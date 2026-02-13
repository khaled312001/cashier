const express = require('express');
const db = require('../database');

const router = express.Router();

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await db.sales.find({ createdAt: { $gte: today, $lt: tomorrow } });
    const allProducts = await db.products.find({});
    const allCustomers = await db.customers.find({});

    const stats = {
      todaySales: todaySales.reduce((sum, s) => sum + s.total, 0),
      todayOrders: todaySales.length,
      totalProducts: allProducts.length,
      totalCustomers: allCustomers.length,
      lowStock: allProducts.filter(p => p.quantity <= (p.minStock || 5)).length,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Recent sales
router.get('/recent-sales', async (req, res) => {
  try {
    const sales = await db.sales.find({});
    sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sales.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Weekly chart data
router.get('/weekly', async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const sales = await db.sales.find({ createdAt: { $gte: date, $lt: nextDay } });
      days.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('ar-EG', { weekday: 'short' }),
        total: sales.reduce((sum, s) => sum + s.total, 0),
        count: sales.length,
      });
    }
    res.json(days);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
