const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database');
const { authenticate, checkPermission } = require('../middleware');
const { getDbPath } = require('../database');

const router = express.Router();

// Get backup directory
const getBackupDir = () => {
  const backupDir = path.join(path.dirname(getDbPath('users.db')), '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// Create manual backup
router.post('/create', authenticate, checkPermission('settings', 'backup'), async (req, res) => {
  try {
    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(backupDir, `backup-${timestamp}`);

    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true });
    }

    // Get all db files
    const dataDir = path.dirname(getDbPath('users.db'));
    const dbFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.db'));

    for (const file of dbFiles) {
      fs.copyFileSync(
        path.join(dataDir, file),
        path.join(backupFolder, file)
      );
    }

    // Log
    await db.auditLog.insert({
      action: 'إنشاء نسخة احتياطية',
      module: 'backup',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      details: JSON.stringify({ folder: backupFolder, filesCount: dbFiles.length }),
      timestamp: new Date(),
    });

    res.json({
      success: true,
      backupName: `backup-${timestamp}`,
      filesCount: dbFiles.length,
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء النسخة الاحتياطية' });
  }
});

// List backups
router.get('/list', authenticate, checkPermission('settings', 'backup'), async (req, res) => {
  try {
    const backupDir = getBackupDir();
    const folders = fs.readdirSync(backupDir)
      .filter(f => fs.statSync(path.join(backupDir, f)).isDirectory())
      .map(f => {
        const folderPath = path.join(backupDir, f);
        const files = fs.readdirSync(folderPath);
        const stats = fs.statSync(folderPath);
        return {
          name: f,
          date: stats.mtime,
          filesCount: files.length,
          size: files.reduce((sum, file) => {
            return sum + fs.statSync(path.join(folderPath, file)).size;
          }, 0),
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Restore backup
router.post('/restore/:name', authenticate, checkPermission('settings', 'backup'), async (req, res) => {
  try {
    const backupDir = getBackupDir();
    const backupFolder = path.join(backupDir, req.params.name);

    if (!fs.existsSync(backupFolder)) {
      return res.status(404).json({ error: 'النسخة الاحتياطية غير موجودة' });
    }

    // Create a safety backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyFolder = path.join(backupDir, `pre-restore-${timestamp}`);
    fs.mkdirSync(safetyFolder, { recursive: true });

    const dataDir = path.dirname(getDbPath('users.db'));
    const currentFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.db'));

    for (const file of currentFiles) {
      fs.copyFileSync(
        path.join(dataDir, file),
        path.join(safetyFolder, file)
      );
    }

    // Restore files
    const backupFiles = fs.readdirSync(backupFolder).filter(f => f.endsWith('.db'));
    for (const file of backupFiles) {
      fs.copyFileSync(
        path.join(backupFolder, file),
        path.join(dataDir, file)
      );
    }

    res.json({
      success: true,
      message: 'تم استعادة النسخة الاحتياطية. يرجى إعادة تشغيل البرنامج.',
      safetyBackup: `pre-restore-${timestamp}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في استعادة النسخة الاحتياطية' });
  }
});

// Delete backup
router.delete('/:name', authenticate, checkPermission('settings', 'backup'), async (req, res) => {
  try {
    const backupDir = getBackupDir();
    const backupFolder = path.join(backupDir, req.params.name);

    if (!fs.existsSync(backupFolder)) {
      return res.status(404).json({ error: 'النسخة الاحتياطية غير موجودة' });
    }

    // Delete folder and contents
    const files = fs.readdirSync(backupFolder);
    for (const file of files) {
      fs.unlinkSync(path.join(backupFolder, file));
    }
    fs.rmdirSync(backupFolder);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Export all data as JSON
router.get('/export', authenticate, checkPermission('settings', 'backup'), async (req, res) => {
  try {
    const data = {};
    const collections = [
      'users', 'products', 'categories', 'sales', 'customers',
      'suppliers', 'settings', 'inventory', 'variants', 'bundles',
      'purchases', 'purchaseItems', 'expenses', 'shifts', 'heldSales',
      'returns', 'loyaltyPoints', 'payments', 'credits',
      'warehouses', 'warehouseTransfers', 'contracts', 'contractItems',
      'employees', 'attendance', 'salaries',
    ];

    for (const col of collections) {
      if (db[col]) {
        data[col] = await db[col].find({});
      }
    }

    res.json({
      exportDate: new Date().toISOString(),
      version: '2.0',
      data,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في تصدير البيانات' });
  }
});

// Import data from JSON
router.post('/import', authenticate, checkPermission('settings', 'backup'), async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'لا توجد بيانات للاستيراد' });
    }

    let imported = 0;
    for (const [collection, records] of Object.entries(data)) {
      if (db[collection] && Array.isArray(records)) {
        await db[collection].remove({}, { multi: true });
        for (const record of records) {
          await db[collection].insert(record);
        }
        imported += records.length;
      }
    }

    res.json({
      success: true,
      message: `تم استيراد ${imported} سجل بنجاح`,
      importedCount: imported,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في استيراد البيانات' });
  }
});

module.exports = router;
