import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService, taskService, notificationService } from '../services/groupService';
import type { Team, Task, AppNotification } from '../types/types';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from '../services/api';

import { type ReactNode } from 'react';

export default function DashboardPage() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [myTasks, setMyTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const stompRef = useRef<Client | null>(null);

    useEffect(() => {
        Promise.all([
            teamService.getMyTeams().catch(() => []),
            user?.id ? taskService.getMyTasks(user.id).catch(() => []) : Promise.resolve([])
        ]).then(([t, tasks]) => {
            setTeams(t);
            setMyTasks(tasks);
            setLoading(false);
        });
        // Load notifications
        notificationService.getAll().then(setNotifications).catch(() => {});
        notificationService.getUnreadCount().then(r => setUnreadCount(r.count)).catch(() => {});
    }, [user?.id]);

    // WebSocket for realtime notifications
    useEffect(() => {
        if (!user?.id) return;
        const token = localStorage.getItem('token');
        const socket = new SockJS(`${API_BASE_URL}/ws?token=${token}`);
        const client = new Client({
            webSocketFactory: () => socket as any,
            onConnect: () => {
                client.subscribe(`/topic/user/${user.id}/notifications`, (msg) => {
                    const notif: AppNotification = JSON.parse(msg.body);
                    setNotifications(prev => [notif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                });
            },
        });
        client.activate();
        stompRef.current = client;
        return () => { client.deactivate(); };
    }, [user?.id]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleAcceptReject = useCallback(async (taskId: string, accepted: boolean, notifId: string) => {
        try {
            await taskService.respondToTask(taskId, accepted);
            await notificationService.markAsRead(notifId);
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            // Refresh tasks
            if (user?.id) {
                taskService.getMyTasks(user.id).then(setMyTasks).catch(() => {});
            }
        } catch (err) { console.error(err); }
    }, [user?.id]);

    const handleMarkAllRead = useCallback(async () => {
        await notificationService.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    const pendingTasks = (myTasks || []).filter(t => t?.status === 'PENDING');
    const inProgressTasks = (myTasks || []).filter(t => t?.status === 'IN_PROGRESS');
    const completedTasks = (myTasks || []).filter(t => t?.status === 'COMPLETED');
    const completionPct = (myTasks || []).length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div className="btn-spinner" style={{ width: 40, height: 40, borderColor: 'var(--accent-primary) transparent transparent transparent' }}></div>
        </div>
    );

    return (
        <div className="dashboard-wrapper" style={{ padding: '0 0 40px 0' }}>
            {/* HERO BANNER - COFFEE ROASTERY THEME */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: 280,
                borderRadius: '0 0 24px 24px',
                overflow: 'hidden',
                marginBottom: 32,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>

                {/* 🔔 Notification Bell - positioned top-right */}
                <div ref={notifRef} style={{ position: 'absolute', top: 20, right: 28, zIndex: 100 }}>
                    <button onClick={() => setShowNotifDropdown(p => !p)} style={{
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                        padding: '8px 12px', cursor: 'pointer', color: '#fff', fontSize: 20,
                        display: 'flex', alignItems: 'center', gap: 6, position: 'relative'
                    }}>
                        <ion-icon name="notifications-outline" style={{ fontSize: '22px' }}></ion-icon>
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                background: '#f43f5e', color: '#fff', fontSize: 10, fontWeight: 800,
                                borderRadius: 99, minWidth: 18, height: 18,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0 4px', border: '2px solid rgba(0,0,0,0.3)'
                            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifDropdown && (
                        <div style={{
                            position: 'absolute', top: 48, right: 0, width: 380,
                            background: 'var(--bg-secondary, #1e1e2e)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            maxHeight: 420, overflow: 'hidden', display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: 15 }}>Thông báo</strong>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} style={{
                                        background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 12, cursor: 'pointer', fontWeight: 600
                                    }}>Đánh dấu tất cả đã đọc</button>
                                )}
                            </div>
                            <div style={{ overflowY: 'auto', maxHeight: 360, padding: '4px 0' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                        Không có thông báo mới
                                    </div>
                                ) : notifications.slice(0, 20).map(n => (
                                    <div key={n.id} style={{
                                        padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: n.read ? 'transparent' : 'rgba(99,102,241,0.08)',
                                        transition: 'background 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <span style={{
                                                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: n.type === 'TASK_ASSIGNED' ? 'rgba(99,102,241,0.2)'
                                                    : n.type === 'TASK_ACCEPTED' ? 'rgba(16,185,129,0.2)' : 'rgba(248,81,73,0.2)',
                                                color: n.type === 'TASK_ASSIGNED' ? '#818cf8'
                                                    : n.type === 'TASK_ACCEPTED' ? '#34d399' : '#f87171',
                                                fontSize: 16
                                            }}>
                                                <ion-icon name={n.type === 'TASK_ASSIGNED' ? 'notifications' : n.type === 'TASK_ACCEPTED' ? 'checkmark-circle' : 'close-circle'}></ion-icon>
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                                                </div>
                                                {/* Accept / Reject buttons for TASK_ASSIGNED */}
                                                {n.type === 'TASK_ASSIGNED' && !n.read && n.taskId && (
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                        <button onClick={() => handleAcceptReject(n.taskId, true, n.id)} style={{
                                                            padding: '5px 14px', borderRadius: 8, border: 'none',
                                                            background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700,
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                        }}>
                                                            <ion-icon name="checkmark" style={{ fontSize: '14px' }}></ion-icon> Nhận việc
                                                        </button>
                                                        <button onClick={() => handleAcceptReject(n.taskId, false, n.id)} style={{
                                                            padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(248,81,73,0.3)',
                                                            background: 'rgba(248,81,73,0.1)', color: '#f87171', fontSize: 12, fontWeight: 700,
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                        }}>
                                                            <ion-icon name="close" style={{ fontSize: '14px' }}></ion-icon> Từ chối
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {/* Background Image (Coffee Beans/Roastery) */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'url("https://images.unsplash.com/photo-1620189507195-68309c04c4d0?auto=format&fit=crop&q=80&w=2000")',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'brightness(0.35) contrast(1.1)'
                }} />

                {/* Gradient Overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 100%)'
                }} />

                <div style={{
                    position: 'absolute', inset: 0,
                    padding: '40px 48px',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'flex-end', zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <span style={{ fontSize: 32, filter: 'drop-shadow(0 0 10px rgba(212,156,87,0.5))' }}><ion-icon name="locate-outline" style={{ fontSize: '32px' }}></ion-icon></span>
                                <h1 style={{
                                    margin: 0, fontSize: 36, fontWeight: 800, color: '#fff',
                                    letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                                }}>
                                    Xưởng Cà Phê ORCA
                                </h1>
                            </div>
                            <p style={{ margin: 0, fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600 }}>
                                Chào mừng <strong style={{ color: 'var(--accent-primary)' }}>{user?.fullName || user?.username}</strong> quay lại bảng điều khiển. Theo dõi tiến độ sản xuất và hiệu suất của xưởng ngay hôm nay.
                            </p>
                        </div>

                        {/* Quick Stats in Banner */}
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{
                                background: 'rgba(26,20,16,0.6)', backdropFilter: 'blur(12px)',
                                padding: '12px 24px', borderRadius: 16, border: '1px solid rgba(212,156,87,0.2)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>{teams.length}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Xưởng quản lý</div>
                            </div>
                            <div style={{
                                background: 'rgba(26,20,16,0.6)', backdropFilter: 'blur(12px)',
                                padding: '12px 24px', borderRadius: 16, border: '1px solid rgba(212,156,87,0.2)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{completionPct}%</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Năng suất</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 48px' }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                    <StatCard icon={<ion-icon name="clipboard-outline" style={{ fontSize: '22px' }}></ion-icon>} label="Tổng lượng Task" value={myTasks.length} color="var(--accent-primary)" bg="linear-gradient(135deg, rgba(212,156,87,0.15), rgba(0,0,0,0))" />
                    <StatCard icon={<ion-icon name="time-outline" style={{ fontSize: '22px' }}></ion-icon>} label="Đang chờ máy/nguyên liệu" value={pendingTasks.length} color="#d29922" bg="linear-gradient(135deg, rgba(210,153,34,0.15), rgba(0,0,0,0))" />
                    <StatCard icon={<ion-icon name="flame-outline" style={{ fontSize: '22px' }}></ion-icon>} label="Đang rang/Gia công" value={inProgressTasks.length} color="#f85149" bg="linear-gradient(135deg, rgba(248,81,73,0.15), rgba(0,0,0,0))" />
                    <StatCard icon={<ion-icon name="checkmark-done-outline" style={{ fontSize: '22px' }}></ion-icon>} label="Đã hoàn thiện & Đóng gói" value={completedTasks.length} color="#3fb950" bg="linear-gradient(135deg, rgba(63,185,80,0.15), rgba(0,0,0,0))" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Member Performance */}
                        <div className="glass-panel" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2 className="text-glow-active" style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="icon-container glow" style={{ width: 32, height: 32, fontSize: 18 }}><ion-icon name="flash-outline"></ion-icon></span> Hiệu suất phân xưởng
                                </h2>
                            </div>

                            {teams.filter(t => t.members && t.members.length > 0).length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu sản xuất</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {teams.filter(t => t.members && t.members.length > 0).map(t => (
                                        <div key={t.id}>
                                            <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                                                <ion-icon name="business-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> {t.name}
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {t.members?.map(m => {
                                                    const pct = m.completionRate || 0;
                                                    const barColor = pct >= 80 ? '#3fb950' : pct >= 50 ? '#d29922' : '#f85149';
                                                    return (
                                                        <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                            <div style={{
                                                                width: 36, height: 36, borderRadius: 12,
                                                                background: `linear-gradient(135deg, ${barColor}40, rgba(0,0,0,0.5))`,
                                                                border: `1px solid ${barColor}40`, color: barColor,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 12, fontWeight: 700
                                                            }}>
                                                                {(m.fullName || m.username).substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                    <span style={{ fontSize: 14, fontWeight: 600 }}>{m.fullName || m.username}</span>
                                                                    <span style={{ fontSize: 13, color: barColor, fontWeight: 700 }}>
                                                                        {m.completedTasks || 0}/{m.totalTasks || 0} mẻ ({pct}%)
                                                                    </span>
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                                                                    <div style={{
                                                                        height: '100%', borderRadius: 999,
                                                                        background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                                                                        width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                        boxShadow: `0 0 10px ${barColor}66`
                                                                    }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Actions Card */}
                        <div className="glass-panel" style={{ padding: 24 }}>
                            <h2 className="text-glow-active" style={{ fontSize: 16, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="icon-container glow" style={{ width: 28, height: 28, fontSize: 14 }}><ion-icon name="build-outline"></ion-icon></span> Thao tác nhanh
                            </h2>
                            <button className="hover-lift" onClick={() => navigate('/groups')} style={{
                                width: '100%', padding: '14px', borderRadius: 12, background: 'var(--accent-gradient)',
                                color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
                                boxShadow: '0 4px 15px rgba(212,156,87,0.3)', transition: 'all 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                <span style={{ fontSize: 18 }}>+</span> Mở xưởng sản xuất mới
                            </button>
                            <button onClick={() => navigate('/marketplace')} style={{
                                width: '100%', padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s'
                            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                                <span><ion-icon name="storefront-outline" style={{ fontSize: '14px' }}></ion-icon></span> Vào thị trường gia công
                            </button>
                        </div>

                        {/* Recent Tasks */}
                        <div className="glass-panel" style={{ padding: 24, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <h2 className="text-glow-active" style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="icon-container glow" style={{ width: 28, height: 28, fontSize: 14 }}><ion-icon name="locate-outline"></ion-icon></span> Nhiệm vụ của bạn
                                </h2>
                            </div>

                            {myTasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>—</div>
                                    Máy móc đang rảnh rỗi.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {myTasks.slice(0, 5).map(t => {
                                        const st = t.status === 'PENDING'
                                            ? { bg: 'rgba(210,153,34,0.15)', color: '#d29922', label: 'Chờ xử lý', border: 'rgba(210,153,34,0.3)' }
                                            : t.status === 'IN_PROGRESS'
                                                ? { bg: 'rgba(248,81,73,0.15)', color: '#f85149', label: 'Đang rang', border: 'rgba(248,81,73,0.3)' }
                                                : { bg: 'rgba(63,185,80,0.15)', color: '#3fb950', label: 'Hoàn thành', border: 'rgba(63,185,80,0.3)' };
                                        return (
                                            <div key={t.id} style={{
                                                background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 16px',
                                                borderLeft: `4px solid ${st.color}`, borderTop: '1px solid rgba(255,255,255,0.05)',
                                                borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                    <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t.title}</strong>
                                                    <span style={{
                                                        fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                                                        background: st.bg, color: st.color, border: `1px solid ${st.border}`
                                                    }}>{st.label}</span>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
                                                    <span><ion-icon name="locate-outline" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> {t.goalTitle}</span>
                                                    <span><ion-icon name="bar-chart-outline" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> {t.completionPercentage || 0}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== CÔNG VIỆC CỦA TÔI — Full Task Summary ===== */}
                <div className="glass-panel" style={{ padding: 28, marginTop: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h2 className="text-glow-active" style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="icon-container glow" style={{ width: 36, height: 36, fontSize: 20 }}><ion-icon name="briefcase-outline"></ion-icon></span>
                            Công việc của tôi
                        </h2>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng hợp tất cả nhiệm vụ được giao</span>
                    </div>

                    {/* Stats Summary - 3 counters */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        <div style={{
                            textAlign: 'center', padding: '16px 12px', borderRadius: 14,
                            background: 'rgba(248,160,50,0.1)', border: '1px solid rgba(248,160,50,0.2)'
                        }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: '#f8a032' }}>{inProgressTasks.length}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#f8a032', textTransform: 'uppercase', letterSpacing: 1 }}>Đang làm</div>
                        </div>
                        <div style={{
                            textAlign: 'center', padding: '16px 12px', borderRadius: 14,
                            background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.2)'
                        }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: '#3fb950' }}>{completedTasks.length}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#3fb950', textTransform: 'uppercase', letterSpacing: 1 }}>Hoàn thành</div>
                        </div>
                        <div style={{
                            textAlign: 'center', padding: '16px 12px', borderRadius: 14,
                            background: 'rgba(130,80,223,0.1)', border: '1px solid rgba(130,80,223,0.2)'
                        }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: '#8250df' }}>{myTasks.length}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#8250df', textTransform: 'uppercase', letterSpacing: 1 }}>Tổng</div>
                        </div>
                    </div>

                    {/* Task Table */}
                    {myTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}><ion-icon name="clipboard-outline"></ion-icon></div>
                            Bạn chưa được giao nhiệm vụ nào
                        </div>
                    ) : (
                        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        {['Tên công việc', 'Trạng thái', 'Ưu tiên', 'Hạn chót', 'Tiến độ'].map((h, i) => (
                                            <th key={i} style={{
                                                padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                                                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                borderBottom: '1px solid rgba(255,255,255,0.06)'
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {myTasks.map(t => {
                                        const st = t.status === 'COMPLETED'
                                            ? { bg: 'rgba(63,185,80,0.15)', color: '#3fb950', label: 'Hoàn thành' }
                                            : t.status === 'IN_PROGRESS'
                                                ? { bg: 'rgba(248,160,50,0.15)', color: '#f8a032', label: 'Đang làm' }
                                                : { bg: 'rgba(130,80,223,0.15)', color: '#8250df', label: 'Chờ xử lý' };
                                        const pr = (t.priority || 1) >= 3
                                            ? { bg: 'rgba(248,81,73,0.15)', color: '#f85149', label: 'Cao' }
                                            : (t.priority || 1) >= 2
                                                ? { bg: 'rgba(210,153,34,0.15)', color: '#d29922', label: 'Trung bình' }
                                                : { bg: 'rgba(63,185,80,0.15)', color: '#3fb950', label: 'Thấp' };
                                        const pct = t.completionPercentage || 0;
                                        return (
                                            <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{t.title}</div>
                                                    {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: pr.bg, color: pr.color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{pr.label}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {t.deadline ? (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <ion-icon name="time-outline" style={{ fontSize: '13px' }}></ion-icon>
                                                            {new Date(t.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ padding: '14px 16px', minWidth: 140 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%', borderRadius: 999,
                                                                background: pct >= 100 ? '#3fb950' : pct >= 50 ? '#f8a032' : '#8250df',
                                                                width: `${pct}%`, transition: 'width 0.6s ease',
                                                                boxShadow: `0 0 8px ${pct >= 100 ? '#3fb95066' : pct >= 50 ? '#f8a03266' : '#8250df66'}`
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? '#3fb950' : 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>
                                                            {pct >= 100 ? <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><ion-icon name="checkmark-circle" style={{ fontSize: '14px', color: '#3fb950' }}></ion-icon> 100%</span> : `${pct}%`}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color, bg }: { icon: ReactNode; label: string; value: number; color: string; bg: string }) {
    return (
        <div className="glass-panel hover-lift" style={{
            padding: 24, display: 'flex', alignItems: 'flex-start', gap: 16,
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Background glowing gradient */}
            <div style={{ position: 'absolute', inset: 0, background: bg, zIndex: 0, opacity: 0.5 }} />

            <div className="icon-container glow" style={{
                width: 48, height: 48, background: `rgba(0,0,0,0.3)`,
                borderColor: `${color}40`, color, zIndex: 1,
                fontSize: 24, boxShadow: `inset 0 2px 10px ${color}20`, borderRadius: 14
            }}>{icon}</div>
            <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
            </div>
        </div>
    );
}
