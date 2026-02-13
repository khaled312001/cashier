import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMonitor, FiUser, FiLock, FiArrowRight, FiPlay, FiDollarSign, FiFacebook, FiGlobe } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Login.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [openingCash, setOpeningCash] = useState('');
    const [step, setStep] = useState('login'); // 'login' | 'shift'
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth(); // getting user from context might be null initially
    const navigate = useNavigate();

    // Store temp user ID for shift start
    const [tempUserId, setTempUserId] = useState(null);
    const [tempUserName, setTempUserName] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            toast.error('أدخل اسم المستخدم وكلمة المرور');
            return;
        }
        setLoading(true);
        try {
            const data = await login(username, password);
            const loggedUser = data.user;

            if (loggedUser.role === 'admin') {
                toast.success(`مرحباً ${loggedUser.name}`);
                navigate('/');
            } else {
                // Check for active shift
                try {
                    const shiftRes = await api.get(`/shifts/current?userId=${loggedUser._id}`);
                    if (shiftRes.data) {
                        toast.success(`متابعة الوردية السابقة`);
                        navigate('/pos');
                    } else {
                        // No shift? Go to shift start step
                        setTempUserId(loggedUser._id);
                        setTempUserName(loggedUser.name);
                        setStep('shift');
                    }
                } catch (err) {
                    // If error checking shift, just go to POS (maybe api error)
                    console.error(err);
                    navigate('/pos');
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'فشل تسجيل الدخول');
        } finally {
            setLoading(false);
        }
    };

    const handleStartShift = async (e) => {
        e.preventDefault();
        if (!openingCash) {
            toast.error('أدخل رصيد الافتتاح');
            return;
        }
        setLoading(true);
        try {
            await api.post('/shifts/start', {
                userId: tempUserId,
                userName: tempUserName,
                openingCash: parseFloat(openingCash)
            });
            toast.success('تم بدء الوردية بنجاح');
            navigate('/pos');
        } catch (err) {
            toast.error(err.message || 'فشل بدء الوردية');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="login-bg-gradient"></div>
            </div>

            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo-container">
                            <FiMonitor className="login-logo-icon" />
                        </div>
                        <h1>شركة برمجلي</h1>
                        <p>{step === 'login' ? 'أدخل بياناتك للمتابعة' : `مرحباً ${tempUserName}، أدخل رصيد الافتتاح`}</p>
                    </div>

                    {step === 'login' ? (
                        <form className="login-form" onSubmit={handleLogin}>
                            <div className="input-group">
                                <label className="input-label">اسم المستخدم</label>
                                <div className="input-with-icon">
                                    <FiUser className="input-icon" />
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="اسم المستخدم"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">كلمة المرور</label>
                                <div className="input-with-icon">
                                    <FiLock className="input-icon" />
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg full-width" disabled={loading}>
                                {loading ? <div className="spinner-sm"></div> : <>تسجيل الدخول <FiArrowRight /></>}
                            </button>
                        </form>
                    ) : (
                        <form className="login-form" onSubmit={handleStartShift}>
                            <div className="input-group">
                                <label className="input-label">رصيد الافتتاح (الكاش في الدرج)</label>
                                <div className="input-with-icon">
                                    <FiDollarSign className="input-icon" />
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0.00"
                                        value={openingCash}
                                        onChange={(e) => setOpeningCash(e.target.value)}
                                        autoFocus
                                        min="0"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-success btn-lg full-width" disabled={loading}>
                                {loading ? <div className="spinner-sm"></div> : <>بدء الوردية <FiPlay /></>}
                            </button>
                            <button type="button" className="btn btn-ghost full-width" onClick={() => setStep('login')} disabled={loading}>
                                العودة
                            </button>
                        </form>
                    )}

                    <div className="login-footer">
                        <p>بواسطة: <strong>شركة برمجلي</strong></p>
                        <p dir="ltr" style={{ marginTop: '8px', color: 'var(--primary-light)', fontWeight: 600 }}>+201010254819</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                            <a href="https://www.facebook.com/BarmaglyOfficial" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', textDecoration: 'none' }}>
                                <FiFacebook /> Facebook
                            </a>
                            <a href="http://barmagly.tech/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', textDecoration: 'none' }}>
                                <FiGlobe /> Website
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
