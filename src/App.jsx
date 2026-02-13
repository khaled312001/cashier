import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';
import Shifts from './pages/Shifts';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import HR from './pages/HR';
import Contracts from './pages/Contracts';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';

const ProtectedRoute = ({ children, module }) => {
    const { user, loading, canView } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
    if (!user) return <Navigate to="/login" />;
    if (module && !canView(module)) return <Navigate to="/" />;
    return children;
};

function App() {
    return (
        <AuthProvider>
            <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#1e293b', color: '#fff', borderRadius: '12px' } }} />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Dashboard />} />
                        <Route path="pos" element={<ProtectedRoute module="pos"><POS /></ProtectedRoute>} />
                        <Route path="products" element={<ProtectedRoute module="products"><Products /></ProtectedRoute>} />
                        <Route path="categories" element={<ProtectedRoute module="categories"><Categories /></ProtectedRoute>} />
                        <Route path="inventory" element={<ProtectedRoute module="inventory"><Inventory /></ProtectedRoute>} />
                        <Route path="purchases" element={<ProtectedRoute module="purchases"><Purchases /></ProtectedRoute>} />
                        <Route path="customers" element={<ProtectedRoute module="customers"><Customers /></ProtectedRoute>} />
                        <Route path="suppliers" element={<ProtectedRoute module="suppliers"><Suppliers /></ProtectedRoute>} />
                        <Route path="shifts" element={<ProtectedRoute module="shifts"><Shifts /></ProtectedRoute>} />
                        <Route path="expenses" element={<ProtectedRoute module="expenses"><Expenses /></ProtectedRoute>} />
                        <Route path="reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
                        <Route path="hr" element={<ProtectedRoute module="hr"><HR /></ProtectedRoute>} />
                        <Route path="contracts" element={<ProtectedRoute module="contracts"><Contracts /></ProtectedRoute>} />
                        <Route path="audit" element={<ProtectedRoute module="audit"><AuditLog /></ProtectedRoute>} />
                        <Route path="settings" element={<ProtectedRoute module="settings"><Settings /></ProtectedRoute>} />
                    </Route>
                </Routes>
            </HashRouter>
        </AuthProvider>
    );
}

export default App;
