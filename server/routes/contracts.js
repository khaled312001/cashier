const express = require('express');
const db = require('../database');
const router = express.Router();

// ============= CONTRACTS CRUD =============

router.get('/', async (req, res) => {
  try {
    const contracts = await db.contracts.find({});
    contracts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contract = await db.contracts.findOne({ _id: req.params.id });
    if (!contract) return res.status(404).json({ error: 'غير موجود' });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { companyName, contactPerson, phone, email, type, startDate, endDate, terms, discountRate, linkedEmployees, notes } = req.body;
    if (!companyName) return res.status(400).json({ error: 'اسم الشركة مطلوب' });
    const contractNumber = 'CTR-' + Date.now().toString().slice(-8);
    const contract = await db.contracts.insert({
      contractNumber, companyName, contactPerson: contactPerson || '',
      phone: phone || '', email: email || '',
      type: type || 'corporate', startDate, endDate,
      terms: terms || '', discountRate: parseFloat(discountRate) || 0,
      linkedEmployees: linkedEmployees || [],
      notes: notes || '', status: 'active',
      createdAt: new Date(), updatedAt: new Date(),
    });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body, updatedAt: new Date() };
    delete data._id;
    await db.contracts.update({ _id: req.params.id }, { $set: data });
    const updated = await db.contracts.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.contracts.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= SUPPLIER DISCOUNT COMPARISON =============

router.get('/compare/suppliers', async (req, res) => {
  try {
    const { productId } = req.query;
    const purchases = await db.purchases.find({});
    const suppliers = await db.suppliers.find({});

    // Group by supplier, find best prices per product
    const comparison = {};
    for (const purchase of purchases) {
      for (const item of (purchase.items || [])) {
        if (productId && item.productId !== productId) continue;
        const key = item.productId;
        if (!comparison[key]) comparison[key] = { productName: item.productName || item.name, suppliers: {} };
        const sid = purchase.supplierId;
        if (!comparison[key].suppliers[sid]) {
          const supplier = suppliers.find(s => s._id === sid);
          comparison[key].suppliers[sid] = { supplierName: supplier?.name || 'غير معروف', prices: [], avgPrice: 0, bestPrice: Infinity, discount: 0 };
        }
        comparison[key].suppliers[sid].prices.push(item.cost || item.price);
      }
    }

    // Calculate averages and best prices
    for (const key of Object.keys(comparison)) {
      for (const sid of Object.keys(comparison[key].suppliers)) {
        const s = comparison[key].suppliers[sid];
        s.avgPrice = s.prices.reduce((a, b) => a + b, 0) / s.prices.length;
        s.bestPrice = Math.min(...s.prices);
        s.purchaseCount = s.prices.length;
      }
    }

    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Payment due notifications
router.get('/dues/pending', async (req, res) => {
  try {
    const purchases = await db.purchases.find({ paymentStatus: { $ne: 'paid' } });
    const now = new Date();
    const dues = purchases.map(p => {
      const dueDate = p.dueDate ? new Date(p.dueDate) : null;
      const isOverdue = dueDate && dueDate < now;
      return { ...p, isOverdue, daysOverdue: isOverdue ? Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)) : 0 };
    }).sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0));
    res.json(dues);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
