import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService } from '../services/groupService';
import { interGroupOrderService } from '../services/interGroupOrderService';
import orcaLogo from '../assets/orca-logo.png';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [pendingOrderCount, setPendingOrderCount] = useState(0);
    const displayName = user?.fullName || user?.username || 'Người dùng';
    const displayPlan = user?.aiPlan || 'free';
    const userInitials = displayName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

    const getPlanColor = (plan: string) => {
        switch (plan.toLowerCase()) {
            case 'free': return { bg: 'transparent', text: '#9ca3af', label: 'Miễn phí' };
            case 'professional':
            case 'plus': return { bg: 'transparent', text: '#e7a766', label: 'Plus' };
            case 'pro': return { bg: 'transparent', text: '#8b5cf6', label: 'Pro' };
            case 'enterprise': return { bg: 'transparent', text: '#ec4899', label: 'Doanh nghiệp' };
            default: return { bg: 'transparent', text: '#9ca3af', label: plan };
        }
    };
    const planStyle = getPlanColor(displayPlan);

    useEffect(() => {
        if (!user || user.role === 'ADMIN') {
            setPendingOrderCount(0);
            return;
        }

        let cancelled = false;

        const fetchPendingOrders = async () => {
            try {
                const teams = await teamService.getMyTeams();
                const ownedTeams = teams.filter(team => team.ownerId === user.id);

                if (ownedTeams.length === 0) {
                    const myOutboundOrders = await interGroupOrderService.getMyOutboundOrders();
                    const nextCount = myOutboundOrders.filter(order => order.buyerViewed === false).length;
                    if (!cancelled) setPendingOrderCount(nextCount);
                    return;
                }

                const myOutboundOrders = await interGroupOrderService.getMyOutboundOrders();
                const teamOutboundOrders = await Promise.all(
                    ownedTeams.map(team => interGroupOrderService.getOutboundOrders(team.id))
                );
                const inboundOrders = await Promise.all(
                    ownedTeams.map(team => interGroupOrderService.getInboundOrders(team.id))
                );

                const outboundUnread = [
                    ...myOutboundOrders,
                    ...teamOutboundOrders.flat()
                ].filter(order => order.buyerViewed === false).length;

                const inboundUnread = inboundOrders
                    .flat()
                    .filter(order => order.sellerViewed === false).length;

                const nextCount = outboundUnread + inboundUnread;

                if (!cancelled) setPendingOrderCount(nextCount);
            } catch (error) {
                if (!cancelled) setPendingOrderCount(0);
                console.error('Unable to load pending order count', error);
            }
        };

        fetchPendingOrders();
        const intervalId = window.setInterval(fetchPendingOrders, 30000);
        window.addEventListener('focus', fetchPendingOrders);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', fetchPendingOrders);
        };
    }, [user]);

    const adminNavItems = [
        { path: '/admin?section=overview', label: 'Tổng quan', icon: 'speedometer-outline' },
        { path: '/admin?section=businesses', label: 'Doanh nghiệp', icon: 'business-outline' },
        { path: '/admin?section=users', label: 'Người dùng', icon: 'people-outline' },
        { path: '/admin?section=subscriptions', label: 'Gói dịch vụ', icon: 'receipt-outline' },
        { path: '/admin?section=billing', label: 'Thanh toán & chi phí', icon: 'card-outline' },
        { path: '/admin?section=ai', label: 'Sử dụng AI', icon: 'hardware-chip-outline' },
        { path: '/admin?section=support', label: 'Trung tâm hỗ trợ', icon: 'help-buoy-outline' },
        { path: '/admin?section=notifications', label: 'Trung tâm thông báo', icon: 'notifications-outline' },
        { path: '/admin?section=audit', label: 'Nhật ký kiểm toán', icon: 'shield-checkmark-outline' },
    ];

    const navItems = user?.role === 'ADMIN' ? adminNavItems : [
        { path: '/dashboard', label: 'Tổng quan', icon: 'grid-outline' },
        { path: '/groups', label: 'Nhóm xưởng', icon: 'people-outline', afterDivider: true },
        { path: '/marketplace', label: 'Thị trường', icon: 'storefront-outline' },
        { path: '/orders', label: 'Đơn hàng', icon: 'cube-outline', badge: pendingOrderCount },
    ];

    const accountMenuItems = [
        { path: '/upgrade', label: 'Nâng cấp gói', icon: 'sparkles-outline' },
        { path: '/settings', label: 'Cá nhân hóa', icon: 'color-palette-outline' },
        { path: '/profile', label: 'Hồ sơ', icon: 'person-circle-outline' },
        { path: '/settings', label: 'Cài đặt', icon: 'settings-outline' },
        { path: '/settings', label: 'Trợ giúp', icon: 'help-buoy-outline', separated: true, hasChevron: true },
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
    const userMenuActive = accountMenuItems.some((item) => location.pathname.startsWith(item.path));

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img className="app-logo-mark sidebar-brand-logo" src={orcaLogo} alt="ORCA" />
            </div>

            <nav className="sidebar-nav">
                <div className="nav-label">DANH MỤC</div>
                {navItems.map((item) => {
                    const active = isNavActive(item.path);
                    return (
                        <div className="nav-item-wrap" key={item.path}>
                            <NavLink to={item.path} className={() => `nav-item ${active ? 'active' : ''}`}>
                                <span className="nav-icon"><ion-icon name={item.icon} style={{ fontSize: '18px' }}></ion-icon></span>
                                <span className="nav-text">{item.label}</span>
                                {!!item.badge && item.badge > 0 && (
                                    <span className="nav-badge" style={{
                                        marginLeft: 'auto',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                        lineHeight: 1,
                                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                                        minWidth: '20px',
                                        textAlign: 'center'
                                    }}>
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                            {item.afterDivider && <div className="nav-divider" role="separator" />}
                        </div>
                    );
                })}
            </nav>

            {user && (
                <div className="sidebar-user-wrap">
                    {userMenuOpen && (
                        <div className="sidebar-user-menu">
                            <div className="sidebar-user-menu-head">
                                <div className="sidebar-avatar sidebar-avatar-initials">{userInitials || 'U'}</div>
                                <div className="sidebar-user-info">
                                    <span className="sidebar-username">{displayName}</span>
                                    <span className="sidebar-user-plan">{displayPlan}</span>
                                </div>
                                <ion-icon name="chevron-forward-outline" className="sidebar-menu-head-chevron"></ion-icon>
                            </div>
                            {accountMenuItems.map((item) => (
                                <NavLink
                                    key={`${item.path}-${item.label}`}
                                    to={item.path}
                                    className={`sidebar-user-menu-item ${item.separated ? 'separated' : ''} ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                                    onClick={() => setUserMenuOpen(false)}
                                >
                                    <span className="nav-icon">
                                        <ion-icon name={item.icon} style={{ fontSize: '18px' }}></ion-icon>
                                    </span>
                                    <span>{item.label}</span>
                                    {item.hasChevron && <ion-icon name="chevron-forward-outline" className="sidebar-menu-chevron"></ion-icon>}
                                </NavLink>
                            ))}
                            <button
                                type="button"
                                className="sidebar-user-menu-item sidebar-user-menu-button"
                                onClick={() => {
                                    setUserMenuOpen(false);
                                    logout();
                                }}
                            >
                                <span className="nav-icon"><ion-icon name="log-out-outline" style={{ fontSize: '18px' }}></ion-icon></span>
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        className={`sidebar-user ${userMenuOpen || userMenuActive ? 'active' : ''}`}
                        onClick={() => setUserMenuOpen((open) => !open)}
                        aria-expanded={userMenuOpen}
                    >
                        <div className="sidebar-avatar sidebar-avatar-initials">{userInitials || 'U'}</div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-username">{displayName}</span>
                            <span 
                                className="sidebar-user-plan"
                                style={{
                                    background: planStyle.bg,
                                    color: planStyle.text,
                                    padding: planStyle.bg === 'transparent' ? '2px 0' : '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    display: 'inline-block',
                                    marginTop: '2px'
                                }}
                            >{planStyle.label}</span>
                        </div>
                        <ion-icon name={userMenuOpen ? 'chevron-down-outline' : 'storefront-outline'} style={{ marginLeft: 'auto', color: 'var(--shell-text-soft)', fontSize: '18px' }}></ion-icon>
                    </button>
                </div>
            )}
        </aside>
    );
}
