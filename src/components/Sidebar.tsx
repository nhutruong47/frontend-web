import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/groups', label: 'Nhóm xưởng', icon: '🏭' },
        { path: '/marketplace', label: 'Thị trường', icon: '🛒' },
        { path: '/orders', label: 'Đơn hàng', icon: '📦' },
        { path: '/profile', label: 'Hồ sơ', icon: '👤' },
        { path: '/settings', label: 'Cài đặt', icon: '⚙️' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">🐋</div>
                <span className="logo-text">ORCA</span>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-label">MENU</div>
                {navItems.map((item) => (
                    <NavLink key={item.path} to={item.path}
                        className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}>
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-text">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {user && (
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-username">{user.username}</span>
                        <span className="role-badge member">👤 Member</span>
                    </div>
                </div>
            )}
        </aside>
    );
}
