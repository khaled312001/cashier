const Datastore = require('nedb-promises');
const path = require('path');
const bcrypt = require('bcryptjs');

// Get database path
const getDbPath = (filename) => {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'data', filename);
  } catch (e) {
    return path.join(__dirname, '../../data', filename);
  }
};

// Create database instances
const db = {
  users: Datastore.create({ filename: getDbPath('users.db'), autoload: true }),
  products: Datastore.create({ filename: getDbPath('products.db'), autoload: true }),
  categories: Datastore.create({ filename: getDbPath('categories.db'), autoload: true }),
  sales: Datastore.create({ filename: getDbPath('sales.db'), autoload: true }),
  customers: Datastore.create({ filename: getDbPath('customers.db'), autoload: true }),
  suppliers: Datastore.create({ filename: getDbPath('suppliers.db'), autoload: true }),
  settings: Datastore.create({ filename: getDbPath('settings.db'), autoload: true }),
  inventory: Datastore.create({ filename: getDbPath('inventory.db'), autoload: true }),
  // Advanced features
  variants: Datastore.create({ filename: getDbPath('variants.db'), autoload: true }),
  bundles: Datastore.create({ filename: getDbPath('bundles.db'), autoload: true }),
  purchases: Datastore.create({ filename: getDbPath('purchases.db'), autoload: true }),
  purchaseItems: Datastore.create({ filename: getDbPath('purchase_items.db'), autoload: true }),
  expenses: Datastore.create({ filename: getDbPath('expenses.db'), autoload: true }),
  shifts: Datastore.create({ filename: getDbPath('shifts.db'), autoload: true }),
  heldSales: Datastore.create({ filename: getDbPath('held_sales.db'), autoload: true }),
  returns: Datastore.create({ filename: getDbPath('returns.db'), autoload: true }),
  loyaltyPoints: Datastore.create({ filename: getDbPath('loyalty_points.db'), autoload: true }),
  payments: Datastore.create({ filename: getDbPath('payments.db'), autoload: true }),
  credits: Datastore.create({ filename: getDbPath('credits.db'), autoload: true }),
  // Phase 1: Security & Permissions
  auditLog: Datastore.create({ filename: getDbPath('audit_log.db'), autoload: true }),
  // Phase 3: Warehouses
  warehouses: Datastore.create({ filename: getDbPath('warehouses.db'), autoload: true }),
  warehouseTransfers: Datastore.create({ filename: getDbPath('warehouse_transfers.db'), autoload: true }),
  // Phase 5: Contracts
  contracts: Datastore.create({ filename: getDbPath('contracts.db'), autoload: true }),
  contractItems: Datastore.create({ filename: getDbPath('contract_items.db'), autoload: true }),
  // Phase 6: HR
  employees: Datastore.create({ filename: getDbPath('employees.db'), autoload: true }),
  attendance: Datastore.create({ filename: getDbPath('attendance.db'), autoload: true }),
  salaries: Datastore.create({ filename: getDbPath('salaries.db'), autoload: true }),
};

