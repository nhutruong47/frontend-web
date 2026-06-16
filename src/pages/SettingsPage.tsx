import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const displayName = user?.fullName || user?.username || 'ORCA Roaster';
    const displayEmail = user?.email || (user?.username ? `${user.username}@orca-roastery.vn` : 'member@orca-roastery.vn');
    const displayRole = user?.role === 'ADMIN' ? 'Master Roaster' : 'Roastery Member';

    return (
        <div className="settings-page">
            <section className="settings-hero">
                <span>Settings</span>
                <h1>Quản lý tài khoản</h1>
                <p>Cá nhân hóa trải nghiệm rang xay và quản lý các thiết lập bảo mật cho tài khoản ORCA của bạn.</p>
            </section>

            <div className="settings-account-layout">
                <section className="settings-profile-card">
                    <div className="settings-card-top">
                        <span className="settings-pill">Thông tin cá nhân</span>
                        <button type="button">
                            <span className="material-symbols-outlined">edit</span>
                            Chỉnh sửa
                        </button>
                    </div>
                    <h2>Thông tin cơ bản</h2>
                    <div className="settings-info-grid">
                        <div>
                            <span>Họ và tên</span>
                            <strong>{displayName}</strong>
                        </div>
                        <div>
                            <span>Email đăng ký</span>
                            <strong>{displayEmail}</strong>
                        </div>
                        <div>
                            <span>Số điện thoại</span>
                            <strong>+84 902 123 456</strong>
                        </div>
                        <div>
                            <span>Vai trò</span>
                            <strong className="settings-dot-role">{displayRole}</strong>
                        </div>
                    </div>
                    <div className="settings-verification">
                        <img src="/coffee-hero.png" alt="Roastery verification" />
                        <div>
                            <h3>Xác thực Roastery</h3>
                            <p>Chứng chỉ chuyên gia đã được xác minh vào tháng 12, 2025.</p>
                        </div>
                    </div>
                </section>

                <aside className="settings-side-stack">
                    <section className="settings-security-card">
                        <div className="settings-side-head">
                            <h2>Bảo mật</h2>
                            <span className="material-symbols-outlined">shield</span>
                        </div>
                        <button type="button" className="settings-security-row">
                            <span className="material-symbols-outlined">key</span>
                            <span>
                                <strong>Mật khẩu</strong>
                                <small>Cập nhật 3 tháng trước</small>
                            </span>
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                        <button type="button" className="settings-security-row">
                            <span className="material-symbols-outlined">phonelink_lock</span>
                            <span>
                                <strong>Xác thực 2 lớp (2FA)</strong>
                                <small>Đang bật</small>
                            </span>
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                        <button type="button" className="settings-outline-btn">Đăng xuất tất cả thiết bị</button>
                    </section>

                    <section className="settings-plan-card">
                        <span>Gói dịch vụ</span>
                        <h2>Roastery Enterprise</h2>
                        <div className="settings-plan-meter">
                            <div>
                                <span>Dung lượng hồ sơ rang</span>
                                <strong>85%</strong>
                            </div>
                            <progress value="85" max="100" />
                        </div>
                        <button type="button">Nâng cấp gói</button>
                    </section>
                </aside>
            </div>

            <section className="settings-device-card">
                <div>
                    <span className="settings-pill">Thiết bị</span>
                    <h2>Thiết bị đăng nhập</h2>
                </div>
                <div className="settings-device-list">
                    <article>
                        <span className="material-symbols-outlined">desktop_windows</span>
                        <div>
                            <strong>Windows Workstation</strong>
                            <small>Đang hoạt động · Việt Nam</small>
                        </div>
                    </article>
                    <article>
                        <span className="material-symbols-outlined">smartphone</span>
                        <div>
                            <strong>Mobile Roastery App</strong>
                            <small>Đăng nhập gần đây</small>
                        </div>
                    </article>
                </div>
            </section>

            <section className="settings-device-card settings-theme-card">
                <div>
                    <span className="settings-pill">Giao diện</span>
                    <h2>Chế độ hiển thị</h2>
                    <p>{theme === 'dark' ? 'Đang dùng giao diện tối' : 'Đang dùng giao diện sáng'}</p>
                </div>
                <button className={`theme-toggle-btn ${theme}`} onClick={toggleTheme}>
                    <span className="toggle-icon">
                        {theme === 'dark'
                            ? <ion-icon name="moon-outline" style={{ fontSize: '14px' }}></ion-icon>
                            : <ion-icon name="sunny-outline" style={{ fontSize: '14px' }}></ion-icon>}
                    </span>
                    <span className="toggle-knob" />
                </button>
            </section>
        </div>
    );
}
