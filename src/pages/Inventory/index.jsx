import { useState, useEffect } from 'react';
import { FiPackage, FiSearch, FiAlertTriangle, FiCalendar, FiEdit2, FiPlus, FiMinus, FiClipboard, FiTruck, FiHome, FiArrowRight } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Inventory.css';

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [movements, setMovements] = useState([]);
    const [activeTab, setActiveTab] = useState('stock');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    // Modals
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showCountModal, setShowCountModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);

    // Forms & Selection
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [adjustForm, setAdjustForm] = useState({ quantity: 0, operation: 'add', reason: '' });
    const [transferForm, setTransferForm] = useState({ fromWarehouseId: '', toWarehouseId: '', items: [], notes: '' });
    const [warehouseForm, setWarehouseForm] = useState({ name: '', address: '', phone: '', type: 'secondary' });
    const [countItems, setCountItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Transfer Items State
    const [transferItem, setTransferItem] = useState({ productId: '', quantity: 1 });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [prodRes, invRes, whRes, trfRes] = await Promise.all([
                api.get('/products'),
                api.get('/reports/inventory'),
                api.get('/warehouses'),
                api.get('/warehouses/transfers/list'),
            ]);
            setProducts(prodRes.data);
            setMovements(invRes.data.movements || []);
            setWarehouses(whRes.data);
            setTransfers(trfRes.data);
        } catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    // Filter Logic
    const filtered = products.filter(p => {
        if (search && !p.name.includes(search) && !p.barcode?.includes(search)) return false;
        if (filter === 'low') return p.quantity <= (p.minStock || 5);
        if (filter === 'out') return p.quantity === 0;
        if (filter === 'expiring') {
            if (!p.expiryDate) return false;
            const expiry = new Date(p.expiryDate);
            const alert = new Date(); alert.setDate(alert.getDate() + 30);
            return expiry <= alert;
        }
        return true;
    });

    // --- Actions ---

    const openAdjust = (product) => {
        setSelectedProduct(product);
        setAdjustForm({ quantity: 0, operation: 'add', reason: '' });
        setShowAdjustModal(true);
    };

    const handleAdjust = async () => {
        if (adjustForm.quantity <= 0) { toast.error('أدخل كمية صحيحة'); return; }
        try {
            await api.patch(`/products/${selectedProduct._id}/stock`, adjustForm);
            toast.success('تم تحديث المخزون');
            setShowAdjustModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const startCount = () => {
        setCountItems(products.map(p => ({ productId: p._id, name: p.name, systemQty: p.quantity, actualQuantity: p.quantity })));
        setShowCountModal(true);
    };

    const handleCount = async () => {
        const changed = countItems.filter(i => i.actualQuantity !== i.systemQty);
        if (changed.length === 0) { toast.error('لا يوجد تغييرات'); return; }
        try {
            await api.post('/products/inventory/count', { items: changed.map(i => ({ productId: i.productId, actualQuantity: i.actualQuantity, counted: i.actualQuantity })) });
            toast.success('تم حفظ الجرد');
            setShowCountModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    // Warehouse Actions
    const handleSaveWarehouse = async () => {
        try {
            if (selectedWarehouse) {
                await api.put(`/warehouses/${selectedWarehouse._id}`, warehouseForm);
                toast.success('تم التحديث');
            } else {
                await api.post('/warehouses', warehouseForm);
                toast.success('تم الإنشاء');
            }
            setShowWarehouseModal(false);
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    const handleDeleteWarehouse = async (id) => {
        if (!window.confirm('هل أنت متأكد؟')) return;
        try {
            await api.delete(`/warehouses/${id}`);
            toast.success('تم الحذف');
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    // Transfer Actions
    const addToTransfer = () => {
        if (!transferItem.productId || transferItem.quantity <= 0) return;
        const product = products.find(p => p._id === transferItem.productId);
        setTransferForm({
            ...transferForm,
            items: [...transferForm.items, { ...transferItem, productName: product.name }]
        });
        setTransferItem({ productId: '', quantity: 1 });
    };

    const handleTransfer = async () => {
        if (!transferForm.fromWarehouseId || !transferForm.toWarehouseId || transferForm.items.length === 0) {
            toast.error('بيانات التحويل غير مكتملة');
            return;
        }
        try {
            await api.post('/warehouses/transfer', transferForm);
            toast.success('تم التحويل بنجاح');
            setShowTransferModal(false);
            setTransferForm({ fromWarehouseId: '', toWarehouseId: '', items: [], notes: '' });
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="inventory-page">
            <div className="page-header">
                <h1><FiPackage /> إدارة المخزون</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => { setWarehouseForm({ name: '', address: '', phone: '', type: 'secondary' }); setSelectedWarehouse(null); setShowWarehouseModal(true); }}>
                        <FiHome /> إضافة مخزن
                    </button>
                    <button className="btn btn-primary" onClick={startCount}><FiClipboard /> جرد المخزون</button>
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>المخزون الحالي</button>
                <button className={`tab ${activeTab === 'warehouses' ? 'active' : ''}`} onClick={() => setActiveTab('warehouses')}>المخازن</button>
                <button className={`tab ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => setActiveTab('transfers')}>التحويلات</button>
                <button className={`tab ${activeTab === 'movements' ? 'active' : ''}`} onClick={() => setActiveTab('movements')}>حركات المخزون</button>
                <button className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>التنبيهات</button>
            </div>

            {/* === STOCK TAB === */}
            {activeTab === 'stock' && (
                <>
                    <div className="filters">
                        <div className="search-box"><FiSearch /><input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                        <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="all">الكل</option>
                            <option value="low">مخزون منخفض</option>
                            <option value="out">نفد المخزون</option>
                            <option value="expiring">قرب انتهاء الصلاحية</option>
                        </select>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowTransferModal(true)}>
                            <FiTruck /> تحويل مخزني
                        </button>
                    </div>
                    <div className="card">
                        <table className="table">
                            <thead><tr><th>المنتج</th><th>الباركود</th><th>الكمية</th><th>الحد الأدنى</th><th>الصلاحية</th><th>إجراءات</th></tr></thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p._id} className={p.quantity <= (p.minStock || 5) ? 'row-warning' : ''}>
                                        <td><strong>{p.name}</strong></td>
                                        <td>{p.barcode || '-'}</td>
                                        <td className={p.quantity === 0 ? 'text-danger' : p.quantity <= (p.minStock || 5) ? 'text-warning' : ''}>{p.quantity} {p.unit || 'قطعة'}</td>
                                        <td>{p.minStock || 5}</td>
                                        <td>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('ar-EG') : '-'}</td>
                                        <td><button className="btn btn-ghost btn-sm" onClick={() => openAdjust(p)}><FiEdit2 /> تعديل</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* === WAREHOUSES TAB === */}
            {activeTab === 'warehouses' && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>اسم المخزن</th><th>النوع</th><th>العنوان</th><th>رئيسي</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            {warehouses.map(w => (
                                <tr key={w._id}>
                                    <td><strong>{w.name}</strong></td>
                                    <td>{w.type === 'main' ? 'رئيسي' : 'فرعي'}</td>
                                    <td>{w.address || '-'}</td>
                                    <td>{w.isDefault ? '✅' : '-'}</td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedWarehouse(w); setWarehouseForm(w); setShowWarehouseModal(true); }}><FiEdit2 /></button>
                                        {!w.isDefault && <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteWarehouse(w._id)}>×</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === TRANSFERS TAB === */}
            {activeTab === 'transfers' && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>رقم التحويل</th><th>من</th><th>إلى</th><th>عدد العناصر</th><th>بواسطة</th><th>التاريخ</th></tr></thead>
                        <tbody>
                            {transfers.map(t => (
                                <tr key={t._id}>
                                    <td>{t.transferNumber}</td>
                                    <td>{warehouses.find(w => w._id === t.fromWarehouseId)?.name || '-'}</td>
                                    <td>{warehouses.find(w => w._id === t.toWarehouseId)?.name || '-'}</td>
                                    <td>{t.items?.length || 0}</td>
                                    <td>{t.userName}</td>
                                    <td>{new Date(t.createdAt).toLocaleDateString('ar-EG')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === MOVEMENTS TAB === */}
            {activeTab === 'movements' && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>التاريخ</th><th>المنتج</th><th>العملية</th><th>التغيير</th><th>السبب</th></tr></thead>
                        <tbody>
                            {movements.map((m, i) => (
                                <tr key={i}>
                                    <td>{new Date(m.createdAt).toLocaleString('ar-EG')}</td>
                                    <td>{m.productName}</td>
                                    <td>{m.operation === 'add' ? 'إضافة' : m.operation === 'subtract' ? 'خصم' : m.operation}</td>
                                    <td className={m.change > 0 ? 'text-success' : 'text-danger'}>{m.change > 0 ? '+' : ''}{m.change}</td>
                                    <td>{m.reason || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === ALERTS TAB === */}
            {activeTab === 'alerts' && (
                <div className="alerts-grid">
                    <div className="alert-card warning">
                        <FiAlertTriangle className="alert-icon" />
                        <div><h3>مخزون منخفض</h3><span className="alert-count">{products.filter(p => p.quantity <= (p.minStock || 5) && p.quantity > 0).length}</span></div>
                    </div>
                    <div className="alert-card danger">
                        <FiPackage className="alert-icon" />
                        <div><h3>نفد المخزون</h3><span className="alert-count">{products.filter(p => p.quantity === 0).length}</span></div>
                    </div>
                    <div className="alert-card info">
                        <FiCalendar className="alert-icon" />
                        <div><h3>قرب انتهاء الصلاحية</h3><span className="alert-count">{products.filter(p => {
                            if (!p.expiryDate) return false;
                            const expiry = new Date(p.expiryDate);
                            const alert = new Date(); alert.setDate(alert.getDate() + 30);
                            return expiry <= alert && expiry >= new Date();
                        }).length}</span></div>
                    </div>
                </div>
            )}

            {/* === ADJUST MODAL === */}
            {showAdjustModal && (
                <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>تعديل مخزون: {selectedProduct?.name}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowAdjustModal(false)}>×</button></div>
                        <div className="modal-body">
                            <p>الكمية الحالية: <strong>{selectedProduct?.quantity}</strong></p>
                            <div className="input-group"><label className="input-label">العملية</label><select className="select" value={adjustForm.operation} onChange={e => setAdjustForm({ ...adjustForm, operation: e.target.value })}><option value="add">إضافة</option><option value="subtract">خصم</option><option value="set">تعيين</option></select></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">الكمية</label><input type="number" className="input" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 0 })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">السبب</label><input className="input" value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleAdjust}>حفظ</button></div>
                    </div>
                </div>
            )}

            {/* === COUNT MODAL === */}
            {showCountModal && (
                <div className="modal-overlay">
                    <div className="modal modal-lg">
                        <div className="modal-header"><h3>جرد المخزون</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCountModal(false)}>×</button></div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <table className="table">
                                <thead><tr><th>المنتج</th><th>المخزون بالنظام</th><th>الكمية الفعلية</th><th>الفرق</th></tr></thead>
                                <tbody>
                                    {countItems.map((item, i) => (
                                        <tr key={i}>
                                            <td>{item.name}</td>
                                            <td>{item.systemQty}</td>
                                            <td><input type="number" className="input input-sm" value={item.actualQuantity} onChange={e => { const newItems = [...countItems]; newItems[i].actualQuantity = parseInt(e.target.value) || 0; setCountItems(newItems); }} style={{ width: '100px' }} /></td>
                                            <td className={item.actualQuantity - item.systemQty !== 0 ? (item.actualQuantity > item.systemQty ? 'text-success' : 'text-danger') : ''}>{item.actualQuantity - item.systemQty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowCountModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleCount}>حفظ الجرد</button></div>
                    </div>
                </div>
            )}

            {/* === WAREHOUSE MODAL === */}
            {showWarehouseModal && (
                <div className="modal-overlay" onClick={() => setShowWarehouseModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{selectedWarehouse ? 'تعديل مخزن' : 'إضافة مخزن'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowWarehouseModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="input-group"><label className="input-label">اسم المخزن</label><input className="input" value={warehouseForm.name} onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">العنوان</label><input className="input" value={warehouseForm.address} onChange={e => setWarehouseForm({ ...warehouseForm, address: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">الهاتف</label><input className="input" value={warehouseForm.phone} onChange={e => setWarehouseForm({ ...warehouseForm, phone: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">النوع</label><select className="select" value={warehouseForm.type} onChange={e => setWarehouseForm({ ...warehouseForm, type: e.target.value })}><option value="main">رئيسي</option><option value="secondary">فرعي</option></select></div>
                            <div style={{ marginTop: '12px' }}><label><input type="checkbox" checked={warehouseForm.isDefault} onChange={e => setWarehouseForm({ ...warehouseForm, isDefault: e.target.checked })} /> مخزن افتراضي</label></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowWarehouseModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleSaveWarehouse}>حفظ</button></div>
                    </div>
                </div>
            )}

            {/* === TRANSFER MODAL === */}
            {showTransferModal && (
                <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>تحويل مخزني</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowTransferModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', mb: '16px' }}>
                                <div className="input-group"><label className="input-label">من مخزن</label><select className="select" value={transferForm.fromWarehouseId} onChange={e => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}><option value="">اختر...</option>{warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}</select></div>
                                <div className="input-group"><label className="input-label">إلى مخزن</label><select className="select" value={transferForm.toWarehouseId} onChange={e => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}><option value="">اختر...</option>{warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}</select></div>
                            </div>
                            <div style={{ margin: '16px 0', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <h4>إضافة منتجات</h4>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <div className="input-group" style={{ flex: 1 }}><label className="input-label">المنتج</label><select className="select" value={transferItem.productId} onChange={e => setTransferItem({ ...transferItem, productId: e.target.value })}><option value="">اختر منتج...</option>{products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
                                    <div className="input-group" style={{ width: '100px' }}><label className="input-label">الكمية</label><input type="number" className="input" value={transferItem.quantity} onChange={e => setTransferItem({ ...transferItem, quantity: parseInt(e.target.value) || 1 })} /></div>
                                    <button className="btn btn-secondary" onClick={addToTransfer}><FiPlus /></button>
                                </div>
                            </div>
                            <table className="table" style={{ marginTop: '16px' }}>
                                <thead><tr><th>المنتج</th><th>الكمية</th><th>حذف</th></tr></thead>
                                <tbody>
                                    {transferForm.items.map((item, i) => (
                                        <tr key={i}>
                                            <td>{item.productName}</td>
                                            <td>{item.quantity}</td>
                                            <td><button className="btn btn-ghost text-danger btn-sm" onClick={() => setTransferForm({ ...transferForm, items: transferForm.items.filter((_, idx) => idx !== i) })}>×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">ملاحظات</label><input className="input" value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleTransfer}>تأكيد التحويل</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
