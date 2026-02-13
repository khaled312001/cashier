import { useState, useEffect } from 'react';
import { FiBarChart2, FiCalendar, FiDollarSign, FiTrendingUp, FiPackage, FiUsers, FiPieChart } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Reports.css';

export default function Reports() {
    const [salesReport, setSalesReport] = useState(null);
    const [productsReport, setProductsReport] = useState(null);
    const [financialReport, setFinancialReport] = useState(null);
    const [performanceReport, setPerformanceReport] = useState(null);
    const [analyticsData, setAnalyticsData] = useState({ predictions: [], suggestions: [], slowMovers: [] });
    const [dateRange, setDateRange] = useState({ from: getDefaultFrom(), to: getToday() });
    const [activeTab, setActiveTab] = useState('sales');
    const [loading, setLoading] = useState(true);

    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getDefaultFrom() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; }

    useEffect(() => { fetchReports(); }, [dateRange, activeTab]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            if (activeTab === 'sales') {
                const res = await api.get(`/reports/sales?from=${dateRange.from}&to=${dateRange.to}`);
                setSalesReport(res.data);
            }
            if (activeTab === 'products') {
                const res = await api.get(`/reports/products?from=${dateRange.from}&to=${dateRange.to}`);
                setProductsReport(res.data);
            }
            if (activeTab === 'financial') {
                const res = await api.get(`/reports/financial?from=${dateRange.from}&to=${dateRange.to}`);
                setFinancialReport(res.data);
            }
            if (activeTab === 'employees') {
                const res = await api.get(`/hr/reports/performance?from=${dateRange.from}&to=${dateRange.to}`);
                setPerformanceReport(res.data);
            }
            if (activeTab === 'analytics') {
                const [predRes, suggRes, slowRes] = await Promise.all([
                    api.get('/analytics/stock-prediction'),
                    api.get('/analytics/purchase-suggestions'),
                    api.get('/analytics/slow-movers')
                ]);
                setAnalyticsData({ predictions: predRes.data, suggestions: suggRes.data, slowMovers: slowRes.data });
            }
        } catch (err) { toast.error('فشل التحميل'); }
        finally { setLoading(false); }
    };

    const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    if (loading && !salesReport && !productsReport && !financialReport && !performanceReport) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="reports-page">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><FiBarChart2 /> التقارير</h1>
                <div className="date-range">
                    <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
                    <span>إلى</span>
                    <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}><FiDollarSign /> المبيعات</button>
                <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}><FiPackage /> المنتجات</button>
                <button className={`tab ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => setActiveTab('financial')}><FiTrendingUp /> الأرباح والخسائر</button>
                <button className={`tab ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}><FiUsers /> أداء الموظفين</button>
                <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><FiMonitor /> الذكاء التحليلي</button>
            </div>

            {/* === SALES TAB === */}
            {activeTab === 'sales' && salesReport && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><FiDollarSign /></div><div><div className="stat-value">{salesReport.summary.totalSales.toLocaleString()} ج.م</div><div className="stat-label">إجمالي المبيعات</div></div></div>
                        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}><FiTrendingUp /></div><div><div className="stat-value">{salesReport.summary.netSales.toLocaleString()} ج.م</div><div className="stat-label">صافي المبيعات</div></div></div>
                        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><FiBarChart2 /></div><div><div className="stat-value">{salesReport.summary.salesCount}</div><div className="stat-label">عدد الفواتير</div></div></div>
                        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}><FiPieChart /></div><div><div className="stat-value">{Math.round(salesReport.summary.averageSale).toLocaleString()} ج.م</div><div className="stat-label">متوسط الفاتورة</div></div></div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                        <div className="card"><div className="card-header"><h3 className="card-title">المبيعات اليومية</h3></div><ResponsiveContainer width="100%" height={300}><AreaChart data={salesReport.dailyData}><defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /><Area type="monotone" dataKey="total" stroke="#6366f1" fillOpacity={1} fill="url(#colorSales)" /></AreaChart></ResponsiveContainer></div>
                        <div className="card"><div className="card-header"><h3 className="card-title">طرق الدفع</h3></div><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={Object.entries(salesReport.paymentMethods).map(([key, value]) => ({ name: key, value }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">{Object.keys(salesReport.paymentMethods).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /><Legend /></PieChart></ResponsiveContainer></div>
                    </div>
                </>
            )}

            {/* === PRODUCTS TAB === */}
            {activeTab === 'products' && productsReport && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="stat-card"><div className="stat-value">{productsReport.totalProducts}</div><div className="stat-label">إجمالي المنتجات</div></div>
                        <div className="stat-card"><div className="stat-value text-warning">{productsReport.lowStock.length}</div><div className="stat-label">مخزون منخفض</div></div>
                        <div className="stat-card"><div className="stat-value text-danger">{productsReport.outOfStock}</div><div className="stat-label">نفد المخزون</div></div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="card"><div className="card-header"><h3 className="card-title">الأكثر مبيعاً</h3></div><ResponsiveContainer width="100%" height={300}><BarChart data={productsReport.bestSellers} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis type="number" stroke="#94a3b8" /><YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /><Bar dataKey="quantity" fill="#6366f1" /></BarChart></ResponsiveContainer></div>
                        <div className="card"><div className="card-header"><h3 className="card-title">الأكثر ربحية</h3></div><ResponsiveContainer width="100%" height={300}><BarChart data={productsReport.mostProfitable} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis type="number" stroke="#94a3b8" /><YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /><Bar dataKey="profit" fill="#22c55e" /></BarChart></ResponsiveContainer></div>
                    </div>
                </>
            )}

            {/* === FINANCIAL TAB === */}
            {activeTab === 'financial' && financialReport && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="stat-card"><div className="stat-value">{financialReport.revenue.totalSales.toLocaleString()}</div><div className="stat-label">الإيرادات</div></div>
                        <div className="stat-card"><div className="stat-value">{financialReport.costs.cogs.toLocaleString()}</div><div className="stat-label">تلفة البضاعة المباعة</div></div>
                        <div className="stat-card"><div className="stat-value text-danger">{financialReport.expenses.total.toLocaleString()}</div><div className="stat-label">المصروفات</div></div>
                        <div className="stat-card"><div className="stat-value text-success">{financialReport.profit.netProfit.toLocaleString()}</div><div className="stat-label">صافي الربح ({financialReport.profit.profitMargin}%)</div></div>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">توزيع المصروفات</h3></div>
                        <div style={{ height: '300px' }}>
                            {Object.keys(financialReport.expenses.byCategory).length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={Object.entries(financialReport.expenses.byCategory).map(([k, v]) => ({ name: k, amount: v }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                                        <Bar dataKey="amount" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>لا توجد بيانات مصروفات</div>}
                        </div>
                    </div>
                </>
            )}

            {/* === EMPLOYEES TAB === */}
            {activeTab === 'employees' && performanceReport && (
                <div className="card">
                    <table className="table">
                        <thead><tr><th>الموظف</th><th>عدد المبيعات</th><th>إجمالي المبيعات</th><th>متوسط الفاتورة</th><th>ساعات العمل</th><th>المبيعات/ساعة</th></tr></thead>
                        <tbody>
                            {performanceReport.map((p, i) => (
                                <tr key={i}>
                                    <td><strong>{p.name}</strong><br /><small>{p.position}</small></td>
                                    <td>{p.salesCount}</td>
                                    <td>{p.totalSales.toLocaleString()} ج.م</td>
                                    <td>{p.avgSaleValue.toLocaleString()} ج.م</td>
                                    <td>{p.totalHours}</td>
                                    <td>{p.salesPerHour} ج.م</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* === ANALYTICS TAB === */}
            {activeTab === 'analytics' && (
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">توقعات نفاد المخزون</h3></div>
                        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead><tr><th>المنتج</th><th>الكمية الحالية</th><th>المعدل اليومي</th><th>الأيام المتبقية</th></tr></thead>
                                <tbody>
                                    {analyticsData.predictions.length > 0 ? analyticsData.predictions.map(p => (
                                        <tr key={p._id}>
                                            <td>{p.name}</td>
                                            <td>{p.currentStock}</td>
                                            <td>{p.dailyVelocity}</td>
                                            <td><span className={`badge ${p.status === 'critical' ? 'badge-danger' : 'badge-warning'}`}>{p.daysLeft} يوم</span></td>
                                        </tr>
                                    )) : <tr><td colSpan="4" className="text-center">لا توجد بيانات كافية</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><h3 className="card-title">اقتراحات الشراء</h3></div>
                        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead><tr><th>المنتج</th><th>المخزون المتوقع</th><th>الكمية المقترحة</th></tr></thead>
                                <tbody>
                                    {analyticsData.suggestions.length > 0 ? analyticsData.suggestions.map(p => (
                                        <tr key={p._id}>
                                            <td>{p.name}</td>
                                            <td>{p.suggestedStock}</td>
                                            <td><strong>{p.reorderQty}</strong></td>
                                        </tr>
                                    )) : <tr><td colSpan="3" className="text-center">المخزون جيد</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><h3 className="card-title">الأصناف الراكدة</h3></div>
                        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead><tr><th>المنتج</th><th>القيمة المجمدة</th><th>المعدل</th></tr></thead>
                                <tbody>
                                    {analyticsData.slowMovers.length > 0 ? analyticsData.slowMovers.map(p => (
                                        <tr key={p._id}>
                                            <td>{p.name}</td>
                                            <td>{p.value.toLocaleString()} ج.م</td>
                                            <td>{p.dailyVelocity}</td>
                                        </tr>
                                    )) : <tr><td colSpan="3" className="text-center">حركة المخزون ممتازة</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
