const express = require('express');
const db = require('../database');
const router = express.Router();

// ============= WAREHOUSES =============

// Get all warehouses
router.get('/', async (req, res) => {
  try {
    const warehouses = await db.warehouses.find({});
    warehouses.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create warehouse
router.post('/', async (req, res) => {
  try {
    const { name, address, phone, type, isDefault } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم المخزن مطلوب' });
    if (isDefault) {
      await db.warehouses.update({}, { $set: { isDefault: false } }, { multi: true });
    }
    const warehouse = await db.warehouses.insert({
      name, address: address || '', phone: phone || '',
      type: type || 'main', isDefault: isDefault || false,
      isActive: true, createdAt: new Date(),
    });
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Update warehouse
router.put('/:id', async (req, res) => {
  try {
    const { name, address, phone, type, isDefault, isActive } = req.body;
    if (isDefault) {
      await db.warehouses.update({}, { $set: { isDefault: false } }, { multi: true });
    }
    await db.warehouses.update({ _id: req.params.id }, {
      $set: { name, address, phone, type, isDefault, isActive, updatedAt: new Date() }
    });
    const updated = await db.warehouses.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Delete warehouse
router.delete('/:id', async (req, res) => {
  try {
    await db.warehouses.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= TRANSFERS =============

// Create inter-warehouse transfer
router.post('/transfer', async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, items, notes } = req.body;
    if (!fromWarehouseId || !toWarehouseId || !items?.length) {
      return res.status(400).json({ error: 'بيانات التحويل غير مكتملة' });
    }
    const transferNumber = 'TRF-' + Date.now().toString().slice(-8);
    const transfer = await db.inventory.insert({
      transferNumber, type: 'transfer',
      fromWarehouseId, toWarehouseId,
      items, notes: notes || '',
      status: 'completed',
      userId: req.user?.id, userName: req.user?.name,
      createdAt: new Date(),
    });
    // Update product warehouse quantities (tracked in inventory log)
    for (const item of items) {
      await db.inventory.insert({
        productId: item.productId, productName: item.productName,
        previousQuantity: 0, newQuantity: item.quantity,
        change: item.quantity, operation: 'transfer',
        reason: `تحويل من مخزن لآخر - ${transferNumber}`,
        fromWarehouseId, toWarehouseId,
        createdAt: new Date(),
      });
    }
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get transfers
router.get('/transfers/list', async (req, res) => {
  try {
    const transfers = await db.inventory.find({ type: 'transfer' });
    transfers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= STOCK ALERTS =============

// Low stock alerts
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const products = await db.products.find({});
    const settings = await db.settings.findOne({});
    const threshold = settings?.lowStockAlert || 5;
    const lowStock = products
      .filter(p => p.quantity <= (p.minStock || threshold) && p.quantity > 0)
      .map(p => ({ ...p, alertType: 'low_stock', threshold: p.minStock || threshold }));
    const outOfStock = products
      .filter(p => p.quantity <= 0)
      .map(p => ({ ...p, alertType: 'out_of_stock' }));
    res.json({ lowStock, outOfStock, totalAlerts: lowStock.length + outOfStock.length });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Expiry alerts
router.get('/alerts/expiry', async (req, res) => {
  try {
    const { from, to, days } = req.query;
    const products = await db.products.find({});
    const settings = await db.settings.findOne({});
    const alertDays = parseInt(days) || settings?.expiryAlertDays || 30;
    const now = new Date();
    const alertDate = new Date(now.getTime() + alertDays * 24 * 60 * 60 * 1000);

    let expiring = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      if (from && to) {
        return expiry >= new Date(from) && expiry <= new Date(to + 'T23:59:59');
      }
      return expiry <= alertDate;
    }).map(p => {
      const expiry = new Date(p.expiryDate);
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return { ...p, daysLeft, isExpired: daysLeft <= 0 };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    const expired = expiring.filter(p => p.isExpired);
    const aboutToExpire = expiring.filter(p => !p.isExpired);
    res.json({ expired, aboutToExpire, totalAlerts: expiring.length });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= PRODUCT MOVEMENT REPORT =============

router.get('/movement/:productId', async (req, res) => {
  try {
    const { from, to } = req.query;
    const product = await db.products.findOne({ _id: req.params.productId });
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    let dateQuery = {};
    if (from || to) {
      dateQuery.createdAt = {};
      if (from) dateQuery.createdAt.$gte = new Date(from);
      if (to) dateQuery.createdAt.$lte = new Date(to + 'T23:59:59');
    }

    // Sales
    const allSales = await db.sales.find({ ...dateQuery, status: { $ne: 'refunded' } });
    const salesMovement = allSales.filter(s => s.items.some(i => i.productId === req.params.productId))
      .map(s => {
        const item = s.items.find(i => i.productId === req.params.productId);
        return { type: 'sale', date: s.createdAt, quantity: -item.quantity, reference: s.invoiceNumber, price: item.price };
      });

    // Returns
    const allReturns = await db.returns.find(dateQuery);
    const returnMovement = allReturns.filter(r => r.items.some(i => i.productId === req.params.productId))
      .map(r => {
        const item = r.items.find(i => i.productId === req.params.productId);
        return { type: 'return', date: r.createdAt, quantity: item.quantity, reference: r.returnNumber };
      });

    // Purchases
    const allPurchases = await db.purchases.find(dateQuery);
    const purchaseMovement = allPurchases.filter(p => p.items?.some(i => i.productId === req.params.productId))
      .map(p => {
        const item = p.items.find(i => i.productId === req.params.productId);
        return { type: 'purchase', date: p.createdAt, quantity: item.quantity, reference: p.purchaseNumber || p._id };
      });

    // Inventory adjustments
    const adjustments = await db.inventory.find({ productId: req.params.productId, ...dateQuery });
    const adjustMovement = adjustments.map(a => ({
      type: a.operation || 'adjustment', date: a.createdAt, quantity: a.change, reason: a.reason,
    }));

    const movements = [...salesMovement, ...returnMovement, ...purchaseMovement, ...adjustMovement]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ product, movements, totalIn: movements.filter(m => m.quantity > 0).reduce((s, m) => s + m.quantity, 0), totalOut: movements.filter(m => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0) });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= STOCKTAKE =============

router.post('/stocktake', async (req, res) => {
  try {
    const { items, notes } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'لا توجد منتجات' });

    const stocktakeNumber = 'STK-' + Date.now().toString().slice(-8);
    const results = [];

    for (const item of items) {
      const product = await db.products.findOne({ _id: item.productId });
      if (!product) continue;

      const diff = item.counted - product.quantity;
      // Log movement
      await db.inventory.insert({
        productId: item.productId, productName: product.name,
        previousQuantity: product.quantity, newQuantity: item.counted,
        change: diff, operation: 'stocktake',
        reason: `جرد ${stocktakeNumber} - ${notes || ''}`,
        createdAt: new Date(),
      });
      // Update product quantity
      await db.products.update({ _id: item.productId }, { $set: { quantity: item.counted, updatedAt: new Date() } });
      results.push({ productId: item.productId, name: product.name, previous: product.quantity, counted: item.counted, diff });
    }

    res.json({ stocktakeNumber, results, totalItems: results.length, totalDifference: results.reduce((s, r) => s + r.diff, 0) });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
