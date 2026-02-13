const express = require('express');
const db = require('../database');

const router = express.Router();

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const { supplierId, status, from, to } = req.query;
    let query = {};
    if (supplierId) query.supplierId = supplierId;
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    const purchases = await db.purchases.find(query);
    purchases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get single purchase with items
router.get('/:id', async (req, res) => {
  try {
    const purchase = await db.purchases.findOne({ _id: req.params.id });
    if (!purchase) return res.status(404).json({ error: 'أمر الشراء غير موجود' });
    purchase.items = await db.purchaseItems.find({ purchaseId: purchase._id });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create purchase order
router.post('/', async (req, res) => {
  try {
    const { supplierId, supplierName, items, notes, expectedDate } = req.body;
    
    const total = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    const poNumber = 'PO-' + Date.now().toString().slice(-8);
    
    const purchase = await db.purchases.insert({
      poNumber,
      supplierId,
      supplierName,
      total,
      status: 'pending', // pending, received, partial, cancelled
      notes: notes || '',
      expectedDate: expectedDate || null,
      createdAt: new Date(),
    });
    
    for (const item of items) {
      await db.purchaseItems.insert({
        purchaseId: purchase._id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        receivedQty: 0,
        cost: item.cost,
        total: item.cost * item.quantity,
        createdAt: new Date(),
      });
    }
    
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إنشاء أمر الشراء' });
  }
});

// Receive purchase order
router.post('/:id/receive', async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, receivedQty }]
    const purchase = await db.purchases.findOne({ _id: req.params.id });
    if (!purchase) return res.status(404).json({ error: 'أمر الشراء غير موجود' });
    
    let allReceived = true;
    
    for (const item of items) {
      const poItem = await db.purchaseItems.findOne({ purchaseId: req.params.id, productId: item.productId });
      if (poItem) {
        const newReceivedQty = (poItem.receivedQty || 0) + item.receivedQty;
        await db.purchaseItems.update(
          { _id: poItem._id },
          { $set: { receivedQty: newReceivedQty } }
        );
        
        if (newReceivedQty < poItem.quantity) allReceived = false;
        
        // Update product stock
        const product = await db.products.findOne({ _id: item.productId });
        if (product) {
          await db.products.update(
            { _id: item.productId },
            { $set: { quantity: product.quantity + item.receivedQty, updatedAt: new Date() } }
          );
          
          await db.inventory.insert({
            productId: item.productId,
            productName: product.name,
            previousQuantity: product.quantity,
            newQuantity: product.quantity + item.receivedQty,
            change: item.receivedQty,
            operation: 'purchase_receive',
            purchaseId: req.params.id,
            createdAt: new Date(),
          });
        }
      }
    }
    
    await db.purchases.update(
      { _id: req.params.id },
      { $set: { status: allReceived ? 'received' : 'partial', receivedAt: new Date() } }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Return to supplier
router.post('/:id/return', async (req, res) => {
  try {
    const { items, reason } = req.body; // [{ productId, quantity }]
    
    for (const item of items) {
      const product = await db.products.findOne({ _id: item.productId });
      if (product) {
        await db.products.update(
          { _id: item.productId },
          { $set: { quantity: Math.max(0, product.quantity - item.quantity), updatedAt: new Date() } }
        );
        
        await db.inventory.insert({
          productId: item.productId,
          productName: product.name,
          previousQuantity: product.quantity,
          newQuantity: Math.max(0, product.quantity - item.quantity),
          change: -item.quantity,
          operation: 'supplier_return',
          purchaseId: req.params.id,
          reason,
          createdAt: new Date(),
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Cancel purchase order
router.patch('/:id/cancel', async (req, res) => {
  try {
    await db.purchases.update({ _id: req.params.id }, { $set: { status: 'cancelled' } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Supplier account statement
router.get('/supplier/:supplierId/statement', async (req, res) => {
  try {
    const purchases = await db.purchases.find({ supplierId: req.params.supplierId });
    const total = purchases.reduce((sum, p) => sum + p.total, 0);
    const paid = purchases.filter(p => p.paid).reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    
    res.json({
      supplierId: req.params.supplierId,
      totalPurchases: total,
      totalPaid: paid,
      balance: total - paid,
      purchases,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
