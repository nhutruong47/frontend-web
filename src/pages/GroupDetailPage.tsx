import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService, goalService, taskService, getTrialStatus, chatService, inventoryService } from '../services/groupService';
import type { Team, Goal, Task, ChatMsg, SalaryReport, AiChatLogMsg, InventoryItem } from '../types/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    PENDING: { bg: '#fef3c7', color: '#d97706', label: 'Chờ xử lý' },
    IN_PROGRESS: { bg: '#dbeafe', color: '#2563eb', label: 'Đang làm' },
    COMPLETED: { bg: '#dcfce7', color: '#16a34a', label: 'Hoàn thành' },
};
const MEMBER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#f43f5e', '#06b6d4', '#8b5cf6', '#3b82f6'];
const DONUT_COLORS = ['#10b981', '#f59e0b', '#94a3b8'];

export default function GroupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [team, setTeam] = useState<Team | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showCreateGoal, setShowCreateGoal] = useState(false);
    const [goalTitle, setGoalTitle] = useState('');
    const [goalTarget, setGoalTarget] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
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

    // Chat History
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [activeChatLog] = useState<AiChatLogMsg[]>([]);
    const [activeGoalTitle] = useState('');

    // Job Labels
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [selectedMemberForLabels, setSelectedMemberForLabels] = useState<any>(null);
    const [editingLabels, setEditingLabels] = useState<string>('');

    // Inventory
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [showAddInventory, setShowAddInventory] = useState(false);
    const [invName, setInvName] = useState('');
    const [invQty, setInvQty] = useState('');
    const [invUnit, setInvUnit] = useState('');
    const [invThreshold, setInvThreshold] = useState('');
    // For updating quantity inline
    const [updatingInvId, setUpdatingInvId] = useState<string | null>(null);
    const [updateInvQty, setUpdateInvQty] = useState('');

    // Task Filtering
    const [taskFilter, setTaskFilter] = useState<'my' | 'all'>('my');

    // Chat
    const [chatTab, setChatTab] = useState<'group' | 'dm'>('group');
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [dmUserId, setDmUserId] = useState<string | null>(null);
    const [showChat, setShowChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const stompClientRef = useRef<Client | null>(null);

    // Refs for WebSocket callbacks to always have the latest state without resubscribing
    const chatTabRef = useRef<'group' | 'dm'>(chatTab);
    const dmUserIdRef = useRef<string | null>(dmUserId);
    useEffect(() => { chatTabRef.current = chatTab; }, [chatTab]);
    useEffect(() => { dmUserIdRef.current = dmUserId; }, [dmUserId]);

    // Online presence + DM previews
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [dmPreviews, setDmPreviews] = useState<ChatMsg[]>([]);

    const isAdmin = team?.members?.find(m => m.userId === user?.id)?.groupRole === 'ADMIN' || team?.ownerId === user?.id;

    useEffect(() => {
        if (!id) return;
        teamService.getDetail(id).then(setTeam).catch(() => { });
        goalService.getByTeam(id).then(g => {
            setGoals(g);
            // Load all tasks for all goals
            Promise.all(g.map(goal => taskService.getByGoal(goal.id)))
                .then(taskArrays => setAllTasks(taskArrays.flat()))
                .catch(() => { });
        }).catch(() => { });
        inventoryService.getByTeam(id).then(setInventoryItems).catch(() => { });
        getTrialStatus().then(s => { setTrialActive(s.aiTrialActive); setTrialDays(s.daysRemaining); }).catch(() => { });
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const loadChatMessages = useCallback(async () => {
        if (!id) return;
        try {
            if (chatTab === 'group') {
                const msgs = await chatService.getGroupMessages(id);
                setChatMessages(msgs);
            } else if (dmUserId) {
                const msgs = await chatService.getDirectMessages(id, dmUserId);
                setChatMessages(msgs);
            }
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    }, [id, chatTab, dmUserId]);

    // Load online users + DM previews
    useEffect(() => {
        if (!id || !user) return;
        chatService.getOnlineUsers().then(setOnlineUsers).catch(() => {});
        chatService.getDmPreviews(id).then(setDmPreviews).catch(() => {});
    }, [id, user]);

    // Automatically load messages when chat is opened or tab/user changes
    useEffect(() => {
        if (showChat) {
            loadChatMessages();
        }
    }, [showChat, chatTab, dmUserId, loadChatMessages]);

    // WebSocket connection
    useEffect(() => {
        if (!id || !user) return;

        // Load initial messages if chat is open
        // if (showChat) loadChatMessages(); // handled by separate useEffect now

        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const socketUrl = `${apiBase}/ws`;

        const client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: { userId: user.id },
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('[STOMP] Connected');

                // Subscribe to group messages
                client.subscribe(`/topic/team/${id}`, (message) => {
                    const newMsg: ChatMsg = JSON.parse(message.body);
                    // ONLY append to current chat view if we are actively looking at the group chat
                    // If we are looking at a DM, DO NOT append group messages to the screen
                    if (chatTabRef.current === 'group') {
                        setChatMessages(prev => [...prev, newMsg]);
                    }
                });

                // Subscribe to ALL incoming DMs for this user in this team
                team?.members?.filter(m => m.userId !== user.id).forEach(m => {
                    client.subscribe(`/topic/dm/${id}/${user.id}/${m.userId}`, (message) => {
                        const newMsg: ChatMsg = JSON.parse(message.body);
                        
                        // Only append to current chat view if we are actively chatting with them
                        if (chatTabRef.current === 'dm' && dmUserIdRef.current === m.userId) {
                            setChatMessages(prev => [...prev, newMsg]);
                        }
                        // Update DM previews
                        setDmPreviews(prev => {
                            const filtered = prev.filter(p => {
                                const contactId = p.senderId === user.id ? p.recipientId : p.senderId;
                                return contactId !== m.userId;
                            });
                            return [newMsg, ...filtered];
                        });
                    });
                });

                // Subscribe to online presence
                client.subscribe('/topic/presence', (message) => {
                    const userIds: string[] = JSON.parse(message.body);
                    setOnlineUsers(userIds);
                });
            },
            onStompError: (frame) => {
                console.error('[STOMP] Error:', frame);
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
            stompClientRef.current = null;
        };
    }, [id, user, team]);

    const handleSendChat = async () => {
        if (!id || !chatInput.trim()) return;
        await chatService.sendMessage(id, chatInput.trim(), chatTab === 'dm' && dmUserId ? dmUserId : undefined);
        setChatInput('');
        loadChatMessages();
    };

    const closeModal = () => { setShowAddMember(false); setError(''); setSuccessMsg(''); };

    const handleCreateGoal = async (useAi: boolean) => {
        if (!id || !goalTitle.trim()) return;
        if (useAi && !trialActive) { setError('AI đã hết hạn dùng thử!'); return; }
        setLoading(true);
        try {
            setError('');
            await goalService.create({ teamId: id, title: goalTitle, outputTarget: goalTarget, deadline: goalDeadline || undefined, useAi } as any);
            const g = await goalService.getByTeam(id);
            setGoals(g);
            Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat()));
            setShowCreateGoal(false);
            setGoalTitle(''); setGoalTarget(''); setGoalDeadline('');
        } catch (e: any) { setError(e?.response?.data?.error || 'Lỗi'); } finally { setLoading(false); }
    };

    const handleTaskStatus = async (taskId: string, status: string) => {
        await taskService.updateStatus(taskId, status);
        if (id) {
            const g = await goalService.getByTeam(id);
            setGoals(g);
            Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat()));
        }
    };

    const handleAddTask = async () => {
        if (!selectedGoalId || !newTaskTitle.trim()) return;
        setLoading(true);
        try {
            await taskService.create({ goalId: selectedGoalId, title: newTaskTitle, description: newTaskDesc, workload: Number(newTaskWorkload) || 0 });
            const g = await goalService.getByTeam(id!);
            setGoals(g);
            Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat()));
            setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskWorkload(''); setShowAddTask(false);
        } catch (e: any) { setError(e?.response?.data?.error || 'Lỗi'); } finally { setLoading(false); }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Xóa task này?')) return;
        await taskService.delete(taskId);
        if (id) {
            const g = await goalService.getByTeam(id);
            setGoals(g);
            Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat()));
        }
    };

    const handleSaveAdSettings = async () => {
        if (!team) return;
        setLoading(true);
        try {
            if (isPublished) {
                const updated = await teamService.advertise(team.id, { specialty: adSpecialty, capacity: adCapacity, region: adRegion });
                setTeam(updated);
            } else {
                await teamService.unpublish(team.id);
                setTeam({ ...team, isPublished: false });
            }
            setShowAdSettings(false);
        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi'); } finally { setLoading(false); }
    };

    const handleDeleteTeam = async () => {
        if (!team) return;
        if (!confirm(`Bạn có chắc muốn xóa nhóm "${team.name}"?\n\nHành động không thể hoàn tác.`)) return;
        try { await teamService.deleteTeam(team.id); navigate('/groups'); } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi'); }
    };

    const handleSaveLabels = async () => {
        if (!team || !selectedMemberForLabels) return;
        setLoading(true);
        try {
            const labelArray = editingLabels.split(',').map(l => l.trim()).filter(l => l.length > 0);
            const updatedLabels = await teamService.updateMemberLabels(team.id, selectedMemberForLabels.userId, labelArray);
            
            // Cập nhật state ui cho team member
            setTeam(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    members: prev.members?.map(m => m.userId === selectedMemberForLabels.userId ? { ...m, jobLabels: updatedLabels } : m)
                };
            });
            setShowLabelModal(false);
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Lỗi khi lưu nhãn dán');
        } finally {
            setLoading(false);
        }
    };

    const handleAddInventory = async () => {
        if (!id || !invName.trim() || !invQty) return;
        setLoading(true);
        try {
            await inventoryService.create({
                teamId: id,
                name: invName,
                quantity: Number(invQty),
                unit: invUnit || 'Cái',
                lowStockThreshold: Number(invThreshold) || 10
            });
            const items = await inventoryService.getByTeam(id);
            setInventoryItems(items);
            setInvName(''); setInvQty(''); setInvUnit(''); setInvThreshold(''); setShowAddInventory(false);
        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi thêm hàng'); } finally { setLoading(false); }
    };

    const handleUpdateInvQty = async (invId: string) => {
        if (!id || !updateInvQty) return;
        setLoading(true);
        try {
            await inventoryService.updateQuantity(invId, Number(updateInvQty));
            const items = await inventoryService.getByTeam(id);
            setInventoryItems(items);
            setUpdatingInvId(null); setUpdateInvQty('');
        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi cập nhật số lượng'); } finally { setLoading(false); }
    };

    const handleDeleteInventory = async (invId: string) => {
        if (!confirm('Xóa mặt hàng này khỏi kho?')) return;
        try {
            await inventoryService.delete(invId);
            const items = await inventoryService.getByTeam(id!);
            setInventoryItems(items);
        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi xóa hàng'); }
    };

    if (!team) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}><ion-icon name="time-outline" style={{ fontSize: '40px' }}></ion-icon></div>
                <p>Đang tải nhóm...</p>
            </div>
        </div>
    );

    // === COMPUTED DATA ===
    const totalTasks = allTasks.length;
    const inProgressTasks = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = allTasks.filter(t => t.status === 'PENDING').length;
    const completionPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Member stats
    const memberStats = (team.members || []).map((m, idx) => {
        const memberTasks = allTasks.filter(t => t.memberId === m.userId);
        const completed = memberTasks.filter(t => t.status === 'COMPLETED').length;
        const total = memberTasks.length;
        const pct = total ? Math.round((completed / total) * 100) : 0;
        return { ...m, completed, total, pct, color: MEMBER_COLORS[idx % MEMBER_COLORS.length] };
    });

    // Mock line chart data (weekly performance)
    const lineData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const day = d.toLocaleDateString('vi', { weekday: 'short' });
        const point: Record<string, string | number> = { day };
        memberStats.forEach(m => {
            point[m.fullName || m.username] = Math.round(Math.min(100, Math.max(0, m.pct + (Math.sin(i * 1.5 + m.userId.charCodeAt(0)) * 20))));
        });
        return point;
    });

    // Donut data
    const donutData = [
        { name: 'Hoàn thành', value: completedTasks },
        { name: 'Đang làm', value: inProgressTasks },
        { name: 'Chưa bắt đầu', value: pendingTasks },
    ].filter(d => d.value > 0);
    if (donutData.length === 0) donutData.push({ name: 'Trống', value: 1 });

    // Bar data
    const barData = memberStats.map(m => ({ name: (m.fullName || m.username).split(' ').pop(), tasks: m.total, completed: m.completed }));

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 32px', fontFamily: "'Inter', sans-serif" }}>
            {/* ===== HEADER ===== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 800 }}>
                        <ion-icon name="business"></ion-icon>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{team.name}</h1>
                            <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>● ĐANG HOẠT ĐỘNG</span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{team.description || 'Nhóm sản xuất'} • {team.memberCount} thành viên</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {team.inviteCode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <ion-icon name="key-outline" style={{ fontSize: 14, color: '#64748b' }}></ion-icon>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Mã mời:</span>
                            <span onClick={() => navigator.clipboard.writeText(team.inviteCode || '')} style={{ fontWeight: 800, letterSpacing: 3, color: '#6366f1', cursor: 'pointer' }}>{team.inviteCode}</span>
                        </div>
                    )}
                    <button onClick={() => setShowChat(!showChat)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}><ion-icon name="chatbubbles-outline"></ion-icon> Chat</button>
                    {isAdmin && <button onClick={() => navigate(`/groups/${team.id}/create-task`)} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><ion-icon name="add"></ion-icon> Thêm công việc</button>}
                    {isAdmin && <button onClick={() => setShowAddMember(true)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}><ion-icon name="people-outline"></ion-icon> Mời</button>}
                    {isAdmin && <button onClick={handleDeleteTeam} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px', fontSize: 16, cursor: 'pointer', color: '#ef4444', display: 'flex' }}><ion-icon name="trash-outline"></ion-icon></button>}
                </div>
            </div>

            {/* ===== STATS CARDS ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Tổng công việc', value: totalTasks, icon: 'clipboard-outline', bg: '#eef2ff', color: '#6366f1' },
                    { label: 'Đang thực hiện', value: inProgressTasks, icon: 'sync-outline', bg: '#fff7ed', color: '#f59e0b' },
                    { label: 'Hoàn thành', value: completedTasks, icon: 'checkmark-circle-outline', bg: '#f0fdf4', color: '#16a34a' },
                    { label: 'Chưa bắt đầu', value: pendingTasks, icon: 'time-outline', bg: '#f8fafc', color: '#94a3b8' },
                ].map((s, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 24 }}>
                            <ion-icon name={s.icon}></ion-icon>
                        </div>
                        <div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ===== LINE CHART ===== */}
            {isAdmin && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Hiệu suất nhân viên trong tuần</h3>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={(v: any) => `${v}%`} />
                        <Legend />
                        {memberStats.map(m => (
                            <Line key={m.userId} type="monotone" dataKey={m.fullName || m.username} stroke={m.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            )}

            {/* ===== TWO COL: DONUT + BAR ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
                {/* Donut */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Tiến độ nhóm</h3>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{completionPct}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <ResponsiveContainer width={140} height={140}>
                            <PieChart>
                                <Pie data={donutData} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                                    {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {donutData.map((d, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                    <span style={{ color: '#475569' }}>{d.name}: <b>{d.value}</b></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bar */}
                {isAdmin && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>So sánh thành viên</h3>
                    <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            <Tooltip />
                            <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Hoàn thành" />
                            <Bar dataKey="tasks" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Tổng" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                )}
            </div>

            {/* ===== MEMBER CARDS ===== */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                {memberStats
                    .filter(m => isAdmin || m.userId === user?.id)
                    .map(m => {
                        const displayName = m.fullName || m.username;
                    return (
                        <div key={m.userId} style={{ minWidth: 220, background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{getInitials(displayName)}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{displayName}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.groupRole === 'ADMIN' || m.groupRole === 'OWNER' ? 'Trưởng nhóm' : 'Thành viên'}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, color: m.pct === 100 ? '#16a34a' : m.pct > 0 ? '#f59e0b' : '#94a3b8' }}>{m.pct}%</div>
                            </div>
                            
                            {/* Tags / Job Labels */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 24 }}>
                                {m.jobLabels && m.jobLabels.length > 0 ? (
                                    m.jobLabels.map((lbl: string, i: number) => (
                                        <span key={i} style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: '1px solid #c7d2fe' }}>
                                            {lbl}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>Chưa có nhãn</span>
                                )}
                                {isAdmin && (
                                    <button onClick={() => { setSelectedMemberForLabels(m); setEditingLabels(m.jobLabels?.join(', ') || ''); setShowLabelModal(true); }} style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#94a3b8', borderRadius: 6, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}>
                                        <ion-icon name="pencil"></ion-icon>
                                    </button>
                                )}
                            </div>

                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                                <div style={{ height: '100%', background: m.pct === 100 ? '#16a34a' : m.pct > 0 ? '#f59e0b' : '#e2e8f0', borderRadius: 3, width: `${m.pct}%`, transition: 'width 0.4s' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.completed}/{m.total} công việc</div>
                                {m.userId !== user?.id && (
                                    <button 
                                        onClick={() => {
                                            setChatTab('dm');
                                            setDmUserId(m.userId);
                                            setShowChat(true);
                                        }}
                                        style={{ 
                                            background: '#eef2ff', color: '#6366f1', border: 'none', 
                                            borderRadius: 8, padding: '4px 10px', fontSize: 11, 
                                            fontWeight: 700, cursor: 'pointer', display: 'flex', 
                                            alignItems: 'center', gap: 4 
                                        }}
                                    >
                                        <ion-icon name="chatbubble-ellipses-outline"></ion-icon> Nhắn tin
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== GOAL STRATEGIC OVERVIEW (NEW) ===== */}
            {isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>
                {goals.map(g => {
                    let aiData: any = null;
                    if (g.aiParsedData) {
                        try {
                            aiData = JSON.parse(g.aiParsedData);
                        } catch (e) {
                            console.error("Failed to parse AI data", e);
                        }
                    }

                    const displayTitle = g.title || aiData?.mainGoal || 'Kế hoạch công việc';
                    const displayDesc = g.outputTarget || g.rawInstruction || aiData?.description || 'Nhiệm vụ đã được phân bổ cho các thành viên trong nhóm.';
                    const displayPhase = aiData?.phase || 'CHÍNH THỨC';

                    return (
                        <div key={g.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ background: '#6366f1', padding: '12px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ion-icon name="rocket-outline" style={{ fontSize: 18 }}></ion-icon>
                                    <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mục tiêu: {displayTitle}</span>
                                </div>
                                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{displayPhase}</span>
                            </div>
                            <div style={{ padding: 16 }}>
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Chỉ tiêu hiện tại</div>
                                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, lineHeight: 1.4 }} className="markdown-body">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayDesc}</ReactMarkdown>
                                    </div>
                                </div>
                                {aiData?.contingency && (
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Phương án dự phòng (Contingency)</div>
                                        <div style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: 8, border: '1px solid #fee2e2' }}>
                                            <ion-icon name="warning-outline" style={{ verticalAlign: 'middle', marginRight: 4 }}></ion-icon>
                                            {aiData.contingency}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* ===== TASK TABLE ===== */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                            <ion-icon name="list-outline" style={{ verticalAlign: 'middle', marginRight: 6, color: '#6366f1' }}></ion-icon>
                            CÔNG VIỆC
                        </h3>
                        {isAdmin && (
                            <button onClick={() => { if (!selectedGoalId && goals.length > 0) setSelectedGoalId(goals[0].id); setShowAddTask(!showAddTask); }} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ion-icon name="add"></ion-icon> Thêm mới
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                            onClick={() => setTaskFilter('my')}
                            style={{ 
                                padding: '8px 16px', 
                                borderRadius: 10, 
                                fontSize: 13, 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: 'none',
                                background: taskFilter === 'my' ? '#6366f1' : '#f1f5f9',
                                color: taskFilter === 'my' ? '#fff' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <ion-icon name="person-outline"></ion-icon>
                            Việc của tôi
                            <span style={{ 
                                background: taskFilter === 'my' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', 
                                padding: '1px 6px', 
                                borderRadius: 6, 
                                fontSize: 11,
                                marginLeft: 6
                            }}>
                                {allTasks.filter(t => t.memberId === user?.id).length}
                            </span>
                        </button>
                        {isAdmin && (
                            <button 
                                onClick={() => setTaskFilter('all')}
                                style={{ 
                                    padding: '8px 16px', 
                                    borderRadius: 10, 
                                    fontSize: 13, 
                                    fontWeight: 700, 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: 'none',
                                    background: taskFilter === 'all' ? '#6366f1' : '#f1f5f9',
                                    color: taskFilter === 'all' ? '#fff' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <ion-icon name="people-outline"></ion-icon>
                                Tất cả công việc
                                <span style={{ 
                                    background: taskFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', 
                                    padding: '1px 6px', 
                                    borderRadius: 6, 
                                    fontSize: 11,
                                    marginLeft: 6
                                }}>
                                    {allTasks.length}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Add task inline form */}
                {showAddTask && isAdmin && (
                    <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={selectedGoalId || ''} onChange={e => setSelectedGoalId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' }}>
                            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                        </select>
                        <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Tên task *" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, flex: 1 }} />
                        <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Mô tả" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 160 }} />
                        <button onClick={handleAddTask} disabled={loading || !newTaskTitle.trim()} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Tạo</button>
                        <button onClick={() => setShowAddTask(false)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#64748b' }}>Hủy</button>
                    </div>
                )}

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            {['Tên công việc', 'Trạng thái', 'Xác nhận', 'Tiến độ', 'Ưu tiên', 'Thành viên', ''].map((h, i) => (
                                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const filtered = (taskFilter === 'my' || !isAdmin) ? allTasks.filter(t => t.memberId === user?.id) : allTasks;
                            if (filtered.length === 0) {
                                return <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>Chưa có công việc nào trong danh sách này</td></tr>;
                            }
                            return filtered.map(t => {
                                const st = STATUS_COLORS[t.status] || STATUS_COLORS.PENDING;
                                return (
                                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t.title}</div>
                                            {t.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{t.description}</div>}
                                            {t.deadline && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}><ion-icon name="time-outline" style={{ fontSize: 11 }}></ion-icon> Hạn: {new Date(t.deadline).toLocaleDateString('vi')}</div>}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {(isAdmin || t.memberId === user?.id) ? (
                                                <select value={t.status} onChange={e => handleTaskStatus(t.id, e.target.value)} style={{ background: st.bg, color: st.color, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                                    <option value="PENDING">Chờ xử lý</option>
                                                    <option value="IN_PROGRESS">Đang làm</option>
                                                    <option value="COMPLETED">Hoàn thành</option>
                                                </select>
                                            ) : (
                                                <span style={{ background: st.bg, color: st.color, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {(() => {
                                                const as = t.acceptanceStatus || 'WAITING';
                                                const aStyle = as === 'ACCEPTED' ? { bg: '#dcfce7', color: '#16a34a', label: 'Đã nhận' }
                                                    : as === 'REJECTED' ? { bg: '#fee2e2', color: '#dc2626', label: 'Từ chối' }
                                                    : { bg: '#fef3c7', color: '#d97706', label: 'Chờ xác nhận' };
                                                return (
                                                    <div>
                                                        <span style={{ background: aStyle.bg, color: aStyle.color, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>{aStyle.label}</span>
                                                        {as === 'WAITING' && t.memberId === user?.id && (
                                                            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                                                <button onClick={async () => { await taskService.respondToTask(t.id, true); const g = await goalService.getByTeam(id!); setGoals(g); Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat())); }} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Nhận</button>
                                                                <button onClick={async () => { await taskService.respondToTask(t.id, false); const g = await goalService.getByTeam(id!); setGoals(g); Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat())); }} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Từ chối</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '12px 16px', minWidth: 120 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: st.color, borderRadius: 3, width: `${t.completionPercentage || 0}%`, transition: 'width 0.4s' }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{t.completionPercentage || 0}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ background: t.priority >= 3 ? '#fee2e2' : t.priority >= 2 ? '#fef3c7' : '#f0fdf4', color: t.priority >= 3 ? '#dc2626' : t.priority >= 2 ? '#d97706' : '#16a34a', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                                {t.priority >= 3 ? 'Cao' : t.priority >= 2 ? 'TB' : 'Thấp'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {isAdmin ? (
                                                <select value={t.memberId || ''} onChange={async e => { await taskService.assign(t.id, e.target.value); const g = await goalService.getByTeam(id!); setGoals(g); Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat())); }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer', minWidth: 100 }}>
                                                    <option value="">— Giao —</option>
                                                    {team?.members?.map(m => <option key={m.userId} value={m.userId}>{m.fullName || m.username}</option>)}
                                                </select>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {t.memberName && <div style={{ width: 24, height: 24, borderRadius: '50%', background: avatarColor(t.memberName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{getInitials(t.memberName)}</div>}
                                                    <span style={{ fontSize: 12, color: '#475569' }}>{t.memberName || 'Chưa giao'}</span>
                                                    {t.memberId && t.memberId !== user?.id && (
                                                        <ion-icon 
                                                            name="chatbubble-ellipses" 
                                                            onClick={() => { setChatTab('dm'); setDmUserId(t.memberId!); setShowChat(true); }} 
                                                            style={{ cursor: 'pointer', color: '#6366f1', marginLeft: 4, fontSize: 16 }} 
                                                            title={`Nhắn tin với ${t.memberName}`}
                                                        ></ion-icon>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {isAdmin && <button onClick={() => handleDeleteTask(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, opacity: 0.6 }}><ion-icon name="trash-outline"></ion-icon></button>}
                                        </td>
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>

            {/* ===== BẢNG LƯƠNG ===== */}
            {isAdmin && (
                <SalaryPanel teamId={id!} />
            )}

            {/* ===== BẢNG KHO HÀNG (INVENTORY) ===== */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}><ion-icon name="cube-outline" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6, color: '#6366f1' }}></ion-icon> KHO HÀNG ({inventoryItems.length})</h3>
                    {isAdmin && (
                        <button onClick={() => setShowAddInventory(!showAddInventory)} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ion-icon name="add"></ion-icon> Nhập kho
                        </button>
                    )}
                </div>

                {/* Add Inventory inline form */}
                {showAddInventory && isAdmin && (
                    <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Tên hàng hóa *" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, flex: 1, minWidth: 200 }} />
                        <input type="number" value={invQty} onChange={e => setInvQty(e.target.value)} placeholder="Số lượng *" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 100 }} />
                        <input value={invUnit} onChange={e => setInvUnit(e.target.value)} placeholder="Đơn vị (VD: Cái)" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 130 }} />
                        <input type="number" value={invThreshold} onChange={e => setInvThreshold(e.target.value)} placeholder="Báo sắp hết (< 10)" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 140 }} />
                        <button onClick={handleAddInventory} disabled={loading || !invName.trim() || !invQty} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Lưu</button>
                        <button onClick={() => setShowAddInventory(false)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#64748b' }}>Hủy</button>
                    </div>
                )}

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            {['Tên mặt hàng', 'Tình trạng', 'Số lượng', 'Cập nhật', ''].map((h, i) => (
                                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryItems.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>Kho hàng trống</td></tr>
                        ) : inventoryItems.map(item => {
                            const isUpdating = updatingInvId === item.id;
                            let statusColor = '#16a34a'; let statusBg = '#dcfce7'; let statusLabel = 'Còn hàng';
                            if (item.status === 'OUT_OF_STOCK') { statusColor = '#dc2626'; statusBg = '#fee2e2'; statusLabel = 'Hết hàng'; }
                            else if (item.status === 'LOW_STOCK') { statusColor = '#d97706'; statusBg = '#fef3c7'; statusLabel = 'Sắp hết'; }
                            
                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{item.name}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Mức báo hết: &lt;= {item.lowStockThreshold} {item.unit}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ background: statusBg, color: statusColor, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }}></div> {statusLabel}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{item.quantity} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>{item.unit}</span></div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {isUpdating ? (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <input type="number" value={updateInvQty} onChange={e => setUpdateInvQty(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #6366f1', width: 70, fontSize: 12 }} autoFocus />
                                                <button onClick={() => handleUpdateInvQty(item.id)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '0 8px', fontSize: 11, cursor: 'pointer' }}>OK</button>
                                                <button onClick={() => setUpdatingInvId(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, padding: '0 8px', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setUpdatingInvId(item.id); setUpdateInvQty(item.quantity.toString()); }} style={{ background: '#f8fafc', color: '#6366f1', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Chỉnh sửa</button>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {isAdmin && <button onClick={() => handleDeleteInventory(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, opacity: 0.6 }}><ion-icon name="trash-outline"></ion-icon></button>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== CHAT PANEL (SLIDE) ===== */}
            {showChat && (
                <div style={{ position: 'fixed', right: 0, top: 0, width: 380, height: '100vh', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' }}>
                    {/* Chat Header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}><ion-icon name="chatbubbles" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6, color: '#6366f1' }}></ion-icon> Nhắn tin</h3>
                        <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}><ion-icon name="close"></ion-icon></button>
                    </div>

                    {/* Tab Bar (Only show if not currently inside a DM conversation) */}
                    {!(chatTab === 'dm' && dmUserId) && (
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                            <button onClick={() => { setChatTab('group'); setDmUserId(null); }} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: chatTab === 'group' ? '#eef2ff' : '#f8fafc', color: chatTab === 'group' ? '#6366f1' : '#64748b', borderBottom: chatTab === 'group' ? '2px solid #6366f1' : '1px solid #e2e8f0' }}>
                                <ion-icon name="people-outline" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Nhóm chung
                            </button>
                            <button onClick={() => setChatTab('dm')} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: chatTab === 'dm' ? '#eef2ff' : '#f8fafc', color: chatTab === 'dm' ? '#6366f1' : '#64748b', borderBottom: chatTab === 'dm' ? '2px solid #6366f1' : '1px solid #e2e8f0' }}>
                                <ion-icon name="person-outline" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Cá nhân
                            </button>
                        </div>
                    )}

                    {/* DM user list */}
                    {chatTab === 'dm' && !dmUserId && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                            {team.members?.filter(m => m.userId !== user?.id).map(m => {
                                const isOnline = onlineUsers.includes(m.userId);
                                const preview = dmPreviews.find(p => p.senderId === m.userId || p.recipientId === m.userId);
                                const previewText = preview ? (preview.content.length > 30 ? preview.content.substring(0, 30) + '...' : preview.content) : null;
                                const previewTime = preview ? new Date(preview.createdAt) : null;
                                const timeLabel = previewTime ? (() => {
                                    const diff = Date.now() - previewTime.getTime();
                                    if (diff < 60000) return 'Vừa xong';
                                    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
                                    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ`;
                                    return previewTime.toLocaleDateString('vi-VN');
                                })() : null;
                                return (
                                    <div key={m.userId} onClick={() => setDmUserId(m.userId)} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor(m.fullName || m.username), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{getInitials(m.fullName || m.username)}</div>
                                            {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{m.fullName || m.username}</span>
                                                {timeLabel && <span style={{ fontSize: 10, color: '#94a3b8' }}>{timeLabel}</span>}
                                            </div>
                                            <div style={{ fontSize: 12, color: isOnline ? '#22c55e' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {previewText || (isOnline ? 'Đang hoạt động' : m.groupRole === 'ADMIN' ? 'Trưởng nhóm' : 'Thành viên')}
                                            </div>
                                        </div>
                                        <ion-icon name="chevron-forward-outline" style={{ color: '#cbd5e1', flexShrink: 0 }}></ion-icon>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Chat messages area */}
                    {(chatTab === 'group' || (chatTab === 'dm' && dmUserId)) && (
                        <>
                            {/* Inner Header for specific conversation */}
                            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                {chatTab === 'dm' && dmUserId && (
                                    <button onClick={() => setDmUserId(null)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}><ion-icon name="arrow-back" style={{ fontSize: 20 }}></ion-icon></button>
                                )}
                                {chatTab === 'dm' && dmUserId ? (() => {
                                    const m = team.members?.find(mem => mem.userId === dmUserId);
                                    const isOnline = m ? onlineUsers.includes(m.userId) : false;
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(m?.fullName || m?.username || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{getInitials(m?.fullName || m?.username || '?')}</div>
                                                {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #f8fafc' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{m?.fullName || m?.username}</div>
                                                <div style={{ fontSize: 12, color: isOnline ? '#22c55e' : '#94a3b8' }}>{isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</div>
                                            </div>
                                        </div>
                                    );
                                })() : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                            <ion-icon name="people-outline" style={{ fontSize: 20 }}></ion-icon>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Nhóm chung</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{team.members?.length || 0} thành viên</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                                {chatMessages.length === 0 && (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '40px 0' }}>
                                        <ion-icon name="chatbubble-outline" style={{ fontSize: 32, display: 'block', margin: '0 auto 8px' }}></ion-icon>
                                        Chưa có tin nhắn nào
                                    </div>
                                )}
                                {chatMessages.map(msg => {
                                    const isMe = msg.senderId === user?.id;

                                    return (
                                        <div key={msg.id} style={{
                                            display: 'flex',
                                            flexDirection: isMe ? 'row-reverse' : 'row',
                                            gap: 8,
                                            marginBottom: 16,
                                            alignItems: 'flex-start'
                                        }}>
                                            {/* Avatar (with silhouette) */}
                                            {!isMe ? (
                                                <div style={{
                                                    width: 38, height: 38, borderRadius: '50%',
                                                    background: '#e2e8f0',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#cbd5e1', flexShrink: 0, overflow: 'hidden'
                                                }}>
                                                    <ion-icon name="person-circle" style={{ fontSize: 44 }}></ion-icon>
                                                </div>
                                            ) : (
                                                <div style={{ width: 0 }} /> // Spacer for right side if needed, or just let row-reverse handle it
                                            )}

                                            <div style={{
                                                maxWidth: '75%',
                                                background: isMe ? '#e5efff' : '#fff',
                                                borderRadius: isMe ? '12px 12px 0 12px' : '0 12px 12px 12px',
                                                padding: '10px 14px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                border: isMe ? '1px solid #d1e2ff' : '1px solid #e1e4e8',
                                            }}>
                                                {!isMe && (
                                                    <div style={{
                                                        fontSize: 12, fontWeight: 600, color: '#515d6e',
                                                        marginBottom: 4
                                                    }}>{msg.senderName}</div>
                                                )}
                                                <div style={{ fontSize: 15, color: '#081c36', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                                    {msg.content}
                                                </div>
                                                <div style={{
                                                    fontSize: 10, color: '#7a869a', marginTop: 4,
                                                    textAlign: isMe ? 'right' : 'left'
                                                }}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat input */}
                            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 8 }}>
                                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder={chatTab === 'dm' ? "Nhập tin nhắn riêng..." : "Nhập tin nhắn cho toàn nhóm..."} style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#f8fafc' }} />
                                <button onClick={handleSendChat} style={{ background: '#6366f1', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'none'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}><ion-icon name="send" style={{ fontSize: 18, marginLeft: 2 }}></ion-icon></button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ===== MODALS (preserved) ===== */}
            {/* Invite Modal */}
            {showAddMember && (
                <div className="modal-overlay" onClick={closeModal} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: 0, borderRadius: 20, overflow: 'hidden', background: '#fff', border: 'none', color: '#1a1a1a', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '24px 32px', textAlign: 'center' }}>
                            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Mã mời nhóm</h2>
                            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Chia sẻ mã hoặc quét QR để mời thành viên.</p>
                        </div>
                        <div style={{ padding: '0 32px 24px' }}>
                            <div style={{ background: '#f8fafc', borderRadius: 16, padding: '24px', textAlign: 'center', border: '1px solid #e2e8f0', marginBottom: 20 }}>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                                    {(team.inviteCode || 'ABCDEF').split('').map((c, i) => (
                                        <div key={i} style={{ width: 44, height: 54, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{c}</div>
                                    ))}
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(team.inviteCode || ''); setSuccessMsg('Đã copy!'); setTimeout(() => setSuccessMsg(''), 2000); }} style={{ background: '#fff', color: '#6b7280', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
                                    <ion-icon name="copy-outline"></ion-icon> Sao chép
                                </button>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ width: 140, height: 140, margin: '0 auto 12px', padding: 10, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`${window.location.origin}/invite/${team.inviteCode}`)}`} alt="QR" style={{ width: '100%', height: '100%' }} />
                                </div>
                            </div>
                            <button onClick={closeModal} style={{ width: '100%', background: '#f8fafc', color: '#1f2937', border: '1px solid #e2e8f0', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Hoàn tất</button>
                        </div>
                        {successMsg && <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}><ion-icon name="checkmark-circle" style={{ color: '#10b981' }}></ion-icon> {successMsg}</div>}
                    </div>
                </div>
            )}

            {/* Create Goal Modal */}
            {showCreateGoal && (
                <div className="modal-overlay" onClick={() => setShowCreateGoal(false)} style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, background: '#fff', color: '#1a1a1a', borderRadius: 16 }}>
                        <h2 style={{ marginBottom: 4, color: '#111' }}>Tạo mục tiêu mới</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>AI sẽ tự động chia nhỏ thành các task.</p>
                        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Tên mục tiêu *" style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} autoFocus />
                            <input value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Sản lượng mục tiêu" style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
                            <input type="datetime-local" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, flexWrap: 'wrap' }}>
                            <button onClick={() => setShowCreateGoal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                            <button onClick={() => handleCreateGoal(false)} disabled={loading} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{loading ? 'Đang tạo...' : 'Tạo thủ công'}</button>
                            <button onClick={() => handleCreateGoal(true)} disabled={loading || !trialActive} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: trialActive ? 1 : 0.5 }}>{loading ? 'Đang tạo...' : `AI tạo task (${trialDays} ngày)`}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ad Settings Modal */}
            {showAdSettings && (
                <div className="modal-overlay" onClick={() => setShowAdSettings(false)} style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, background: '#fff', color: '#1a1a1a', borderRadius: 16 }}>
                        <h2 style={{ marginBottom: 4, color: '#111' }}>Cài đặt Marketplace</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, marginTop: 16 }}>
                            <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} style={{ width: 16, height: 16 }} />
                            <label style={{ fontSize: 14, fontWeight: 600 }}>Công khai trên Marketplace</label>
                        </div>
                        {isPublished && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <input value={adRegion} onChange={e => setAdRegion(e.target.value)} placeholder="Khu vực" style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
                                <input value={adSpecialty} onChange={e => setAdSpecialty(e.target.value)} placeholder="Chuyên môn" style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
                                <input value={adCapacity} onChange={e => setAdCapacity(e.target.value)} placeholder="Năng suất" style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button onClick={() => setShowAdSettings(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Thoát</button>
                            <button onClick={handleSaveAdSettings} disabled={loading} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Labels Modal */}
            {showLabelModal && selectedMemberForLabels && (
                <div className="modal-overlay" onClick={() => setShowLabelModal(false)} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, background: '#fff', color: '#1a1a1a', borderRadius: 16, padding: '24px' }}>
                        <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 18 }}>Nhãn dán công việc</h2>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                            Gán thẻ nhãn cho <b>{selectedMemberForLabels.fullName || selectedMemberForLabels.username}</b>. Các nhãn phân cách nhau bằng dấu phẩy (Ví dụ: Thợ rang, Đóng gói).
                        </p>
                        <input 
                            value={editingLabels} 
                            onChange={e => setEditingLabels(e.target.value)} 
                            placeholder="Nhập thẻ nhãn..." 
                            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#f8fafc' }} 
                            autoFocus 
                            onKeyDown={e => e.key === 'Enter' && handleSaveLabels()}
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button onClick={() => setShowLabelModal(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                            <button onClick={handleSaveLabels} disabled={loading} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                {loading ? 'Đang lưu...' : 'Lưu nhãn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat History Modal */}
            {showChatHistory && (
                <div className="modal-overlay" onClick={() => setShowChatHistory(false)} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, padding: 0, borderRadius: 20, overflow: 'hidden', height: '80vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Lịch sử Chat AI</h3><p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>Mục tiêu: {activeGoalTitle}</p></div>
                            <button onClick={() => setShowChatHistory(false)} style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><ion-icon name="close" style={{ fontSize: 20 }}></ion-icon></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {activeChatLog.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0', background: msg.role === 'user' ? '#6366f1' : '#fff', color: msg.role === 'user' ? '#fff' : '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: 14, lineHeight: 1.5, border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none' }}>{msg.content}</div>
                                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{msg.role === 'user' ? 'Bạn' : 'AI'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}><button onClick={() => setShowChatHistory(false)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Đóng</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SalaryPanel({ teamId }: { teamId: string }) {
    const [salaryData, setSalaryData] = useState<SalaryReport[]>([]);
    const [loadingSalary, setLoadingSalary] = useState(false);
    const [showSalary, setShowSalary] = useState(false);

    const loadSalary = async () => {
        setLoadingSalary(true);
        try {
            const data = await taskService.getSalaryReport(teamId);
            setSalaryData(data);
        } catch { /* ignore */ }
        setLoadingSalary(false);
    };

    return (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showSalary ? 16 : 0 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ion-icon name="wallet-outline" style={{ fontSize: 20, color: '#6366f1' }}></ion-icon>
                    Bảng lương nhân viên
                </h3>
                <button onClick={() => { setShowSalary(p => !p); if (!showSalary) loadSalary(); }} style={{
                    background: showSalary ? '#f1f5f9' : '#6366f1', color: showSalary ? '#475569' : '#fff',
                    border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}>
                    {showSalary ? 'Ẩn' : 'Xem bảng lương'}
                </button>
            </div>

            {showSalary && (
                loadingSalary ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Đang tải...</div>
                ) : salaryData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu lương</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Nhân viên', 'Tổng task', 'Hoàn thành', 'Tổng công (giờ)', 'Đơn giá/giờ', 'Lương ước tính'].map((h, i) => (
                                    <th key={i} style={{ padding: '10px 14px', textAlign: i >= 1 ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {salaryData.map(s => (
                                <tr key={s.memberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{s.memberName}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13 }}>{s.totalTasks}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{s.completedTasks}</span>
                                    </td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{s.totalWorkload.toFixed(1)}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13 }}>{s.hourlyRate.toLocaleString('vi-VN')} đ</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
                                            {s.estimatedSalary.toLocaleString('vi-VN')} đ
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ background: '#fafafa', fontWeight: 700 }}>
                                <td style={{ padding: '12px 14px', fontSize: 14, color: '#1e293b' }}>Tổng cộng</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>{salaryData.reduce((a, s) => a + s.totalTasks, 0)}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>{salaryData.reduce((a, s) => a + s.completedTasks, 0)}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>{salaryData.reduce((a, s) => a + s.totalWorkload, 0).toFixed(1)}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>—</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <span style={{ background: '#6366f1', color: '#fff', padding: '6px 16px', borderRadius: 8, fontSize: 14, fontWeight: 800 }}>
                                        {salaryData.reduce((a, s) => a + s.estimatedSalary, 0).toLocaleString('vi-VN')} đ
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )
            )}
        </div>
    );
}
