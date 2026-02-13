const express = require('express');
const db = require('../database');

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') },
      ];
    }

    const suppliers = await db.suppliers.find(query);
    suppliers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الموردين' });
  }
});

// Get single supplier
router.get('/:id', async (req, res) => {
  try {
    const supplier = await db.suppliers.findOne({ _id: req.params.id });
    if (!supplier) {
      return res.status(404).json({ error: 'المورد غير موجود' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create supplier
router.post('/', async (req, res) => {
  try {
    const { name, company, phone, email, address, notes } = req.body;

    const supplier = await db.suppliers.insert({
      name,
      company: company || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || '',
      totalOrders: 0,
      createdAt: new Date(),
    });

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إضافة المورد' });
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  try {
    const { name, company, phone, email, address, notes } = req.body;

    await db.suppliers.update(
      { _id: req.params.id },
      { $set: { name, company, phone, email, address, notes, updatedAt: new Date() } }
    );

    const updated = await db.suppliers.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في تحديث المورد' });
  }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    await db.suppliers.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في حذف المورد' });
  }
});

module.exports = router;
