const express = require('express');
const db = require('../database');

const router = express.Router();

// Get all expenses
router.get('/', async (req, res) => {
  try {
    const { category, from, to } = req.query;
    let query = {};
    if (category) query.category = category;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }
    const expenses = await db.expenses.find(query);
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get expense categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'rent', name: 'إيجار', icon: '🏠' },
      { id: 'utilities', name: 'مرافق', icon: '💡' },
      { id: 'salaries', name: 'رواتب', icon: '💰' },
      { id: 'inventory', name: 'مخزون', icon: '📦' },
      { id: 'maintenance', name: 'صيانة', icon: '🔧' },
      { id: 'marketing', name: 'تسويق', icon: '📢' },
      { id: 'transport', name: 'نقل', icon: '🚚' },
      { id: 'other', name: 'أخرى', icon: '📋' },
    ];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create expense
router.post('/', async (req, res) => {
  try {
    const { title, amount, category, date, notes, userId, userName } = req.body;
    
    const expense = await db.expenses.insert({
      title,
      amount: parseFloat(amount) || 0,
      category: category || 'other',
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || '',
      userId,
      userName,
      createdAt: new Date(),
    });
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إضافة المصروف' });
  }
});

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const { title, amount, category, date, notes } = req.body;
    
    await db.expenses.update(
      { _id: req.params.id },
      {
        $set: {
          title,
          amount: parseFloat(amount) || 0,
          category,
          date,
          notes,
          updatedAt: new Date(),
        },
      }
    );
    
    const updated = await db.expenses.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    await db.expenses.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Summary by category
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }
    
    const expenses = await db.expenses.find(query);
    
    const byCategory = {};
    for (const e of expenses) {
      if (!byCategory[e.category]) byCategory[e.category] = 0;
      byCategory[e.category] += e.amount;
    }
    
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    res.json({ total, byCategory, count: expenses.length });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
