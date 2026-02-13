import { useState, useEffect } from 'react';
import { FiBriefcase, FiPlus, FiEdit2, FiTrash2, FiSearch, FiDollarSign, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Contracts.css';

export default function Contracts() {
    const [contracts, setContracts] = useState([]);
    const [comparison, setComparison] = useState({});
    const [dues, setDues] = useState([]);
    const [activeTab, setActiveTab] = useState('contracts');
    const [loading, setLoading] = useState(true);

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ companyName: '', contactPerson: '', phone: '', email: '', type: 'corporate', discountRate: 0, terms: '' });

    useEffect(() => { fetchData(); }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'contracts') {
                const res = await api.get('/contracts');
                setContracts(res.data);
            } else if (activeTab === 'comparison') {
                const res = await api.get('/contracts/compare/suppliers');
                setComparison(res.data);
            } else if (activeTab === 'dues') {
                const res = await api.get('/contracts/dues/pending');
                setDues(res.data);
            }
        } catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            if (form._id) {
                await api.put(`/contracts/${form._id}`, form);
                toast.success('تم التحديث');
            } else {
                await api.post('/contracts', form);
                toast.success('تم الإنشاء');
            }
            setShowModal(false);
            setForm({ companyName: '', contactPerson: '', phone: '', email: '', type: 'corporate', discountRate: 0, terms: '' });
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد؟')) return;
        try {
            await api.delete(`/contracts/${id}`);
            toast.success('تم الحذف');
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    if (loading && contracts.length === 0 && Object.keys(comparison).length === 0) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="contracts-page">
            <div className="page-header">
                <h1><FiBriefcase /> العقود والموردين</h1>
                {activeTab === 'contracts' && <button className="btn btn-primary" onClick={() => { setForm({}); setShowModal(true); }}><FiPlus /> عقد جديد</button>}
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}>العقود</button>
                <button className={`tab ${activeTab === 'comparison' ? 'active' : ''}`} onClick={() => setActiveTab('comparison')}>مقارنة الأسعار</button>
                <button className={`tab ${activeTab === 'dues' ? 'active' : ''}`} onClick={() => setActiveTab('dues')}>استحقاقات الدفع</button>
            </div>

            {/* === CONTRACTS TAB === */}
            {activeTab === 'contracts' && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>الشركة</th><th>جهة الاتصال</th><th>النوع</th><th>الخصم</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            {contracts.map(c => (
                                <tr key={c._id}>
                                    <td><strong>{c.companyName}</strong></td>
                                    <td>{c.contactPerson} <br /><small>{c.phone}</small></td>
                                    <td>{c.type === 'corporate' ? 'شركات' : 'مورد'}</td>
                                    <td>{c.discountRate}%</td>
                                    <td><span className={`contract-status ${c.status === 'active' ? 'active' : 'expired'}`}>{c.status === 'active' ? 'نشط' : 'منتهي'}</span></td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setForm(c); setShowModal(true); }}><FiEdit2 /></button>
                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(c._id)}><FiTrash2 /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === COMPARISON TAB === */}
            {activeTab === 'comparison' && (
                <div className="comparison-grid">
                    {Object.entries(comparison).map(([productId, data]) => {
                        const sortedSuppliers = Object.entries(data.suppliers).sort((a, b) => a[1].bestPrice - b[1].bestPrice);
                        return (
                            <div key={productId} className="comparison-card">
                                <h3>{data.productName}</h3>
                                <div style={{ marginTop: '12px' }}>
                                    {sortedSuppliers.map(([sid, sup], index) => (
                                        <div key={sid} className="price-row">
                                            <span>{sup.supplierName}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <strong>{sup.bestPrice} ج.م</strong>
                                                {index === 0 && <span className="price-badge best">الأفضل</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* === DUES TAB === */}
            {activeTab === 'dues' && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>المورد</th><th>رقم الفاتورة</th><th>المبلغ المستحق</th><th>تاريخ الاستحقاق</th><th>الحالة</th></tr></thead>
                        <tbody>
                            {dues.map(d => (
                                <tr key={d._id}>
                                    <td>{d.supplierName}</td>
                                    <td>{d.invoiceNumber || '-'}</td>
                                    <td><strong>{d.remainingAmount || d.total} ج.م</strong></td>
                                    <td>{new Date(d.dueDate).toLocaleDateString('ar-EG')}</td>
                                    <td>
                                        {d.isOverdue ?
                                            <span className="text-danger flex-center"><FiAlertCircle /> متأخر {d.daysOverdue} يوم</span> :
                                            <span className="text-success"><FiCheckCircle /> جاري</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === MODAL === */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{form._id ? 'تعديل عقد' : 'عقد جديد'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="input-group"><label className="input-label">اسم الشركة</label><input className="input" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">جهة الاتصال</label><input className="input" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">الهاتف</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">البريد الإلكتروني</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">النوع</label><select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="corporate">شركات</option><option value="supplier">مورد</option></select></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">نسبة الخصم %</label><input type="number" className="input" value={form.discountRate} onChange={e => setForm({ ...form, discountRate: parseFloat(e.target.value) || 0 })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">الشروط</label><textarea className="input" value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} rows="3"></textarea></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleSave}>حفظ</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
