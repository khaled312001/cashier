import { useState, useEffect } from 'react';
import { FiDollarSign, FiPlus, FiEdit2, FiTrash2, FiPieChart, FiHome, FiZap, FiUser, FiPackage, FiTool, FiVolume2, FiTruck, FiClipboard } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
    { id: 'rent', name: 'إيجار', icon: <FiHome /> },
    { id: 'utilities', name: 'مرافق', icon: <FiZap /> },
    { id: 'salaries', name: 'رواتب', icon: <FiUser /> },
    { id: 'inventory', name: 'مخزون', icon: <FiPackage /> },
    { id: 'maintenance', name: 'صيانة', icon: <FiTool /> },
    { id: 'marketing', name: 'تسويق', icon: <FiVolume2 /> },
    { id: 'transport', name: 'نقل', icon: <FiTruck /> },
    { id: 'other', name: 'أخرى', icon: <FiClipboard /> },
];

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({ total: 0, byCategory: {} });
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', amount: 0, category: 'other', date: new Date().toISOString().split('T')[0], notes: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [expensesRes, summaryRes] = await Promise.all([
                api.get('/expenses'),
                api.get('/expenses/summary'),
            ]);
            setExpenses(expensesRes.data);
            setSummary(summaryRes.data);
        } catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const openModal = (expense = null) => {
        setForm(expense ? { title: expense.title, amount: expense.amount, category: expense.category, date: expense.date, notes: expense.notes || '' } : { title: '', amount: 0, category: 'other', date: new Date().toISOString().split('T')[0], notes: '' });
        setEditing(expense);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || form.amount <= 0) { toast.error('أكمل البيانات'); return; }
        try {
            if (editing) { await api.put(`/expenses/${editing._id}`, form); toast.success('تم التحديث'); }
            else { await api.post('/expenses', form); toast.success('تمت الإضافة'); }
            setShowModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد؟')) return;
        try { await api.delete(`/expenses/${id}`); toast.success('تم الحذف'); fetchData(); }
        catch (err) { toast.error(err.message); }
    };

    const getCategoryInfo = (id) => CATEGORIES.find(c => c.id === id) || { name: id, icon: '📋' };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="page-header"><h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 800 }}><FiDollarSign /> المصروفات</h1><button className="btn btn-primary" onClick={() => openModal()}><FiPlus /> إضافة مصروف</button></div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>إجمالي المصروفات</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>{summary.total?.toLocaleString()} ج.م</div>
                </div>
                {Object.entries(summary.byCategory || {}).slice(0, 4).map(([cat, amount]) => (
                    <div key={cat} className="card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px' }}>{getCategoryInfo(cat).icon}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getCategoryInfo(cat).name}</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>{amount.toLocaleString()} ج.م</div>
                    </div>
                ))}
            </div>

            <div className="card">
                <table className="table">
                    <thead><tr><th>الوصف</th><th>الفئة</th><th>المبلغ</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
                    <tbody>
                        {expenses.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>لا توجد مصروفات</td></tr> : expenses.map(e => (
                            <tr key={e._id}>
                                <td><strong>{e.title}</strong>{e.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{e.notes}</div>}</td>
                                <td>{getCategoryInfo(e.category).icon} {getCategoryInfo(e.category).name}</td>
                                <td className="text-danger">{e.amount?.toLocaleString()} ج.م</td>
                                <td>{e.date}</td>
                                <td><div style={{ display: 'flex', gap: '8px' }}><button className="btn btn-ghost btn-sm" onClick={() => openModal(e)}><FiEdit2 /></button><button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(e._id)}><FiTrash2 /></button></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">{editing ? 'تعديل مصروف' : 'إضافة مصروف'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="input-group"><label className="input-label">الوصف *</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                                <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">المبلغ *</label><input type="number" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
                                <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">الفئة</label><select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">التاريخ</label><input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                                <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">ملاحظات</label><textarea className="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button><button type="submit" className="btn btn-primary">{editing ? 'حفظ' : 'إضافة'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
