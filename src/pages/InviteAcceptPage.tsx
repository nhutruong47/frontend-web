import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

interface InviteTokenPayload {
    email?: string;
    teamId?: string;
    role?: string;
    exp?: number;
}

export default function InviteAcceptPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<InviteTokenPayload | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Đường dẫn không hợp lệ — thiếu token.');
            return;
        }
        try {
            const decoded = jwtDecode<InviteTokenPayload>(token);
            // Kiểm tra hết hạn
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                setError('Link mời đã hết hạn (sau 7 ngày).');
                return;
            }
            setTokenInfo(decoded);
        } catch {
            setError('Token không hợp lệ hoặc đã bị chỉnh sửa.');
        }
    }, [token]);

    const handleAccept = async () => {
        if (!isAuthenticated) {
            navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
            return;
        }
        try {
            setLoading(true);
            const jwt = localStorage.getItem('token');
            await axios.post(
                'http://localhost:8080/api/teams/invites/accept',
                { token },
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            setDone(true);
            setTimeout(() => navigate('/dashboard'), 2500);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Không thể tham gia nhóm. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 20,
                border: '1px solid var(--border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
                maxWidth: 440,
                width: '100%',
                padding: '48px 40px',
                textAlign: 'center',
                animation: 'fadeInUp 0.4s ease'
            }}>
                {/* Logo ORCA */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{
                        width: 72, height: 72,
                        borderRadius: '50%',
                        background: error ? 'rgba(239,68,68,0.15)' : done ? 'rgba(34,197,94,0.15)' : 'rgba(212,165,116,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                        fontSize: 36
                    }}>
                        {error ? '❌' : done ? '✅' : '✉️'}
                    </div>

                    {done ? (
                        <>
                            <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
                                Tham gia thành công!
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                                Bạn đã được thêm vào nhóm. Đang chuyển về Dashboard...
                            </p>
                        </>
                    ) : error ? (
                        <>
                            <h1 style={{ color: '#ef4444', fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
                                Link không hợp lệ
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                                {error}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
                                Lời mời tham gia nhóm
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                                Bạn được mời tham gia nhóm trên hệ thống{' '}
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>ORCA</span>.
                            </p>

                            {tokenInfo?.email && (
                                <div style={{
                                    marginTop: 20,
                                    padding: '12px 16px',
                                    background: 'rgba(212,165,116,0.08)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(212,165,116,0.2)',
                                    fontSize: 13,
                                    color: 'var(--text-secondary)'
                                }}>
                                    📧 Gửi đến: <strong style={{ color: 'var(--accent-primary)' }}>{tokenInfo.email}</strong>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Buttons */}
                {!done && !error && (
                    <>
                        {!isAuthenticated && (
                            <p style={{
                                fontSize: 13,
                                color: 'var(--text-secondary)',
                                marginBottom: 20,
                                padding: '12px',
                                background: 'rgba(212,165,116,0.08)',
                                borderRadius: 10,
                                border: '1px dashed rgba(212,165,116,0.3)'
                            }}>
                                💡 Bạn cần <strong>đăng nhập</strong> hoặc <strong>tạo tài khoản</strong> để tham gia nhóm.
                            </p>
                        )}

                        <button
                            onClick={handleAccept}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: 12,
                                border: 'none',
                                background: loading ? 'var(--border)' : 'var(--accent-primary)',
                                color: '#1a0f00',
                                fontWeight: 700,
                                fontSize: 16,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: 12
                            }}
                        >
                            {loading ? '⏳ Đang xử lý...' : isAuthenticated ? '✅ Chấp nhận & Tham gia' : '🔐 Đăng nhập để tham gia'}
                        </button>

                        {!isAuthenticated && (
                            <button
                                onClick={() => navigate(`/register?returnUrl=${encodeURIComponent(location.pathname + location.search)}`)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 12,
                                    border: '1px solid var(--border)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                }}
                            >
                                Chưa có tài khoản? Đăng ký ngay
                            </button>
                        )}
                    </>
                )}

                {error && (
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 12,
                            border: 'none', background: 'var(--accent-primary)',
                            color: '#1a0f00', fontWeight: 700, fontSize: 16, cursor: 'pointer'
                        }}
                    >
                        Về trang đăng nhập
                    </button>
                )}

                <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)', opacity: 0.5 }}>
                    ORCA — Quản lý xưởng cà phê
                </p>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
