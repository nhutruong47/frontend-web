import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orcaLogo from '../assets/orca-logo.png';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const adminNavItems = [
        { path: '/admin?section=overview', label: 'Dashboard', icon: 'speedometer-outline' },
        { path: '/admin?section=businesses', label: 'Doanh nghiệp', icon: 'business-outline' },
        { path: '/admin?section=users', label: 'Người dùng', icon: 'people-outline' },
        { path: '/admin?section=subscriptions', label: 'Gói dịch vụ', icon: 'receipt-outline' },
        { path: '/admin?section=billing', label: 'Billing & Cost Control', icon: 'card-outline' },
        { path: '/admin?section=ai', label: 'AI Usage', icon: 'hardware-chip-outline' },
        { path: '/admin?section=monitoring', label: 'System Status', icon: 'pulse-outline' },
        { path: '/admin?section=support', label: 'Support Center', icon: 'help-buoy-outline' },
        { path: '/admin?section=notifications', label: 'Notification Center', icon: 'notifications-outline' },
        { path: '/admin?section=audit', label: 'Audit Log', icon: 'shield-checkmark-outline' },
    ];

    const navItems = user?.role === 'ADMIN' ? adminNavItems : [
        { path: '/dashboard', label: 'Dashboard', icon: 'grid-outline' },
        { path: '/groups', label: 'Nhóm xưởng', icon: 'people-outline' },
        { path: '/marketplace', label: 'Thị trường', icon: 'storefront-outline' },
        { path: '/orders', label: 'Đơn hàng', icon: 'cube-outline' },
    ];

    const userMenuItems = [
        { path: '/upgrade', label: 'Nâng cấp AI', icon: 'sparkles-outline' },
        { path: '/profile', label: 'Hồ sơ', icon: 'person-circle-outline' },
        { path: '/settings', label: 'Cài đặt', icon: 'settings-outline' },
    ];
    const isNavActive = (path: string) => {
        if (path.startsWith('/admin')) {
            const section = new URLSearchParams(path.split('?')[1] || '').get('section') || 'overview';
            const currentSection = new URLSearchParams(location.search).get('section') || 'overview';
            return location.pathname === '/admin' && section === currentSection;
        }
        if (path === '/marketplace') {
            return location.pathname.startsWith('/marketplace')
                || location.pathname === '/dat-hang'
                || location.pathname === '/thi-truong-dat-hang';
        }
        return location.pathname.startsWith(path);
    };
    const userMenuActive = userMenuItems.some((item) => location.pathname.startsWith(item.path));

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img className="app-logo-mark sidebar-brand-logo" src={orcaLogo} alt="ORCA" />
            </div>

            <nav className="sidebar-nav">
                <div className="nav-label">MENU</div>
                {navItems.map((item) => {
                    const active = isNavActive(item.path);
                    return (
                        <NavLink key={item.path} to={item.path} className={() => `nav-item ${active ? 'active' : ''}`}>
                            <span className="nav-icon"><ion-icon name={item.icon} style={{ fontSize: '18px' }}></ion-icon></span>
                            <span className="nav-text">{item.label}</span>
                        </NavLink>
                    );
                })}
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
                                    <span className="nav-icon">
                                        {item.path === '/admin'
                                            ? <img className="admin-menu-logo" src={orcaLogo} alt="" aria-hidden="true" />
                                            : <ion-icon name={item.icon} style={{ fontSize: '17px' }}></ion-icon>}
                                    </span>
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
                            <img className="sidebar-avatar-logo" src={orcaLogo} alt="" aria-hidden="true" />
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
