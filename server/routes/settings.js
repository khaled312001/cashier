const express = require('express');
const db = require('../database');

const router = express.Router();


// Get store settings
router.get('/store', async (req, res) => {
  try {
    const settings = await db.settings.findOne({ key: 'store' });
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الإعدادات' });
  }
});

// Get settings
router.get('/', async (req, res) => {
  try {
    const settings = await db.settings.findOne({ key: 'store' });
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الإعدادات' });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const { storeName, storeAddress, storePhone, storeLogo, taxRate, currency, receiptFooter } = req.body;
    const exists = await db.settings.findOne({ key: 'store' });

    const data = { storeName, storeAddress, storePhone, storeLogo, taxRate: parseFloat(taxRate) || 0, currency: currency || 'ج.م', receiptFooter, updatedAt: new Date() };

    if (exists) {
      await db.settings.update({ key: 'store' }, { $set: data });
    } else {
      await db.settings.insert({ key: 'store', ...data, createdAt: new Date() });
    }

    res.json(await db.settings.findOne({ key: 'store' }));
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Backup
router.get('/backup', async (req, res) => {
  try {
    res.json({
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      data: {
        products: await db.products.find({}),
        categories: await db.categories.find({}),
        customers: await db.customers.find({}),
        suppliers: await db.suppliers.find({}),
        sales: await db.sales.find({}),
        settings: await db.settings.find({}),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Restore
router.post('/restore', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'بيانات غير صالحة' });

    for (const key of ['products', 'categories', 'customers', 'suppliers', 'sales', 'settings']) {
      await db[key].remove({}, { multi: true });
      if (data[key]?.length) {
        for (const item of data[key]) await db[key].insert(item);
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
