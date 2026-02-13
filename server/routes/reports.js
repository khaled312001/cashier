const express = require('express');
const db = require('../database');

const router = express.Router();

// Sales Report
router.get('/sales', async (req, res) => {
  try {
    const { from, to, groupBy } = req.query;
    let query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    
    const sales = await db.sales.find(query);
    const returns = await db.returns.find(query);
    
    // Payment methods breakdown
    const paymentMethods = { cash: 0, card: 0, transfer: 0, wallet: 0, credit: 0 };
    for (const sale of sales) {
      for (const payment of (sale.payments || [])) {
        paymentMethods[payment.method] = (paymentMethods[payment.method] || 0) + payment.amount;
      }
      if (sale.remaining > 0) paymentMethods.credit += sale.remaining;
    }
    
    // Daily data
    const dailyData = {};
    for (const sale of sales) {
      const date = new Date(sale.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = { date, total: 0, count: 0, profit: 0 };
      dailyData[date].total += sale.total;
      dailyData[date].count += 1;
      
      // Calculate profit
      for (const item of (sale.items || [])) {
        dailyData[date].profit += (item.price - (item.cost || 0)) * item.quantity;
      }
    }
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalReturns = returns.reduce((sum, r) => sum + r.total, 0);
    const totalProfit = sales.reduce((sum, s) => {
      return sum + (s.items || []).reduce((p, i) => p + ((i.price - (i.cost || 0)) * i.quantity), 0);
    }, 0);
    
    res.json({
      summary: {
        totalSales,
        totalReturns,
        netSales: totalSales - totalReturns,
        totalProfit,
        salesCount: sales.length,
        returnsCount: returns.length,
        averageSale: sales.length ? totalSales / sales.length : 0,
      },
      dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      paymentMethods,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Products Report
router.get('/products', async (req, res) => {
  try {
    const { from, to } = req.query;
    let salesQuery = {};
    if (from || to) {
      salesQuery.createdAt = {};
      if (from) salesQuery.createdAt.$gte = new Date(from);
      if (to) salesQuery.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    
    const products = await db.products.find({});
    const sales = await db.sales.find(salesQuery);
    
    // Best sellers
    const productSales = {};
    const productProfit = {};
    for (const sale of sales) {
      for (const item of (sale.items || [])) {
        if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
        
        if (!productProfit[item.productId]) productProfit[item.productId] = { name: item.name, profit: 0 };
        productProfit[item.productId].profit += (item.price - (item.cost || 0)) * item.quantity;
      }
    }
    
    const bestSellers = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    
    const mostProfitable = Object.values(productProfit)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
    
    // Slow moving (راكدة)
    const soldProductIds = new Set(Object.keys(productSales));
    const slowMoving = products.filter(p => !soldProductIds.has(p._id)).slice(0, 10);
    
    // Low stock
    const lowStock = products.filter(p => p.quantity <= (p.minStock || 5));
    
    // Out of stock
    const outOfStock = products.filter(p => p.quantity === 0).length;
    
    // Expiring
    const now = new Date();
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + 30);
    const expiringSoon = products.filter(p => p.expiryDate && new Date(p.expiryDate) <= alertDate && new Date(p.expiryDate) >= now);
    
    res.json({
      totalProducts: products.length,
      outOfStock,
      lowStock,
      expiringSoon,
      bestSellers,
      mostProfitable,
      slowMoving,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Inventory Report
router.get('/inventory', async (req, res) => {
  try {
    const { from, to, operation } = req.query;
    let query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    if (operation) query.operation = operation;
    
    const movements = await db.inventory.find(query);
    movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const products = await db.products.find({});
    const totalValue = products.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    
    res.json({
      totalProducts: products.length,
      totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
      totalCostValue: totalValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalValue,
      movements: movements.slice(0, 100),
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Financial Report (الأرباح والخسائر)
router.get('/financial', async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateQuery = {};
    if (from || to) {
      dateQuery = {};
      if (from) dateQuery.$gte = new Date(from);
      if (to) dateQuery.$lte = new Date(to + 'T23:59:59');
    }
    
    const sales = await db.sales.find(dateQuery.createdAt ? { createdAt: dateQuery } : {});
    const returns = await db.returns.find(dateQuery.createdAt ? { createdAt: dateQuery } : {});
    const expenses = await db.expenses.find(dateQuery.date ? { date: { $gte: from, $lte: to } } : {});
    
    // Revenue
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalReturns = returns.reduce((sum, r) => sum + r.total, 0);
    const netRevenue = totalRevenue - totalReturns;
    
    // Cost of goods sold
    const cogs = sales.reduce((sum, s) => {
      return sum + (s.items || []).reduce((c, i) => c + ((i.cost || 0) * i.quantity), 0);
    }, 0);
    
    // Gross profit
    const grossProfit = netRevenue - cogs;
    
    // Operating expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Net profit
    const netProfit = grossProfit - totalExpenses;
    
    // Expense breakdown
    const expensesByCategory = {};
    for (const e of expenses) {
      if (!expensesByCategory[e.category]) expensesByCategory[e.category] = 0;
      expensesByCategory[e.category] += e.amount;
    }
    
    res.json({
      revenue: {
        totalSales: totalRevenue,
        returns: totalReturns,
        netRevenue,
      },
      costs: {
        cogs,
        grossProfit,
        grossMargin: netRevenue ? (grossProfit / netRevenue * 100).toFixed(1) : 0,
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
      },
      profit: {
        netProfit,
        profitMargin: netRevenue ? (netProfit / netRevenue * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Tax Report
router.get('/tax', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    
    const sales = await db.sales.find(query);
    const totalTax = sales.reduce((sum, s) => sum + (s.tax || 0), 0);
    const taxableSales = sales.filter(s => (s.tax || 0) > 0);
    
    res.json({
      totalSales: sales.reduce((sum, s) => sum + s.total, 0),
      taxableSalesTotal: taxableSales.reduce((sum, s) => sum + s.subtotal, 0),
      totalTaxCollected: totalTax,
      invoicesCount: sales.length,
      taxableInvoices: taxableSales.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Employee Performance
router.get('/employees', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to + 'T23:59:59');
    }
    
    const sales = await db.sales.find(query);
    const users = await db.users.find({});
    
    const performance = {};
    for (const sale of sales) {
      if (!performance[sale.userId]) {
        const user = users.find(u => u._id === sale.userId);
        performance[sale.userId] = { userName: sale.userName || user?.name || 'غير معروف', salesCount: 0, totalSales: 0 };
      }
      performance[sale.userId].salesCount += 1;
      performance[sale.userId].totalSales += sale.total;
    }
    
    const performanceList = Object.values(performance).sort((a, b) => b.totalSales - a.totalSales);
    
    res.json({ employees: performanceList });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Customer Report
router.get('/customers', async (req, res) => {
  try {
    const customers = await db.customers.find({});
    const credits = await db.credits.find({ status: { $ne: 'paid' } });
    
    const topCustomers = [...customers]
      .sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0))
      .slice(0, 10);
    
    const totalReceivables = credits.reduce((sum, c) => sum + (c.amount - (c.paidAmount || 0)), 0);
    
    res.json({
      totalCustomers: customers.length,
      topCustomers,
      totalReceivables,
      creditCustomers: credits.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
