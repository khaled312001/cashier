import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiShoppingCart, FiPackage, FiGrid, FiUsers, FiTruck, FiBarChart2, FiSettings, FiLogOut, FiLayers, FiClipboard, FiClock, FiDollarSign, FiMonitor, FiFacebook, FiGlobe, FiShield, FiDatabase, FiFileText, FiUserCheck } from 'react-icons/fi';
import './Layout.css';

const allNavItems = [
    { path: '/', icon: FiHome, label: 'الرئيسية', module: 'dashboard' },
    { path: '/pos', icon: FiShoppingCart, label: 'نقطة البيع', module: 'pos' },
    { path: '/products', icon: FiPackage, label: 'المنتجات', module: 'products' },
    { path: '/categories', icon: FiGrid, label: 'الفئات', module: 'categories' },
    { path: '/inventory', icon: FiLayers, label: 'المخزون', module: 'inventory' },
    { path: '/purchases', icon: FiClipboard, label: 'المشتريات', module: 'purchases' },
    { path: '/customers', icon: FiUsers, label: 'العملاء', module: 'customers' },
    { path: '/suppliers', icon: FiTruck, label: 'الموردين', module: 'suppliers' },
    { path: '/contracts', icon: FiFileText, label: 'العقود', module: 'contracts' },
    { path: '/shifts', icon: FiClock, label: 'الورديات', module: 'shifts' },
    { path: '/expenses', icon: FiDollarSign, label: 'المصروفات', module: 'expenses' },
    { path: '/hr', icon: FiUserCheck, label: 'شؤون العاملين', module: 'hr' },
    { path: '/reports', icon: FiBarChart2, label: 'التقارير', module: 'reports' },
    { path: '/audit', icon: FiShield, label: 'سجل العمليات', module: 'audit' },
    { path: '/settings', icon: FiSettings, label: 'الإعدادات', module: 'settings' },
];

function getRoleName(role) {
    const names = {
        admin: 'مدير النظام',
        manager: 'مدير',
        cashier: 'كاشير',
        warehouse: 'أمين مخزن',
        accountant: 'محاسب',
    };
    return names[role] || role;
}

export default function Layout() {
    const { user, logout, canView } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Filter nav items based on permissions
    const navItems = allNavItems.filter(item => canView(item.module));

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <FiMonitor className="logo-icon" size={28} />
                        <span className="logo-text">شركة برمجلي</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <item.icon className="nav-icon" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                        <a href="https://www.facebook.com/BarmaglyOfficial" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}><FiFacebook size={18} /></a>
                        <a href="http://barmagly.tech/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}><FiGlobe size={18} /></a>
                    </div>
                    <div className="user-info">
                        <div className="user-avatar">{user?.name?.[0] || 'م'}</div>
                        <div className="user-details">
                            <div className="user-name">{user?.name || 'مستخدم'}</div>
                            <div className="user-role">{getRoleName(user?.role)}</div>
                        </div>
                    </div>
                    <button className="btn-logout" onClick={handleLogout}><FiLogOut /></button>
                </div>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
