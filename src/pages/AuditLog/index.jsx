import { useState, useEffect } from 'react';
import { FiShield, FiSearch, FiFilter, FiCalendar, FiUser, FiActivity, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './AuditLog.css';

const ACTION_ICONS = {
    'تسجيل دخول': '🔑',
    'إنشاء مستخدم': '👤',
    'تحديث مستخدم': '✏️',
    'حذف مستخدم': '🗑️',
    'تحديث صلاحيات': '🔒',
    'إنشاء نسخة احتياطية': '💾',
    'حذف سجلات قديمة': '🧹',
    'بيع': '🛒',
    'مرتجع': '↩️',
    'إضافة منتج': '📦',
    'تعديل منتج': '📝',
    'حذف منتج': '❌',
};

const MODULE_COLORS = {
    auth: '#6366f1',
    users: '#8b5cf6',
    sales: '#22c55e',
    products: '#3b82f6',
    inventory: '#f59e0b',
    purchases: '#14b8a6',
    customers: '#ec4899',
    suppliers: '#f97316',
    expenses: '#ef4444',
    backup: '#06b6d4',
    audit: '#64748b',
    settings: '#475569',
};

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({
        from: '', to: '', userId: '', module: '', action: '',
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchLogs(); fetchStats(); }, [page, filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 30 });
            if (filters.from) params.append('from', filters.from);
            if (filters.to) params.append('to', filters.to);
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.module) params.append('module', filters.module);
            const res = await api.get(`/audit?${params}`);
            setLogs(res.data.logs);
            setTotalPages(res.data.totalPages);
            setTotal(res.data.total);
        } catch (err) { toast.error('فشل تحميل السجل'); }
        finally { setLoading(false); }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/audit/stats');
            setStats(res.data);
        } catch (err) { /* ignore */ }
    };

    const clearFilters = () => {
        setFilters({ from: '', to: '', userId: '', module: '', action: '' });
        setPage(1);
    };

    return (
        <div className="audit-page">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><FiShield /> سجل العمليات</h1>
                <span className="text-muted">{total} عملية مسجلة</span>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="audit-stats">
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><FiActivity /></div>
                        <div><div className="stat-value">{stats.todayCount}</div><div className="stat-label">عمليات اليوم</div></div>
                    </div>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}><FiShield /></div>
                        <div><div className="stat-value">{stats.totalCount}</div><div className="stat-label">إجمالي العمليات</div></div>
                    </div>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><FiUser /></div>
                        <div><div className="stat-value">{Object.keys(stats.byUser || {}).length}</div><div className="stat-label">مستخدمين نشطين</div></div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="audit-filters card">
                <div className="filter-row">
                    <div className="filter-item">
                        <label><FiCalendar /> من</label>
                        <input type="date" className="input" value={filters.from} onChange={e => { setFilters({ ...filters, from: e.target.value }); setPage(1); }} />
                    </div>
                    <div className="filter-item">
                        <label><FiCalendar /> إلى</label>
                        <input type="date" className="input" value={filters.to} onChange={e => { setFilters({ ...filters, to: e.target.value }); setPage(1); }} />
                    </div>
                    <div className="filter-item">
                        <label><FiFilter /> القسم</label>
                        <select className="select" value={filters.module} onChange={e => { setFilters({ ...filters, module: e.target.value }); setPage(1); }}>
                            <option value="">الكل</option>
                            <option value="auth">تسجيل الدخول</option>
                            <option value="users">المستخدمين</option>
                            <option value="sales">المبيعات</option>
                            <option value="products">المنتجات</option>
                            <option value="inventory">المخزون</option>
                            <option value="purchases">المشتريات</option>
                            <option value="customers">العملاء</option>
                            <option value="expenses">المصروفات</option>
                            <option value="backup">النسخ الاحتياطي</option>
                        </select>
                    </div>
                    <button className="btn btn-ghost" onClick={clearFilters}>مسح الفلاتر</button>
                </div>
            </div>

            {/* Logs List */}
            {loading ? (
                <div className="loading-screen"><div className="spinner"></div></div>
            ) : (
                <div className="audit-logs">
                    {logs.length === 0 ? (
                        <div className="empty-state"><FiShield size={48} /><p>لا توجد عمليات مسجلة</p></div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={log._id || i} className="audit-log-item">
                                <div className="log-icon" style={{ background: `${MODULE_COLORS[log.module] || '#64748b'}20`, color: MODULE_COLORS[log.module] || '#64748b' }}>
                                    {ACTION_ICONS[log.action] || '📋'}
                                </div>
                                <div className="log-content">
                                    <div className="log-action">{log.action}</div>
                                    <div className="log-meta">
                                        <span className="log-user"><FiUser size={12} /> {log.userName}</span>
                                        <span className="log-module" style={{ color: MODULE_COLORS[log.module] }}>{log.module}</span>
                                        <span className="log-time">{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                                    </div>
                                    {log.details && log.details !== '{}' && (
                                        <div className="log-details">{log.details}</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><FiChevronRight /> السابق</button>
                    <span className="page-info">صفحة {page} من {totalPages}</span>
                    <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي <FiChevronLeft /></button>
                </div>
            )}
        </div>
    );
}