// Default permissions template for each role
const ROLE_PERMISSIONS = {
  admin: {
    dashboard: { view: true },
    pos: { view: true, sell: true, return: true, discount: true, hold: true, void: true },
    products: { view: true, add: true, edit: true, delete: true, import: true, export: true },
    categories: { view: true, add: true, edit: true, delete: true },
    inventory: { view: true, adjust: true, count: true, transfer: true },
    warehouses: { view: true, add: true, edit: true, delete: true, transfer: true },
    purchases: { view: true, add: true, edit: true, delete: true },
    customers: { view: true, add: true, edit: true, delete: true, loyalty: true },
    suppliers: { view: true, add: true, edit: true, delete: true },
    contracts: { view: true, add: true, edit: true, delete: true },
    reports: { view: true, sales: true, products: true, financial: true, employees: true, export: true },
    shifts: { view: true, open: true, close: true },
    expenses: { view: true, add: true, edit: true, delete: true },
    hr: { view: true, attendance: true, salaries: true, manage: true },
    settings: { view: true, edit: true, users: true, backup: true },
    audit: { view: true, export: true },
  },
  manager: {
    dashboard: { view: true },
    pos: { view: true, sell: true, return: true, discount: true, hold: true, void: true },
    products: { view: true, add: true, edit: true, delete: true, import: true, export: true },
    categories: { view: true, add: true, edit: true, delete: true },
    inventory: { view: true, adjust: true, count: true, transfer: true },
    warehouses: { view: true, add: true, edit: true, delete: false, transfer: true },
    purchases: { view: true, add: true, edit: true, delete: false },
    customers: { view: true, add: true, edit: true, delete: false, loyalty: true },
    suppliers: { view: true, add: true, edit: true, delete: false },
    contracts: { view: true, add: false, edit: false, delete: false },
    reports: { view: true, sales: true, products: true, financial: true, employees: true, export: true },
    shifts: { view: true, open: true, close: true },
    expenses: { view: true, add: true, edit: true, delete: false },
    hr: { view: true, attendance: true, salaries: false, manage: false },
    settings: { view: true, edit: false, users: false, backup: false },
    audit: { view: true, export: false },
  },
  cashier: {
    dashboard: { view: true },
    pos: { view: true, sell: true, return: false, discount: false, hold: true, void: false },
    products: { view: true, add: false, edit: false, delete: false, import: false, export: false },
    categories: { view: true, add: false, edit: false, delete: false },
    inventory: { view: false, adjust: false, count: false, transfer: false },
    warehouses: { view: false, add: false, edit: false, delete: false, transfer: false },
    purchases: { view: false, add: false, edit: false, delete: false },
    customers: { view: true, add: true, edit: false, delete: false, loyalty: false },
    suppliers: { view: false, add: false, edit: false, delete: false },
    contracts: { view: false, add: false, edit: false, delete: false },
    reports: { view: false, sales: false, products: false, financial: false, employees: false, export: false },
    shifts: { view: true, open: true, close: true },
    expenses: { view: false, add: false, edit: false, delete: false },
    hr: { view: false, attendance: false, salaries: false, manage: false },
    settings: { view: false, edit: false, users: false, backup: false },
    audit: { view: false, export: false },
  },
  warehouse: {
    dashboard: { view: true },
    pos: { view: false, sell: false, return: false, discount: false, hold: false, void: false },
    products: { view: true, add: true, edit: true, delete: false, import: true, export: true },
    categories: { view: true, add: true, edit: true, delete: false },
    inventory: { view: true, adjust: true, count: true, transfer: true },
    warehouses: { view: true, add: false, edit: false, delete: false, transfer: true },
    purchases: { view: true, add: true, edit: true, delete: false },
    customers: { view: false, add: false, edit: false, delete: false, loyalty: false },
    suppliers: { view: true, add: true, edit: true, delete: false },
    contracts: { view: false, add: false, edit: false, delete: false },
    reports: { view: true, sales: false, products: true, financial: false, employees: false, export: true },
    shifts: { view: false, open: false, close: false },
    expenses: { view: false, add: false, edit: false, delete: false },
    hr: { view: false, attendance: false, salaries: false, manage: false },
    settings: { view: false, edit: false, users: false, backup: false },
    audit: { view: false, export: false },
  },
  accountant: {
    dashboard: { view: true },
    pos: { view: false, sell: false, return: false, discount: false, hold: false, void: false },
    products: { view: true, add: false, edit: false, delete: false, import: false, export: true },
    categories: { view: true, add: false, edit: false, delete: false },
    inventory: { view: true, adjust: false, count: false, transfer: false },
    warehouses: { view: true, add: false, edit: false, delete: false, transfer: false },
    purchases: { view: true, add: false, edit: false, delete: false },
    customers: { view: true, add: false, edit: false, delete: false, loyalty: false },
    suppliers: { view: true, add: false, edit: false, delete: false },
    contracts: { view: true, add: false, edit: false, delete: false },
    reports: { view: true, sales: true, products: true, financial: true, employees: true, export: true },
    shifts: { view: true, open: false, close: false },
    expenses: { view: true, add: true, edit: true, delete: false },
    hr: { view: true, attendance: false, salaries: true, manage: false },
    settings: { view: false, edit: false, users: false, backup: false },
    audit: { view: true, export: true },
  },
};

