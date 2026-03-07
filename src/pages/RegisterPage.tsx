import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';

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
            navigate(returnUrl);
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { error?: string } } };
                setError(axiosErr.response?.data?.error || 'Đăng ký thất bại!');
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
                    <div className="auth-logo-icon">☕</div>
                    <h1 className="auth-logo-text">ORCA</h1>
                    <p className="auth-subtitle">Tạo tài khoản mới</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">Tài khoản</label>
                        <div className="input-container">
                            <span className="input-icon">👤</span>
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
                            <span className="input-icon">🔒</span>
                            <input
                                id="register-password"
                                type="password"
                                className="form-input"
                                placeholder="Ít nhất 6 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Xác nhận mật khẩu</label>
                        <div className="input-container">
                            <span className="input-icon">🔒</span>
                            <input
                                id="register-confirm-password"
                                type="password"
                                className="form-input"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="form-error">
                            <span>⚠️</span> {error}
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
