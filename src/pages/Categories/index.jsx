import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiGrid } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];
const ICONS = ['📦', '🥤', '🍔', '🍰', '☕', '🧁', '🍕', '👕', '👗', '🩳', '👟', '📱', '💻', '🎮'];

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', icon: '📦', color: '#6b7280' });
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try { const res = await api.get('/categories'); setCategories(res.data); }
        catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const openModal = (cat = null) => {
        setForm(cat ? { name: cat.name, icon: cat.icon, color: cat.color } : { name: '', icon: '📦', color: '#6b7280' });
        setEditing(cat);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) { toast.error('أدخل اسم الفئة'); return; }
        try {
            if (editing) { await api.put(`/categories/${editing._id}`, form); toast.success('تم التحديث'); }
            else { await api.post('/categories', form); toast.success('تمت الإضافة'); }
            setShowModal(false); fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد؟')) return;
        try { await api.delete(`/categories/${id}`); toast.success('تم الحذف'); fetchData(); }
        catch (err) { toast.error(err.message); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="page-header"><h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 800 }}><FiGrid /> الفئات</h1><button className="btn btn-primary" onClick={() => openModal()}><FiPlus /> إضافة فئة</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {categories.map(cat => (
                    <div key={cat._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => openModal(cat)}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{cat.icon}</div>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{cat.name}</div></div>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(cat._id); }}><FiTrash2 /></button>
                    </div>
                ))}
                {categories.length === 0 && <div className="empty-state"><p>لا توجد فئات</p></div>}
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">{editing ? 'تعديل فئة' : 'إضافة فئة'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="input-group"><label className="input-label">اسم الفئة</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">الأيقونة</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{ICONS.map(icon => (<button key={icon} type="button" style={{ width: '40px', height: '40px', borderRadius: '8px', border: form.icon === icon ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'var(--bg-dark)', fontSize: '20px', cursor: 'pointer' }} onClick={() => setForm({ ...form, icon })}>{icon}</button>))}</div></div>
                                <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">اللون</label><div style={{ display: 'flex', gap: '8px' }}>{COLORS.map(color => (<button key={color} type="button" style={{ width: '32px', height: '32px', borderRadius: '50%', border: form.color === color ? '3px solid white' : 'none', background: color, cursor: 'pointer' }} onClick={() => setForm({ ...form, color })} />))}</div></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button><button type="submit" className="btn btn-primary">{editing ? 'حفظ' : 'إضافة'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
