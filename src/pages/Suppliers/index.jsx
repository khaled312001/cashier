import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiTruck, FiSearch } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', address: '', notes: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try { const res = await api.get('/suppliers'); setSuppliers(res.data); }
        catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const filtered = suppliers.filter(s => s.name.includes(search) || s.company?.includes(search));

    const openModal = (supplier = null) => {
        setForm(supplier ? { name: supplier.name, company: supplier.company || '', phone: supplier.phone || '', email: supplier.email || '', address: supplier.address || '', notes: supplier.notes || '' } : { name: '', company: '', phone: '', email: '', address: '', notes: '' });
        setEditing(supplier);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) { toast.error('أدخل اسم المورد'); return; }
        try {
            if (editing) { await api.put(`/suppliers/${editing._id}`, form); toast.success('تم التحديث'); }
            else { await api.post('/suppliers', form); toast.success('تمت الإضافة'); }
            setShowModal(false); fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد؟')) return;
        try { await api.delete(`/suppliers/${id}`); toast.success('تم الحذف'); fetchData(); }
        catch (err) { toast.error(err.message); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="page-header"><h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 800 }}><FiTruck /> الموردين</h1><button className="btn btn-primary" onClick={() => openModal()}><FiPlus /> إضافة مورد</button></div>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}><FiSearch /><input style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: 'inherit' }} placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>المورد</th><th>الشركة</th><th>الهاتف</th><th>البريد</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            {filtered.length === 0 ? (<tr><td colSpan="5" className="text-center text-muted" style={{ padding: '40px' }}>لا يوجد موردين</td></tr>) : filtered.map(s => (
                                <tr key={s._id}>
                                    <td><strong>{s.name}</strong></td>
                                    <td>{s.company || '-'}</td>
                                    <td>{s.phone || '-'}</td>
                                    <td>{s.email || '-'}</td>
                                    <td><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => openModal(s)}><FiEdit2 /></button><button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(s._id)}><FiTrash2 /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">{editing ? 'تعديل مورد' : 'إضافة مورد'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleSubmit}><div className="modal-body"><div className="input-group"><label className="input-label">اسم المورد *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">الشركة</label><input className="input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div><div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">الهاتف</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">البريد</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button><button type="submit" className="btn btn-primary">{editing ? 'حفظ' : 'إضافة'}</button></div></form>
                    </div>
                </div>
            )}
        </div>
    );
}
