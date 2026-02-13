import { useState, useEffect } from 'react';
import { FiUsers, FiUserPlus, FiUserCheck, FiDollarSign, FiBarChart2, FiClock, FiEdit2, FiTrash2, FiSearch, FiCalendar } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './HR.css';

export default function HR() {
    const [activeTab, setActiveTab] = useState('employees');
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showEmpModal, setShowEmpModal] = useState(false);
    const [showPayrollModal, setShowPayrollModal] = useState(false);

    // Forms
    const [empForm, setEmpForm] = useState({ name: '', position: '', department: '', phone: '', salary: 0, commissionRate: 0, nationalId: '' });
    const [payrollForm, setPayrollForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empRes] = await Promise.all([api.get('/hr')]);
            setEmployees(empRes.data);

            if (activeTab === 'attendance') {
                const res = await api.get('/hr/attendance');
                setAttendance(res.data);
            }
            if (activeTab === 'payroll') {
                const res = await api.get('/hr/salaries');
                setSalaries(res.data);
            }
            if (activeTab === 'performance') {
                const res = await api.get('/hr/reports/performance');
                setPerformance(res.data);
            }
        } catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    // Employee Actions
    const handleSaveEmp = async () => {
        try {
            if (empForm._id) {
                await api.put(`/hr/${empForm._id}`, empForm);
                toast.success('تم التحديث');
            } else {
                await api.post('/hr', empForm);
                toast.success('تمت الإضافة');
            }
            setShowEmpModal(false);
            setEmpForm({ name: '', position: '', department: '', phone: '', salary: 0, commissionRate: 0, nationalId: '' });
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    const handleDeleteEmp = async (id) => {
        if (!window.confirm('هل أنت متأكد؟')) return;
        try {
            await api.delete(`/hr/${id}`);
            toast.success('تم الحذف');
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    // Attendance Actions
    const handleCheckIn = async (employeeId) => {
        try {
            await api.post('/hr/attendance/checkin', { employeeId });
            toast.success('تم تسجيل الحضور');
            fetchData();
        } catch (err) { toast.error(err.response?.data?.error || 'حدث خطأ'); }
    };

    const handleCheckOut = async (employeeId) => {
        try {
            await api.post('/hr/attendance/checkout', { employeeId });
            toast.success('تم تسجيل الانصراف');
            fetchData();
        } catch (err) { toast.error(err.response?.data?.error || 'حدث خطأ'); }
    };

    // Payroll Actions
    const handleCalculatePayroll = async () => {
        try {
            await api.post('/hr/salaries/calculate', payrollForm);
            toast.success('تم حساب الرواتب');
            setShowPayrollModal(false);
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    if (loading && employees.length === 0) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="hr-page">
            <div className="page-header">
                <h1><FiUsers /> الموارد البشرية</h1>
                {activeTab === 'employees' && <button className="btn btn-primary" onClick={() => { setEmpForm({}); setShowEmpModal(true); }}><FiUserPlus /> موظف جديد</button>}
                {activeTab === 'payroll' && <button className="btn btn-primary" onClick={() => setShowPayrollModal(true)}><FiDollarSign /> حساب الرواتب</button>}
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}><FiUsers /> الموظفين</button>
                <button className={`tab ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}><FiClock /> الحضور والانصراف</button>
                <button className={`tab ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => setActiveTab('payroll')}><FiDollarSign /> الرواتب</button>
                <button className={`tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}><FiBarChart2 /> الأداء</button>
            </div>

            {/* === EMPLOYEES TAB === */}
            {activeTab === 'employees' && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>الاسم</th><th>المنصب</th><th>القسم</th><th>الهاتف</th><th>الراتب الأساسي</th><th>العمولة %</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp._id}>
                                    <td><strong>{emp.name}</strong></td>
                                    <td>{emp.position}</td>
                                    <td>{emp.department}</td>
                                    <td>{emp.phone}</td>
                                    <td>{emp.salary}</td>
                                    <td>{emp.commissionRate}%</td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setEmpForm(emp); setShowEmpModal(true); }}><FiEdit2 /></button>
                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteEmp(emp._id)}><FiTrash2 /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === ATTENDANCE TAB === */}
            {activeTab === 'attendance' && (
                <div className="card">
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {employees.map(emp => {
                            const todayRecord = attendance.find(a => a.employeeId === emp._id && new Date(a.date).toDateString() === new Date().toDateString());
                            const isPresent = todayRecord && !todayRecord.checkOut;
                            return (
                                <div key={emp._id} className="employee-card" style={{ flex: '1 0 200px' }}>
                                    <div><strong>{emp.name}</strong><div style={{ fontSize: '12px' }}>{isPresent ? '🟢 متواجد' : '⚪ غير متواجد'}</div></div>
                                    {!isPresent ?
                                        <button className="btn btn-success btn-sm" onClick={() => handleCheckIn(emp._id)}>حضور</button> :
                                        <button className="btn btn-warning btn-sm" onClick={() => handleCheckOut(emp._id)}>انصراف</button>
                                    }
                                </div>
                            );
                        })}
                    </div>
                    <h3>سجل الحضور</h3>
                    <table className="table">
                        <thead><tr><th>التاريخ</th><th>الموظف</th><th>حضور</th><th>انصراف</th><th>ساعات العمل</th></tr></thead>
                        <tbody>
                            {attendance.map(a => (
                                <tr key={a._id}>
                                    <td>{new Date(a.date).toLocaleDateString('ar-EG')}</td>
                                    <td>{a.employeeName}</td>
                                    <td>{new Date(a.checkIn).toLocaleTimeString('ar-EG')}</td>
                                    <td>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString('ar-EG') : '-'}</td>
                                    <td>{a.hoursWorked || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === PAYROLL TAB === */}
            {activeTab === 'payroll' && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>الشهر/السنة</th><th>الموظف</th><th>الراتب الأساسي</th><th>العمولة</th><th>ساعات العمل</th><th>الإجمالي</th></tr></thead>
                        <tbody>
                            {salaries.map(s => (
                                <tr key={s._id}>
                                    <td>{s.month}/{s.year}</td>
                                    <td>{s.name}</td>
                                    <td>{s.baseSalary}</td>
                                    <td>{s.commission}</td>
                                    <td>{s.totalHours}</td>
                                    <td><strong>{s.totalSalary}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === PERFORMANCE TAB === */}
            {activeTab === 'performance' && (
                <div className="performance-grid">
                    {performance.map((p, i) => (
                        <div key={i} className="perf-card">
                            <div className="perf-header">
                                <h3>{p.name}</h3>
                                <span className="badge badge-primary">{p.position}</span>
                            </div>
                            <div className="perf-metric"><span>مبيعات ({p.salesCount})</span><span>{p.totalSales.toLocaleString()} ج.م</span></div>
                            <div className="perf-metric"><span>ساعات العمل</span><span>{p.totalHours} ساعة</span></div>
                            <div className="perf-metric"><span>مبيعات/ساعة</span><span>{p.salesPerHour} ج.م</span></div>
                            <div className="perf-metric"><span>مرتجعات</span><span className={p.returnsCount > 0 ? 'text-danger' : 'text-success'}>{p.returnsCount}</span></div>
                        </div>
                    ))}
                </div>
            )}

            {/* === EMPLOYEE MODAL === */}
            {showEmpModal && (
                <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{empForm._id ? 'تعديل موظف' : 'موظف جديد'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowEmpModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="input-group"><label className="input-label">الاسم</label><input className="input" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">المنصب</label><input className="input" value={empForm.position} onChange={e => setEmpForm({ ...empForm, position: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">القسم</label><input className="input" value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">الهاتف</label><input className="input" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">الراتب الأساسي</label><input type="number" className="input" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: parseFloat(e.target.value) || 0 })} /></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">نسبة العمولة %</label><input type="number" className="input" value={empForm.commissionRate} onChange={e => setEmpForm({ ...empForm, commissionRate: parseFloat(e.target.value) || 0 })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowEmpModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleSaveEmp}>حفظ</button></div>
                    </div>
                </div>
            )}

            {/* === PAYROLL MODAL === */}
            {showPayrollModal && (
                <div className="modal-overlay" onClick={() => setShowPayrollModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '300px' }}>
                        <div className="modal-header"><h3>حساب الرواتب</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowPayrollModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="input-group"><label className="input-label">الشهر</label><select className="select" value={payrollForm.month} onChange={e => setPayrollForm({ ...payrollForm, month: parseInt(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                            <div className="input-group" style={{ marginTop: '12px' }}><label className="input-label">السنة</label><input type="number" className="input" value={payrollForm.year} onChange={e => setPayrollForm({ ...payrollForm, year: parseInt(e.target.value) })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowPayrollModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleCalculatePayroll}>حساب</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
