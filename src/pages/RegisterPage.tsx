import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orcaLogo from '../assets/orca-logo.png';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';

    useEffect(() => {
        const remembered = localStorage.getItem('orca_remember_username');
        if (remembered) {
            setUsername(remembered);
            setRememberMe(true);
        }
    }, []);

    const friendlyRegisterError = (message?: string) => {
        const text = (message || '').toLowerCase();
        if (text.includes('tồn tại') || text.includes('unique') || text.includes('constraint') || text.includes('duplicate')) {
            return 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.';
        }
        if (text.includes('sql') || text.includes('could not execute statement') || text.includes('public.')) {
            return 'Không thể đăng ký tài khoản. Vui lòng thử lại với tên đăng nhập khác.';
        }
        return message || 'Đăng ký thất bại. Vui lòng thử lại.';
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp!');
            return;
        }

        setIsLoading(true);
        try {
            await register({ username, password });
            if (rememberMe) {
                localStorage.setItem('orca_remember_username', username.trim());
            } else {
                localStorage.removeItem('orca_remember_username');
            }
            navigate(returnUrl);
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { error?: string } } };
                setError(friendlyRegisterError(axiosErr.response?.data?.error));
            } else {
                setError('Không thể kết nối đến server!');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-bg-shapes">
                <div className="shape shape-1" />
                <div className="shape shape-2" />
                <div className="shape shape-3" />
            </div>

            <div className="auth-card">
                <div className="auth-logo">
                    <img className="auth-brand-full-logo" src={orcaLogo} alt="ORCA" />
                    <p className="auth-subtitle">Tạo tài khoản mới</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">Tài khoản</label>
                        <div className="input-container">
                            <span className="input-icon"><ion-icon name="person-outline" style={{ fontSize: '16px' }}></ion-icon></span>
                            <input
                                id="register-username"
                                type="text"
                                className="form-input"
                                placeholder="Nhập tên đăng nhập"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mật khẩu</label>
                        <div className="input-container">
                            <span className="input-icon"><ion-icon name="lock-closed-outline" style={{ fontSize: '16px' }}></ion-icon></span>
                            <input
                                id="register-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input password-input"
                                placeholder="Ít nhất 6 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                <ion-icon name={showPassword ? 'eye-off-outline' : 'eye-outline'}></ion-icon>
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Xác nhận mật khẩu</label>
                        <div className="input-container">
                            <span className="input-icon"><ion-icon name="shield-checkmark-outline" style={{ fontSize: '16px' }}></ion-icon></span>
                            <input
                                id="register-confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(prev => !prev)}
                                aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                                title={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                            >
                                <ion-icon name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}></ion-icon>
                            </button>
                        </div>
                    </div>

                    <label className="remember-row">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                        />
                        <span>Ghi nhớ tài khoản</span>
                    </label>

                    {error && (
                        <div className="form-error">
                            <ion-icon name="alert-circle-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> {error}
                        </div>
                    )}

                    <button
                        id="register-submit"
                        type="submit"
                        className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="btn-spinner" />
                                Đang đăng ký...
                            </>
                        ) : (
                            'Đăng ký'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Đã có tài khoản?{' '}
                        <Link to={`/login${returnUrl !== '/dashboard' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="auth-link">
                            Đăng nhập
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
