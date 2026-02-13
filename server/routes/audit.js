const express = require('express');
const db = require('../database');
const { authenticate, checkPermission } = require('../middleware');

const router = express.Router();

// Get audit logs with filters
router.get('/', authenticate, checkPermission('audit', 'view'), async (req, res) => {
  try {
    const { from, to, userId, module, action, page = 1, limit = 50 } = req.query;
    let query = {};

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to + 'T23:59:59');
    }

    if (userId) query.userId = userId;
    if (module) query.module = module;
    if (action) query.action = action;

    const total = await db.auditLog.count(query);
    const logs = await db.auditLog.find(query);

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = logs.slice(skip, skip + parseInt(limit));

    res.json({
      logs: paginated,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب سجل العمليات' });
  }
});

// Get audit log stats
router.get('/stats', authenticate, checkPermission('audit', 'view'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = await db.auditLog.count({ timestamp: { $gte: today } });
    const totalLogs = await db.auditLog.count({});

    // Get actions by module
    const allLogs = await db.auditLog.find({});
    const moduleStats = {};
    const userStats = {};

    for (const log of allLogs) {
      if (!moduleStats[log.module]) moduleStats[log.module] = 0;
      moduleStats[log.module]++;

      if (!userStats[log.userName]) userStats[log.userName] = 0;
      userStats[log.userName]++;
    }

    res.json({
      todayCount: todayLogs,
      totalCount: totalLogs,
      byModule: moduleStats,
      byUser: userStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Clear old logs (admin only)
router.delete('/clear', authenticate, checkPermission('audit', 'export'), async (req, res) => {
  try {
    const { before } = req.body;
    if (!before) {
      return res.status(400).json({ error: 'يرجى تحديد التاريخ' });
    }

    const removed = await db.auditLog.remove(
      { timestamp: { $lt: new Date(before) } },
      { multi: true }
    );

    // Log this action itself
    await db.auditLog.insert({
      action: 'حذف سجلات قديمة',
      module: 'audit',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      details: JSON.stringify({ before, removedCount: removed }),
      timestamp: new Date(),
    });

    res.json({ success: true, removedCount: removed });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
