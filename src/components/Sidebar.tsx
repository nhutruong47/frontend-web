import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: 'grid-outline' },
        { path: '/groups', label: 'Nhóm xưởng', icon: 'people-outline' },
        { path: '/marketplace', label: 'Thị trường', icon: 'storefront-outline' },
        { path: '/orders', label: 'Đơn hàng', icon: 'cube-outline' },
        { path: '/profile', label: 'Hồ sơ', icon: 'person-circle-outline' },
        { path: '/settings', label: 'Cài đặt', icon: 'settings-outline' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>O</div>
                <span className="logo-text">ORCA</span>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-label">MENU</div>
                {navItems.map((item) => (
                    <NavLink key={item.path} to={item.path}
                        className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}>
                        <span className="nav-icon"><ion-icon name={item.icon} style={{ fontSize: '18px' }}></ion-icon></span>
                        <span className="nav-text">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {user && (
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {(user.username || user.fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-username">{user.fullName || user.username || 'User'}</span>
                        <span className="role-badge member"><ion-icon name="person-outline" style={{ fontSize: '12px' }}></ion-icon> Member</span>
                    </div>
                </div>
            )}
        </aside>
    );
}
