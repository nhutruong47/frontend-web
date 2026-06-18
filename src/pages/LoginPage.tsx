import { useState, useEffect, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orcaLogo from '../assets/orca-logo.png';

const COFFEE_BRANDS = [
    { name: 'Trung Nguyên Legend', desc: 'Thương hiệu cà phê số 1 Việt Nam', emoji: 'TN' },
    { name: 'Highlands Coffee', desc: 'Chuỗi cà phê hiện đại hàng đầu', emoji: 'HC' },
    { name: 'Phúc Long Heritage', desc: 'Di sản cà phê & trà Việt', emoji: 'PL' },
    { name: 'The Coffee House', desc: 'Không gian cà phê sáng tạo', emoji: 'CH' },
    { name: 'Cà Phê Đắk Lắk', desc: 'Thủ phủ cà phê Tây Nguyên', emoji: 'DL' },
    { name: 'Lavazza (Italy)', desc: 'Hương vị Espresso đỉnh cao', emoji: 'LV' },
];

const COFFEE_BRAND_LOGOS = [
    {
        key: 'trung-nguyen',
        top: 'TRUNG',
        bottom: 'NGUYEN',
        src: 'https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Trung-Nguyen-Ori.png'
    },
    {
        key: 'highlands',
        top: 'Highlands',
        bottom: 'COFFEE',
        src: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Highlands_Coffee_5G.svg'
    },
    {
        key: 'phuc-long',
        top: 'PHUC',
        bottom: 'LONG',
        src: 'https://congtyquatang.com.vn/wp-content/uploads/2026/04/logo-phuc-long-vector-04.jpg'
    },
    {
        key: 'coffee-house',
        top: 'THE',
        bottom: 'COFFEE HOUSE',
        src: 'https://upload.wikimedia.org/wikipedia/commons/9/97/The_Coffee_House_logo.svg'
    },
    {
        key: 'dak-lak',
        top: 'DAKLAK',
        bottom: 'COFFEE',
        src: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Emblem_of_Daklak_Province.svg'
    },
    {
        key: 'lavazza',
        top: 'LAVAZZA',
        bottom: 'ITALY',
        src: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Lavazza_-_logo_%28Italy%2C_1995%29.svg'
    },
];

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeBrand, setActiveBrand] = useState(0);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const locationState = location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null;
    const fromLocation = locationState?.from;

    const stateReturnUrl = fromLocation
        ? `${fromLocation.pathname || ''}${fromLocation.search || ''}${fromLocation.hash || ''}`
        : '';
    const returnUrl = searchParams.get('returnUrl') || stateReturnUrl || '/dashboard';

    useEffect(() => {
        const rememberedUser = localStorage.getItem('orca_remember_username');
        const rememberedPass = localStorage.getItem('orca_remember_password');
        if (rememberedUser) {
            setUsername(rememberedUser);
            setRememberMe(true);
        }
        if (rememberedPass) {
            setPassword(rememberedPass);
        }
    }, []);

    // Auto-rotate brands
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveBrand(prev => (prev + 1) % COFFEE_BRANDS.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        setIsLoading(true);
        try {
            await login({ username, password });
            if (rememberMe) {
                localStorage.setItem('orca_remember_username', username.trim());
                localStorage.setItem('orca_remember_password', password.trim());
            } else {
                localStorage.removeItem('orca_remember_username');
                localStorage.removeItem('orca_remember_password');
            }
            navigate(returnUrl, { replace: true });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { error?: string } } };
                setError(axiosErr.response?.data?.error || 'Đăng nhập thất bại!');
            } else {
                setError('Không thể kết nối đến server!');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-split">
            {/* LEFT — Hero side with coffee brands */}
            <div className="login-hero">
                <div className="login-hero-overlay" />
                <img src="/coffee-hero.png" alt="Coffee Workshop" className="login-hero-img" />

                <div className="login-hero-content">
                    <div className="login-hero-badge">ORCA Coffee Platform</div>
                    <h1 className="login-hero-title">
                        Nền tảng quản lý<br />
                        <span className="login-hero-highlight">xưởng cà phê</span><br />
                        thông minh
                    </h1>
                    <p className="login-hero-desc">
                        Tích hợp AI để tối ưu quy trình sản xuất, quản lý nguyên liệu,
                        theo dõi đơn hàng và phân công công việc tự động.
                    </p>

                    {/* Famous coffee brands carousel */}
                    <div className="login-brands">
                        <p className="login-brands-label">Đối tác & Xưởng cà phê nổi bật</p>
                        <div className="login-brands-list">
                            {COFFEE_BRANDS.map((brand, i) => {
                                const logo = COFFEE_BRAND_LOGOS[i];
                                return (
                                    <div
                                        key={brand.name}
                                        className={`login-brand-card ${i === activeBrand ? 'active' : ''}`}
                                        onClick={() => setActiveBrand(i)}
                                    >
                                        <span className={`login-brand-logo login-brand-logo--${logo.key}`}>
                                            <img
                                                src={logo.src}
                                                alt={`${brand.name} logo`}
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.style.display = 'none';
                                                    event.currentTarget.parentElement?.classList.add('login-brand-logo--fallback');
                                                }}
                                            />
                                            <span className="login-brand-logo-fallback">
                                                <strong>{logo.top}</strong>
                                                <small>{logo.bottom}</small>
                                            </span>
                                        </span>
                                        <div>
                                            <div className="login-brand-name">{brand.name}</div>
                                            <div className="login-brand-desc">{brand.desc}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="login-brands-dots">
                            {COFFEE_BRANDS.map((_, i) => (
                                <span key={i} className={`dot ${i === activeBrand ? 'active' : ''}`}
                                    onClick={() => setActiveBrand(i)} />
                            ))}
                        </div>
                    </div>

                    <div className="login-hero-stats">
                        <div className="login-hero-stat">
                            <span className="stat-value">500+</span>
                            <span className="stat-label">Xưởng sử dụng</span>
                        </div>
                        <div className="login-hero-stat">
                            <span className="stat-value">10K+</span>
                            <span className="stat-label">Đơn hàng/tháng</span>
                        </div>
                        <div className="login-hero-stat">
                            <span className="stat-value">99.9%</span>
                            <span className="stat-label">Uptime</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT — Login form */}
            <div className="login-form-side">
                <div className="login-form-container">
                    <div className="login-form-header">
                        <div className="login-logo-row">
                            <img src={orcaLogo} alt="ORCA" className="login-brand-full-logo" />
                        </div>
                        <h2 className="login-form-title">Chào mừng trở lại!</h2>
                        <p className="login-form-subtitle">Đăng nhập để quản lý xưởng cà phê của bạn</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field">
                            <label>Tài khoản</label>
                            <div className="login-input-wrap">
                                <svg className="login-input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                </svg>
                                <input
                                    id="login-username"
                                    type="text"
                                    placeholder="Nhập tên đăng nhập"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label>Mật khẩu</label>
                            <div className="login-input-wrap">
                                <svg className="login-input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="password-input"
                                    placeholder="Nhập mật khẩu"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn login-password-toggle"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    <ion-icon name={showPassword ? 'eye-off-outline' : 'eye-outline'}></ion-icon>
                                </button>
                            </div>
                        </div>

                        <label className="remember-row login-remember-row">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                            />
                            <span>Ghi nhớ tài khoản</span>
                        </label>

                        {error && (
                            <div className="login-error">
                                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            id="login-submit"
                            type="submit"
                            className={`login-btn-primary ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <><span className="login-spinner" /> Đang đăng nhập...</>
                            ) : (
                                'Đăng nhập'
                            )}
                        </button>
                    </form>

                    <div className="login-divider"><span>hoặc</span></div>

                    <button
                        id="google-login"
                        className="login-btn-google"
                        onClick={() => {
                            window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth2/authorization/google`;
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Đăng nhập bằng Google
                    </button>

                    <div className="login-footer">
                        <p>Chưa có tài khoản? <Link to={`/register${returnUrl !== '/dashboard' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="login-link">Đăng ký ngay</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
