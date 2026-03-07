import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();

    return (
        <div className="settings-page">
            <h1 className="settings-title">⚙️ Cài đặt</h1>

            {/* Theme Section */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <h2>🎨 Giao diện</h2>
                    <p className="settings-card-desc">Tùy chỉnh giao diện ứng dụng theo sở thích của bạn</p>
                </div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <span className="settings-row-label">Chế độ hiển thị</span>
                        <span className="settings-row-hint">
                            {theme === 'dark' ? '🌙 Đang dùng giao diện tối' : '☀️ Đang dùng giao diện sáng'}
                        </span>
                    </div>
                    <button className={`theme-toggle-btn ${theme}`} onClick={toggleTheme}>
                        <span className="toggle-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                        <span className="toggle-knob" />
                    </button>
                </div>

                <div className="theme-preview-row">
                    <div
                        className={`theme-preview-card ${theme === 'dark' ? 'selected' : ''}`}
                        onClick={() => theme !== 'dark' && toggleTheme()}
                    >
                        <div className="theme-preview dark-preview">
                            <div className="preview-sidebar" />
                            <div className="preview-content">
                                <div className="preview-bar" />
                                <div className="preview-block" />
                                <div className="preview-block short" />
                            </div>
                        </div>
                        <span>🌙 Tối</span>
                    </div>
                    <div
                        className={`theme-preview-card ${theme === 'light' ? 'selected' : ''}`}
                        onClick={() => theme !== 'light' && toggleTheme()}
                    >
                        <div className="theme-preview light-preview">
                            <div className="preview-sidebar" />
                            <div className="preview-content">
                                <div className="preview-bar" />
                                <div className="preview-block" />
                                <div className="preview-block short" />
                            </div>
                        </div>
                        <span>☀️ Sáng</span>
                    </div>
                </div>
            </div>

            {/* Account Info */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <h2>👤 Tài khoản</h2>
                    <p className="settings-card-desc">Thông tin tài khoản của bạn</p>
                </div>
                <div className="settings-info-grid">
                    <div className="settings-info-item">
                        <span className="info-label">Tên đăng nhập</span>
                        <span className="info-value">{user?.username || '—'}</span>
                    </div>
                    <div className="settings-info-item">
                        <span className="info-label">Vai trò</span>
                        <span className="info-value role-badge-inline">{user?.role || 'MEMBER'}</span>
                    </div>
                    <div className="settings-info-item">
                        <span className="info-label">Email</span>
                        <span className="info-value">{user?.email || user?.username || '—'}</span>
                    </div>
                </div>
            </div>

            {/* App Info */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <h2>ℹ️ Thông tin ứng dụng</h2>
                </div>
                <div className="settings-info-grid">
                    <div className="settings-info-item">
                        <span className="info-label">Phiên bản</span>
                        <span className="info-value">v1.0.0</span>
                    </div>
                    <div className="settings-info-item">
                        <span className="info-label">Nền tảng</span>
                        <span className="info-value">ORCA Coffee Workshop</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
