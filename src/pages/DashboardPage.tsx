import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService, taskService } from '../services/groupService';
import type { Task, Team } from '../types/types';
import './DashboardPage.css';

const teamImages = [
    '/coffee-hero.png',
    '/luxury-coffee-hero.png',
    'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=900&q=85',
];

function statusText(status: string) {
    if (status === 'COMPLETED') return 'Hoàn thành';
    if (status === 'IN_PROGRESS') return 'Đang làm';
    return 'Chờ xử lý';
}

function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [teams, setTeams] = useState<Team[]>([]);
    const [myTasks, setMyTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            teamService.getMyTeams().catch(() => []),
            user?.id ? taskService.getMyTasks(user.id).catch(() => []) : Promise.resolve([]),
        ]).then(([teamData, tasksData]) => {
            setTeams(teamData || []);
            setMyTasks(tasksData || []);
        }).finally(() => setLoading(false));
    }, [user?.id]);

    const activeTasks = useMemo(() => myTasks.filter(task => task.status !== 'COMPLETED'), [myTasks]);
    const completedTasks = useMemo(() => myTasks.filter(task => task.status === 'COMPLETED'), [myTasks]);
    const progress = myTasks.length ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;
    const recentTasks = myTasks.slice(0, 5);
    const visibleStats = [
        ...(teams.length > 0 ? [{
            label: 'Nhóm xưởng',
            value: teams.length,
            caption: 'Không gian đang tham gia',
        }] : []),
        ...(activeTasks.length > 0 ? [{
            label: 'Việc đang làm',
            value: activeTasks.length,
            caption: 'Cần theo dõi hôm nay',
        }] : []),
        ...(myTasks.length > 0 ? [{
            label: 'Tiến độ',
            value: `${progress}%`,
            caption: `${completedTasks.length}/${myTasks.length} công việc hoàn thành`,
        }] : []),
    ];

    const openTeamWorkspace = (teamId: string | number) => {
        navigate(`/groups/${teamId}`);
    };

    if (loading) {
        return (
            <div className="dashboard-page dashboard-loading">
                <div className="btn-spinner" />
                <p>Đang tải dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <section className="dashboard-hero">
                <div className="dashboard-hero-copy">
                    <span>Tổng quan</span>
                    <h1>Xin chào, {user?.fullName || user?.username || 'ORCA'}.</h1>
                    <p>Theo dõi nhanh xưởng, công việc và tiến độ hôm nay. Mình giữ lại những thông tin cần nhìn nhất để màn hình nhẹ hơn.</p>
                    <div className="dashboard-hero-actions">
                        <button onClick={() => navigate('/groups')} type="button">Mở nhóm xưởng</button>
                        <button onClick={() => navigate('/groups')} type="button">Tạo công việc</button>
                    </div>
                </div>
                <div className="dashboard-hero-media">
                    <img src="/luxury-coffee-hero.png" alt="Coffee roastery workspace" />
                </div>
            </section>

            {visibleStats.length > 0 && (
                <section className="dashboard-simple-stats" aria-label="Tổng quan nhanh">
                    {visibleStats.map(stat => (
                        <article key={stat.label}>
                            <span>{stat.label}</span>
                            <strong>{stat.value}</strong>
                            <p>{stat.caption}</p>
                        </article>
                    ))}
                </section>
            )}

            <section className="dashboard-section">
                <div className="dashboard-section-head">
                    <div>
                        <span>Xưởng cà phê</span>
                        <h2>Nhóm đang vận hành</h2>
                    </div>
                    <button onClick={() => navigate('/groups')} type="button">Xem tất cả</button>
                </div>

                {teams.length > 0 ? (
                    <div className="dashboard-team-grid">
                        {teams.slice(0, 3).map((team, index) => (
                            <article
                                className="dashboard-team-card"
                                key={team.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => openTeamWorkspace(team.id)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openTeamWorkspace(team.id);
                                    }
                                }}
                                aria-label={`Mở nơi làm việc của nhóm ${team.name}`}
                            >
                                <img src={teamImages[index % teamImages.length]} alt={team.name} />
                                <div>
                                    <h3>{team.name}</h3>
                                    <p>{team.description || team.specialty || 'Xưởng cà phê đang được quản lý trên ORCA.'}</p>
                                    <dl>
                                        <div>
                                            <dt>Thành viên</dt>
                                            <dd>{team.memberCount}</dd>
                                        </div>
                                        <div>
                                            <dt>Ngày tạo</dt>
                                            <dd>{formatDate(team.createdAt)}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="dashboard-empty">
                        <img src="/coffee-hero.png" alt="Coffee workspace" />
                        <div>
                            <h3>Chưa có nhóm xưởng</h3>
                            <p>Tạo nhóm đầu tiên để bắt đầu quản lý nhân sự, quy trình và công việc sản xuất cà phê.</p>
                            <button onClick={() => navigate('/groups')} type="button">Tạo nhóm</button>
                        </div>
                    </div>
                )}
            </section>

            <section className="dashboard-section">
                <div className="dashboard-section-head">
                    <div>
                        <span>Công việc</span>
                        <h2>Việc gần đây</h2>
                    </div>
                </div>

                <div className="dashboard-task-list">
                    {recentTasks.length > 0 ? recentTasks.map(task => (
                        <article className="dashboard-task-row" key={task.id}>
                            <div>
                                <h3>{task.title}</h3>
                                <p>{task.description || task.goalTitle || 'Không có mô tả.'}</p>
                            </div>
                            <span className={`dashboard-task-status ${task.status.toLowerCase().replaceAll('_', '-')}`}>
                                {statusText(task.status)}
                            </span>
                        </article>
                    )) : (
                        <div className="dashboard-empty dashboard-empty-compact">
                            <div>
                                <h3>Chưa có công việc mới</h3>
                                <p>Khi có task được giao, danh sách sẽ hiện ở đây.</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
