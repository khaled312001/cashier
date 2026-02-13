const express = require('express');
const db = require('../database');
const router = express.Router();

// Helper: Calculate average daily sales for a product
const calculateDailyVelocity = (sales, productId, days = 30) => {
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - days);
  
  const relevantSales = sales.filter(s => new Date(s.createdAt) >= pastDate);
  let totalQty = 0;
  
  for (const sale of relevantSales) {
    const item = (sale.items || []).find(i => i.productId === productId);
    if (item) totalQty += item.quantity;
  }
  
  return totalQty / days;
};

// Stock Prediction (When will stock run out?)
router.get('/stock-prediction', async (req, res) => {
  try {
    const products = await db.products.find({ quantity: { $gt: 0 } });
    const sales = await db.sales.find({}); // Optimally limit to last 90 days
    
    const predictions = products.map(p => {
      const velocity = calculateDailyVelocity(sales, p._id, 30);
      const daysLeft = velocity > 0 ? Math.floor(p.quantity / velocity) : 999;
      return {
        _id: p._id,
        name: p.name,
        currentStock: p.quantity,
        dailyVelocity: velocity.toFixed(2),
        daysLeft: daysLeft === 999 ? 'غير محدد (لا توجد مبيعات)' : daysLeft,
        status: daysLeft < 7 ? 'critical' : daysLeft < 30 ? 'warning' : 'safe'
      };
    }).filter(p => p.status !== 'safe').sort((a, b) => (typeof a.daysLeft === 'number' ? a.daysLeft : 999) - (typeof b.daysLeft === 'number' ? b.daysLeft : 999));
    
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Purchase Suggestions (Reorder quantities)
router.get('/purchase-suggestions', async (req, res) => {
  try {
    const products = await db.products.find({});
    const sales = await db.sales.find({});
    
    const suggestions = products.map(p => {
      const velocity = calculateDailyVelocity(sales, p._id, 30);
      const suggestedStock = Math.ceil(velocity * 30); // Aim for 30 days coverage
      const reorderQty = Math.max(0, suggestedStock - p.quantity);
      
      return {
        _id: p._id,
        name: p.name,
        currentStock: p.quantity,
        dailyVelocity: velocity.toFixed(2),
        suggestedStock,
        reorderQty
      };
    }).filter(p => p.reorderQty > 0).sort((a, b) => b.reorderQty - a.reorderQty);
    
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Slow Movers Alert (Dead Stock)
router.get('/slow-movers', async (req, res) => {
  try {
    const products = await db.products.find({ quantity: { $gt: 0 } });
    const sales = await db.sales.find({});
    
    const slowMovers = products.map(p => {
      const velocity = calculateDailyVelocity(sales, p._id, 90); // Check last 90 days
      return {
        _id: p._id,
        name: p.name,
        currentStock: p.quantity,
        value: p.quantity * p.cost,
        dailyVelocity: velocity.toFixed(3)
      };
    }).filter(p => parseFloat(p.dailyVelocity) < 0.1) // Less than 1 item every 10 days
      .sort((a, b) => b.value - a.value); // Sort by value tied up
    
    res.json(slowMovers);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
