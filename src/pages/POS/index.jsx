import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiPlus, FiMinus, FiTrash2, FiPrinter, FiUser, FiPercent, FiX, FiPause, FiPlay, FiRotateCcw, FiCreditCard, FiDollarSign, FiSmartphone, FiFileText, FiPackage, FiGrid, FiBriefcase, FiCreditCard as FiCard, FiCamera, FiWifi, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import BarcodeScanner from './BarcodeScanner';
import './POS.css';

const PAYMENT_METHODS = [
    { id: 'cash', name: 'نقدي', icon: '💵', color: '#22c55e' },
    { id: 'card', name: 'بطاقة', icon: '💳', color: '#6366f1' },
    { id: 'transfer', name: 'تحويل بنكي', icon: '🏦', color: '#0ea5e9' },
    { id: 'wallet', name: 'محفظة إلكترونية', icon: '📱', color: '#8b5cf6' },
    { id: 'credit', name: 'آجل', icon: '📝', color: '#f59e0b' },
    { id: 'nfc', name: 'NFC / Apple Pay', icon: '📲', color: '#14b8a6' },
];

export default function POS() {
    const { user, hasPermission } = useAuth();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [heldSales, setHeldSales] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState('fixed');
    const [showCheckout, setShowCheckout] = useState(false);
    const [showHeld, setShowHeld] = useState(false);
    const [showReturns, setShowReturns] = useState(false);
    const [showCustomers, setShowCustomers] = useState(false);
    const [showDrawerClose, setShowDrawerClose] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [returnInvoice, setReturnInvoice] = useState('');
    const [returnSale, setReturnSale] = useState(null);
    const [returnReason, setReturnReason] = useState('');
    const [payments, setPayments] = useState([{ method: 'cash', amount: 0 }]);
    const [loading, setLoading] = useState(true);
    const [customerSearch, setCustomerSearch] = useState('');
    const [drawerData, setDrawerData] = useState(null);
    const [drawerCounted, setDrawerCounted] = useState(0);
    const searchRef = useRef(null);
    // Removed videoRef, streamRef

    // Settings
    const [storeSettings, setStoreSettings] = useState(null);
    const [lastSale, setLastSale] = useState(null);

    useEffect(() => {
        fetchData();
        searchRef.current?.focus();
        // Removed stopCamera cleanup
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, catRes, custRes, heldRes, setRes] = await Promise.all([
                api.get('/products'),
                api.get('/categories'),
                api.get('/customers'),
                api.get('/sales/held/list'),
                api.get('/settings'),
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setCustomers(custRes.data);
            setHeldSales(heldRes.data);
            setStoreSettings(setRes.data || {});
        } catch (err) {
            toast.error('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // ============= LIVE SEARCH =============
    const filteredProducts = products.filter(p => {
        const s = search.toLowerCase();
        const matchSearch = !search ||
            p.name.toLowerCase().includes(s) ||
            p.barcode?.toLowerCase().includes(s) ||
            p.sku?.toLowerCase().includes(s);
        const matchCategory = !activeCategory || p.categoryId === activeCategory;
        return matchSearch && matchCategory;
    });

    // ============= BARCODE SCANNERS =============
    const handleScanResult = (decodedText) => {
        const product = products.find(p => p.barcode === decodedText);
        if (product) {
            addToCart(product);
            toast.success(`تم قراءة: ${product.name}`);
            setShowCamera(false);
        } else {
            toast.error(`منتج غير موجود: ${decodedText}`);
        }
    };

    // ============= CART OPERATIONS =============
    const addToCart = (product) => {
        if (product.quantity <= 0) {
            toast.error('المنتج غير متوفر');
            return;
        }
        const existing = cart.find(item => item.productId === product._id);
        if (existing) {
            if (existing.quantity >= product.quantity) {
                toast.error('الكمية غير متوفرة');
                return;
            }
            setCart(cart.map(item =>
                item.productId === product._id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                productId: product._id,
                name: product.name,
                price: product.price,
                cost: product.cost || 0,
                quantity: 1,
                maxQuantity: product.quantity,
                barcode: product.barcode,
            }]);
        }
        // Clear search after adding from barcode
        if (search && products.find(p => p.barcode === search)) {
            setSearch('');
        }
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.productId !== productId) return item;
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxQuantity) {
                toast.error('الكمية غير متوفرة');
                return item;
            }
            return { ...item, quantity: newQty };
        }).filter(Boolean));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setCustomer(null);
        setDiscount(0);
        setPayments([{ method: 'cash', amount: 0 }]);
    };

    // ============= CALCULATIONS =============
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = discountType === 'percent' ? subtotal * (discount / 100) : discount;
    const total = Math.max(0, subtotal - discountAmount);
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const change = Math.max(0, totalPaid - total);
    const remaining = Math.max(0, total - totalPaid);

    // ============= HOLD =============
    const handleHold = async () => {
        if (cart.length === 0) return;
        if (!hasPermission('pos', 'hold')) { toast.error('ليس لديك صلاحية تعليق الفواتير'); return; }
        try {
            await api.post('/sales/hold', { items: cart, customerId: customer?._id, customerName: customer?.name, notes: '' });
            toast.success('تم تعليق الفاتورة');
            clearCart();
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    const resumeHeld = async (held) => {
        setCart(held.items);
        if (held.customerId) {
            const cust = customers.find(c => c._id === held.customerId);
            if (cust) setCustomer(cust);
        }
        try { await api.delete(`/sales/held/${held._id}`); } catch (e) { }
        setShowHeld(false);
        fetchData();
    };

    // ============= CHECKOUT =============
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!hasPermission('pos', 'sell')) { toast.error('ليس لديك صلاحية البيع'); return; }
        const hasCredit = payments.some(p => p.method === 'credit');
        if (!hasCredit && totalPaid < total) {
            toast.error('المبلغ المدفوع أقل من الإجمالي');
            return;
        }
        if (hasCredit && !customer) {
            toast.error('اختر عميل للبيع الآجل');
            return;
        }
        try {
            const saleData = {
                items: cart,
                customerId: customer?._id,
                customerName: customer?.name || 'عميل نقدي',
                subtotal,
                discount: discountAmount,
                discountType,
                tax: 0,
                total,
                payments: payments.filter(p => p.amount > 0),
                userId: user?.id,
                userName: user?.name,
            };
            const res = await api.post('/sales', saleData);
            toast.success(`تم البيع - فاتورة ${res.data.invoiceNumber}`);
            setLastSale(res.data);
            clearCart();
            setShowCheckout(false);
            fetchData();
            setTimeout(() => { window.print(); }, 500);
        } catch (err) { toast.error('حدث خطأ في البيع'); }
    };

    // ============= RETURNS WITH TIME LIMIT =============
    const searchReturn = async () => {
        if (!returnInvoice) return;
        try {
            const sales = await api.get('/sales');
            const sale = sales.data.find(s => s.invoiceNumber === returnInvoice);
            if (!sale) {
                toast.error('الفاتورة غير موجودة');
                return;
            }
            // Check return period
            const returnPeriodDays = storeSettings?.returnPeriodDays || 14;
            const saleDate = new Date(sale.createdAt);
            const now = new Date();
            const daysDiff = Math.floor((now - saleDate) / (1000 * 60 * 60 * 24));
            if (daysDiff > returnPeriodDays) {
                toast.error(`انتهت فترة قبول المرتجعات (${returnPeriodDays} يوم)`);
                return;
            }
            if (sale.status === 'returned') {
                toast.error('هذه الفاتورة تم ارجاعها بالكامل');
                return;
            }
            sale.items = sale.items.map(i => ({ ...i, returnQty: 0, exchangeQty: 0 }));
            sale.daysSincePurchase = daysDiff;
            sale.returnDeadline = returnPeriodDays;
            setReturnSale(sale);
        } catch (err) { toast.error('حدث خطأ في البحث'); }
    };

    const processReturn = async () => {
        if (!hasPermission('pos', 'return')) { toast.error('ليس لديك صلاحية المرتجعات'); return; }
        const items = returnSale.items.filter(i => i.returnQty > 0).map(i => ({ productId: i.productId, quantity: i.returnQty }));
        if (items.length === 0) {
            toast.error('اختر منتجات للإرجاع');
            return;
        }
        try {
            const res = await api.post(`/sales/${returnSale._id}/return`, { items, reason: returnReason || 'مرتجع' });
            toast.success(`تم الإرجاع - ${res.data.returnTotal?.toLocaleString()} ج.م`);
            setShowReturns(false);
            setReturnSale(null);
            setReturnInvoice('');
            setReturnReason('');
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    // ============= DRAWER CLOSE =============
    const openDrawerClose = async () => {
        try {
            const res = await api.get('/sales/drawer-summary');
            setDrawerData(res.data);
            setDrawerCounted(0);
            setShowDrawerClose(true);
        } catch (err) { toast.error('حدث خطأ'); }
    };

    // ============= BARCODE HANDLER =============
    const handleBarcode = (e) => {
        if (e.key === 'Enter' && search) {
            const product = products.find(p => p.barcode === search);
            if (product) {
                addToCart(product);
                setSearch('');
            }
        }
    };

    // ============= QUICK PAY BUTTONS =============
    const setFullPayment = (method) => {
        setPayments([{ method, amount: total }]);
    };

    // ============= PAYMENTS =============
    const addPayment = () => setPayments([...payments, { method: 'cash', amount: 0 }]);
    const updatePayment = (i, field, value) => {
        const p = [...payments];
        p[i][field] = value;
        setPayments(p);
    };
    const removePayment = (i) => setPayments(payments.filter((_, idx) => idx !== i));

    // ============= CUSTOMER FILTER =============
    const filteredCustomers = customers.filter(c =>
        !customerSearch || c.name.includes(customerSearch) || c.phone?.includes(customerSearch)
    );

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="pos-container">
            {/* Printable Receipt */}
            <div className="print-only receipt">
                <div className="receipt-header">
                    <h2>{storeSettings?.storeName || 'اسم المتجر'}</h2>
                    <p>{storeSettings?.storeAddress}</p>
                    <p>{storeSettings?.storePhone}</p>
                    <div className="receipt-info">
                        <p>رقم الفاتورة: {lastSale?.invoiceNumber}</p>
                        <p>التاريخ: {lastSale ? new Date(lastSale.createdAt).toLocaleString('ar-EG') : ''}</p>
                        <p>الموظف: {lastSale?.userName}</p>
                        {lastSale?.customerName && <p>العميل: {lastSale.customerName}</p>}
                    </div>
                </div>
                <hr className="dashed-line" />
                <table className="receipt-items">
                    <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                    <tbody>
                        {lastSale?.items.map((item, i) => (
                            <tr key={i}><td>{item.name}</td><td>{item.quantity}</td><td>{item.price}</td><td>{(item.price * item.quantity).toFixed(2)}</td></tr>
                        ))}
                    </tbody>
                </table>
                <hr className="dashed-line" />
                <div className="receipt-totals">
                    <div className="row"><span>المجموع:</span><span>{lastSale?.subtotal?.toFixed(2)}</span></div>
                    {lastSale?.discount > 0 && <div className="row"><span>الخصم:</span><span>{lastSale?.discount?.toFixed(2)}</span></div>}
                    <div className="row total"><span>الإجمالي:</span><span>{lastSale?.total?.toFixed(2)}</span></div>
                    <div className="row"><span>المدفوع:</span><span>{lastSale?.totalPaid?.toFixed(2)}</span></div>
                    <div className="row"><span>الباقي:</span><span>{lastSale?.change > 0 ? lastSale.change.toFixed(2) : '0.00'}</span></div>
                </div>
                <hr className="dashed-line" />
                <div className="receipt-footer">
                    <p>{storeSettings?.receiptFooter || 'شكراً لزيارتكم'}</p>
                    <p className="powered-by">Powered by Barmagly - +201010254819</p>
                </div>
            </div>

            {/* Main POS UI */}
            <div className="pos no-print">
                <div className="pos-products">
                    <div className="pos-header">
                        <div className="search-box">
                            <FiSearch className="search-icon" />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="🔍 ابحث عن منتج أو امسح باركود..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleBarcode}
                                autoFocus
                            />
                            <button className="camera-btn" onClick={() => setShowCamera(true)} title="مسح باركود (كاميرا / صورة)">
                                <FiCamera />
                            </button>
                        </div>
                        <div className="pos-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowHeld(true)}>
                                <FiPlay /> المعلقة ({heldSales.length})
                            </button>
                            {hasPermission('pos', 'return') && (
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowReturns(true)}>
                                    <FiRotateCcw /> مرتجع
                                </button>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={openDrawerClose}>
                                💰 إغلاق الدرج
                            </button>
                        </div>
                    </div>
                    <div className="categories-bar">
                        <button className={`cat-btn ${!activeCategory ? 'active' : ''}`} onClick={() => setActiveCategory(null)}>الكل</button>
                        {categories.map(cat => (
                            <button key={cat._id} className={`cat-btn ${activeCategory === cat._id ? 'active' : ''}`}
                                style={{ '--cat-color': cat.color }} onClick={() => setActiveCategory(cat._id)}>
                                <span>{cat.icon}</span> {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Product count */}
                    {search && (
                        <div className="search-results-info">
                            تم العثور على <strong>{filteredProducts.length}</strong> منتج
                        </div>
                    )}

                    <div className="products-grid">
                        {filteredProducts.map(product => (
                            <div key={product._id} className={`product-card ${product.quantity <= 0 ? 'out-of-stock' : ''}`}
                                onClick={() => addToCart(product)}>
                                <div className="product-emoji">{product.image || '📦'}</div>
                                <div className="product-name">{product.name}</div>
                                <div className="product-price">{product.price.toLocaleString()} ج.م</div>
                                {product.quantity <= 5 && <div className="product-stock">{product.quantity} في المخزون</div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pos-cart">
                    <div className="cart-header">
                        <h2>🛒 سلة المشتريات</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {cart.length > 0 && hasPermission('pos', 'hold') && <button className="btn btn-warning btn-sm" onClick={handleHold}><FiPause /> تعليق</button>}
                            {cart.length > 0 && <button className="btn btn-ghost btn-sm" onClick={clearCart}><FiTrash2 /></button>}
                        </div>
                    </div>

                    <div className="customer-row" onClick={() => setShowCustomers(true)}>
                        <FiUser />
                        <span>{customer ? `${customer.name} ${customer.loyaltyPoints ? `(${customer.loyaltyPoints} نقطة)` : ''}` : 'اختر عميل (اختياري)'}</span>
                        {customer && <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); setCustomer(null); }}><FiX /></button>}
                    </div>

                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <div className="empty-cart"><p>السلة فارغة</p></div>
                        ) : (
                            cart.map(item => (
                                <div key={item.productId} className="cart-item">
                                    <div className="cart-item-info">
                                        <div className="cart-item-name">{item.name}</div>
                                        <div className="cart-item-price">{item.price.toLocaleString()} ج.م</div>
                                    </div>
                                    <div className="cart-item-qty">
                                        <button onClick={() => updateQuantity(item.productId, -1)}><FiMinus /></button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.productId, 1)}><FiPlus /></button>
                                    </div>
                                    <div className="cart-item-total">{(item.price * item.quantity).toLocaleString()}</div>
                                    <button className="cart-item-remove" onClick={() => removeFromCart(item.productId)}><FiX /></button>
                                </div>
                            ))
                        )}
                    </div>

                    {cart.length > 0 && (
                        <>
                            {hasPermission('pos', 'discount') && (
                                <div className="discount-row">
                                    <FiPercent />
                                    <input type="number" placeholder="خصم" value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} style={{ width: '80px' }} />
                                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}><option value="fixed">ج.م</option><option value="percent">%</option></select>
                                </div>
                            )}
                            <div className="cart-summary">
                                <div className="summary-row"><span>المجموع</span><span>{subtotal.toLocaleString()} ج.م</span></div>
                                {discountAmount > 0 && <div className="summary-row text-success"><span>الخصم</span><span>-{discountAmount.toLocaleString()} ج.م</span></div>}
                                <div className="summary-row total"><span>الإجمالي</span><span>{total.toLocaleString()} ج.م</span></div>
                            </div>
                            <div className="cart-actions">
                                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setShowCheckout(true)}>
                                    💳 الدفع {total.toLocaleString()} ج.م
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* ============= CHECKOUT MODAL ============= */}
                {showCheckout && (
                    <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
                        <div className="modal checkout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                            <div className="modal-header">
                                <h3 className="modal-title">💳 إتمام الدفع</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowCheckout(false)}><FiX /></button>
                            </div>
                            <div className="modal-body">
                                <div className="checkout-total">
                                    <span>الإجمالي</span>
                                    <span className="checkout-amount">{total.toLocaleString()} ج.م</span>
                                </div>

                                {/* Quick Payment Buttons */}
                                <div className="quick-pay-grid">
                                    {PAYMENT_METHODS.map(m => (
                                        <button key={m.id} className="quick-pay-btn" style={{ '--pay-color': m.color }}
                                            onClick={() => setFullPayment(m.id)}>
                                            <span className="quick-pay-icon">{m.icon}</span>
                                            <span>{m.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Mixed Payment */}
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <label className="input-label">طرق الدفع (مختلط)</label>
                                        <button className="btn btn-secondary btn-sm" onClick={addPayment}><FiPlus /> إضافة</button>
                                    </div>
                                    {payments.map((p, i) => (
                                        <div key={i} className="payment-row">
                                            <select className="select" value={p.method} onChange={e => updatePayment(i, 'method', e.target.value)}>
                                                {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
                                            </select>
                                            <input type="number" className="input" placeholder="المبلغ" value={p.amount || ''} onChange={e => updatePayment(i, 'amount', e.target.value)} />
                                            {payments.length > 1 && <button className="btn btn-ghost btn-icon" onClick={() => removePayment(i)}><FiX /></button>}
                                        </div>
                                    ))}
                                </div>

                                <div className="payment-summary">
                                    <div className="pay-row"><span>الإجمالي</span><span className="fw-bold">{total.toLocaleString()} ج.م</span></div>
                                    <div className="pay-row"><span>المدفوع</span><span className="fw-bold">{totalPaid.toLocaleString()} ج.م</span></div>
                                    {change > 0 && <div className="pay-row text-success"><span>الباقي للعميل</span><span className="fw-bold">{change.toLocaleString()} ج.م</span></div>}
                                    {remaining > 0 && <div className="pay-row text-danger"><span>المتبقي</span><span className="fw-bold">{remaining.toLocaleString()} ج.م</span></div>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowCheckout(false)}>إلغاء</button>
                                <button className="btn btn-success" onClick={handleCheckout}><FiCheckCircle /> تأكيد و طباعة</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============= HELD SALES ============= */}
                {showHeld && (
                    <div className="modal-overlay" onClick={() => setShowHeld(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title"><FiPlay /> الفواتير المعلقة</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowHeld(false)}><FiX /></button>
                            </div>
                            <div className="modal-body">
                                {heldSales.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد فواتير معلقة</p> : heldSales.map(h => (
                                    <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                                        <div><strong>{h.holdNumber}</strong><div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{h.items?.length} منتج - {h.customerName || 'بدون عميل'}</div></div>
                                        <button className="btn btn-primary btn-sm" onClick={() => resumeHeld(h)}>استرجاع</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============= RETURNS MODAL ============= */}
                {showReturns && (
                    <div className="modal-overlay" onClick={() => setShowReturns(false)}>
                        <div className="modal" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title"><FiRotateCcw /> مرتجعات واستبدال</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowReturns(false)}><FiX /></button>
                            </div>
                            <div className="modal-body">
                                {!returnSale ? (
                                    <div>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                            <input className="input" placeholder="رقم الفاتورة (INV-...)" value={returnInvoice} onChange={e => setReturnInvoice(e.target.value)} style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && searchReturn()} />
                                            <button className="btn btn-primary" onClick={searchReturn}>🔍 بحث</button>
                                        </div>
                                        <div className="return-info-box">
                                            <FiAlertTriangle /> فترة قبول المرتجعات: <strong>{storeSettings?.returnPeriodDays || 14} يوم</strong> من تاريخ الشراء
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="return-invoice-info">
                                            <div><strong>فاتورة: {returnSale.invoiceNumber}</strong> - {returnSale.customerName}</div>
                                            <div className="return-timer">
                                                <span className={`badge ${returnSale.daysSincePurchase <= 7 ? 'badge-success' : 'badge-warning'}`}>
                                                    مضى {returnSale.daysSincePurchase} يوم من {returnSale.returnDeadline}
                                                </span>
                                            </div>
                                        </div>
                                        <table className="table">
                                            <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>إرجاع</th></tr></thead>
                                            <tbody>
                                                {returnSale.items.map((item, i) => (
                                                    <tr key={i}>
                                                        <td>{item.name}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>{item.price.toLocaleString()}</td>
                                                        <td>
                                                            <input type="number" className="input input-sm" style={{ width: '70px' }} min="0" max={item.quantity} value={item.returnQty || ''}
                                                                onChange={e => { const items = [...returnSale.items]; items[i].returnQty = Math.min(parseInt(e.target.value) || 0, item.quantity); setReturnSale({ ...returnSale, items }); }} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="input-group" style={{ marginTop: '12px' }}>
                                            <label className="input-label">سبب الإرجاع</label>
                                            <input className="input" placeholder="اختياري..." value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                                        </div>
                                        <div className="return-total">
                                            إجمالي المرتجع: <strong>{returnSale.items.reduce((sum, i) => sum + (i.returnQty || 0) * i.price, 0).toLocaleString()} ج.م</strong>
                                        </div>
                                    </>
                                )}
                            </div>
                            {returnSale && (
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => { setReturnSale(null); setReturnInvoice(''); }}>إلغاء</button>
                                    <button className="btn btn-warning" onClick={processReturn}><FiRotateCcw /> تأكيد الإرجاع</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============= CUSTOMERS MODAL ============= */}
                {showCustomers && (
                    <div className="modal-overlay" onClick={() => setShowCustomers(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title"><FiUser /> اختر عميل</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowCustomers(false)}><FiX /></button>
                            </div>
                            <div className="modal-body">
                                <input className="input" placeholder="بحث عن عميل..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} style={{ marginBottom: '12px' }} />
                                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    {filteredCustomers.map(c => (
                                        <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '8px', cursor: 'pointer' }} onClick={() => { setCustomer(c); setShowCustomers(false); setCustomerSearch(''); }}>
                                            <div>
                                                <strong>{c.name}</strong>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {c.phone || '-'} {c.loyaltyPoints > 0 ? `• ${c.loyaltyPoints} نقطة` : ''}
                                                </div>
                                            </div>
                                            {c.totalCredit > 0 && <span className="badge badge-warning">{c.totalCredit.toLocaleString()} ج.م آجل</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============= DRAWER CLOSE MODAL ============= */}
                {showDrawerClose && (
                    <div className="modal-overlay" onClick={() => setShowDrawerClose(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h3 className="modal-title">💰 تقفيل الدرج</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowDrawerClose(false)}><FiX /></button>
                            </div>
                            <div className="modal-body">
                                {drawerData && (
                                    <div className="drawer-summary">
                                        <div className="drawer-section">
                                            <h4>ملخص المبيعات</h4>
                                            <div className="drawer-row"><span>عدد الفواتير</span><span className="fw-bold">{drawerData.salesCount || 0}</span></div>
                                            <div className="drawer-row"><span>إجمالي المبيعات</span><span className="fw-bold">{(drawerData.totalSales || 0).toLocaleString()} ج.م</span></div>
                                        </div>
                                        <div className="drawer-section">
                                            <h4>تفاصيل المدفوعات</h4>
                                            <div className="drawer-row"><span>💵 النقدية</span><span className="fw-bold text-success">{(drawerData.cash || 0).toLocaleString()} ج.م</span></div>
                                            <div className="drawer-row"><span>💳 البطاقات</span><span className="fw-bold" style={{ color: '#6366f1' }}>{(drawerData.card || 0).toLocaleString()} ج.م</span></div>
                                            <div className="drawer-row"><span>📱 المحفظة</span><span className="fw-bold" style={{ color: '#8b5cf6' }}>{(drawerData.wallet || 0).toLocaleString()} ج.م</span></div>
                                            <div className="drawer-row"><span>🏦 تحويل</span><span className="fw-bold" style={{ color: '#0ea5e9' }}>{(drawerData.transfer || 0).toLocaleString()} ج.م</span></div>
                                            <div className="drawer-row"><span>📝 آجل</span><span className="fw-bold text-warning">{(drawerData.credit || 0).toLocaleString()} ج.م</span></div>
                                        </div>
                                        <div className="drawer-section">
                                            <h4>حساب النقدية</h4>
                                            <div className="drawer-row">
                                                <span>المبلغ المحسوب فعلياً</span>
                                                <input type="number" className="input" style={{ width: '120px', textAlign: 'center' }} value={drawerCounted || ''} onChange={e => setDrawerCounted(parseFloat(e.target.value) || 0)} placeholder="0" />
                                            </div>
                                            {drawerCounted > 0 && (
                                                <>
                                                    <div className="drawer-row">
                                                        <span>المتوقع</span>
                                                        <span className="fw-bold">{(drawerData.cash || 0).toLocaleString()} ج.م</span>
                                                    </div>
                                                    <div className={`drawer-row ${drawerCounted - (drawerData.cash || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                                                        <span>{drawerCounted - (drawerData.cash || 0) >= 0 ? '↑ زيادة' : '↓ عجز'}</span>
                                                        <span className="fw-bold">{Math.abs(drawerCounted - (drawerData.cash || 0)).toLocaleString()} ج.م</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="drawer-section drawer-total">
                                            <div className="drawer-row"><span>إجمالي المدفوعات الإلكترونية</span><span className="fw-bold">{((drawerData.card || 0) + (drawerData.wallet || 0) + (drawerData.transfer || 0)).toLocaleString()} ج.م</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDrawerClose(false)}>إغلاق</button>
                                <button className="btn btn-primary" onClick={() => { window.print(); }}>🖨️ طباعة التقرير</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============= CAMERA MODAL ============= */}
                {showCamera && (
                    <BarcodeScanner
                        onScan={handleScanResult}
                        onClose={() => setShowCamera(false)}
                    />
                )}
            </div>
        </div>
    );
}
