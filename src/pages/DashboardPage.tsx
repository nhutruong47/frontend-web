import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Factory,
    MessageCircle,
    PackageCheck,
    Plus,
    UserRoundCog,
    Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { teamService, taskService } from '../services/groupService';
import type { Task, Team } from '../types/types';
import './DashboardPage.css';

const teamImages = [
    'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=900&q=84',
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=900&q=84',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=84',
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

function getTodayLabel() {
    return new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
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
    const displayName = user?.fullName || user?.username || 'ORCA';
    const primaryTeam = teams[0];

    const goToTeamFeature = (featurePath: string) => {
        if (!primaryTeam) {
            navigate('/groups');
            return;
        }
        navigate(`/groups/${primaryTeam.id}${featurePath}`);
    };

    const quickActions = [
        {
            label: 'Tạo công việc',
            caption: primaryTeam ? 'Giao task trong nhóm đầu tiên' : 'Chọn nhóm để tạo task',
            icon: ClipboardList,
            onClick: () => goToTeamFeature('/create-task'),
        },
        {
            label: 'Đơn hàng',
            caption: 'Theo dõi mua bán và xử lý đơn',
            icon: PackageCheck,
            onClick: () => navigate('/orders'),
        },
        {
            label: 'Lịch sản xuất',
            caption: primaryTeam ? 'Xem lịch của nhóm gần nhất' : 'Cần có nhóm xưởng',
            icon: CalendarDays,
            onClick: () => goToTeamFeature('/calendar'),
        },
        {
            label: 'Nhân sự',
            caption: primaryTeam ? 'Chấm công và ca làm' : 'Cần có nhóm xưởng',
            icon: UserRoundCog,
            onClick: () => goToTeamFeature('/workforce'),
        },
        {
            label: 'Tin nhắn nhóm',
            caption: primaryTeam ? 'Mở nhóm và khung chat' : 'Cần có nhóm xưởng',
            icon: MessageCircle,
            onClick: () => goToTeamFeature(''),
        },
        {
            label: 'Thị trường',
            caption: 'Tìm xưởng và đơn hợp tác',
            icon: Store,
            onClick: () => navigate('/marketplace'),
        },
    ];

    const stats = [
        {
            label: 'Nhóm xưởng',
            value: teams.length,
            caption: 'Không gian đang tham gia',
            icon: Factory,
            tone: 'teal',
        },
        {
            label: 'Việc đang làm',
            value: activeTasks.length,
            caption: 'Cần theo dõi hôm nay',
            icon: ClipboardList,
            tone: 'amber',
        },
        {
            label: 'Tiến độ',
            value: `${progress}%`,
            caption: `${completedTasks.length}/${myTasks.length} công việc hoàn thành`,
            icon: CheckCircle2,
            tone: 'green',
        },
        {
            label: 'Lịch hôm nay',
            value: getTodayLabel(),
            caption: 'Cập nhật theo múi giờ Việt Nam',
            icon: CalendarDays,
            tone: 'blue',
        },
    ];

    const openTeamWorkspace = (teamId: string | number) => {
        navigate(`/groups/${teamId}`);
    };

    const currentHour = new Date().getHours();
    const isOverloaded = activeTasks.length > 0 && currentHour >= 17;
    const totalTarget = myTasks.reduce((sum, task) => sum + (task.outputTarget || 0), 0);
    const totalActual = myTasks.reduce((sum, task) => sum + (task.actualOutput || 0), 0);
    const isOverachieving = totalTarget > 0 && totalActual > totalTarget;

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
            <section className="dashboard-command">
                <div className="dashboard-command-main">
                    <span className="dashboard-eyebrow">Tổng quan vận hành</span>
                    <h1>Xin chào, {displayName}</h1>
                    <p>Theo dõi nhóm xưởng, tiến độ và việc cần xử lý trong ngày từ một màn hình gọn hơn.</p>
                    <div className="dashboard-command-actions">
                        <button className="dashboard-primary-action" onClick={() => navigate('/groups')} type="button">
                            <Plus size={18} />
                            Mở nhóm xưởng
                        </button>
                        <button onClick={() => goToTeamFeature('/create-task')} type="button">
                            <ClipboardList size={18} />
                            Tạo công việc
                        </button>
                    </div>
                </div>

                <div className={`dashboard-ops-card ${isOverachieving ? 'overachieving' : isOverloaded ? 'overloaded' : ''}`} aria-label="Trạng thái vận hành">
                    <div className="dashboard-ops-head">
                        <Activity size={18} />
                        <span>Nhịp vận hành</span>
                    </div>
                    <strong>{isOverachieving ? 'Phát triển vượt mong đợi' : isOverloaded ? 'Quá tải công việc' : activeTasks.length > 0 ? 'Đang có việc cần bám' : 'Không có việc quá tải'}</strong>
                    <p>{isOverachieving ? `Sản lượng đạt ${totalActual}/${totalTarget}, vượt mức kế hoạch đề ra.` : isOverloaded ? `Đã hết ngày nhưng còn ${activeTasks.length} task chưa xong.` : activeTasks.length > 0 ? `${activeTasks.length} task chưa hoàn thành.` : 'Bạn có thể tạo thêm kế hoạch hoặc kiểm tra nhóm xưởng.'}</p>
                    <div className="dashboard-progress-track">
                        <span style={{ width: `${progress}%`, background: isOverachieving ? 'var(--success)' : isOverloaded ? 'var(--danger)' : undefined }} />
                    </div>
                    <small style={{ color: isOverachieving ? 'var(--success)' : isOverloaded ? 'var(--danger)' : undefined }}>{progress}% hoàn thành</small>
                </div>
            </section>

            <section className="dashboard-quick-actions" aria-label="Lối tắt chức năng">
                {quickActions.map(action => {
                    const Icon = action.icon;
                    return (
                        <button key={action.label} type="button" onClick={action.onClick}>
                            <span className="dashboard-quick-icon">
                                <Icon size={18} />
                            </span>
                            <span>
                                <strong>{action.label}</strong>
                                <small>{action.caption}</small>
                            </span>
                        </button>
                    );
                })}
            </section>

            <section className="dashboard-stat-grid" aria-label="Tổng quan nhanh">
                {stats.map(stat => {
                    const Icon = stat.icon;
                    return (
                        <article className={`dashboard-stat-card ${stat.tone}`} key={stat.label}>
                            <div className="dashboard-stat-icon">
                                <Icon size={19} />
                            </div>
                            <div>
                                <span>{stat.label}</span>
                                <strong>{stat.value}</strong>
                                <p>{stat.caption}</p>
                            </div>
                        </article>
                    );
                })}
            </section>

            <div className="dashboard-workspace-grid">
                <section className="dashboard-panel dashboard-teams-panel">
                    <div className="dashboard-section-head">
                        <div>
                            <span>Không gian làm việc</span>
                            <h2>Nhóm đang vận hành</h2>
                        </div>
                        <button onClick={() => navigate('/groups')} type="button">
                            Xem tất cả
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    {teams.length > 0 ? (
                        <div className="dashboard-team-list">
                            {teams.slice(0, 3).map((team, index) => {
                                const teamTasks = myTasks.filter(t => t.teamId === team.id);
                                const totalTeamTasks = teamTasks.length;
                                const completedTeamTasks = teamTasks.filter(t => t.status === 'COMPLETED').length;
                                const isAllCompleted = totalTeamTasks > 0 && totalTeamTasks === completedTeamTasks;
                                const hasTasks = totalTeamTasks > 0;

                                return (
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
                                    style={{ position: 'relative' }}
                                >
                                    <img src={teamImages[index % teamImages.length]} alt={team.name} />
                                    <div className="dashboard-team-body">
                                        <div>
                                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {team.name}
                                                {hasTasks && (
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: '50%',
                                                            backgroundColor: isAllCompleted ? '#10b981' : '#ef4444',
                                                            boxShadow: `0 0 8px ${isAllCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                                            flexShrink: 0
                                                        }}
                                                        title={isAllCompleted ? 'Tất cả công việc đã hoàn thành' : 'Có công việc chưa hoàn thành'}
                                                    />
                                                )}
                                            </h3>
                                            <p>{team.description || team.specialty || 'Nhóm xưởng đang được quản lý trên ORCA.'}</p>
                                        </div>
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
                                );
                            })}
                        </div>
                    ) : (
                        <div className="dashboard-empty">
                            <Factory size={34} />
                            <h3>Chưa có nhóm xưởng</h3>
                            <p>Tạo nhóm đầu tiên để bắt đầu quản lý nhân sự, quy trình và công việc sản xuất.</p>
                            <button onClick={() => navigate('/groups')} type="button">Tạo nhóm</button>
                        </div>
                    )}
                </section>

                <section className="dashboard-panel dashboard-tasks-panel">
                    <div className="dashboard-section-head">
                        <div>
                            <span>Công việc</span>
                            <h2>Việc gần đây</h2>
                        </div>
                        <button onClick={() => goToTeamFeature('/create-task')} type="button">
                            Tạo công việc
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    <div className="dashboard-task-list">
                        {recentTasks.length > 0 ? recentTasks.map(task => (
                            <article className="dashboard-task-row" key={task.id}>
                                <div className="dashboard-task-mark">
                                    {task.status === 'COMPLETED' ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                                </div>
                                <div className="dashboard-task-copy">
                                    <h3>{task.title}</h3>
                                    <p>{task.description || task.goalTitle || 'Không có mô tả.'}</p>
                                </div>
                                <span className={`dashboard-task-status ${task.status.toLowerCase().replaceAll('_', '-')}`}>
                                    {statusText(task.status)}
                                </span>
                            </article>
                        )) : (
                            <div className="dashboard-empty dashboard-empty-compact">
                                <ClipboardList size={34} />
                                <h3>Chưa có công việc mới</h3>
                                <p>Khi có task được giao, danh sách sẽ hiện ở đây.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
