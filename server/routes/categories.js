const express = require('express');
const db = require('../database');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await db.categories.find({});
    categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الفئات' });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await db.categories.findOne({ _id: req.params.id });
    if (!category) {
      return res.status(404).json({ error: 'الفئة غير موجودة' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { name, icon, color, order } = req.body;

    const exists = await db.categories.findOne({ name });
    if (exists) {
      return res.status(400).json({ error: 'الفئة موجودة بالفعل' });
    }

    const category = await db.categories.insert({
      name,
      icon: icon || '📦',
      color: color || '#6b7280',
      order: order || 0,
      createdAt: new Date(),
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إضافة الفئة' });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, icon, color, order } = req.body;

    await db.categories.update(
      { _id: req.params.id },
      { $set: { name, icon, color, order, updatedAt: new Date() } }
    );

    const updated = await db.categories.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في تحديث الفئة' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    // Check if category has products
    const productsCount = await db.products.count({ categoryId: req.params.id });
    if (productsCount > 0) {
      return res.status(400).json({ 
        error: `لا يمكن حذف الفئة لأنها تحتوي على ${productsCount} منتج` 
      });
    }

    await db.categories.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في حذف الفئة' });
  }
});

// Update order
router.post('/reorder', async (req, res) => {
  try {
    const { categories } = req.body;
    
    for (let i = 0; i < categories.length; i++) {
      await db.categories.update(
        { _id: categories[i] },
        { $set: { order: i } }
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