// Initialize default data
async function initializeDatabase() {
  try {
    // Admin user with full permissions
    const adminExists = await db.users.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.users.insert({
        username: 'admin',
        password: hashedPassword,
        name: 'مدير النظام',
        role: 'admin',
        permissions: ROLE_PERMISSIONS.admin,
        isActive: true,
        createdAt: new Date(),
      });
      console.log('✅ Default admin user created');
    } else if (!adminExists.permissions || Array.isArray(adminExists.permissions)) {
      // Migrate old admin to new permissions format
      await db.users.update(
        { _id: adminExists._id },
        { $set: { permissions: ROLE_PERMISSIONS.admin, isActive: true } }
      );
      console.log('✅ Admin permissions migrated');
    }

    // Migrate all existing users to new permissions format
    const allUsers = await db.users.find({});
    for (const user of allUsers) {
      if (!user.permissions || Array.isArray(user.permissions)) {
        const rolePerms = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.cashier;
        await db.users.update(
          { _id: user._id },
          { $set: { permissions: rolePerms, isActive: user.isActive !== false } }
        );
      }
    }

    // Default settings
    const settingsExist = await db.settings.findOne({ key: 'store' });
    if (!settingsExist) {
      await db.settings.insert({
        key: 'store',
        storeName: 'شركة برمجلي',
        storeAddress: 'مصر',
        storePhone: '+201010254819',
        storeLogo: null,
        taxRate: 15,
        currency: 'ج.م',
        receiptFooter: 'صنع بواسطة شركة برمجلي - +201010254819',
        enableTax: true,
        enableLoyalty: true,
        loyaltyPointsPerUnit: 1,
        loyaltyPointValue: 0.1,
        lowStockAlert: 5,
        expiryAlertDays: 30,
        returnPeriodDays: 14,
        createdAt: new Date(),
      });
      console.log('✅ Default settings created');
    }

    // Default categories
    const categoriesCount = await db.categories.count({});
    if (categoriesCount === 0) {
      const defaultCategories = [
        { name: 'مشروبات', icon: '🥤', color: '#3b82f6', order: 1 },
        { name: 'وجبات', icon: '🍔', color: '#ef4444', order: 2 },
        { name: 'حلويات', icon: '🍰', color: '#f59e0b', order: 3 },
        { name: 'مخبوزات', icon: '🥐', color: '#8b5cf6', order: 4 },
        { name: 'عام', icon: '📦', color: '#6b7280', order: 5 },
      ];
      for (const cat of defaultCategories) {
        await db.categories.insert({ ...cat, createdAt: new Date() });
      }
      console.log('✅ Default categories created');
    }

    // Payment methods settings
    const paymentSettings = await db.settings.findOne({ key: 'payments' });
    if (!paymentSettings) {
      await db.settings.insert({
        key: 'payments',
        methods: [
          { id: 'cash', name: 'نقدي', icon: '💵', enabled: true },
          { id: 'card', name: 'بطاقة', icon: '💳', enabled: true },
          { id: 'transfer', name: 'تحويل بنكي', icon: '🏦', enabled: true },
          { id: 'wallet', name: 'محفظة إلكترونية', icon: '📱', enabled: true },
          { id: 'credit', name: 'آجل', icon: '📝', enabled: true },
        ],
        createdAt: new Date(),
      });
      console.log('✅ Payment methods created');
    }

    // Default warehouse
    const warehouseCount = await db.warehouses.count({});
    if (warehouseCount === 0) {
      await db.warehouses.insert({
        name: 'المخزن الرئيسي',
        location: 'الفرع الرئيسي',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
      });
      console.log('✅ Default warehouse created');
    }

  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initializeDatabase();

module.exports = db;
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
module.exports.getDbPath = getDbPath;
