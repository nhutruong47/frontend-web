import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: 'grid-outline' },
        { path: '/groups', label: 'Nhóm xưởng', icon: 'people-outline' },
        { path: '/marketplace', label: 'Thị trường', icon: 'storefront-outline' },
        { path: '/orders', label: 'Đơn hàng', icon: 'cube-outline' },
    ];

    const userMenuItems = [
        { path: '/upgrade', label: 'Nâng cấp AI', icon: 'sparkles-outline' },
        ...(user?.role === 'ADMIN' ? [{ path: '/admin', label: 'Admin', icon: 'shield-checkmark-outline' }] : []),
        { path: '/profile', label: 'Hồ sơ', icon: 'person-circle-outline' },
        { path: '/settings', label: 'Cài đặt', icon: 'settings-outline' },
    ];
    const userMenuActive = userMenuItems.some((item) => location.pathname.startsWith(item.path));

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
                <div className="sidebar-user-wrap">
                    {userMenuOpen && (
                        <div className="sidebar-user-menu">
                            {userMenuItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={`sidebar-user-menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                                    onClick={() => setUserMenuOpen(false)}
                                >
                                    <span className="nav-icon"><ion-icon name={item.icon} style={{ fontSize: '17px' }}></ion-icon></span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        className={`sidebar-user ${userMenuOpen || userMenuActive ? 'active' : ''}`}
                        onClick={() => setUserMenuOpen((open) => !open)}
                        aria-expanded={userMenuOpen}
                    >
                        <div className="sidebar-avatar">
                            {(user.username || user.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-username">{user.fullName || user.username || 'User'}</span>
                            <span className={`role-badge ${user.role === 'ADMIN' ? 'manager' : 'member'}`}>
                                <ion-icon name={user.role === 'ADMIN' ? 'shield-checkmark-outline' : 'person-outline'} style={{ fontSize: '12px' }}></ion-icon> {user.role === 'ADMIN' ? 'Admin' : 'Member'}
                            </span>
                        </div>
                        <ion-icon name={userMenuOpen ? 'chevron-down-outline' : 'chevron-up-outline'} style={{ marginLeft: 'auto', color: 'var(--shell-text-soft)', fontSize: '16px' }}></ion-icon>
                    </button>
                </div>
            )}
        </aside>
    );
}
