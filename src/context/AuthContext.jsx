import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/auth/me')
                .then(res => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem('token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // Check if user has a specific permission
    // Usage: hasPermission('products', 'add') or hasPermission('pos', 'sell')
    const hasPermission = (module, action) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (!user.permissions) return false;
        const modulePerms = user.permissions[module];
        if (!modulePerms) return false;
        return !!modulePerms[action];
    };

    // Check if user can view a specific module
    const canView = (module) => hasPermission(module, 'view');

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, canView }}>
            {children}
        </AuthContext.Provider>
    );
};
