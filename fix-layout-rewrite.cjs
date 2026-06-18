const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'Layout.tsx');

const content = `import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { Bell, MoreHorizontal, MessageCircle, Edit } from 'lucide-react';
import { teamService, notificationService } from '../services/groupService';
import type { AppNotification } from '../types/types';

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

    useEffect(() => {
        if (user) {
            teamService.getMyTeams().then(teams => {
                const mapped = teams.map(t => ({
                    id: t.id,
                    name: t.name,
                    avatar: \`https://ui-avatars.com/api/?name=\${encodeURIComponent(t.name)}&background=0284c7&color=fff\`,
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
                                                    navigate(\`/groups/\${group.id}?openChat=1\`);
                                                }}
                                                style={{cursor: 'pointer'}}
                                            >
                                                <div className="fb-notif-avatar-wrapper">
                                                    <img src={group.avatar} alt="avatar" className="fb-notif-avatar" />
                                                    {group.isActive && <div className="online-indicator"></div>}
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p className={\`msg-group-name \${group.unreadCount > 0 ? 'unread-text' : ''}\`}>
                                                        {group.name}
                                                    </p>
                                                    <div className="msg-preview">
                                                        <span className={\`msg-preview-text \${group.unreadCount > 0 ? 'unread-text' : ''}\`}>
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
                                                className={\`fb-notification-item \${notif.read ? 'read' : 'unread'}\`}
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

                        <div className="topbar-avatar" onClick={logout} title="Đăng xuất">
                            <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
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
        </div>
    );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully rewrote Layout.tsx with real data fetching.');
