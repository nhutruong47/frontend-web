import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { Bell, MoreHorizontal, Check, MessageSquare, AlertCircle, MessageCircle, Edit } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMessages, setShowMessages] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const notifRef = useRef<HTMLDivElement>(null);
    const msgRef = useRef<HTMLDivElement>(null);

    // Mock notifications
    const [notifications] = useState([
        {
            id: 1,
            userName: 'Admin Hệ Thống',
            avatar: 'https://ui-avatars.com/api/?name=Admin&background=1e293b&color=fff',
            action: 'đã từ chối yêu cầu đăng xưởng của bạn do thiếu giấy phép kinh doanh hợp lệ.',
            isRead: false,
            time: 'Vừa xong',
            badgeIcon: <AlertCircle size={12} color="#fff" />,
            badgeColor: '#f85149'
        },
        {
            id: 2,
            userName: 'ORCA Factory Manager',
            avatar: 'https://ui-avatars.com/api/?name=ORCA&background=f59e0b&color=fff',
            action: 'đã nhắc đến bạn trong một bình luận: "Vui lòng cập nhật tiến độ".',
            isRead: false,
            time: '21 giờ',
            badgeIcon: <MessageSquare size={12} color="#fff" />,
            badgeColor: '#10b981'
        },
        {
            id: 3,
            userName: 'Hệ thống',
            avatar: 'https://ui-avatars.com/api/?name=HT&background=3b82f6&color=fff',
            action: 'chào mừng bạn đến với hệ thống quản lý Orca.',
            isRead: true,
            time: '1 ngày',
            badgeIcon: <Check size={12} color="#fff" />,
            badgeColor: '#3b82f6'
        }
    ]);

    // Mock Groups/Messages
    const [messageGroups] = useState([
        {
            id: 1,
            name: 'Xưởng May Gia Công A',
            avatar: 'https://ui-avatars.com/api/?name=Xưởng+A&background=0284c7&color=fff',
            lastMessage: 'Đã nhận được mẫu vải, tiến độ đang tốt.',
            time: '5 phút',
            unreadCount: 3,
            isActive: true
        },
        {
            id: 2,
            name: 'Nhóm Quản Lý Orca',
            avatar: 'https://ui-avatars.com/api/?name=Orca&background=059669&color=fff',
            lastMessage: 'Cuộc họp lúc 3h chiều nay nhé mọi người.',
            time: '1 giờ',
            unreadCount: 1,
            isActive: true
        },
        {
            id: 3,
            name: 'Xưởng In Ấn B',
            avatar: 'https://ui-avatars.com/api/?name=Xưởng+B&background=e11d48&color=fff',
            lastMessage: 'File thiết kế này bị lỗi font rồi bạn ơi.',
            time: '1 ngày',
            unreadCount: 0,
            isActive: false
        }
    ]);

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

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const displayNotifications = activeTab === 'all' ? notifications : notifications.filter(n => !n.isRead);
    
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
                                                    navigate(`/groups/${group.teamId}/chat`);
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
                                        <span>Trước đó</span>
                                        <button>Xem tất cả</button>
                                    </div>
                                    <div className="fb-notification-list">
                                        {displayNotifications.map(notif => (
                                            <div key={notif.id} className={`fb-notification-item ${notif.isRead ? 'read' : 'unread'}`}>
                                                <div className="fb-notif-avatar-wrapper">
                                                    <img src={notif.avatar} alt="avatar" className="fb-notif-avatar" />
                                                    <div className="fb-notif-badge" style={{ backgroundColor: notif.badgeColor }}>
                                                        {notif.badgeIcon}
                                                    </div>
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p>
                                                        <strong>{notif.userName}</strong> {notif.action}
                                                    </p>
                                                    <span className="fb-notif-time">{notif.time}</span>
                                                </div>
                                                {!notif.isRead && <div className="fb-notif-unread-dot"></div>}
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
