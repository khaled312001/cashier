import { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiDownload, FiUpload, FiUsers, FiLock, FiShield, FiDatabase, FiToggleLeft, FiToggleRight, FiEdit2, FiTrash2, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Settings.css';

const MODULE_LABELS = {
    dashboard: 'الرئيسية',
    pos: 'نقطة البيع',
    products: 'المنتجات',
    categories: 'الفئات',
    inventory: 'المخزون',
    warehouses: 'المخازن',
    purchases: 'المشتريات',
    customers: 'العملاء',
    suppliers: 'الموردين',
    contracts: 'العقود',
    reports: 'التقارير',
    shifts: 'الورديات',
    expenses: 'المصروفات',
    hr: 'شؤون العاملين',
    settings: 'الإعدادات',
    audit: 'سجل العمليات',
};

const ACTION_LABELS = {
    view: 'عرض',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    sell: 'بيع',
    return: 'مرتجع',
    discount: 'خصم',
    hold: 'تعليق',
    void: 'إلغاء',
    import: 'استيراد',
    export: 'تصدير',
    adjust: 'تعديل كمية',
    count: 'جرد',
    transfer: 'تحويل',
    loyalty: 'نقاط ولاء',
    sales: 'مبيعات',
    products: 'منتجات',
    financial: 'مالي',
    employees: 'موظفين',
    open: 'فتح',
    close: 'إغلاق',
    attendance: 'حضور',
    salaries: 'رواتب',
    manage: 'إدارة',
    users: 'مستخدمين',
    backup: 'نسخ احتياطي',
};

const ROLE_LABELS = {
    admin: 'مدير النظام',
    manager: 'مدير',
    cashier: 'كاشير',
    warehouse: 'أمين مخزن',
    accountant: 'محاسب',
};

export default function Settings() {
    const { user, hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('store');
    const [settings, setSettings] = useState({
        storeName: '', storeAddress: '', storePhone: '', taxRate: 15,
        currency: 'ج.م', receiptFooter: '', lowStockAlert: 5,
        expiryAlertDays: 30, returnPeriodDays: 14,
    });
    const [users, setUsers] = useState([]);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'cashier' });
    const [editPermissions, setEditPermissions] = useState({});
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [settingsRes, usersRes] = await Promise.all([
                api.get('/settings'),
                api.get('/auth/users'),
            ]);
            if (settingsRes.data) setSettings(settingsRes.data);
            setUsers(usersRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchBackups = async () => {
        try {
            const res = await api.get('/backup/list');
            setBackups(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (activeTab === 'backup') fetchBackups(); }, [activeTab]);

    const saveSettings = async () => {
        try { await api.put('/settings', settings); toast.success('تم حفظ الإعدادات'); }
        catch (err) { toast.error('فشل حفظ الإعدادات'); }
    };

    const changePassword = async () => {
        if (passwords.new !== passwords.confirm) { toast.error('كلمات المرور غير متطابقة'); return; }
        if (passwords.new.length < 4) { toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
        try {
            await api.post('/auth/change-password', { currentPassword: passwords.current, newPassword: passwords.new });
            toast.success('تم تغيير كلمة المرور');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) { toast.error(err.response?.data?.error || 'فشل تغيير كلمة المرور'); }
    };

    const openCreateUser = () => {
        setEditingUser(null);
        setUserForm({ username: '', password: '', name: '', role: 'cashier' });
        setShowUserModal(true);
    };

    const openEditUser = (u) => {
        setEditingUser(u);
        setUserForm({ username: u.username, password: '', name: u.name, role: u.role });
        setShowUserModal(true);
    };

    const saveUser = async () => {
        if (!userForm.name) { toast.error('يرجى إدخال الاسم'); return; }
        try {
            if (editingUser) {
                const data = { name: userForm.name, role: userForm.role };
                if (userForm.password) data.password = userForm.password;
                await api.put(`/auth/users/${editingUser.id}`, data);
                toast.success('تم تحديث المستخدم');
            } else {
                if (!userForm.username || !userForm.password) { toast.error('أكمل جميع الحقول'); return; }
                await api.post('/auth/users', userForm);
                toast.success('تم إضافة المستخدم');
            }
            setShowUserModal(false);
            fetchData();
        } catch (err) { toast.error(err.response?.data?.error || 'حدث خطأ'); }
    };

    const toggleUserActive = async (u) => {
        try {
            await api.put(`/auth/users/${u.id}`, { name: u.name, role: u.role, isActive: !u.isActive });
            toast.success(u.isActive ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب');
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    const deleteUser = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try { await api.delete(`/auth/users/${id}`); toast.success('تم الحذف'); fetchData(); }
        catch (err) { toast.error(err.response?.data?.error || 'حدث خطأ'); }
    };

    const openPermissions = (u) => {
        setEditingUser(u);
        setEditPermissions(JSON.parse(JSON.stringify(u.permissions || {})));
        setShowPermissionsModal(true);
    };

    const togglePermission = (module, action) => {
        setEditPermissions(prev => ({
            ...prev,
            [module]: {
                ...(prev[module] || {}),
                [action]: !(prev[module]?.[action]),
            },
        }));
    };

    const savePermissions = async () => {
        try {
            await api.put(`/auth/users/${editingUser.id}/permissions`, { permissions: editPermissions });
            toast.success('تم حفظ الصلاحيات');
            setShowPermissionsModal(false);
            fetchData();
        } catch (err) { toast.error('حدث خطأ'); }
    };

    const createBackup = async () => {
        try {
            const res = await api.post('/backup/create');
            toast.success(`تم إنشاء نسخة احتياطية (${res.data.filesCount} ملف)`);
            fetchBackups();
        } catch (err) { toast.error('فشل إنشاء النسخة الاحتياطية'); }
    };

    const restoreBackup = async (name) => {
        if (!confirm('هل أنت متأكد؟ سيتم استبدال البيانات الحالية.')) return;
        try {
            await api.post(`/backup/restore/${name}`);
            toast.success('تم الاستعادة - أعد تشغيل البرنامج');
        } catch (err) { toast.error('فشل الاستعادة'); }
    };

    const deleteBackup = async (name) => {
        if (!confirm('حذف النسخة الاحتياطية؟')) return;
        try { await api.delete(`/backup/${name}`); toast.success('تم الحذف'); fetchBackups(); }
        catch (err) { toast.error('حدث خطأ'); }
    };

    const exportBackup = async () => {
        try {
            const res = await api.get('/backup/export');
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('تم تصدير النسخة الاحتياطية');
        } catch (err) { toast.error('فشل التصدير'); }
    };

    const importBackup = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            await api.post('/backup/import', { data: parsed.data || parsed });
            toast.success('تم استيراد البيانات');
            fetchData();
        } catch (err) { toast.error('فشل استيراد الملف'); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

    const tabs = [
        { id: 'store', label: 'إعدادات المتجر', icon: '🏪' },
        { id: 'users', label: 'المستخدمين', icon: '👥' },
        { id: 'password', label: 'كلمة المرور', icon: '🔒' },
        { id: 'backup', label: 'النسخ الاحتياطي', icon: '💾' },
    ];

    return (
        <div className="settings-page">
            <div className="page-header"><h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><FiSettings /> الإعدادات</h1></div>
            <div className="settings-layout">
                <div className="settings-sidebar">
                    {tabs.map(t => (
                        <button key={t.id} className={`settings-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                            <span style={{ marginLeft: '8px' }}>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>
                <div className="settings-content">
                    {/* Store Settings */}
                    {activeTab === 'store' && (
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">إعدادات المتجر</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="input-group"><label className="input-label">اسم المتجر</label><input className="input" value={settings.storeName} onChange={e => setSettings({ ...settings, storeName: e.target.value })} /></div>
                                <div className="input-group"><label className="input-label">العنوان</label><input className="input" value={settings.storeAddress} onChange={e => setSettings({ ...settings, storeAddress: e.target.value })} /></div>
                                <div className="input-group"><label className="input-label">الهاتف</label><input className="input" value={settings.storePhone} onChange={e => setSettings({ ...settings, storePhone: e.target.value })} /></div>
                                <div className="grid grid-2">
                                    <div className="input-group"><label className="input-label">نسبة الضريبة %</label><input type="number" className="input" value={settings.taxRate} onChange={e => setSettings({ ...settings, taxRate: e.target.value })} /></div>
                                    <div className="input-group"><label className="input-label">العملة</label><input className="input" value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-2">
                                    <div className="input-group"><label className="input-label">تنبيه المخزون المنخفض (كمية)</label><input type="number" className="input" value={settings.lowStockAlert} onChange={e => setSettings({ ...settings, lowStockAlert: parseInt(e.target.value) || 5 })} /></div>
                                    <div className="input-group"><label className="input-label">تنبيه انتهاء الصلاحية (أيام)</label><input type="number" className="input" value={settings.expiryAlertDays} onChange={e => setSettings({ ...settings, expiryAlertDays: parseInt(e.target.value) || 30 })} /></div>
                                </div>
                                <div className="input-group"><label className="input-label">فترة قبول المرتجعات (أيام)</label><input type="number" className="input" value={settings.returnPeriodDays || 14} onChange={e => setSettings({ ...settings, returnPeriodDays: parseInt(e.target.value) || 14 })} /></div>
                                <div className="input-group"><label className="input-label">ذيل الفاتورة</label><textarea className="textarea" rows="2" value={settings.receiptFooter} onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })} /></div>
                                <button className="btn btn-primary" onClick={saveSettings}><FiSave /> حفظ الإعدادات</button>
                            </div>
                        </div>
                    )}

                    {/* Users Management */}
                    {activeTab === 'users' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title"><FiUsers /> المستخدمين والصلاحيات</h3>
                                {hasPermission('settings', 'users') && (
                                    <button className="btn btn-primary btn-sm" onClick={openCreateUser}><FiPlus /> إضافة مستخدم</button>
                                )}
                            </div>
                            <div className="users-table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>المستخدم</th>
                                            <th>الاسم</th>
                                            <th>الدور</th>
                                            <th>الحالة</th>
                                            <th>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                                                <td><strong>{u.username}</strong></td>
                                                <td>{u.name}</td>
                                                <td><span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'manager' ? 'badge-warning' : u.role === 'accountant' ? 'badge-info' : u.role === 'warehouse' ? 'badge-secondary' : 'badge-success'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                                                <td>
                                                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                        {u.isActive ? 'نشط' : 'معطل'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {u.username !== 'admin' && hasPermission('settings', 'users') && (
                                                            <>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => openEditUser(u)} title="تعديل"><FiEdit2 /></button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => openPermissions(u)} title="الصلاحيات"><FiShield /></button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => toggleUserActive(u)} title={u.isActive ? 'تعطيل' : 'تفعيل'}>
                                                                    {u.isActive ? <FiToggleRight color="#22c55e" /> : <FiToggleLeft color="#ef4444" />}
                                                                </button>
                                                                <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteUser(u.id)} title="حذف"><FiTrash2 /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Password */}
                    {activeTab === 'password' && (
                        <div className="card">
                            <div className="card-header"><h3 className="card-title"><FiLock /> تغيير كلمة المرور</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="input-group"><label className="input-label">كلمة المرور الحالية</label><input type="password" className="input" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} /></div>
                                <div className="input-group"><label className="input-label">كلمة المرور الجديدة</label><input type="password" className="input" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} /></div>
                                <div className="input-group"><label className="input-label">تأكيد كلمة المرور</label><input type="password" className="input" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} /></div>
                                <button className="btn btn-primary" onClick={changePassword}>تغيير كلمة المرور</button>
                            </div>
                        </div>
                    )}

                    {/* Backup */}
                    {activeTab === 'backup' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title"><FiDatabase /> النسخ الاحتياطي</h3>
                                <button className="btn btn-primary btn-sm" onClick={createBackup}><FiPlus /> إنشاء نسخة</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <button className="btn btn-secondary" onClick={exportBackup}><FiDownload /> تصدير JSON</button>
                                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}><FiUpload /> استيراد JSON<input type="file" accept=".json" onChange={importBackup} style={{ display: 'none' }} /></label>
                                </div>

                                {backups.length > 0 && (
                                    <div>
                                        <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>النسخ الاحتياطية المحلية</h4>
                                        <div className="backup-list">
                                            {backups.map(b => (
                                                <div key={b.name} className="backup-item">
                                                    <div className="backup-info">
                                                        <strong>{b.name}</strong>
                                                        <span className="text-muted">{b.filesCount} ملف • {(b.size / 1024).toFixed(1)} KB</span>
                                                        <span className="text-muted">{new Date(b.date).toLocaleString('ar-EG')}</span>
                                                    </div>
                                                    <div className="backup-actions">
                                                        <button className="btn btn-ghost btn-sm" onClick={() => restoreBackup(b.name)} title="استعادة"><FiRefreshCw /></button>
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteBackup(b.name)} title="حذف"><FiTrash2 /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit User Modal */}
            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowUserModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {!editingUser && (
                                <div className="input-group"><label className="input-label">اسم المستخدم</label><input className="input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} /></div>
                            )}
                            <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">الاسم</label><input className="input" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '16px' }}><label className="input-label">{editingUser ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور'}</label><input type="password" className="input" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} /></div>
                            <div className="input-group" style={{ marginTop: '16px' }}>
                                <label className="input-label">الدور الوظيفي</label>
                                <select className="select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="cashier">كاشير</option>
                                    <option value="manager">مدير</option>
                                    <option value="warehouse">أمين مخزن</option>
                                    <option value="accountant">محاسب</option>
                                    <option value="admin">مدير النظام</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>إلغاء</button>
                            <button className="btn btn-primary" onClick={saveUser}>{editingUser ? 'حفظ' : 'إضافة'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {showPermissionsModal && editingUser && (
                <div className="modal-overlay" onClick={() => setShowPermissionsModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h3 className="modal-title"><FiShield /> صلاحيات: {editingUser.name}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowPermissionsModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ overflow: 'auto', flex: 1 }}>
                            <div className="permissions-grid">
                                {Object.entries(MODULE_LABELS).map(([mod, modLabel]) => {
                                    const modPerms = editPermissions[mod] || {};
                                    const actions = Object.keys(modPerms);
                                    if (actions.length === 0) return null;
                                    return (
                                        <div key={mod} className="permission-module">
                                            <div className="permission-module-header">{modLabel}</div>
                                            <div className="permission-actions">
                                                {actions.map(action => (
                                                    <label key={action} className="permission-toggle">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!modPerms[action]}
                                                            onChange={() => togglePermission(mod, action)}
                                                        />
                                                        <span>{ACTION_LABELS[action] || action}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPermissionsModal(false)}>إلغاء</button>
                            <button className="btn btn-primary" onClick={savePermissions}><FiSave /> حفظ الصلاحيات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
