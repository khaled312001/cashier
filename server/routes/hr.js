const express = require('express');
const db = require('../database');
const router = express.Router();

// ============= EMPLOYEES =============

router.get('/', async (req, res) => {
  try {
    const employees = await db.employees.find({});
    employees.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, position, department, salary, commissionRate, startDate, nationalId, address } = req.body;
    if (!name) return res.status(400).json({ error: 'الاسم مطلوب' });
    const employeeNumber = 'EMP-' + Date.now().toString().slice(-6);
    const employee = await db.employees.insert({
      employeeNumber, name, phone: phone || '', email: email || '',
      position: position || '', department: department || '',
      salary: parseFloat(salary) || 0, commissionRate: parseFloat(commissionRate) || 0,
      startDate: startDate || new Date(), nationalId: nationalId || '',
      address: address || '', isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body, updatedAt: new Date() };
    delete data._id;
    await db.employees.update({ _id: req.params.id }, { $set: data });
    const updated = await db.employees.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.employees.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= ATTENDANCE =============

// Check-in
router.post('/attendance/checkin', async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'معرف الموظف مطلوب' });
    const employee = await db.employees.findOne({ _id: employeeId });
    if (!employee) return res.status(404).json({ error: 'الموظف غير موجود' });

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await db.attendance.findOne({ employeeId, date: { $gte: today }, checkOut: null });
    if (existing) return res.status(400).json({ error: 'الموظف مسجل حضور بالفعل' });

    const record = await db.attendance.insert({
      employeeId, employeeName: employee.name,
      checkIn: new Date(), checkOut: null,
      date: new Date(), hoursWorked: 0,
      status: 'present', notes: '',
      createdAt: new Date(),
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Check-out
router.post('/attendance/checkout', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await db.attendance.findOne({ employeeId, date: { $gte: today }, checkOut: null });
    if (!record) return res.status(404).json({ error: 'لا يوجد تسجيل حضور مفتوح' });

    const checkOut = new Date();
    const hoursWorked = ((checkOut - new Date(record.checkIn)) / (1000 * 60 * 60)).toFixed(2);
    await db.attendance.update({ _id: record._id }, { $set: { checkOut, hoursWorked: parseFloat(hoursWorked) } });
    const updated = await db.attendance.findOne({ _id: record._id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get attendance records
router.get('/attendance', async (req, res) => {
  try {
    const { from, to, employeeId } = req.query;
    let query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59');
    }
    if (employeeId) query.employeeId = employeeId;
    const records = await db.attendance.find(query);
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= WORK HOURS REPORT =============

router.get('/reports/hours', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59');
    }
    const records = await db.attendance.find(query);
    const employees = await db.employees.find({});

    const report = employees.map(emp => {
      const empRecords = records.filter(r => r.employeeId === emp._id);
      const totalHours = empRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
      const daysPresent = empRecords.length;
      const avgHours = daysPresent > 0 ? (totalHours / daysPresent).toFixed(1) : 0;
      return { employeeId: emp._id, name: emp.name, position: emp.position, totalHours: totalHours.toFixed(1), daysPresent, avgHours };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= SALARY CALCULATION =============

router.post('/salaries/calculate', async (req, res) => {
  try {
    const { month, year } = req.body; // e.g. month=1, year=2026
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    const employees = await db.employees.find({ isActive: true });
    const attendance = await db.attendance.find({ date: { $gte: from, $lte: to } });
    const sales = await db.sales.find({ createdAt: { $gte: from, $lte: to } });

    const salaries = employees.map(emp => {
      const empAttendance = attendance.filter(a => a.employeeId === emp._id);
      const totalHours = empAttendance.reduce((s, a) => s + (a.hoursWorked || 0), 0);
      const daysWorked = empAttendance.length;

      // Commission from sales
      const empSales = sales.filter(s => s.userId === emp._id);
      const totalSalesAmount = empSales.reduce((s, sale) => s + (sale.total || 0), 0);
      const commission = totalSalesAmount * ((emp.commissionRate || 0) / 100);

      const baseSalary = emp.salary || 0;
      const totalSalary = baseSalary + commission;

      return {
        employeeId: emp._id, name: emp.name, position: emp.position,
        baseSalary, commission: commission.toFixed(2), totalSalary: totalSalary.toFixed(2),
        daysWorked, totalHours: totalHours.toFixed(1),
        salesCount: empSales.length, salesTotal: totalSalesAmount.toFixed(2),
        month, year,
      };
    });

    // Save salary records
    for (const salary of salaries) {
      await db.salaries.update(
        { employeeId: salary.employeeId, month, year },
        { $set: { ...salary, calculatedAt: new Date() } },
        { upsert: true }
      );
    }

    res.json(salaries);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get salary history
router.get('/salaries', async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    const salaries = await db.salaries.find(query);
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ============= EMPLOYEE PERFORMANCE =============

router.get('/reports/performance', async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateQuery = {};
    if (from || to) {
      dateQuery.createdAt = {};
      if (from) dateQuery.createdAt.$gte = new Date(from);
      if (to) dateQuery.createdAt.$lte = new Date(to + 'T23:59:59');
    }

    const employees = await db.employees.find({});
    const sales = await db.sales.find(dateQuery);
    const attendance = await db.attendance.find(from || to ? { date: dateQuery.createdAt } : {});

    const performance = employees.map(emp => {
      const empSales = sales.filter(s => s.userId === emp._id);
      const empAttendance = attendance.filter(a => a.employeeId === emp._id);
      const totalSales = empSales.reduce((s, sale) => s + (sale.total || 0), 0);
      const totalHours = empAttendance.reduce((s, a) => s + (a.hoursWorked || 0), 0);
      const returnsCount = empSales.filter(s => s.hasReturns || s.status === 'refunded').length;

      return {
        employeeId: emp._id, name: emp.name, position: emp.position,
        salesCount: empSales.length, totalSales,
        avgSaleValue: empSales.length > 0 ? (totalSales / empSales.length).toFixed(2) : 0,
        daysPresent: empAttendance.length, totalHours: totalHours.toFixed(1),
        salesPerHour: totalHours > 0 ? (totalSales / totalHours).toFixed(2) : 0,
        returnsCount,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);

    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
