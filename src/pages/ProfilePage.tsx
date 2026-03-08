import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
    const { user } = useAuth();

    const profileFields = [
        { icon: '🆔', label: 'User ID', value: user?.id?.toString() || '—' },
        { icon: '👤', label: 'Tên đăng nhập', value: user?.username || '—' },
        { icon: '📝', label: 'Họ tên', value: user?.fullName || '—' },
        { icon: '📧', label: 'Email', value: user?.email || '—' },
        { icon: '🎖️', label: 'Vai trò', value: 'Thành viên (Member)' },
    ];

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="profile-avatar-large">
                    {user?.username.charAt(0).toUpperCase()}
                </div>
                <h1 className="profile-name">{user?.fullName || user?.username}</h1>
                <span className="role-badge large member">👤 Member</span>
            </div>

            <div className="profile-section">
                <h2 className="section-title">📋 Thông tin tài khoản</h2>
                <div className="profile-fields">
                    {profileFields.map((field, index) => (
                        <div key={index} className="profile-field">
                            <div className="field-icon">{field.icon}</div>
                            <div className="field-content">
                                <span className="field-label">{field.label}</span>
                                <span className="field-value">{field.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="profile-section">
                <h2 className="section-title">🔒 Bảo mật</h2>
                <div className="security-info">
                    <div className="security-item">
                        <span className="security-icon">✅</span>
                        <div>
                            <span className="security-label">Mật khẩu</span>
                            <span className="security-value">Được mã hóa BCrypt</span>
                        </div>
                    </div>
                    <div className="security-item">
                        <span className="security-icon">✅</span>
                        <div>
                            <span className="security-label">Xác thực</span>
                            <span className="security-value">JWT Token đang hoạt động</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
