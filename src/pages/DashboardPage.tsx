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

    if (loading) return <div className="page-container"><p>Đang tải...</p></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Dashboard</h1>
                    <p className="page-subtitle">Xin chào, {user?.fullName || user?.username}!</p>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard icon="🏭" label="Nhóm" value={teams.length} color="#3b82f6" />
                <StatCard icon="📋" label="Tổng tasks" value={myTasks.length} color="#8b5cf6" />
                <StatCard icon="⏳" label="Chờ xử lý" value={pendingTasks.length} color="#f59e0b" />
                <StatCard icon="🔨" label="Đang làm" value={inProgressTasks.length} color="#10b981" />
                <StatCard icon="✅" label="Hoàn thành" value={completedTasks.length} color="#22c55e" />
            </div>

            {/* My Groups */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>🏭 Nhóm của tôi</h2>
                {teams.length === 0 ? (
                    <p style={{ opacity: 0.5 }}>Chưa tham gia nhóm nào.
                        <span style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}
                            onClick={() => navigate('/groups')}> Tạo nhóm mới →</span>
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {teams.map(t => (
                            <div key={t.id} style={{
                                background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 16px',
                                cursor: 'pointer', fontSize: 14
                            }} onClick={() => navigate(`/groups/${t.id}`)}>
                                🏭 {t.name} ({t.memberCount})
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* My Tasks */}
            <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>📋 Tasks của tôi</h2>
                {myTasks.length === 0 ? (
                    <p style={{ opacity: 0.5 }}>Chưa có task nào được giao</p>
                ) : (
                    myTasks.filter(t => t.status !== 'COMPLETED').slice(0, 10).map(t => (
                        <div key={t.id} style={{
                            background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginBottom: 8,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <strong>{t.title}</strong>
                                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                                    🎯 {t.goalTitle} • {t.completionPercentage || 0}%
                                </div>
                            </div>
                            <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                background: t.status === 'PENDING' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                                color: t.status === 'PENDING' ? '#f59e0b' : '#10b981'
                            }}>{t.status === 'PENDING' ? '⏳ Chờ' : '🔨 Đang làm'}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    return (
        <div style={{
            background: 'var(--card-bg, #1e293b)', borderRadius: 12, padding: 16,
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10, background: `${color}20`, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{value}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
            </div>
        </div>
    );
}
