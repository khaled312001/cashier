import { useState, useEffect } from 'react';
import { FiTruck, FiPlus, FiCheck, FiX, FiPackage, FiEye } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Purchases() {
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState('list');
    const [showModal, setShowModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [form, setForm] = useState({ supplierId: '', items: [], notes: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
                api.get('/purchases'),
                api.get('/suppliers'),
                api.get('/products'),
            ]);
            setPurchases(purchasesRes.data);
            setSuppliers(suppliersRes.data);
            setProducts(productsRes.data);
        } catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const openNew = () => {
        setForm({ supplierId: '', items: [], notes: '' });
        setShowModal(true);
    };

    const addItem = () => {
        setForm({ ...form, items: [...form.items, { productId: '', productName: '', quantity: 1, cost: 0 }] });
    };

    const updateItem = (index, field, value) => {
        const items = [...form.items];
        items[index][field] = value;
        if (field === 'productId') {
            const product = products.find(p => p._id === value);
            if (product) { items[index].productName = product.name; items[index].cost = product.cost || 0; }
        }
        setForm({ ...form, items });
    };

    const removeItem = (index) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.supplierId) { toast.error('اختر المورد'); return; }
        if (form.items.length === 0) { toast.error('أضف منتجات'); return; }
        try {
            const supplier = suppliers.find(s => s._id === form.supplierId);
            await api.post('/purchases', { ...form, supplierName: supplier?.name });
            toast.success('تم إنشاء أمر الشراء');
            setShowModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const openReceive = async (purchase) => {
        try {
            const res = await api.get(`/purchases/${purchase._id}`);
            setSelectedPurchase(res.data);
            setShowReceiveModal(true);
        } catch (err) { toast.error('فشل التحميل'); }
    };

    const handleReceive = async () => {
        const items = selectedPurchase.items.filter(i => (i.toReceive || 0) > 0).map(i => ({
            productId: i.productId,
            receivedQty: i.toReceive,
        }));
        if (items.length === 0) { toast.error('أدخل الكميات'); return; }
        try {
            await api.post(`/purchases/${selectedPurchase._id}/receive`, { items });
            toast.success('تم استلام المنتجات');
            setShowReceiveModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const getStatusBadge = (status) => {
        const styles = { pending: 'badge-warning', received: 'badge-success', partial: 'badge-info', cancelled: 'badge-danger' };
        const labels = { pending: 'قيد الانتظار', received: 'تم الاستلام', partial: 'استلام جزئي', cancelled: 'ملغي' };
        return <span className={`badge ${styles[status] || ''}`}>{labels[status] || status}</span>;
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="page-header"><h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 800 }}><FiTruck /> المشتريات</h1><button className="btn btn-primary" onClick={openNew}><FiPlus /> أمر شراء جديد</button></div>

            <div className="card">
                <table className="table">
                    <thead><tr><th>رقم الأمر</th><th>المورد</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
                    <tbody>
                        {purchases.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>لا توجد أوامر شراء</td></tr> : purchases.map(p => (
                            <tr key={p._id}>
                                <td><strong>{p.poNumber}</strong></td>
                                <td>{p.supplierName}</td>
                                <td>{p.total?.toLocaleString()} ج.م</td>
                                <td>{getStatusBadge(p.status)}</td>
                                <td>{new Date(p.createdAt).toLocaleDateString('ar-EG')}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {p.status === 'pending' || p.status === 'partial' ? <button className="btn btn-success btn-sm" onClick={() => openReceive(p)}><FiCheck /> استلام</button> : null}
                                        <button className="btn btn-ghost btn-sm"><FiEye /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">أمر شراء جديد</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="input-group"><label className="input-label">المورد *</label><select className="select" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}><option value="">اختر المورد</option>{suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
                                <div style={{ marginTop: '20px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><label className="input-label">المنتجات</label><button type="button" className="btn btn-secondary btn-sm" onClick={addItem}><FiPlus /> إضافة</button></div>
                                    {form.items.map((item, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                                            <select className="select" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}><option value="">اختر المنتج</option>{products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
                                            <input type="number" className="input" placeholder="الكمية" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} />
                                            <input type="number" className="input" placeholder="التكلفة" value={item.cost} onChange={e => updateItem(i, 'cost', parseFloat(e.target.value) || 0)} />
                                            <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => removeItem(i)}><FiX /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">ملاحظات</label><textarea className="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div>
                            <div className="modal-footer"><span style={{ flex: 1, fontWeight: 700 }}>الإجمالي: {form.items.reduce((s, i) => s + (i.quantity * i.cost), 0).toLocaleString()} ج.م</span><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button><button type="submit" className="btn btn-primary">إنشاء</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showReceiveModal && selectedPurchase && (
                <div className="modal-overlay" onClick={() => setShowReceiveModal(false)}>
                    <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">استلام: {selectedPurchase.poNumber}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowReceiveModal(false)}>×</button></div>
                        <div className="modal-body">
                            <table className="table"><thead><tr><th>المنتج</th><th>المطلوب</th><th>تم استلامه</th><th>استلام الآن</th></tr></thead><tbody>
                                {selectedPurchase.items?.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.productName}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.receivedQty || 0}</td>
                                        <td><input type="number" className="input input-sm" style={{ width: '80px' }} max={item.quantity - (item.receivedQty || 0)} value={item.toReceive || ''} onChange={e => { const items = [...selectedPurchase.items]; items[i].toReceive = parseInt(e.target.value) || 0; setSelectedPurchase({ ...selectedPurchase, items }); }} /></td>
                                    </tr>
                                ))}
                            </tbody></table>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowReceiveModal(false)}>إلغاء</button><button className="btn btn-success" onClick={handleReceive}><FiCheck /> استلام</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
