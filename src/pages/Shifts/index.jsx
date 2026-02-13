import { useState, useEffect } from 'react';
import { FiClock, FiPlay, FiStopCircle, FiDollarSign, FiList } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Shifts() {
    const { user } = useAuth();
    const [shifts, setShifts] = useState([]);
    const [currentShift, setCurrentShift] = useState(null);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [openingCash, setOpeningCash] = useState(0);
    const [closingCash, setClosingCash] = useState(0);
    const [closeNotes, setCloseNotes] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [shiftsRes, currentRes] = await Promise.all([
                api.get('/shifts'),
                api.get(`/shifts/current?userId=${user?.id}`),
            ]);
            setShifts(shiftsRes.data);
            setCurrentShift(currentRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const startShift = async () => {
        try {
            await api.post('/shifts/start', { userId: user?.id, userName: user?.name, openingCash });
            toast.success('تم بدء الوردية');
            setShowStartModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const closeShift = async () => {
        try {
            await api.post(`/shifts/${currentShift._id}/close`, { closingCash, notes: closeNotes });
            toast.success('تم إغلاق الوردية');
            setShowCloseModal(false);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 800 }}><FiClock /> الورديات</h1>
                {!currentShift ? (
                    <button className="btn btn-success" onClick={() => setShowStartModal(true)}><FiPlay /> بدء وردية</button>
                ) : (
                    <button className="btn btn-danger" onClick={() => setShowCloseModal(true)}><FiStopCircle /> إغلاق الوردية</button>
                )}
            </div>

            {currentShift && (
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div><div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>الوردية الحالية</div><div style={{ fontSize: '20px', fontWeight: 700 }}>{currentShift.shiftNumber}</div></div>
                        <div><div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>البداية</div><div>{new Date(currentShift.startedAt).toLocaleString('ar-EG')}</div></div>
                        <div><div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>رصيد الافتتاح</div><div style={{ fontSize: '18px', fontWeight: 700 }}>{currentShift.openingCash?.toLocaleString()} ج.م</div></div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header"><h3 className="card-title"><FiList /> سجل الورديات</h3></div>
                <table className="table">
                    <thead><tr><th>الرقم</th><th>الموظف</th><th>البداية</th><th>النهاية</th><th>رصيد الافتتاح</th><th>رصيد الإغلاق</th><th>الفرق</th><th>الحالة</th></tr></thead>
                    <tbody>
                        {shifts.length === 0 ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>لا توجد ورديات</td></tr> : shifts.map(s => (
                            <tr key={s._id}>
                                <td><strong>{s.shiftNumber}</strong></td>
                                <td>{s.userName}</td>
                                <td>{new Date(s.startedAt).toLocaleString('ar-EG')}</td>
                                <td>{s.endedAt ? new Date(s.endedAt).toLocaleString('ar-EG') : '-'}</td>
                                <td>{s.openingCash?.toLocaleString()} ج.م</td>
                                <td>{s.closingCash?.toLocaleString() || '-'} ج.م</td>
                                <td className={s.difference > 0 ? 'text-success' : s.difference < 0 ? 'text-danger' : ''}>{s.difference !== undefined ? `${s.difference > 0 ? '+' : ''}${s.difference.toLocaleString()} ج.م` : '-'}</td>
                                <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{s.status === 'active' ? 'نشطة' : 'مغلقة'}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showStartModal && (
                <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title"><FiPlay /> بدء وردية جديدة</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowStartModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="input-group"><label className="input-label">رصيد الافتتاح (الكاش)</label><input type="number" className="input" value={openingCash} onChange={e => setOpeningCash(parseFloat(e.target.value) || 0)} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowStartModal(false)}>إلغاء</button><button className="btn btn-success" onClick={startShift}>بدء الوردية</button></div>
                    </div>
                </div>
            )}

            {showCloseModal && currentShift && (
                <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title"><FiStopCircle /> إغلاق الوردية</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCloseModal(false)}>×</button></div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '16px' }}>رصيد الافتتاح: <strong>{currentShift.openingCash?.toLocaleString()} ج.م</strong></p>
                            <div className="input-group"><label className="input-label">رصيد الإغلاق (الكاش الفعلي)</label><input type="number" className="input" value={closingCash} onChange={e => setClosingCash(parseFloat(e.target.value) || 0)} /></div>
                            <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">ملاحظات</label><textarea className="textarea" value={closeNotes} onChange={e => setCloseNotes(e.target.value)} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>إلغاء</button><button className="btn btn-danger" onClick={closeShift}>إغلاق الوردية</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
