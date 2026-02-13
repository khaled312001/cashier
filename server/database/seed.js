const Datastore = require('nedb-promises');
const path = require('path');
const bcrypt = require('bcryptjs');

// Get database path
const getDbPath = (filename) => {
  return path.join(__dirname, '../../data', filename);
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
  variants: Datastore.create({ filename: getDbPath('variants.db'), autoload: true }),
  bundles: Datastore.create({ filename: getDbPath('bundles.db'), autoload: true }),
  purchases: Datastore.create({ filename: getDbPath('purchases.db'), autoload: true }),
  purchaseItems: Datastore.create({ filename: getDbPath('purchase_items.db'), autoload: true }),
  expenses: Datastore.create({ filename: getDbPath('expenses.db'), autoload: true }),
  shifts: Datastore.create({ filename: getDbPath('shifts.db'), autoload: true }),
  heldSales: Datastore.create({ filename: getDbPath('held_sales.db'), autoload: true }),
  returns: Datastore.create({ filename: getDbPath('returns.db'), autoload: true }),
  payments: Datastore.create({ filename: getDbPath('payments.db'), autoload: true }),
  credits: Datastore.create({ filename: getDbPath('credits.db'), autoload: true }),
};

async function seedDatabase() {
  console.log('🌱 بدء إنشاء البيانات الوهمية...\n');

  // Clear existing data
  console.log('🗑️ حذف البيانات القديمة...');
  await Promise.all([
    db.users.remove({}, { multi: true }),
    db.products.remove({}, { multi: true }),
    db.categories.remove({}, { multi: true }),
    db.customers.remove({}, { multi: true }),
    db.suppliers.remove({}, { multi: true }),
    db.sales.remove({}, { multi: true }),
    db.expenses.remove({}, { multi: true }),
    db.shifts.remove({}, { multi: true }),
    db.purchases.remove({}, { multi: true }),
    db.purchaseItems.remove({}, { multi: true }),
    db.inventory.remove({}, { multi: true }),
  ]);

  // =============== USERS ===============
  console.log('👤 إنشاء المستخدمين...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('1234', 10);

  const users = await Promise.all([
    db.users.insert({ username: 'admin', password: hashedPassword, name: 'أحمد المدير', role: 'admin', permissions: ['all'], createdAt: new Date() }),
    db.users.insert({ username: 'cashier1', password: cashierPassword, name: 'محمد الكاشير', role: 'cashier', permissions: ['pos', 'products_view'], createdAt: new Date() }),
    db.users.insert({ username: 'cashier2', password: cashierPassword, name: 'سارة الكاشير', role: 'cashier', permissions: ['pos', 'products_view'], createdAt: new Date() }),
  ]);
  console.log(`   ✅ تم إنشاء ${users.length} مستخدمين`);

  // =============== CATEGORIES ===============
  console.log('🏷️ إنشاء الفئات...');
  const categoriesData = [
    { name: 'مشروبات ساخنة', icon: '☕', color: '#8b5cf6', order: 1 },
    { name: 'مشروبات باردة', icon: '🥤', color: '#3b82f6', order: 2 },
    { name: 'وجبات رئيسية', icon: '🍔', color: '#ef4444', order: 3 },
    { name: 'مقبلات', icon: '🍟', color: '#f59e0b', order: 4 },
    { name: 'حلويات', icon: '🍰', color: '#ec4899', order: 5 },
    { name: 'سندويتشات', icon: '🥪', color: '#22c55e', order: 6 },
    { name: 'بيتزا', icon: '🍕', color: '#dc2626', order: 7 },
    { name: 'عصائر', icon: '🧃', color: '#f97316', order: 8 },
  ];
  const categories = [];
  for (const cat of categoriesData) {
    const c = await db.categories.insert({ ...cat, createdAt: new Date() });
    categories.push(c);
  }
  console.log(`   ✅ تم إنشاء ${categories.length} فئات`);

  // =============== PRODUCTS ===============
  console.log('📦 إنشاء المنتجات...');
  const productsData = [
    // مشروبات ساخنة
    { name: 'قهوة عربي', price: 15, cost: 5, quantity: 100, categoryId: categories[0]._id, barcode: '1001', image: '☕' },
    { name: 'قهوة تركي', price: 20, cost: 7, quantity: 80, categoryId: categories[0]._id, barcode: '1002', image: '☕' },
    { name: 'كابتشينو', price: 25, cost: 10, quantity: 60, categoryId: categories[0]._id, barcode: '1003', image: '☕' },
    { name: 'لاتيه', price: 28, cost: 12, quantity: 50, categoryId: categories[0]._id, barcode: '1004', image: '☕' },
    { name: 'شاي أحمر', price: 10, cost: 3, quantity: 150, categoryId: categories[0]._id, barcode: '1005', image: '🍵' },
    { name: 'شاي أخضر', price: 12, cost: 4, quantity: 100, categoryId: categories[0]._id, barcode: '1006', image: '🍵' },
    { name: 'نسكافيه', price: 18, cost: 6, quantity: 90, categoryId: categories[0]._id, barcode: '1007', image: '☕' },
    
    // مشروبات باردة
    { name: 'بيبسي', price: 8, cost: 3, quantity: 200, categoryId: categories[1]._id, barcode: '2001', image: '🥤' },
    { name: 'كوكا كولا', price: 8, cost: 3, quantity: 180, categoryId: categories[1]._id, barcode: '2002', image: '🥤' },
    { name: 'سفن أب', price: 8, cost: 3, quantity: 150, categoryId: categories[1]._id, barcode: '2003', image: '🥤' },
    { name: 'مياه معدنية', price: 5, cost: 2, quantity: 300, categoryId: categories[1]._id, barcode: '2004', image: '💧' },
    { name: 'ريد بول', price: 25, cost: 15, quantity: 50, categoryId: categories[1]._id, barcode: '2005', image: '🥤' },
    { name: 'آيس كوفي', price: 22, cost: 8, quantity: 40, categoryId: categories[1]._id, barcode: '2006', image: '🧋' },
    
    // وجبات رئيسية
    { name: 'برجر لحم', price: 45, cost: 20, quantity: 30, categoryId: categories[2]._id, barcode: '3001', image: '🍔' },
    { name: 'برجر دجاج', price: 40, cost: 18, quantity: 35, categoryId: categories[2]._id, barcode: '3002', image: '🍔' },
    { name: 'برجر دبل', price: 65, cost: 30, quantity: 25, categoryId: categories[2]._id, barcode: '3003', image: '🍔' },
    { name: 'شاورما لحم', price: 35, cost: 15, quantity: 40, categoryId: categories[2]._id, barcode: '3004', image: '🌯' },
    { name: 'شاورما دجاج', price: 30, cost: 12, quantity: 50, categoryId: categories[2]._id, barcode: '3005', image: '🌯' },
    { name: 'كباب مشوي', price: 55, cost: 25, quantity: 20, categoryId: categories[2]._id, barcode: '3006', image: '🍢' },
    { name: 'ستيك لحم', price: 85, cost: 40, quantity: 15, categoryId: categories[2]._id, barcode: '3007', image: '🥩' },
    
    // مقبلات
    { name: 'بطاطس محمرة', price: 15, cost: 5, quantity: 100, categoryId: categories[3]._id, barcode: '4001', image: '🍟' },
    { name: 'بطاطس بالجبن', price: 22, cost: 8, quantity: 60, categoryId: categories[3]._id, barcode: '4002', image: '🍟' },
    { name: 'ناجتس دجاج', price: 25, cost: 10, quantity: 50, categoryId: categories[3]._id, barcode: '4003', image: '🍗' },
    { name: 'سلطة خضراء', price: 18, cost: 6, quantity: 40, categoryId: categories[3]._id, barcode: '4004', image: '🥗' },
    { name: 'حمص', price: 12, cost: 4, quantity: 70, categoryId: categories[3]._id, barcode: '4005', image: '🥣' },
    
    // حلويات
    { name: 'كيك شوكولاتة', price: 25, cost: 10, quantity: 30, categoryId: categories[4]._id, barcode: '5001', image: '🍰' },
    { name: 'تشيز كيك', price: 30, cost: 12, quantity: 25, categoryId: categories[4]._id, barcode: '5002', image: '🍰' },
    { name: 'آيس كريم', price: 15, cost: 5, quantity: 50, categoryId: categories[4]._id, barcode: '5003', image: '🍨' },
    { name: 'كنافة', price: 35, cost: 15, quantity: 20, categoryId: categories[4]._id, barcode: '5004', image: '🍮' },
    { name: 'بسبوسة', price: 20, cost: 8, quantity: 35, categoryId: categories[4]._id, barcode: '5005', image: '🍮' },
    
    // سندويتشات
    { name: 'كلوب ساندويتش', price: 38, cost: 15, quantity: 35, categoryId: categories[5]._id, barcode: '6001', image: '🥪' },
    { name: 'ساندويتش تونة', price: 28, cost: 12, quantity: 40, categoryId: categories[5]._id, barcode: '6002', image: '🥪' },
    { name: 'ساندويتش جبنة', price: 20, cost: 8, quantity: 50, categoryId: categories[5]._id, barcode: '6003', image: '🧀' },
    { name: 'هوت دوج', price: 22, cost: 9, quantity: 45, categoryId: categories[5]._id, barcode: '6004', image: '🌭' },
    
    // بيتزا
    { name: 'بيتزا مارجريتا', price: 50, cost: 20, quantity: 20, categoryId: categories[6]._id, barcode: '7001', image: '🍕' },
    { name: 'بيتزا بيبروني', price: 60, cost: 25, quantity: 18, categoryId: categories[6]._id, barcode: '7002', image: '🍕' },
    { name: 'بيتزا خضار', price: 55, cost: 22, quantity: 15, categoryId: categories[6]._id, barcode: '7003', image: '🍕' },
    { name: 'بيتزا سوبريم', price: 75, cost: 30, quantity: 12, categoryId: categories[6]._id, barcode: '7004', image: '🍕' },
    
    // عصائر
    { name: 'عصير برتقال', price: 18, cost: 6, quantity: 60, categoryId: categories[7]._id, barcode: '8001', image: '🍊' },
    { name: 'عصير مانجو', price: 20, cost: 7, quantity: 50, categoryId: categories[7]._id, barcode: '8002', image: '🥭' },
    { name: 'عصير فراولة', price: 18, cost: 6, quantity: 55, categoryId: categories[7]._id, barcode: '8003', image: '🍓' },
    { name: 'كوكتيل فواكه', price: 25, cost: 10, quantity: 40, categoryId: categories[7]._id, barcode: '8004', image: '🍹' },
    { name: 'سموثي', price: 28, cost: 12, quantity: 35, categoryId: categories[7]._id, barcode: '8005', image: '🥤' },
  ];
  
  const products = [];
  for (const prod of productsData) {
    const p = await db.products.insert({ ...prod, minStock: 10, createdAt: new Date() });
    products.push(p);
  }
  console.log(`   ✅ تم إنشاء ${products.length} منتج`);

  // =============== CUSTOMERS ===============
  console.log('👥 إنشاء العملاء...');
  const customersData = [
    { name: 'أحمد محمد علي', phone: '01012345678', email: 'ahmed@email.com', address: 'المعادي، القاهرة', category: 'vip' },
    { name: 'محمد إبراهيم', phone: '01123456789', email: 'mohamed@email.com', address: 'مدينة نصر', category: 'regular' },
    { name: 'فاطمة أحمد', phone: '01234567890', email: 'fatma@email.com', address: 'الدقي، الجيزة', category: 'regular' },
    { name: 'سارة خالد', phone: '01098765432', email: 'sara@email.com', address: 'الزمالك', category: 'vip' },
    { name: 'عمر حسن', phone: '01111222333', email: 'omar@email.com', address: 'المهندسين', category: 'regular' },
    { name: 'نورا محمود', phone: '01555666777', email: 'noura@email.com', address: 'شبرا', category: 'regular' },
    { name: 'خالد سمير', phone: '01222333444', email: 'khaled@email.com', address: 'حلوان', category: 'wholesale' },
    { name: 'مريم علي', phone: '01000111222', email: 'mariam@email.com', address: 'العباسية', category: 'regular' },
    { name: 'يوسف أشرف', phone: '01288899900', email: 'yousef@email.com', address: 'الشيخ زايد', category: 'vip' },
    { name: 'هدى سعيد', phone: '01066677788', email: 'hoda@email.com', address: 'التجمع الخامس', category: 'regular' },
  ];
  
  const customers = [];
  for (const cust of customersData) {
    const c = await db.customers.insert({ ...cust, totalPurchases: Math.floor(Math.random() * 5000), loyaltyPoints: Math.floor(Math.random() * 500), creditLimit: 5000, createdAt: new Date() });
    customers.push(c);
  }
  console.log(`   ✅ تم إنشاء ${customers.length} عميل`);

  // =============== SUPPLIERS ===============
  console.log('🚚 إنشاء الموردين...');
  const suppliersData = [
    { name: 'شركة الطازج للتوريدات', phone: '0227654321', email: 'fresh@supplier.com', address: 'المنطقة الصناعية، 6 أكتوبر' },
    { name: 'مصنع المشروبات الوطني', phone: '0233445566', email: 'drinks@supplier.com', address: 'العاشر من رمضان' },
    { name: 'شركة اللحوم المصرية', phone: '0244556677', email: 'meat@supplier.com', address: 'مدينة بدر' },
    { name: 'مخبوزات الفيروز', phone: '0255667788', email: 'bakery@supplier.com', address: 'شبرا الخيمة' },
    { name: 'شركة الألبان المتحدة', phone: '0266778899', email: 'dairy@supplier.com', address: 'الإسكندرية' },
  ];
  
  const suppliers = [];
  for (const sup of suppliersData) {
    const s = await db.suppliers.insert({ ...sup, createdAt: new Date() });
    suppliers.push(s);
  }
  console.log(`   ✅ تم إنشاء ${suppliers.length} مورد`);

  // =============== SALES ===============
  console.log('💰 إنشاء سجل المبيعات...');
  const paymentMethods = ['cash', 'card', 'transfer', 'wallet'];
  const salesRecords = [];
  
  // إنشاء 100 فاتورة مبيعات
  for (let i = 0; i < 100; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - daysAgo);
    saleDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
    
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items = [];
    let subtotal = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        quantity: qty,
      });
      subtotal += product.price * qty;
    }
    
    const discount = Math.random() > 0.8 ? Math.floor(Math.random() * 20) : 0;
    const total = Math.max(0, subtotal - discount);
    const customer = Math.random() > 0.6 ? customers[Math.floor(Math.random() * customers.length)] : null;
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    const sale = await db.sales.insert({
      invoiceNumber: `INV-${saleDate.toISOString().split('T')[0].replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
      items,
      customerId: customer?._id || null,
      customerName: customer?.name || 'عميل نقدي',
      subtotal,
      discount,
      discountType: 'fixed',
      tax: 0,
      total,
      payments: [{ method: paymentMethod, amount: total }],
      totalPaid: total,
      change: 0,
      remaining: 0,
      status: 'paid',
      userId: users[Math.floor(Math.random() * 3)]._id,
      userName: users[Math.floor(Math.random() * 3)].name,
      createdAt: saleDate,
    });
    salesRecords.push(sale);
  }
  console.log(`   ✅ تم إنشاء ${salesRecords.length} فاتورة مبيعات`);

  // =============== EXPENSES ===============
  console.log('💸 إنشاء المصروفات...');
  const expenseCategories = ['rent', 'utilities', 'salaries', 'inventory', 'maintenance', 'marketing', 'transport', 'other'];
  const expenseData = [
    { title: 'إيجار المحل - يناير', amount: 8000, category: 'rent' },
    { title: 'فاتورة الكهرباء', amount: 1200, category: 'utilities' },
    { title: 'فاتورة المياه', amount: 350, category: 'utilities' },
    { title: 'راتب موظف 1', amount: 4500, category: 'salaries' },
    { title: 'راتب موظف 2', amount: 4000, category: 'salaries' },
    { title: 'صيانة المعدات', amount: 800, category: 'maintenance' },
    { title: 'إعلانات فيسبوك', amount: 500, category: 'marketing' },
    { title: 'مواصلات توصيل', amount: 600, category: 'transport' },
    { title: 'مستلزمات تنظيف', amount: 250, category: 'other' },
    { title: 'فاتورة الإنترنت', amount: 400, category: 'utilities' },
  ];
  
  for (const exp of expenseData) {
    const daysAgo = Math.floor(Math.random() * 30);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() - daysAgo);
    await db.expenses.insert({ ...exp, date: expDate.toISOString().split('T')[0], userId: users[0]._id, userName: users[0].name, createdAt: expDate });
  }
  console.log(`   ✅ تم إنشاء ${expenseData.length} مصروف`);

  // =============== SHIFTS ===============
  console.log('⏱️ إنشاء سجل الورديات...');
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(i / 2);
    const shiftDate = new Date();
    shiftDate.setDate(shiftDate.getDate() - daysAgo);
    shiftDate.setHours(i % 2 === 0 ? 8 : 16, 0);
    
    const endDate = new Date(shiftDate);
    endDate.setHours(endDate.getHours() + 8);
    
    const user = users[Math.floor(Math.random() * 3)];
    const openingCash = 500;
    const totalSales = Math.floor(Math.random() * 3000) + 1000;
    const closingCash = openingCash + totalSales * 0.7;
    
    await db.shifts.insert({
      shiftNumber: `SH-${Date.now().toString().slice(-8)}${i}`,
      userId: user._id,
      userName: user.name,
      openingCash,
      closingCash,
      expectedCash: openingCash + totalSales * 0.7,
      difference: Math.floor(Math.random() * 100) - 50,
      totalSales,
      salesCount: Math.floor(Math.random() * 20) + 5,
      status: 'closed',
      startedAt: shiftDate,
      endedAt: endDate,
    });
  }
  console.log(`   ✅ تم إنشاء 15 وردية`);

  // =============== PURCHASES ===============
  console.log('🚚 إنشاء أوامر الشراء...');
  for (let i = 0; i < 8; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const daysAgo = Math.floor(Math.random() * 20);
    const poDate = new Date();
    poDate.setDate(poDate.getDate() - daysAgo);
    
    const items = [];
    const itemCount = Math.floor(Math.random() * 5) + 2;
    let total = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 50) + 10;
      items.push({
        productId: product._id,
        productName: product.name,
        quantity: qty,
        receivedQty: i < 5 ? qty : 0,
        cost: product.cost,
        total: product.cost * qty,
      });
      total += product.cost * qty;
    }
    
    const purchase = await db.purchases.insert({
      poNumber: `PO-${Date.now().toString().slice(-8)}${i}`,
      supplierId: supplier._id,
      supplierName: supplier.name,
      total,
      status: i < 5 ? 'received' : 'pending',
      createdAt: poDate,
    });
    
    for (const item of items) {
      await db.purchaseItems.insert({ purchaseId: purchase._id, ...item, createdAt: poDate });
    }
  }
  console.log(`   ✅ تم إنشاء 8 أوامر شراء`);

  // =============== SETTINGS ===============
  console.log('⚙️ إنشاء الإعدادات...');
  await db.settings.remove({}, { multi: true });
  await db.settings.insert({
    key: 'store',
    storeName: 'كافيه الراحة',
    storeAddress: '15 شارع التحرير، الدقي، الجيزة',
    storePhone: '0233445566',
    taxRate: 14,
    currency: 'ج.م',
    receiptFooter: 'شكراً لزيارتكم - نتمنى لكم يوماً سعيداً!',
    enableTax: true,
    enableLoyalty: true,
    loyaltyPointsPerUnit: 1,
    loyaltyPointValue: 0.1,
    lowStockAlert: 10,
    expiryAlertDays: 30,
    createdAt: new Date(),
  });
  
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
  console.log(`   ✅ تم إنشاء الإعدادات`);

  console.log('\n✅✅✅ تم إنشاء جميع البيانات الوهمية بنجاح! ✅✅✅\n');
  console.log('📊 ملخص البيانات:');
  console.log(`   • ${users.length} مستخدمين`);
  console.log(`   • ${categories.length} فئات`);
  console.log(`   • ${products.length} منتج`);
  console.log(`   • ${customers.length} عملاء`);
  console.log(`   • ${suppliers.length} موردين`);
  console.log(`   • ${salesRecords.length} فاتورة مبيعات`);
  console.log(`   • ${expenseData.length} مصروفات`);
  console.log(`   • 15 وردية`);
  console.log(`   • 8 أوامر شراء`);
  console.log('\n🔑 بيانات الدخول:');
  console.log('   • المدير: admin / admin123');
  console.log('   • الكاشير: cashier1 / 1234');
  console.log('   • الكاشير: cashier2 / 1234\n');
  
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('❌ خطأ:', err);
  process.exit(1);
});
