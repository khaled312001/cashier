import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPackage } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Products.css';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', barcode: '', categoryId: '', price: '', cost: '', quantity: '', minStock: '5', unit: 'قطعة' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([api.get('/products'), api.get('/categories')]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
        } catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const filtered = products.filter(p => p.name.includes(search) || p.barcode?.includes(search));

    const openModal = (product = null) => {
        if (product) {
            setForm({ name: product.name, barcode: product.barcode || '', categoryId: product.categoryId || '', price: product.price, cost: product.cost || '', quantity: product.quantity, minStock: product.minStock || 5, unit: product.unit || 'قطعة' });
            setEditingProduct(product);
        } else {
            setForm({ name: '', barcode: '', categoryId: '', price: '', cost: '', quantity: '', minStock: '5', unit: 'قطعة' });
            setEditingProduct(null);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price) { toast.error('أدخل الاسم والسعر'); return; }
        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct._id}`, form);
                toast.success('تم التحديث');
            } else {
                await api.post('/products', form);
                toast.success('تمت الإضافة');
            }
            setShowModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success('تم الحذف');
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const getCategoryName = (id) => categories.find(c => c._id === id)?.name || '-';

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="products-page">
            <div className="page-header">
                <h1><FiPackage /> المنتجات</h1>
                <button className="btn btn-primary" onClick={() => openModal()}><FiPlus /> إضافة منتج</button>
            </div>
            <div className="search-bar">
                <FiSearch />
                <input placeholder="بحث بالاسم أو الباركود..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr><th>المنتج</th><th>الباركود</th><th>الفئة</th><th>السعر</th><th>التكلفة</th><th>المخزون</th><th>إجراءات</th></tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '40px' }}>لا توجد منتجات</td></tr>
                            ) : filtered.map(p => (
                                <tr key={p._id}>
                                    <td><strong>{p.name}</strong></td>
                                    <td>{p.barcode || '-'}</td>
                                    <td>{getCategoryName(p.categoryId)}</td>
                                    <td className="text-success">{p.price.toLocaleString()} ج.م</td>
                                    <td className="text-muted">{p.cost?.toLocaleString() || '-'} ج.م</td>
                                    <td><span className={`badge ${p.quantity <= p.minStock ? 'badge-warning' : 'badge-success'}`}>{p.quantity} {p.unit}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(p)}><FiEdit2 /></button>
                                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(p._id)}><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingProduct ? 'تعديل منتج' : 'إضافة منتج'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="grid grid-2 gap-4">
                                    <div className="input-group"><label className="input-label">اسم المنتج *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                    <div className="input-group"><label className="input-label">الباركود</label><input className="input" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
                                    <div className="input-group"><label className="input-label">الفئة</label><select className="select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">بدون فئة</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                                    <div className="input-group"><label className="input-label">الوحدة</label><input className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                                    <div className="input-group"><label className="input-label">سعر البيع *</label><input type="number" className="input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                                    <div className="input-group"><label className="input-label">التكلفة</label><input type="number" className="input" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
                                    <div className="input-group"><label className="input-label">الكمية</label><input type="number" className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                                    <div className="input-group"><label className="input-label">الحد الأدنى</label><input type="number" className="input" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                                <button type="submit" className="btn btn-primary">{editingProduct ? 'حفظ التغييرات' : 'إضافة'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
