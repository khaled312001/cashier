const jwt = require('jsonwebtoken');
const db = require('./database');

const JWT_SECRET = 'pos-system-secret-key-2024';

// Authenticate user from JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.users.findOne({ _id: decoded.id });

    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'الحساب معطل - تواصل مع المدير' });
    }

    req.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions || {},
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة - يرجى إعادة تسجيل الدخول' });
    }
    return res.status(401).json({ error: 'غير مصرح' });
  }
};

// Check permission for a specific action
// Usage: checkPermission('products', 'add') or checkPermission('pos', 'sell')
const checkPermission = (module, action) => {
  return (req, res, next) => {
    // Admin always has access
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لهذا الإجراء' });
    }

    const modulePerms = req.user.permissions[module];
    if (!modulePerms || !modulePerms[action]) {
      return res.status(403).json({ error: `ليس لديك صلاحية: ${module}.${action}` });
    }

    next();
  };
};

// Audit logger middleware - logs operations to the audit log
const auditLog = (action, module, getDetails) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Only log successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const details = getDetails ? getDetails(req, data) : {};
          await db.auditLog.insert({
            action,
            module,
            userId: req.user?.id || 'system',
            userName: req.user?.name || 'النظام',
            userRole: req.user?.role || 'system',
            details: typeof details === 'string' ? details : JSON.stringify(details),
            ip: req.ip || req.connection?.remoteAddress || 'unknown',
            timestamp: new Date(),
          });
        } catch (err) {
          console.error('Audit log error:', err);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = { authenticate, checkPermission, auditLog, JWT_SECRET };
