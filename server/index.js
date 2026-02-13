const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const salesRoutes = require('./routes/sales');
const customersRoutes = require('./routes/customers');
const suppliersRoutes = require('./routes/suppliers');
const purchasesRoutes = require('./routes/purchases');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const shiftsRoutes = require('./routes/shifts');
const expensesRoutes = require('./routes/expenses');
// New routes
const auditRoutes = require('./routes/audit');
const backupRoutes = require('./routes/backup');
const warehousesRoutes = require('./routes/warehouses');
const contractsRoutes = require('./routes/contracts');
const hrRoutes = require('./routes/hr');
const analyticsRoutes = require('./routes/analytics');

const PORT = 3001;
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/expenses', expensesRoutes);
// New routes
app.use('/api/audit', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'حدث خطأ في السيرفر' });
});

// Auto Backup (Daily at 2:00 AM)
const performAutoBackup = async () => {
  try {
    const db = require('./database');
    const fs = require('fs');
    const path = require('path');
    
    // Create backups directory if not exists
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const collections = ['users', 'products', 'categories', 'sales', 'customers', 'suppliers', 'purchases', 'settings', 'shifts', 'expenses', 'auditLog', 'warehouses', 'contracts', 'employees', 'attendance', 'salaries', 'inventory'];
    
    const backupData = {};
    for (const name of collections) {
      if (db[name]) {
        backupData[name] = await db[name].find({});
      }
    }
    
    const filePath = path.join(backupDir, `auto_backup_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Auto backup created: ${filePath}`);
    
    // Log in audit
    if (db.auditLog) {
        await db.auditLog.insert({
            action: 'نسخ احتياطي تلقائي',
            module: 'backup',
            userId: 'system',
            userName: 'النظام',
            userRole: 'system',
            details: `Created auto backup: auto_backup_${timestamp}.json`,
            ip: '127.0.0.1',
            timestamp: new Date()
        });
    }
  } catch (error) {
    console.error('❌ Auto backup failed:', error);
  }
};

// Run check every hour
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() === 0) {
    performAutoBackup();
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📦 API ready at http://localhost:${PORT}/api`);
});
