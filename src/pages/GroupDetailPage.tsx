import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService, goalService, taskService, getTrialStatus } from '../services/groupService';
import type { AiParseResult } from '../services/groupService';
import type { Team, Goal, Task } from '../types/types';
import AiAssistantPanel from '../components/AiAssistantPanel';


function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
    return colors[hash];
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Chờ xử lý' },
    IN_PROGRESS: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: 'Đang làm' },
    COMPLETED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Hoàn thành' },
};

export default function GroupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [team, setTeam] = useState<Team | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [selectedGoalTasks, setSelectedGoalTasks] = useState<Task[]>([]);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showCreateGoal, setShowCreateGoal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [goalTitle, setGoalTitle] = useState('');
    const [goalTarget, setGoalTarget] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [trialActive, setTrialActive] = useState(true);
    const [trialDays, setTrialDays] = useState(30);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskWorkload, setNewTaskWorkload] = useState('');

    // Ad Settings
    const [showAdSettings, setShowAdSettings] = useState(false);
    const [adSpecialty, setAdSpecialty] = useState('');
    const [adCapacity, setAdCapacity] = useState('');
    const [adRegion, setAdRegion] = useState('');
    const [isPublished, setIsPublished] = useState(false);

    const isAdmin = team?.members?.find(m => m.userId === user?.id)?.groupRole === 'ADMIN' || team?.ownerId === user?.id;

    useEffect(() => {
        if (!id) return;
        teamService.getDetail(id).then(setTeam).catch(() => { });
        goalService.getByTeam(id).then(setGoals).catch(() => { });
        getTrialStatus().then(s => { setTrialActive(s.aiTrialActive); setTrialDays(s.daysRemaining); }).catch(() => { });
    }, [id]);

    const loadTasks = async (goalId: string) => {
        if (selectedGoalId === goalId) { setSelectedGoalId(null); return; }
        setSelectedGoalId(goalId);
        const tasks = await taskService.getByGoal(goalId);
        setSelectedGoalTasks(tasks);
    };

    const refreshTasks = async (goalId: string | null) => {
        if (!goalId) return;
        const tasks = await taskService.getByGoal(goalId);
        setSelectedGoalTasks(tasks);
    };

    const closeModal = () => { setShowAddMember(false); setError(''); setSuccessMsg(''); setInviteLink(null); setInviteEmail(''); };

    const handleAddByEmail = async () => {
        if (!id || !inviteEmail.trim()) return;
        setLoading(true);
        try {
            setError(''); setSuccessMsg(''); setInviteLink(null);
            const res = await teamService.addMember(id, inviteEmail);
            if (res.status === 'ADDED') {
                setSuccessMsg(`${res.message}`);
                const updated = await teamService.getDetail(id);
                setTeam(updated);
            } else {
                setSuccessMsg(`${res.message}`);
                if (res.inviteLink) setInviteLink(res.inviteLink);
            }
            setInviteEmail('');
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.response?.data?.message || 'Không thể thực hiện');
        } finally { setLoading(false); }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!id || !confirm('Xóa thành viên này?')) return;
        await teamService.removeMember(id, userId);
        const updated = await teamService.getDetail(id);
        setTeam(updated);
    };

    const handleCreateGoal = async (useAi: boolean) => {
        if (!id || !goalTitle.trim()) return;
        if (useAi && !trialActive) { setError('AI đã hết hạn dùng thử 30 ngày!'); return; }
        setLoading(true);
        try {
            setError('');
            await goalService.create({ teamId: id, title: goalTitle, outputTarget: goalTarget, deadline: goalDeadline || undefined, useAi } as any);
            setGoals(await goalService.getByTeam(id));
            setShowCreateGoal(false);
            setGoalTitle(''); setGoalTarget(''); setGoalDeadline('');
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Không thể tạo mục tiêu');
        } finally { setLoading(false); }
    };

    const handleTaskStatus = async (taskId: string, status: string) => {
        await taskService.updateStatus(taskId, status);
        if (selectedGoalId) refreshTasks(selectedGoalId);
    };

    const handleAddTask = async () => {
        if (!selectedGoalId || !newTaskTitle.trim()) return;
        setLoading(true);
        try {
            await taskService.create({ goalId: selectedGoalId, title: newTaskTitle, description: newTaskDesc, workload: Number(newTaskWorkload) || 0 });
            refreshTasks(selectedGoalId);
            if (id) setGoals(await goalService.getByTeam(id));
            setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskWorkload(''); setShowAddTask(false);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Không thể tạo task');
        } finally { setLoading(false); }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Xóa task này?')) return;
        await taskService.delete(taskId);
        if (selectedGoalId) refreshTasks(selectedGoalId);
        if (id) setGoals(await goalService.getByTeam(id));
    };

    const handleSaveAdSettings = async () => {
        if (!team) return;
        setLoading(true);
        try {
            if (isPublished) {
                const updated = await teamService.advertise(team.id, {
                    specialty: adSpecialty,
                    capacity: adCapacity,
                    region: adRegion
                });
                setTeam(updated);
            } else {
                await teamService.unpublish(team.id);
                setTeam({ ...team, isPublished: false });
            }
            setShowAdSettings(false);
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Lỗi lưu cài đặt');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async () => {
        if (!team) return;
        const confirmed = confirm(`Bạn có chắc chắn muốn xóa nhóm "${team.name}"?\n\nHành động này không thể hoàn tác. Tất cả mục tiêu, task và thành viên sẽ bị xóa.`);
        if (!confirmed) return;
        try {
            await teamService.deleteTeam(team.id);
            alert('Đã xóa nhóm thành công!');
            navigate('/groups');
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Không thể xóa nhóm. Chỉ chủ nhóm mới có quyền xóa.');
        }
    };

    if (!team) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}><ion-icon name="time-outline" style={{ fontSize: '40px' }}></ion-icon></div>
                <p>Đang tải nhóm...</p>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            {/* ===== HEADER ===== */}
            <div className="glass-panel" style={{
                padding: '28px 32px',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                flexWrap: 'wrap'
            }}>
                <div>
                    <h1 className="text-glow-active" style={{ margin: 0, fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="icon-container glow" style={{ width: 40, height: 40, fontSize: 22 }}><ion-icon name="business-outline"></ion-icon></span> {team.name}
                    </h1>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                        {team.description || 'Nhóm xưởng cà phê'} &nbsp;•&nbsp; <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{team.memberCount} thành viên</span>
                    </p>
                    {team.inviteCode && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}><ion-icon name="key-outline" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Mã mời:</span>
                            <span
                                onClick={() => navigator.clipboard.writeText(team.inviteCode || '')}
                                title="Bấm để copy"
                                style={{
                                    fontSize: 14, fontWeight: 800, letterSpacing: 4,
                                    padding: '3px 12px', borderRadius: 8,
                                    background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                                    cursor: 'pointer', userSelect: 'all',
                                    border: '1px solid rgba(34,197,94,0.3)',
                                }}
                            >{team.inviteCode}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>Bấm để copy</span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isAdmin && (
                        <button className="btn hover-lift" onClick={() => {
                            setAdSpecialty(team.specialty || '');
                            setAdCapacity(team.capacity || '');
                            setAdRegion(team.region || '');
                            setIsPublished(team.isPublished || false);
                            setShowAdSettings(true);
                        }} style={{ gap: 6, display: 'flex', alignItems: 'center' }}>
                            <ion-icon name="megaphone-outline" style={{ fontSize: '14px' }}></ion-icon> Chợ {team.isPublished && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', marginLeft: 4 }}></span>}
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn btn-primary hover-lift" style={{ gap: 6, display: 'flex', alignItems: 'center' }}
                            onClick={() => setShowAddMember(true)}>
                            <ion-icon name="people-outline" style={{ fontSize: '14px' }}></ion-icon> Thêm thành viên
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn hover-lift" onClick={() => setShowCreateGoal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            + Mục tiêu mới
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn hover-lift" onClick={handleDeleteTeam}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <ion-icon name="trash-outline" style={{ fontSize: '14px' }}></ion-icon> Xóa nhóm
                        </button>
                    )}
                </div>
            </div>

            {/* ===== AI ASSISTANT ===== */}
            {isAdmin && (
                <AiAssistantPanel
                    trialActive={trialActive}
                    trialDays={trialDays}
                    onCreateGoal={(result: AiParseResult) => {
                        setGoalTitle(result.title || '');
                        setGoalTarget(result.quantity || result.title || '');
                        setShowCreateGoal(true);
                    }}
                />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
                {/* ===== MEMBERS PANEL ===== */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                            <ion-icon name="people-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Thành viên ({team.memberCount})
                        </h2>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        {team.members?.map(m => {
                            const displayName = m.fullName || m.username;
                            const isCurrentUser = m.userId === user?.id;
                            const isOwner = m.groupRole === 'ADMIN' || m.groupRole === 'OWNER';
                            return (
                                <div key={m.userId} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 20px',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background 0.15s',
                                    background: isCurrentUser ? 'rgba(212,165,116,0.05)' : 'transparent',
                                }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%',
                                        background: avatarColor(displayName),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, fontWeight: 700, color: '#fff',
                                        flexShrink: 0
                                    }}>
                                        {getInitials(displayName)}
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {displayName}
                                            </span>
                                            {isCurrentUser && (
                                                <span style={{ fontSize: 10, background: 'rgba(212,165,116,0.2)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>Bạn</span>
                                            )}
                                        </div>
                                        <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{
                                                fontSize: 10,
                                                padding: '2px 6px', borderRadius: 8, fontWeight: 600,
                                                background: isOwner ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                                                color: isOwner ? '#f59e0b' : '#818cf8',
                                            }}>
                                                {isOwner ? <><ion-icon name="shield-outline" style={{ fontSize: '10px' }}></ion-icon> Admin</> : <><ion-icon name="person-outline" style={{ fontSize: '10px' }}></ion-icon> Member</>}
                                            </span>

                                            {/* Admin only: Member Progress Stats */}
                                            {isAdmin && m.totalTasks !== undefined && (
                                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                                                    <ion-icon name="bar-chart-outline" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> {m.completedTasks}/{m.totalTasks} ({m.completionRate || 0}%)
                                                </span>
                                            )}
                                        </div>

                                        {/* Admin only: Mini Progress bar under member name */}
                                        {isAdmin && m.totalTasks !== undefined && m.totalTasks > 0 && (
                                            <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                                                <div style={{
                                                    height: '100%',
                                                    background: m.completionRate === 100 ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                                                    borderRadius: 4,
                                                    width: `${m.completionRate || 0}%`,
                                                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                    {/* Remove button */}
                                    {isAdmin && !isCurrentUser && !isOwner && (
                                        <button onClick={() => handleRemoveMember(m.userId)}
                                            title="Xóa thành viên"
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4, borderRadius: 6, flexShrink: 0 }}>
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ===== RIGHT PANEL: Goals + Tasks ===== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* AI Trial Badge */}
                    {isAdmin && (
                        <div style={{
                            padding: '12px 20px', borderRadius: 12, marginBottom: 0,
                            background: trialActive ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${trialActive ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: trialActive ? '#818cf8' : '#f87171' }}>
                                {trialActive ? `AI chia việc miễn phí: còn ${trialDays} ngày` : 'AI chia việc đã hết hạn dùng thử — Hãy tạo task thủ công'}
                            </span>
                        </div>
                    )}

                    {/* Goals */}
                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 className="text-glow-active" style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="icon-container glow" style={{ width: 28, height: 28, fontSize: 16 }}><ion-icon name="locate-outline"></ion-icon></span> Mục tiêu ({goals.length})
                            </h2>
                        </div>
                        <div style={{ padding: 12 }}>
                            {goals.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.4 }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}><ion-icon name="clipboard-outline" style={{ fontSize: '32px' }}></ion-icon></div>
                                    <p style={{ margin: 0, fontSize: 14 }}>Chưa có mục tiêu nào</p>
                                </div>
                            ) : goals.map(g => {
                                const pct = g.totalTasks ? Math.round((g.completedTasks / g.totalTasks) * 100) : 0;
                                const isSelected = selectedGoalId === g.id;
                                return (
                                    <div key={g.id}
                                        style={{
                                            borderRadius: 12, padding: '16px', marginBottom: 12,
                                            background: isSelected ? 'rgba(212,165,116,0.1)' : 'rgba(255,255,255,0.03)',
                                            border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                                            boxShadow: isSelected ? '0 4px 12px rgba(212,165,116,0.1)' : 'none',
                                            transition: 'all 0.2s',
                                        }}>

                                        {/* Goal Header (Clickable) */}
                                        <div onClick={() => loadTasks(g.id)} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{g.title}</strong>
                                                <span style={{
                                                    fontSize: 11, padding: '4px 10px', borderRadius: 12, fontWeight: 700,
                                                    background: g.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                                                    color: g.status === 'COMPLETED' ? '#34d399' : '#818cf8',
                                                }}>{g.status}</span>
                                            </div>
                                            {g.outputTarget && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}><b>Chỉ tiêu:</b> {g.outputTarget}</p>}

                                            {/* Progress bar */}
                                            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 999, height: 6, marginBottom: 12, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 999,
                                                    background: pct === 100 ? '#34d399' : 'var(--accent-primary)',
                                                    width: `${pct}%`, transition: 'width 0.4s ease'
                                                }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <ion-icon name="bar-chart-outline" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> {g.completedTasks}/{g.totalTasks} tasks
                                                    <span style={{ color: 'var(--text-primary)' }}>({pct}%)</span>
                                                </span>
                                                {g.deadline && <span style={{ color: '#f87171' }}><ion-icon name="time-outline" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> {new Date(g.deadline).toLocaleDateString('vi')}</span>}
                                            </div>
                                        </div>

                                        {/* Expanded Tasks Area */}
                                        {isSelected && (
                                            <div style={{ marginTop: 16, borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: 16 }} onClick={e => e.stopPropagation()}>
                                                <div style={{ padding: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}><ion-icon name="clipboard-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Danh sách task ({selectedGoalTasks.length})</h2>
                                                    {isAdmin && (
                                                        <button onClick={() => setShowAddTask(!showAddTask)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8 }}>
                                                            {showAddTask ? '✕ Đóng' : '＋ Thêm task'}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Manual task creation form */}
                                                {showAddTask && isAdmin && (
                                                    <div style={{ padding: '16px', marginBottom: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            <input className="input" placeholder="Tên task *" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={{ fontSize: 13 }} />
                                                            <input className="input" placeholder="Mô tả (tuỳ chọn)" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} style={{ fontSize: 13 }} />
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                <input className="input" type="number" placeholder="Giờ làm" value={newTaskWorkload} onChange={e => setNewTaskWorkload(e.target.value)} style={{ fontSize: 13, width: 120 }} />
                                                                <button onClick={handleAddTask} disabled={loading || !newTaskTitle.trim()} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>
                                                                    {loading ? 'Đang tạo...' : 'Tạo task'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    {selectedGoalTasks.length === 0 ? (
                                                        <div style={{ textAlign: 'center', padding: '16px', opacity: 0.4, fontSize: 13 }}>
                                                            {trialActive ? 'Không có task nào' : 'Hãy thêm task thủ công bằng nút "＋ Thêm task" ở trên'}
                                                        </div>
                                                    ) : selectedGoalTasks.map(t => {
                                                        const st = STATUS_COLORS[t.status] || STATUS_COLORS.PENDING;
                                                        const isMyTask = t.memberId === user?.id;
                                                        const canEditStatus = true; // Tất cả thành viên nhóm đều được đổi trạng thái
                                                        return (
                                                            <div key={t.id} style={{
                                                                border: `1.5px solid ${st.color}${isMyTask ? '60' : '30'}`,
                                                                background: isMyTask
                                                                    ? `linear-gradient(135deg, ${st.color}12, ${st.color}04)`
                                                                    : 'rgba(255,255,255,0.02)',
                                                                borderRadius: 12, padding: '16px', marginBottom: 12,
                                                                boxShadow: isMyTask ? `0 4px 16px ${st.color}18` : 'none',
                                                                transition: 'all 0.2s ease',
                                                            }}>
                                                                {/* Task header */}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                            {isMyTask && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 700 }}><ion-icon name="pin-outline" style={{ fontSize: '9px' }}></ion-icon> Của bạn</span>}
                                                                            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t.title}</strong>
                                                                        </div>
                                                                        {t.description && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t.description}</span>}
                                                                    </div>
                                                                    <span style={{
                                                                        fontSize: 10, padding: '4px 10px', borderRadius: 10, fontWeight: 700,
                                                                        background: st.bg, color: st.color, whiteSpace: 'nowrap',
                                                                    }}>
                                                                        {st.label}
                                                                    </span>
                                                                </div>

                                                                {/* Progress bar */}
                                                                <div style={{ margin: '8px 0', background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 4, overflow: 'hidden' }}>
                                                                    <div style={{
                                                                        height: '100%', borderRadius: 999, transition: 'width 0.4s ease',
                                                                        background: (t.completionPercentage || 0) === 100
                                                                            ? 'linear-gradient(90deg, #34d399, #10b981)'
                                                                            : `linear-gradient(90deg, ${st.color}, ${st.color}88)`,
                                                                        width: `${t.completionPercentage || 0}%`,
                                                                    }} />
                                                                </div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span><ion-icon name="bar-chart-outline" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> Tiến độ: <b style={{ color: st.color }}>{t.completionPercentage || 0}%</b></span>
                                                                    {t.deadline && <span style={{ color: '#f87171' }}><ion-icon name="time-outline" style={{ fontSize: '11px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> {new Date(t.deadline).toLocaleDateString('vi')}</span>}
                                                                </div>

                                                                {/* Footer: assignee + controls */}
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div style={{
                                                                            width: 24, height: 24, borderRadius: '50%',
                                                                            background: t.memberName ? avatarColor(t.memberName) : 'var(--border)',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: 10, fontWeight: 700, color: '#fff'
                                                                        }}>
                                                                            {t.memberName ? getInitials(t.memberName) : '?'}
                                                                        </div>
                                                                        <span style={{ fontSize: 12, color: t.memberName ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                                                            {t.memberName || 'Chưa giao'}
                                                                        </span>
                                                                    </div>

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        {/* Admin: assign member dropdown */}
                                                                        {isAdmin && (
                                                                            <select
                                                                                value={t.memberId || ''}
                                                                                onChange={async e => {
                                                                                    await taskService.assign(t.id, e.target.value);
                                                                                    refreshTasks(selectedGoalId);
                                                                                }}
                                                                                className="input"
                                                                                style={{
                                                                                    padding: '4px 8px', height: 28, fontSize: 11, minWidth: 110,
                                                                                    background: 'rgba(0,0,0,0.2)', border: `1px solid ${st.color}40`, color: 'var(--text-primary)'
                                                                                }}
                                                                            >
                                                                                <option value="">— Giao cho —</option>
                                                                                {team?.members?.map(m => (
                                                                                    <option key={m.userId} value={m.userId}>{m.fullName || m.username}</option>
                                                                                ))}
                                                                            </select>
                                                                        )}

                                                                        {/* Admin OR assigned member: status dropdown */}
                                                                        {canEditStatus && (
                                                                            <select
                                                                                value={t.status}
                                                                                onChange={e => handleTaskStatus(t.id, e.target.value)}
                                                                                className="input"
                                                                                style={{
                                                                                    padding: '4px 8px', height: 28, fontSize: 11, minWidth: 110,
                                                                                    background: st.bg, border: `1px solid ${st.color}40`, color: st.color, fontWeight: 600,
                                                                                }}
                                                                            >
                                                                                <option value="PENDING">Chờ xử lý</option>
                                                                                <option value="IN_PROGRESS">Đang làm</option>
                                                                                <option value="COMPLETED">Hoàn thành</option>
                                                                            </select>
                                                                        )}

                                                                        {/* Non-admin, not their task: read-only badge */}
                                                                        {!canEditStatus && (
                                                                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic' }}><ion-icon name="lock-closed-outline" style={{ fontSize: '10px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> Chỉ xem</span>
                                                                        )}

                                                                        {/* Admin: delete task */}
                                                                        {isAdmin && (
                                                                            <button onClick={() => handleDeleteTask(t.id)} title="Xóa task" style={{
                                                                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                                                                color: '#f87171', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer'
                                                                            }}><ion-icon name="trash-outline" style={{ fontSize: '12px' }}></ion-icon></button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== INVITE MODAL ===== */}
            {showAddMember && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <h2 style={{ marginBottom: 4 }}><ion-icon name="people-outline" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: 6 }}></ion-icon> Thêm / Mời thành viên</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Nhập email — tự động thêm nếu đã có tài khoản, hoặc gửi link mời.</p>
                        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
                        {successMsg && (
                            <div style={{ padding: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, marginBottom: 12, color: '#34d399', fontSize: 14 }}>
                                {successMsg}
                            </div>
                        )}
                        {inviteLink && (
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}><ion-icon name="link-outline" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Copy link mời gửi thủ công:</p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="form-input" readOnly value={inviteLink} style={{ flex: 1, fontSize: 11 }} onClick={e => (e.target as HTMLInputElement).select()} />
                                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                                        onClick={() => navigator.clipboard.writeText(inviteLink!)}><ion-icon name="copy-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Copy</button>
                                </div>
                            </div>
                        )}
                        {!successMsg && (
                            <div className="form-group">
                                <label className="form-label"><ion-icon name="mail-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Email người dùng</label>
                                <input className="form-input" type="email" value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddByEmail()}
                                    placeholder="example@gmail.com" autoFocus />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn" onClick={closeModal}><ion-icon name="close-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Đóng</button>
                            {!successMsg && (
                                <button className="btn btn-primary" onClick={handleAddByEmail} disabled={loading}>
                                    {loading ? <><ion-icon name="sync-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> ...</> : <><ion-icon name="checkmark-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Xác nhận</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CREATE GOAL MODAL ===== */}
            {showCreateGoal && (
                <div className="modal-overlay" onClick={() => setShowCreateGoal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <h2 style={{ marginBottom: 4 }}><ion-icon name="locate-outline" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: 6 }}></ion-icon> Tạo mục tiêu mới</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>AI sẽ tự động chia nhỏ thành các task.</p>
                        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
                        <div className="form-group">
                            <label className="form-label"><ion-icon name="document-text-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Tên mục tiêu *</label>
                            <input className="form-input" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="VD: Sản xuất cà phê tháng 3" autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label"><ion-icon name="cube-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Sản lượng mục tiêu</label>
                            <input className="form-input" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="VD: 3 tấn cà phê" />
                        </div>
                        <div className="form-group">
                            <label className="form-label"><ion-icon name="calendar-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Deadline</label>
                            <input className="form-input" type="datetime-local" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
                            <button className="btn" onClick={() => setShowCreateGoal(false)}><ion-icon name="close-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Hủy</button>
                            <button className="btn" onClick={() => handleCreateGoal(false)} disabled={loading}
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>
                                {loading ? 'Đang tạo...' : <><ion-icon name="hammer-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Tạo thủ công</>}
                            </button>
                            <button className="btn btn-primary" onClick={() => handleCreateGoal(true)} disabled={loading || !trialActive}
                                title={!trialActive ? 'AI đã hết hạn dùng thử 30 ngày' : `AI miễn phí: còn ${trialDays} ngày`}
                                style={{ opacity: trialActive ? 1 : 0.5 }}>
                                {loading ? 'Đang tạo...' : trialActive ? <><ion-icon name="sparkles-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> AI tạo task (còn {trialDays} ngày)</> : <><ion-icon name="lock-closed-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> AI (hết hạn)</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ADVERTISEMENT MODAL ===== */}
            {showAdSettings && (
                <div className="modal-overlay" onClick={() => setShowAdSettings(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <h2 style={{ marginBottom: 4 }}><ion-icon name="megaphone-outline" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: 6 }}></ion-icon> Cài đặt Marketplace</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Thông tin này sẽ hiển thị công khai trên Thị trường (Marketplace) để các xưởng khác gửi đơn hàng.
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 16 }}>
                            <input
                                type="checkbox"
                                id="isPublished"
                                checked={isPublished}
                                onChange={e => setIsPublished(e.target.checked)}
                                style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                            <label htmlFor="isPublished" style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                Bật trạng thái công khai trên Thị trường
                            </label>
                        </div>

                        {isPublished && (
                            <>
                                <div className="form-group">
                                    <label className="form-label"><ion-icon name="location-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Khu vực (Region)</label>
                                    <select className="form-input" value={adRegion} onChange={e => setAdRegion(e.target.value)}>
                                        <option value="">-- Chọn khu vực --</option>
                                        <option value="Central Highlands">Central Highlands (Tây Nguyên)</option>
                                        <option value="North West">North West (Tây Bắc)</option>
                                        <option value="South East">South East (Đông Nam Bộ)</option>
                                        <option value="Mekong Delta">Mekong Delta (ĐBSCL)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label"><ion-icon name="flask-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Chuyên môn (Specialty)</label>
                                    <input className="form-input" value={adSpecialty} onChange={e => setAdSpecialty(e.target.value)} placeholder="VD: Arabica & Robusta Blend" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label"><ion-icon name="speedometer-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Năng suất (Capacity)</label>
                                    <input className="form-input" value={adCapacity} onChange={e => setAdCapacity(e.target.value)} placeholder="VD: > 500kg/day" />
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn" onClick={() => setShowAdSettings(false)}><ion-icon name="close-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Thoát</button>
                            <button className="btn btn-primary" onClick={handleSaveAdSettings} disabled={loading}>
                                {loading ? 'Đang lưu...' : <><ion-icon name="save-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Lưu cài đặt</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
