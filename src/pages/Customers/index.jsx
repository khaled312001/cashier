import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiSearch, FiPhone, FiMail } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
    const [smsModal, setSmsModal] = useState(false);
    const [redeemModal, setRedeemModal] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [redeemPoints, setRedeemPoints] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try { const res = await api.get('/customers'); setCustomers(res.data); }
        catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const filtered = customers.filter(c => c.name.includes(search) || c.phone?.includes(search));

    const openModal = (customer = null) => {
        setForm(customer ? { name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '', notes: customer.notes || '' } : { name: '', phone: '', email: '', address: '', notes: '' });
        setEditing(customer);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) { toast.error('أدخل اسم العميل'); return; }
        try {
            if (editing) { await api.put(`/customers/${editing._id}`, form); toast.success('تم التحديث'); }
            else { await api.post('/customers', form); toast.success('تمت الإضافة'); }
            setShowModal(false); fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد؟')) return;
        try { await api.delete(`/customers/${id}`); toast.success('تم الحذف'); fetchData(); }
        catch (err) { toast.error(err.message); }
    };

    const handleSendSMS = async () => {
        if (!smsMessage) return toast.error('أدخل نص الرسالة');
        try {
            await api.post(`/customers/${selectedCustomer._id}/sms`, { message: smsMessage });
            toast.success('تم الإرسال');
            setSmsModal(false); setSmsMessage('');
        } catch (err) { toast.error('فشل الإرسال'); }
    };

    const handleRedeemPoints = async () => {
        if (!redeemPoints || redeemPoints <= 0) return toast.error('أدخل عدد النقاط');
        try {
            const res = await api.post(`/customers/${selectedCustomer._id}/redeem-points`, { points: parseInt(redeemPoints) });
            toast.success(`تم استبدال النقاط بخصم ${res.data.discountValue} ج.م`);
            setRedeemModal(false); setRedeemPoints(0); fetchData();
        } catch (err) { toast.error(err.response?.data?.error || 'فشل العملية'); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="page-header"><h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 800 }}><FiUsers /> العملاء</h1><button className="btn btn-primary" onClick={() => openModal()}><FiPlus /> إضافة عميل</button></div>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}><FiSearch /><input style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: 'inherit' }} placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>العميل</th><th>الهاتف</th><th>البريد</th><th>إجمالي المشتريات</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            {filtered.length === 0 ? (<tr><td colSpan="5" className="text-center text-muted" style={{ padding: '40px' }}>لا يوجد عملاء</td></tr>) : filtered.map(c => (
                                <tr key={c._id}>
                                    <td><strong>{c.name}</strong></td>
                                    <td>{c.phone || '-'}</td>
                                    <td>{c.email || '-'}</td>
                                    <td className="text-success">{(c.totalPurchases || 0).toLocaleString()} ج.م</td>
                                    <td><span className="badge badge-warning">{c.loyaltyPoints || 0} نقطة</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedCustomer(c); setSmsModal(true); }} title="إرسال SMS"><FiMail /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedCustomer(c); setRedeemModal(true); }} title="استبدال نقاط"><FiUsers /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(c)}><FiEdit2 /></button>
                                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(c._id)}><FiTrash2 /></button>
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
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">{editing ? 'تعديل عميل' : 'إضافة عميل'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleSubmit}><div className="modal-body"><div className="input-group"><label className="input-label">الاسم *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">الهاتف</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">البريد الإلكتروني</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">العنوان</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button><button type="submit" className="btn btn-primary">{editing ? 'حفظ' : 'إضافة'}</button></div></form>
                    </div>
                </div>
            )}

            {smsModal && (
                <div className="modal-overlay" onClick={() => setSmsModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>إرسال رسالة SMS</h3><button className="btn btn-ghost btn-icon" onClick={() => setSmsModal(false)}>×</button></div>
                        <div className="modal-body">
                            <p>إلى: {selectedCustomer?.name} ({selectedCustomer?.phone})</p>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">الرسالة</label><textarea className="input" rows="4" value={smsMessage} onChange={e => setSmsMessage(e.target.value)} placeholder="اكتب نص العرض هنا..."></textarea></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSmsModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleSendSMS}>إرسال</button></div>
                    </div>
                </div>
            )}

            {redeemModal && (
                <div className="modal-overlay" onClick={() => setRedeemModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>استبدال نقاط الولاء</h3><button className="btn btn-ghost btn-icon" onClick={() => setRedeemModal(false)}>×</button></div>
                        <div className="modal-body">
                            <p>العميل: {selectedCustomer?.name}</p>
                            <p>النقاط المتاحة: <span className="badge badge-warning">{selectedCustomer?.loyaltyPoints || 0}</span></p>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">عدد النقاط للاستبدال</label><input type="number" className="input" value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)} max={selectedCustomer?.loyaltyPoints || 0} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setRedeemModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleRedeemPoints}>استبدال</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
