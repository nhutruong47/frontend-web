import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService, taskService } from '../services/groupService';
import type { Team, Task } from '../types/types';

export default function DashboardPage() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [myTasks, setMyTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            teamService.getMyTeams().catch(() => []),
            user?.id ? taskService.getMyTasks(user.id).catch(() => []) : Promise.resolve([])
        ]).then(([t, tasks]) => {
            setTeams(t);
            setMyTasks(tasks);
            setLoading(false);
        });
    }, [user?.id]);

    const pendingTasks = myTasks.filter(t => t.status === 'PENDING');
    const inProgressTasks = myTasks.filter(t => t.status === 'IN_PROGRESS');
    const completedTasks = myTasks.filter(t => t.status === 'COMPLETED');
    const completionPct = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

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
                                <span style={{ fontSize: 32, filter: 'drop-shadow(0 0 10px rgba(212,156,87,0.5))' }}>☕</span>
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
                    <StatCard icon="📋" label="Tổng lượng Task" value={myTasks.length} color="var(--accent-primary)" bg="linear-gradient(135deg, rgba(212,156,87,0.15), rgba(0,0,0,0))" />
                    <StatCard icon="⏳" label="Đang chờ máy/nguyên liệu" value={pendingTasks.length} color="#d29922" bg="linear-gradient(135deg, rgba(210,153,34,0.15), rgba(0,0,0,0))" />
                    <StatCard icon="🔥" label="Đang rang/Gia công" value={inProgressTasks.length} color="#f85149" bg="linear-gradient(135deg, rgba(248,81,73,0.15), rgba(0,0,0,0))" />
                    <StatCard icon="📦" label="Đã hoàn thiện & Đóng gói" value={completedTasks.length} color="#3fb950" bg="linear-gradient(135deg, rgba(63,185,80,0.15), rgba(0,0,0,0))" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Member Performance */}
                        <div style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-md)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: 'var(--accent-primary)' }}>⚡</span> Hiệu suất phân xưởng
                                </h2>
                            </div>

                            {teams.filter(t => t.members && t.members.length > 0).length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu sản xuất</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {teams.filter(t => t.members && t.members.length > 0).map(t => (
                                        <div key={t.id}>
                                            <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                                                🏭 {t.name}
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
                        <div style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-md)'
                        }}>
                            <h2 style={{ fontSize: 16, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--accent-primary)' }}>🛠</span> Thao tác nhanh
                            </h2>
                            <button onClick={() => navigate('/groups')} style={{
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
                                <span>🛒</span> Vào thị trường gia công
                            </button>
                        </div>

                        {/* Recent Tasks */}
                        <div style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-md)', flex: 1
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <h2 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: 'var(--accent-primary)' }}>🎯</span> Nhiệm vụ của bạn
                                </h2>
                            </div>

                            {myTasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>🍃</div>
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
                                                    <span>🎯 {t.goalTitle}</span>
                                                    <span>📊 {t.completionPercentage || 0}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: number; color: string; bg: string }) {
    return (
        <div style={{
            background: 'var(--bg-card)', borderRadius: 20, padding: 24,
            border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 16,
            boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background glowing gradient */}
            <div style={{ position: 'absolute', inset: 0, background: bg, zIndex: 0, opacity: 0.5 }} />

            <div style={{
                width: 48, height: 48, borderRadius: 14, background: `rgba(0,0,0,0.3)`,
                border: `1px solid ${color}40`, color, zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                boxShadow: `inset 0 2px 10px ${color}20`
            }}>{icon}</div>
            <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
            </div>
        </div>
    );
}
