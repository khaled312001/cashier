const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { ROLE_PERMISSIONS } = require('../database');
const { authenticate, checkPermission, JWT_SECRET } = require('../middleware');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.users.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'الحساب معطل - تواصل مع المدير' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log login
    await db.auditLog.insert({
      action: 'تسجيل دخول',
      module: 'auth',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      details: JSON.stringify({ username }),
      ip: req.ip || 'unknown',
      timestamp: new Date(),
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions || ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.cashier,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'حدث خطأ في تسجيل الدخول' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.users.findOne({ _id: decoded.id });

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json({
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions || ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.cashier,
    });
  } catch (error) {
    res.status(401).json({ error: 'غير مصرح' });
  }
});

// Get all users
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await db.users.find({});
    res.json(users.map(u => ({
      id: u._id,
      username: u.username,
      name: u.name,
      role: u.role,
      permissions: u.permissions || ROLE_PERMISSIONS[u.role] || {},
      isActive: u.isActive !== false,
      createdAt: u.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get available roles and their default permissions
router.get('/roles', authenticate, async (req, res) => {
  try {
    const roles = Object.entries(ROLE_PERMISSIONS).map(([key, perms]) => ({
      id: key,
      name: getRoleName(key),
      permissions: perms,
    }));
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

function getRoleName(role) {
  const names = {
    admin: 'مدير النظام',
    manager: 'مدير',
    cashier: 'كاشير',
    warehouse: 'أمين مخزن',
    accountant: 'محاسب',
  };
  return names[role] || role;
}

// Create user
router.post('/users', authenticate, checkPermission('settings', 'users'), async (req, res) => {
  try {
    const { username, password, name, role, permissions, isActive } = req.body;

    const exists = await db.users.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userPerms = permissions || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;

    const user = await db.users.insert({
      username,
      password: hashedPassword,
      name,
      role: role || 'cashier',
      permissions: userPerms,
      isActive: isActive !== false,
      createdAt: new Date(),
    });

    // Audit log
    await db.auditLog.insert({
      action: 'إنشاء مستخدم',
      module: 'users',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      details: JSON.stringify({ newUser: username, role: role || 'cashier' }),
      timestamp: new Date(),
    });

    res.json({
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إنشاء المستخدم' });
  }
});

// Update user
router.put('/users/:id', authenticate, checkPermission('settings', 'users'), async (req, res) => {
  try {
    const { name, role, password, permissions, isActive } = req.body;
    const update = { name, role, updatedAt: new Date() };

    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    if (permissions) {
      update.permissions = permissions;
    } else if (role) {
      update.permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
    }

    if (isActive !== undefined) {
      update.isActive = isActive;
    }

    await db.users.update({ _id: req.params.id }, { $set: update });

    // Audit log
    await db.auditLog.insert({
      action: 'تحديث مستخدم',
      module: 'users',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      details: JSON.stringify({ targetUserId: req.params.id, changes: { name, role, isActive } }),
      timestamp: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في تحديث المستخدم' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, checkPermission('settings', 'users'), async (req, res) => {
  try {
    // Prevent deleting the admin user
    const user = await db.users.findOne({ _id: req.params.id });
    if (user && user.username === 'admin') {
      return res.status(400).json({ error: 'لا يمكن حذف المدير الرئيسي' });
    }

    await db.users.remove({ _id: req.params.id });

    // Audit log
    await db.auditLog.insert({
      action: 'حذف مستخدم',
      module: 'users',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      details: JSON.stringify({ deletedUser: user?.username }),
      timestamp: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في حذف المستخدم' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { currentPassword, newPassword } = req.body;
    const user = await db.users.findOne({ _id: decoded.id });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.users.update({ _id: decoded.id }, { $set: { password: hashedPassword } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Update user permissions (granular)
router.put('/users/:id/permissions', authenticate, checkPermission('settings', 'users'), async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions) {
      return res.status(400).json({ error: 'يرجى تحديد الصلاحيات' });
    }

    await db.users.update(
      { _id: req.params.id },
      { $set: { permissions, updatedAt: new Date() } }
    );

    // Audit log
    await db.auditLog.insert({
      action: 'تحديث صلاحيات',
      module: 'users',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      details: JSON.stringify({ targetUserId: req.params.id }),
      timestamp: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
