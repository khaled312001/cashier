import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiPackage, FiUsers, FiAlertTriangle, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import './Dashboard.css';

export default function Dashboard() {
    const [stats, setStats] = useState({ todaySales: 0, todayOrders: 0, totalProducts: 0, totalCustomers: 0, lowStock: 0 });
    const [weeklyData, setWeeklyData] = useState([]);
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, weeklyRes, salesRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/dashboard/weekly'),
                api.get('/dashboard/recent-sales'),
            ]);
            setStats(statsRes.data);
            setWeeklyData(weeklyRes.data);
            setRecentSales(salesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { icon: FiDollarSign, label: 'مبيعات اليوم', value: `${stats.todaySales.toLocaleString()} ج.م`, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        { icon: FiShoppingCart, label: 'طلبات اليوم', value: stats.todayOrders, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
        { icon: FiPackage, label: 'إجمالي المنتجات', value: stats.totalProducts, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' },
        { icon: FiUsers, label: 'العملاء', value: stats.totalCustomers, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    ];

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1>لوحة التحكم</h1>
                <Link to="/pos" className="btn btn-primary">
                    <FiShoppingCart /> فتح نقطة البيع
                </Link>
            </div>

            <div className="stats-grid">
                {statCards.map((stat, i) => (
                    <div key={i} className="stat-card" style={{ '--accent': stat.color, '--accent-bg': stat.bg }}>
                        <div className="stat-icon"><stat.icon /></div>
                        <div className="stat-content">
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {stats.lowStock > 0 && (
                <div className="alert alert-warning">
                    <FiAlertTriangle />
                    <span>يوجد {stats.lowStock} منتج بمخزون منخفض</span>
                    <Link to="/products?lowStock=true" className="btn btn-sm btn-ghost">عرض</Link>
                </div>
            )}

            <div className="dashboard-grid">
                <div className="card chart-card">
                    <div className="card-header">
                        <h3 className="card-title"><FiTrendingUp /> مبيعات الأسبوع</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={weeklyData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="day" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="total" stroke="#6366f1" fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">آخر المبيعات</h3>
                    </div>
                    <div className="recent-sales">
                        {recentSales.length === 0 ? (
                            <div className="empty-state"><p>لا توجد مبيعات بعد</p></div>
                        ) : (
                            recentSales.slice(0, 5).map(sale => (
                                <div key={sale._id} className="sale-item">
                                    <div className="sale-info">
                                        <div className="sale-number">{sale.invoiceNumber}</div>
                                        <div className="sale-customer">{sale.customerName}</div>
                                    </div>
                                    <div className="sale-total">{sale.total.toLocaleString()} ج.م</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
