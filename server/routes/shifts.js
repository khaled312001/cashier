const express = require('express');
const db = require('../database');

const router = express.Router();

// Get all shifts
router.get('/', async (req, res) => {
  try {
    const { userId, from, to, status } = req.query;
    let query = {};
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (from || to) {
      query.startedAt = {};
      if (from) query.startedAt.$gte = new Date(from);
      if (to) query.startedAt.$lte = new Date(to + 'T23:59:59');
    }
    const shifts = await db.shifts.find(query);
    shifts.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get current active shift
router.get('/current', async (req, res) => {
  try {
    const { userId } = req.query;
    const shift = await db.shifts.findOne({ status: 'active', userId });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Start shift
router.post('/start', async (req, res) => {
  try {
    const { userId, userName, openingCash } = req.body;
    
    // Check if user already has active shift
    const activeShift = await db.shifts.findOne({ userId, status: 'active' });
    if (activeShift) {
      return res.status(400).json({ error: 'يوجد وردية نشطة بالفعل' });
    }
    
    const shiftNumber = 'SH-' + Date.now().toString().slice(-8);
    
    const shift = await db.shifts.insert({
      shiftNumber,
      userId,
      userName,
      openingCash: parseFloat(openingCash) || 0,
      closingCash: 0,
      expectedCash: parseFloat(openingCash) || 0,
      difference: 0,
      totalSales: 0,
      salesCount: 0,
      totalReturns: 0,
      returnsCount: 0,
      status: 'active',
      startedAt: new Date(),
      endedAt: null,
    });
    
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في بدء الوردية' });
  }
});

// Close shift
router.post('/:id/close', async (req, res) => {
  try {
    const { closingCash, notes } = req.body;
    const shift = await db.shifts.findOne({ _id: req.params.id });
    if (!shift) return res.status(404).json({ error: 'الوردية غير موجودة' });
    
    // Calculate shift totals
    const shiftStart = new Date(shift.startedAt);
    const now = new Date();
    
    const sales = await db.sales.find({
      userId: shift.userId,
      createdAt: { $gte: shiftStart, $lte: now },
    });
    
    const returns = await db.returns.find({
      createdAt: { $gte: shiftStart, $lte: now },
    });
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalCash = sales.reduce((sum, s) => {
      const cashPayments = (s.payments || []).filter(p => p.method === 'cash');
      return sum + cashPayments.reduce((cs, p) => cs + p.amount, 0);
    }, 0);
    const totalReturns = returns.reduce((sum, r) => sum + r.total, 0);
    
    const expectedCash = shift.openingCash + totalCash - totalReturns;
    const difference = parseFloat(closingCash) - expectedCash;
    
    await db.shifts.update(
      { _id: req.params.id },
      {
        $set: {
          closingCash: parseFloat(closingCash),
          expectedCash,
          difference,
          totalSales,
          salesCount: sales.length,
          totalReturns,
          returnsCount: returns.length,
          totalCash,
          status: 'closed',
          notes: notes || '',
          endedAt: new Date(),
        },
      }
    );
    
    const updated = await db.shifts.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إغلاق الوردية' });
  }
});

// Get shift details with transactions
router.get('/:id/details', async (req, res) => {
  try {
    const shift = await db.shifts.findOne({ _id: req.params.id });
    if (!shift) return res.status(404).json({ error: 'الوردية غير موجودة' });
    
    const shiftStart = new Date(shift.startedAt);
    const shiftEnd = shift.endedAt ? new Date(shift.endedAt) : new Date();
    
    const sales = await db.sales.find({
      userId: shift.userId,
      createdAt: { $gte: shiftStart, $lte: shiftEnd },
    });
    
    const expenses = await db.expenses.find({
      userId: shift.userId,
      createdAt: { $gte: shiftStart, $lte: shiftEnd },
    });
    
    res.json({ shift, sales, expenses });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
