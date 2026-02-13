const express = require('express');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all sales
router.get('/', async (req, res) => {
  try {
    const { from, to, customerId, status, userId } = req.query;
    let query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    
    const sales = await db.sales.find(query);
    sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Hold sale
router.post('/hold', async (req, res) => {
  try {
    const { items, customerId, customerName, notes } = req.body;
    const holdNumber = 'HOLD-' + Date.now().toString().slice(-6);
    
    const held = await db.heldSales.insert({
      holdNumber,
      items,
      customerId,
      customerName: customerName || 'عميل',
      notes,
      createdAt: new Date(),
    });
    
    res.json(held);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get held sales
router.get('/held/list', async (req, res) => {
  try {
    const held = await db.heldSales.find({});
    held.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(held);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Resume held sale
router.get('/held/:id', async (req, res) => {
  try {
    const held = await db.heldSales.findOne({ _id: req.params.id });
    if (!held) return res.status(404).json({ error: 'غير موجود' });
    res.json(held);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Delete held sale
router.delete('/held/:id', async (req, res) => {
  try {
    await db.heldSales.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Drawer close summary (today's breakdown) - MUST be before /:id
router.get('/drawer-summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await db.sales.find({ createdAt: { $gte: today, $lt: tomorrow }, status: { $ne: 'refunded' } });
    const returns = await db.returns.find({ createdAt: { $gte: today, $lt: tomorrow } });

    const paymentBreakdown = { cash: 0, card: 0, wallet: 0, transfer: 0, credit: 0, nfc: 0 };
    for (const sale of sales) {
      for (const payment of (sale.payments || [])) {
        const method = payment.method || 'cash';
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (parseFloat(payment.amount) || 0);
      }
    }

    const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalReturns = returns.reduce((sum, r) => sum + (r.total || 0), 0);

    res.json({
      salesCount: sales.length,
      totalSales,
      totalReturns,
      netSales: totalSales - totalReturns,
      ...paymentBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get single sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await db.sales.findOne({ _id: req.params.id });
    if (!sale) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create sale (checkout)
router.post('/', async (req, res) => {
  try {
    const {
      items, customerId, customerName,
      subtotal, discount, discountType, tax, total,
      payments, // [{ method, amount }]
      notes, userId, userName, isWholesale
    } = req.body;

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const change = Math.max(0, totalPaid - total);
    const remaining = Math.max(0, total - totalPaid);

    // Generate invoice number
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await db.sales.count({});
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Update stock
    for (const item of items) {
      if (item.variantId) {
        const variant = await db.variants.findOne({ _id: item.variantId });
        if (variant) {
          await db.variants.update(
            { _id: item.variantId },
            { $set: { quantity: Math.max(0, variant.quantity - item.quantity) } }
          );
        }
      } else {
        const product = await db.products.findOne({ _id: item.productId });
        if (product) {
          // Handle bundle
          if (product.isBundle) {
            const bundleItems = await db.bundles.find({ bundleId: product._id });
            for (const bi of bundleItems) {
              const bundleProduct = await db.products.findOne({ _id: bi.productId });
              if (bundleProduct) {
                await db.products.update(
                  { _id: bi.productId },
                  { $set: { quantity: Math.max(0, bundleProduct.quantity - (bi.quantity * item.quantity)) } }
                );
              }
            }
          } else {
            await db.products.update(
              { _id: item.productId },
              { $set: { quantity: Math.max(0, product.quantity - item.quantity), updatedAt: new Date() } }
            );
          }
        }
      }
    }

    const sale = await db.sales.insert({
      invoiceNumber,
      items,
      customerId: customerId || null,
      customerName: customerName || 'عميل نقدي',
      subtotal: parseFloat(subtotal),
      discount: parseFloat(discount) || 0,
      discountType: discountType || 'fixed',
      tax: parseFloat(tax) || 0,
      total: parseFloat(total),
      payments,
      totalPaid,
      change,
      remaining,
      status: remaining > 0 ? 'credit' : 'paid',
      isWholesale: isWholesale || false,
      userId,
      userName,
      notes: notes || '',
      createdAt: new Date(),
    });

    // Record credit if not fully paid
    if (remaining > 0 && customerId) {
      await db.credits.insert({
        saleId: sale._id,
        invoiceNumber,
        customerId,
        customerName,
        amount: remaining,
        paidAmount: 0,
        status: 'pending',
        createdAt: new Date(),
      });
    }

    // Update customer
    if (customerId) {
      const customer = await db.customers.findOne({ _id: customerId });
      if (customer) {
        const settings = await db.settings.findOne({ key: 'store' });
        const loyaltyPoints = settings?.enableLoyalty ? Math.floor(total * (settings?.loyaltyPointsPerUnit || 1)) : 0;
        
        await db.customers.update(
          { _id: customerId },
          {
            $set: {
              totalPurchases: (customer.totalPurchases || 0) + total,
              loyaltyPoints: (customer.loyaltyPoints || 0) + loyaltyPoints,
              lastPurchase: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    res.json(sale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Return sale (full or partial)
router.post('/:id/return', async (req, res) => {
  try {
    const { items, reason } = req.body; // [{ productId, quantity, variantId? }]
    const sale = await db.sales.findOne({ _id: req.params.id });
    if (!sale) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

    let returnTotal = 0;

    for (const item of items) {
      const saleItem = sale.items.find(i => i.productId === item.productId);
      if (saleItem) {
        returnTotal += saleItem.price * item.quantity;
        
        // Return to stock
        if (item.variantId) {
          const variant = await db.variants.findOne({ _id: item.variantId });
          if (variant) {
            await db.variants.update(
              { _id: item.variantId },
              { $set: { quantity: variant.quantity + item.quantity } }
            );
          }
        } else {
          const product = await db.products.findOne({ _id: item.productId });
          if (product) {
            await db.products.update(
              { _id: item.productId },
              { $set: { quantity: product.quantity + item.quantity } }
            );
          }
        }
      }
    }

    // Create return record
    const returnNumber = 'RET-' + Date.now().toString().slice(-8);
    await db.returns.insert({
      returnNumber,
      saleId: req.params.id,
      invoiceNumber: sale.invoiceNumber,
      items,
      total: returnTotal,
      reason: reason || '',
      createdAt: new Date(),
    });

    // Update sale if full return
    const fullReturn = items.length === sale.items.length && 
      items.every(i => {
        const si = sale.items.find(s => s.productId === i.productId);
        return si && si.quantity === i.quantity;
      });

    if (fullReturn) {
      await db.sales.update({ _id: req.params.id }, { $set: { status: 'refunded', refundedAt: new Date() } });
    } else {
      await db.sales.update({ _id: req.params.id }, { $set: { hasReturns: true } });
    }

    res.json({ success: true, returnNumber, returnTotal });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get returns
router.get('/returns/list', async (req, res) => {
  try {
    const returns = await db.returns.find({});
    returns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Today's summary
router.get('/summary/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await db.sales.find({ createdAt: { $gte: today, $lt: tomorrow } });
    
    const paymentBreakdown = {};
    for (const sale of sales) {
      for (const payment of (sale.payments || [])) {
        paymentBreakdown[payment.method] = (paymentBreakdown[payment.method] || 0) + payment.amount;
      }
    }

    res.json({
      count: sales.length,
      total: sales.reduce((sum, s) => sum + s.total, 0),
      cash: paymentBreakdown.cash || 0,
      card: paymentBreakdown.card || 0,
      credit: sales.filter(s => s.status === 'credit').reduce((sum, s) => sum + s.remaining, 0),
      paymentBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
