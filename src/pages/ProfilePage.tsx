import { useAuth } from '../context/AuthContext';


export default function ProfilePage() {
    const { user } = useAuth();

    const profileFields = [
        { icon: <ion-icon name="key-outline" style={{ fontSize: '16px' }}></ion-icon>, label: 'User ID', value: user?.id?.toString() || '—' },
        { icon: <ion-icon name="person-outline" style={{ fontSize: '16px' }}></ion-icon>, label: 'Tên đăng nhập', value: user?.username || '—' },
        { icon: <ion-icon name="document-text-outline" style={{ fontSize: '16px' }}></ion-icon>, label: 'Họ tên', value: user?.fullName || '—' },
        { icon: <ion-icon name="mail-outline" style={{ fontSize: '16px' }}></ion-icon>, label: 'Email', value: user?.email || '—' },
        { icon: <ion-icon name="ribbon-outline" style={{ fontSize: '16px' }}></ion-icon>, label: 'Vai trò', value: 'Thành viên (Member)' },
    ];

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="profile-avatar-large">
                    {user?.username.charAt(0).toUpperCase()}
                </div>
                <h1 className="profile-name">{user?.fullName || user?.username}</h1>
                <span className="role-badge large member"><ion-icon name="person-outline" style={{ fontSize: '14px' }}></ion-icon> Member</span>
            </div>

            <div className="profile-section glass-panel">
                <h2 className="section-title text-glow-active" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="icon-container glow" style={{ width: 32, height: 32, fontSize: 18 }}><ion-icon name="clipboard-outline"></ion-icon></span> Thông tin tài khoản
                </h2>
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

            <div className="profile-section glass-panel">
                <h2 className="section-title text-glow-active" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="icon-container glow" style={{ width: 32, height: 32, fontSize: 18 }}><ion-icon name="lock-closed-outline"></ion-icon></span> Bảo mật
                </h2>
                <div className="security-info">
                    <div className="security-item">
                        <span className="security-icon"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '16px' }}></ion-icon></span>
                        <div>
                            <span className="security-label">Mật khẩu</span>
                            <span className="security-value">Được mã hóa BCrypt</span>
                        </div>
                    </div>
                    <div className="security-item">
                        <span className="security-icon"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '16px' }}></ion-icon></span>
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
