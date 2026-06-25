import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { Bell, MoreHorizontal, MessageCircle, Edit, Sparkles } from 'lucide-react';
import { teamService, notificationService } from '../services/groupService';
import type { AppNotification } from '../types/types';
import defaultAvatar from '../assets/default-avatar.png';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMessages, setShowMessages] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const notifRef = useRef<HTMLDivElement>(null);
    const msgRef = useRef<HTMLDivElement>(null);

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [messageGroups, setMessageGroups] = useState<any[]>([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        const handlePaymentRequired = () => {
            setShowUpgradeModal(true);
        };
        window.addEventListener('payment-required', handlePaymentRequired);
        return () => window.removeEventListener('payment-required', handlePaymentRequired);
    }, []);

    useEffect(() => {
        if (user) {
            teamService.getMyTeams().then(teams => {
                const mapped = teams.map(t => ({
                    id: t.id,
                    name: t.name,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=0284c7&color=fff`,
                    lastMessage: t.description || 'Nhấn để mở đoạn chat của nhóm',
                    time: new Date(t.createdAt).toLocaleDateString('vi-VN'),
                    unreadCount: 0,
                    isActive: false
                }));
                setMessageGroups(mapped);
            }).catch(console.error);

            notificationService.getAll().then(setNotifications).catch(console.error);
        }
    }, [user]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (msgRef.current && !msgRef.current.contains(event.target as Node)) {
                setShowMessages(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;
    const displayNotifications = activeTab === 'all' ? notifications : notifications.filter(n => !n.read);
    
    const unreadMsgCount = messageGroups.reduce((acc, curr) => acc + curr.unreadCount, 0);

    return (
        <div className="layout">
            <Sidebar />
            <div className="layout-main">
                {/* Top bar */}
                <header className="topbar">
                    <div className="topbar-left">
                        <h2 className="topbar-greeting">
                            Xin chào, <span className="topbar-username">{user?.fullName || user?.username || 'Người dùng'}</span>
                        </h2>
                    </div>
                    <div className="topbar-right">
                        
                        {/* MESSENGER DROPDOWN */}
                        <div className="topbar-messenger" ref={msgRef}>
                            <button 
                                className="notification-btn" 
                                title="Tin nhắn"
                                onClick={() => {
                                    setShowMessages(!showMessages);
                                    if (!showMessages) setShowNotifications(false);
                                }}
                            >
                                <MessageCircle size={20} />
                                {unreadMsgCount > 0 && <span className="notification-badge">{unreadMsgCount}</span>}
                            </button>

                            {showMessages && (
                                <div className="fb-notification-dropdown msg-dropdown">
                                    <div className="fb-notification-header">
                                        <h3>Đoạn chat</h3>
                                        <div style={{display: 'flex', gap: '8px'}}>
                                            <button className="fb-notification-options"><MoreHorizontal size={20}/></button>
                                            <button className="fb-notification-options"><Edit size={18}/></button>
                                        </div>
                                    </div>
                                    <div className="fb-notification-list">
                                        {messageGroups.map(group => (
                                            <div 
                                                key={group.id} 
                                                className="fb-notification-item msg-item"
                                                onClick={() => {
                                                    setShowMessages(false);
                                                    navigate(`/groups/${group.id}?openChat=1`);
                                                }}
                                                style={{cursor: 'pointer'}}
                                            >
                                                <div className="fb-notif-avatar-wrapper">
                                                    <img src={group.avatar} alt="avatar" className="fb-notif-avatar" />
                                                    {group.isActive && <div className="online-indicator"></div>}
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p className={`msg-group-name ${group.unreadCount > 0 ? 'unread-text' : ''}`}>
                                                        {group.name}
                                                    </p>
                                                    <div className="msg-preview">
                                                        <span className={`msg-preview-text ${group.unreadCount > 0 ? 'unread-text' : ''}`}>
                                                            {group.lastMessage}
                                                        </span>
                                                        <span className="msg-preview-time"> · {group.time}</span>
                                                    </div>
                                                </div>
                                                {group.unreadCount > 0 && (
                                                    <div className="msg-unread-badge-icon">
                                                        {group.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="fb-notification-footer">
                                        <button onClick={() => { setShowMessages(false); navigate('/groups'); }}>Xem tất cả trong Messenger</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* NOTIFICATION DROPDOWN */}
                        <div className="topbar-notification" ref={notifRef}>
                            <button 
                                className="notification-btn"
                                onClick={() => {
                                    setShowNotifications(!showNotifications);
                                    if (!showNotifications) setShowMessages(false);
                                }}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>
                            
                            {showNotifications && (
                                <div className="fb-notification-dropdown">
                                    <div className="fb-notification-header">
                                        <h3>Thông báo</h3>
                                        <button className="fb-notification-options"><MoreHorizontal size={20}/></button>
                                    </div>
                                    <div className="fb-notification-tabs">
                                        <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>Tất cả</button>
                                        <button className={activeTab === 'unread' ? 'active' : ''} onClick={() => setActiveTab('unread')}>Chưa đọc</button>
                                    </div>
                                    <div className="fb-notification-section">
                                        <span>Gần đây</span>
                                        <button>Xem tất cả</button>
                                    </div>
                                    <div className="fb-notification-list">
                                        {displayNotifications.map(notif => (
                                            <div 
                                                key={notif.id} 
                                                className={`fb-notification-item ${notif.read ? 'read' : 'unread'}`}
                                                onClick={() => {
                                                    if (!notif.read) {
                                                        notificationService.markAsRead(notif.id).then(() => {
                                                            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                                        }).catch(console.error);
                                                    }
                                                    if (notif.taskId) {
                                                        // Example navigation if there's a taskId
                                                        setShowNotifications(false);
                                                    }
                                                }}
                                                style={{cursor: 'pointer'}}
                                            >
                                                <div className="fb-notif-avatar-wrapper">
                                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                                                        <Bell size={24} color="#fff" />
                                                    </div>
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p>
                                                        <strong>Hệ thống</strong> {notif.message}
                                                    </p>
                                                    <span className="fb-notif-time">{new Date(notif.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                {!notif.read && <div className="fb-notif-unread-dot"></div>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="fb-notification-footer">
                                        <button>Xem thông báo trước đó</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="topbar-avatar" onClick={() => navigate('/profile')} title="Hồ sơ nhân viên" style={{ cursor: 'pointer', backgroundImage: `url(${user?.avatar || defaultAvatar})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' }}>
                        </div>
                        <button className="topbar-logout" onClick={logout}>
                            Đăng xuất
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>

            {showUpgradeModal && (
                <div className="modal-overlay">
                    <div className="modal-content upgrade-required-modal">
                        <div style={{ color: '#7c3aed', marginBottom: '16px' }}>
                            <Sparkles size={48} style={{ margin: '0 auto' }} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Nâng cấp để tiếp tục</h3>
                        <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '15px' }}>
                            Chọn gói phù hợp để tiếp tục sử dụng trợ lý AI ORCA.
                        </p>
                        <div className="upgrade-required-actions">
                            <button
                                className="btn-secondary upgrade-required-button"
                                onClick={() => setShowUpgradeModal(false)}
                            >
                                Đóng
                            </button>
                            <button
                                className="btn-primary upgrade-required-button upgrade-required-primary"
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    navigate('/nang-cap-goi');
                                }}
                            >
                                Nâng cấp gói
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
