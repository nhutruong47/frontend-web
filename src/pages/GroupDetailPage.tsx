import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService, goalService, taskService, getTrialStatus, chatService } from '../services/groupService';
import type { Team, Goal, Task, ChatMsg, SalaryReport, AiChatLogMsg } from '../types/types';

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { estimateTokens, formatTokenCount } from '../utils/tokenUsage';

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
    const colors = ['#d4a574', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
    return colors[hash];
}
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: '#fef3c7', color: '#d97706', label: 'Chờ xử lý' },
    IN_PROGRESS: { bg: '#dbeafe', color: '#2563eb', label: 'Đang làm' },
    COMPLETED: { bg: '#dcfce7', color: '#16a34a', label: 'Hoàn thành' },
};
Object.assign(STATUS_COLORS, {
    PENDING: { bg: '#f8fafc', color: '#64748b', label: 'Cho xu ly' },
    BLOCKED: { bg: '#fee2e2', color: '#dc2626', label: 'Bi khoa' },
    READY: { bg: '#dcfce7', color: '#16a34a', label: 'San sang' },
    WAITING_APPROVAL: { bg: '#fef3c7', color: '#d97706', label: 'Cho duyet' },
    COMPLETED: { bg: '#dcfce7', color: '#16a34a', label: 'Hoan thanh' },
    CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'Da huy' },
});
const MEMBER_COLORS = ['#d4a574', '#f59e0b', '#10b981', '#ec4899', '#f43f5e', '#06b6d4', '#8b5cf6', '#3b82f6'];



const inventoryService = {
  getByTeam: async (..._args: any[]) => [],
  create: async (..._args: any[]) => {},
  updateQuantity: async (..._args: any[]) => {},
  delete: async (..._args: any[]) => {}
};

export default function GroupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [team, setTeam] = useState<Team | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
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
    const [newTaskStage, setNewTaskStage] = useState('Roasting');
    const [newTaskUnit, setNewTaskUnit] = useState('');
    const [newTaskDueTime, setNewTaskDueTime] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState(2);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTaskTitle, setEditTaskTitle] = useState('');
    const [editTaskDesc, setEditTaskDesc] = useState('');
    const [editTaskStage, setEditTaskStage] = useState('Roasting');
    const [editTaskDueTime, setEditTaskDueTime] = useState('');
    const [editTaskPriority, setEditTaskPriority] = useState(2);
    const [editTaskUnit, setEditTaskUnit] = useState('');

    const inferUnitFromText = (text: string, stage?: string): string => {
        const lower = (text || '').toLowerCase();
        const map: { keys: string[]; unit: string }[] = [
            { keys: ['gói', 'goi', 'pack', 'package', 'packet', 'túi', 'tui', 'bịch', 'bich'], unit: 'gói' },
            { keys: ['hộp', 'hop', 'box', 'thùng', 'thung', 'carton'], unit: 'hộp' },
            { keys: ['chai', 'bottle', 'lọ', 'lo'], unit: 'chai' },
            { keys: ['tem', 'nhãn', 'nhan', 'label', 'sticker'], unit: 'tem' },
            { keys: ['mẫu', 'mau', 'sample'], unit: 'mẫu' },
            { keys: ['đơn', 'don', 'order', 'đơn hàng'], unit: 'đơn' },
        ];
        for (const m of map) {
            if (m.keys.some(k => lower.includes(k))) return m.unit;
        }
        const stageMap: Record<string, string> = {
            DONG_GOI: 'gói',
            Packaging: 'gói',
            DAN_TEM: 'tem',
            Labeling: 'tem',
            QA: 'mẫu',
            QC: 'mẫu',
            GIAO_HANG: 'đơn',
            Delivery: 'đơn',
            Shipping: 'đơn',
            Roasting: 'kg',
            RANG: 'kg',
            SAY: 'kg',
            Drying: 'kg',
        };
        if (stage && stageMap[stage]) return stageMap[stage];
        return 'kg';
    };

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
    const [showMemberRoles, setShowMemberRoles] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [selectedMemberForLabels, setSelectedMemberForLabels] = useState<any>(null);
    const [editingLabels, setEditingLabels] = useState<string>('');

    // Inventory
    const [inventoryItems, setanys] = useState<any[]>([]);
    const [showAddInventory, setShowAddInventory] = useState(false);
    const [invName, setInvName] = useState('');
    const [invQty, setInvQty] = useState('');
    const [invUnit, setInvUnit] = useState('');
    const [invThreshold, setInvThreshold] = useState('');
    // For updating quantity inline
    const [updatingInvId, setUpdatingInvId] = useState<string | null>(null);
    const [updateInvQty, setUpdateInvQty] = useState('');

    // Task Filtering
    const [taskFilter, setTaskFilter] = useState<'my' | 'all'>('all');

    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [calendarDate, setCalendarDate] = useState(new Date(2026, 5, 20));
    const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(20);

    // Chat
    const [chatTab, setChatTab] = useState<'group' | 'dm'>('group');
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [dmUserId, setDmUserId] = useState<string | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [showChatTokens, setShowChatTokens] = useState(false);
    const [chatExpanded, setChatExpanded] = useState(true);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [chatAttachment, setChatAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [unreadGroupCount, setUnreadGroupCount] = useState(0);
    const [unreadDmCounts, setUnreadDmCounts] = useState<Record<string, number>>({});
    const chatEndRef = useRef<HTMLDivElement>(null);
    const stompClientRef = useRef<Client | null>(null);

    // Refs for WebSocket callbacks to always have the latest state without resubscribing
    const chatTabRef = useRef<'group' | 'dm'>(chatTab);
    const dmUserIdRef = useRef<string | null>(dmUserId);
    const showChatRef = useRef(showChat);
    const chatTokenTotal = chatMessages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
    const unreadDmTotal = Object.values(unreadDmCounts).reduce((sum, count) => sum + count, 0);
    const unreadTotal = unreadGroupCount + unreadDmTotal;
    useEffect(() => { chatTabRef.current = chatTab; }, [chatTab]);
    useEffect(() => { dmUserIdRef.current = dmUserId; }, [dmUserId]);
    useEffect(() => { showChatRef.current = showChat; }, [showChat]);

    // Online presence + DM previews
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [dmPreviews, setDmPreviews] = useState<ChatMsg[]>([]);

    const currentMember = team?.members?.find(m => m.userId === user?.id);
    const isSystemAdmin = user?.role === 'ADMIN';
    const isAdmin = currentMember?.groupRole === 'ADMIN' || currentMember?.groupRole === 'OWNER' || team?.ownerId === user?.id;
    const isManager = !isSystemAdmin && isAdmin;

    useEffect(() => {
        if (!team || !user) return;
        setTaskFilter(isAdmin ? 'all' : 'my');
    }, [team?.id, user?.id, isAdmin]);

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
        // inventoryService.getByTeam(id).then(setanys).catch(() => { });
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

    useEffect(() => {
        if (showChat && chatTab === 'group') {
            setUnreadGroupCount(0);
        }
        if (showChat && chatTab === 'dm' && dmUserId) {
            setUnreadDmCounts(prev => ({ ...prev, [dmUserId]: 0 }));
        }
    }, [showChat, chatTab, dmUserId]);

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
                    if (newMsg.senderId !== user.id && !(showChatRef.current && chatTabRef.current === 'group')) {
                        setUnreadGroupCount(prev => prev + 1);
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
                        if (newMsg.senderId !== user.id && !(showChatRef.current && chatTabRef.current === 'dm' && dmUserIdRef.current === m.userId)) {
                            setUnreadDmCounts(prev => ({ ...prev, [m.userId]: (prev[m.userId] || 0) + 1 }));
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
        if (!id || (!chatInput.trim() && !chatAttachment)) return;

        let messageContent = chatInput.trim();
        if (chatAttachment) {
            messageContent = messageContent ? `${messageContent} [Đính kèm: ${chatAttachment.name}]` : `[Đính kèm: ${chatAttachment.name}]`;
        }

        await chatService.sendMessage(id, messageContent, chatTab === 'dm' && dmUserId ? dmUserId : undefined);
        setChatInput('');
        setChatAttachment(null);
        loadChatMessages();
    };

    const renderUnreadBadge = (count: number) => count > 0 ? (
        <span style={{
            minWidth: 20,
            height: 20,
            padding: '0 6px',
            borderRadius: 999,
            background: '#ef4444',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 4px 10px rgba(239,68,68,0.28)'
        }}>{count > 99 ? '99+' : count}</span>
    ) : null;

    const closeModal = () => { setShowAddMember(false); setInviteEmail(''); setError(''); setSuccessMsg(''); };

    const handleInviteMember = async () => {
        if (!id || !inviteEmail.trim()) {
            setError('Vui lòng nhập email người được mời.');
            return;
        }
        try {
            setError('');
            setLoading(true);
            const result = await teamService.addMember(id, inviteEmail.trim());
            setSuccessMsg(result.message || 'Đã gửi lời mời.');
            setInviteEmail('');
            setTimeout(() => setSuccessMsg(''), 2500);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Không thể gửi lời mời.');
        } finally {
            setLoading(false);
        }
    };

    const toDatetimeInputValue = (value?: string) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset();
        const local = new Date(date.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16);
    };

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



    const handleAddTask = async () => {
        if (!id || !newTaskTitle.trim()) return;
        setLoading(true);
        try {
            let goalId = selectedGoalId;
            if (!goalId) {
                const manualGoal = await goalService.create({
                    teamId: id,
                    title: 'Công việc thủ công',
                    outputTarget: 'Các công việc được thêm thủ công trong bảng.'
                } as any);
                goalId = manualGoal.id;
                setSelectedGoalId(goalId);
            }
            const inferredUnit = (newTaskUnit && newTaskUnit.trim()) || inferUnitFromText(`${newTaskTitle} ${newTaskDesc}`, newTaskStage);
            await taskService.create({
                goalId,
                title: newTaskTitle,
                description: newTaskDesc,
                workload: Number(newTaskWorkload) || 0,
                priority: newTaskPriority,
                productionStage: newTaskStage,
                unit: inferredUnit,
                dueTime: newTaskDueTime || undefined,
                deadline: newTaskDueTime || undefined,
                createdById: user?.id,
                createdByType: 'MANAGER'
            });
            const g = await goalService.getByTeam(id);
            setGoals(g);
            Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat()));
            setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskWorkload(''); setNewTaskDueTime(''); setNewTaskPriority(2); setShowAddTask(false);
        } catch (e: any) { setError(e?.response?.data?.error || 'Lỗi'); } finally { setLoading(false); }
    };

    const startEditTask = (task: Task) => {
        setEditingTaskId(task.id);
        setEditTaskTitle(task.title || '');
        setEditTaskDesc(task.description || '');
        setEditTaskStage(task.productionStage || 'Roasting');
        setEditTaskUnit(task.unit || '');
        setEditTaskDueTime(toDatetimeInputValue(task.dueTime || task.deadline));
        setEditTaskPriority(task.priority || 2);
    };

    const cancelEditTask = () => {
        setEditingTaskId(null);
        setEditTaskTitle('');
        setEditTaskDesc('');
        setEditTaskStage('Roasting');
        setEditTaskUnit('');
        setEditTaskDueTime('');
        setEditTaskPriority(2);
    };

    const handleUpdateTask = async (taskId: string) => {
        if (!editTaskTitle.trim()) return;
        setLoading(true);
        try {
            const updatedUnit = (editTaskUnit && editTaskUnit.trim())
                ? editTaskUnit.trim()
                : inferUnitFromText(`${editTaskTitle} ${editTaskDesc}`, editTaskStage);
            await taskService.update(taskId, {
                title: editTaskTitle.trim(),
                description: editTaskDesc.trim(),
                priority: editTaskPriority,
                productionStage: editTaskStage,
                unit: updatedUnit,
                dueTime: editTaskDueTime || undefined,
                deadline: editTaskDueTime || undefined,
                updatedById: user?.id,
                updatedByType: 'MANAGER'
            });
            if (id) {
                const g = await goalService.getByTeam(id);
                setGoals(g);
                Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat()));
            }
            cancelEditTask();
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
            setanys(items);
            setInvName(''); setInvQty(''); setInvUnit(''); setInvThreshold(''); setShowAddInventory(false);
        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi thêm hàng'); } finally { setLoading(false); }
    };

    const handleUpdateInvQty = async (invId: string) => {
        if (!id || !updateInvQty) return;
        setLoading(true);
        try {
            await inventoryService.updateQuantity(invId, Number(updateInvQty));
            const items = await inventoryService.getByTeam(id);
            setanys(items);
            setUpdatingInvId(null); setUpdateInvQty('');
        } catch (e: any) { alert(e?.response?.data?.error || 'Lỗi cập nhật số lượng'); } finally { setLoading(false); }
    };

    const handleDeleteInventory = async (invId: string) => {
        if (!confirm('Xóa mặt hàng này khỏi kho?')) return;
        try {
            await inventoryService.delete(invId);
            const items = await inventoryService.getByTeam(id!);
            setanys(items);
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


    // Member stats
    const memberStats = (team.members || []).map((m, idx) => {
        const memberTasks = allTasks.filter(t => t.memberId === m.userId);
        const completed = memberTasks.filter(t => t.status === 'COMPLETED').length;
        const total = memberTasks.length;
        const pct = total ? Math.round((completed / total) * 100) : 0;
        return { ...m, completed, total, pct, color: MEMBER_COLORS[idx % MEMBER_COLORS.length] };
    });




    // Show the actual team roster for everyone. The previous filter hid all other
    // members for non-admin users, which made the group appear to have only one member.
    const visibleMemberStats = memberStats;
    const latestGoal = [...goals].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
    })[0] || goals[goals.length - 1];
    const latestGoalTasks = latestGoal ? allTasks.filter(task => task.goalId === latestGoal.id) : allTasks;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px clamp(16px, 3vw, 48px)', fontFamily: "'Inter', sans-serif", width: '100%', maxWidth: 'none', margin: 0 }}>
            {/* ===== HEADER ===== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#d4a574', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 800 }}>
                        <ion-icon name="cafe-outline"></ion-icon>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{team.name}</h1>
                            <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>● ĐANG HOẠT ĐỘNG</span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{team.description || 'Nhóm sản xuất'} • {team.memberCount} thành viên</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <style>
                        {`
                        @keyframes pulse-ai-btn {
                            0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
                            70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
                        }
                        `}
                    </style>
                    {team.inviteCode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <ion-icon name="key-outline" style={{ fontSize: 14, color: 'var(--text-muted)' }}></ion-icon>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Mã mời:</span>
                            <span onClick={() => navigator.clipboard.writeText(team.inviteCode || '')} style={{ fontWeight: 800, letterSpacing: 3, color: 'var(--accent-primary)', cursor: 'pointer' }}>{team.inviteCode}</span>
                        </div>
                    )}

                    {/* NÚT AI NỔI BẬT ĐƯA LÊN TRƯỚC */}
                    {isAdmin && (
                        <button
                            onClick={() => navigate(`/groups/${team.id}/create-task`)}
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 10,
                                padding: '8px 20px',
                                fontSize: 14,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                textShadow: '0 1px 2px rgba(0,0,0,0.28)',
                                animation: 'pulse-ai-btn 2s infinite',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <ion-icon name="sparkles" style={{ fontSize: '18px' }}></ion-icon>
                            Phân chia công việc tự động
                        </button>
                    )}

                    <button onClick={() => setShowStatsModal(true)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }} id="btn-stats-modal"><ion-icon name="bar-chart-outline"></ion-icon> Thống kê</button>
                    <button onClick={() => setShowScheduleModal(true)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }} id="btn-schedule-modal"><ion-icon name="calendar-outline"></ion-icon> Lịch sản xuất</button>
                    <button onClick={() => setShowChat(!showChat)} style={{ position: 'relative', background: unreadTotal > 0 ? '#fff7ed' : 'var(--bg-input)', border: unreadTotal > 0 ? '1px solid #fed7aa' : '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary)' }}><ion-icon name={unreadTotal > 0 ? 'chatbubbles' : 'chatbubbles-outline'}></ion-icon> Nhắn tin {renderUnreadBadge(unreadTotal)}</button>
                    {isAdmin && <button onClick={() => setShowMemberRoles(!showMemberRoles)} style={{ background: showMemberRoles ? '#fff7ed' : 'var(--bg-input)', border: showMemberRoles ? '1px solid #fed7aa' : '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: showMemberRoles ? '#d97706' : 'var(--text-secondary)' }}><ion-icon name="id-card-outline"></ion-icon> Phân vai trò</button>}

                    {isAdmin && <button onClick={() => setShowAddMember(true)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}><ion-icon name="people-outline"></ion-icon> Mời</button>}
                    {isAdmin && <button onClick={handleDeleteTeam} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px', fontSize: 16, cursor: 'pointer', color: '#ef4444', display: 'flex' }}><ion-icon name="trash-outline"></ion-icon></button>}
                </div>
            </div>

            {/* ===== STATS CARDS ===== */}
            {isManager && totalTasks > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
                {[
                    { label: 'Tổng công việc', value: totalTasks, icon: 'clipboard-outline', bg: '#f9f1e3', color: '#d4a574' },
                    { label: 'Chưa bắt đầu', value: pendingTasks, icon: 'time-outline', bg: '#f8fafc', color: '#94a3b8' },
                    { label: 'Đang thực hiện', value: inProgressTasks, icon: 'sync-outline', bg: '#fff7ed', color: '#f59e0b' },
                    { label: 'Hoàn thành', value: completedTasks, icon: 'checkmark-circle-outline', bg: '#f0fdf4', color: '#16a34a' },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 24 }}>
                            <ion-icon name={s.icon}></ion-icon>
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {/* ===== EMPTY STATE / ANALYTICS ===== */}
            {/* ===== MEMBER CARDS ===== */}
            {showMemberRoles && visibleMemberStats.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 260px))', gap: 14, marginBottom: 18 }}>
                {visibleMemberStats.map(m => {
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
                            {((m.jobLabels && m.jobLabels.filter((l: string) => l.trim().length > 0).length > 0) || isAdmin) && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 24 }}>
                                    {m.jobLabels && m.jobLabels.filter((l: string) => l.trim().length > 0).length > 0 && (
                                        m.jobLabels.filter((l: string) => l.trim().length > 0).map((lbl: string, i: number) => (
                                            <span key={i} style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: '1px solid #c7d2fe' }}>
                                                {lbl}
                                            </span>
                                        ))
                                    )}
                                    {isAdmin && (
                                        <button onClick={() => { setSelectedMemberForLabels(m); setEditingLabels(m.jobLabels?.join(', ') || ''); setShowLabelModal(true); }} style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#64748b', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s' }}>
                                            <ion-icon name="add"></ion-icon> Phân vai trò
                                        </button>
                                    )}
                                </div>
                            )}

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
                                            background: '#f9f1e3', color: '#d4a574', border: 'none',
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
            )}

            {/* ===== DB ROADMAP: same source as task table ===== */}
            {isAdmin && latestGoal && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 18, boxShadow: '0 10px 26px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
                        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212, 165, 116, 0.15)', color: 'var(--accent-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <ion-icon name="flag-outline" style={{ fontSize: 18 }}></ion-icon>
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Muc tieu san xuat</div>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>{latestGoal.title}</h3>
                            <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13 }}>{latestGoal.outputTarget || latestGoal.rawInstruction}</div>
                        </div>
                    </div>
                    <span style={{ background: 'rgba(212, 165, 116, 0.15)', color: 'var(--accent-primary)', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>CAP NHAT MOI NHAT</span>
                </div>
                <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Roadmap tu task database</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                {['STT', 'Cong viec', 'Nguoi chinh', 'Du phong', 'Trang thai', 'Tien do'].map((h, i) => (
                                    <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {latestGoalTasks.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)', fontSize: 13 }}>Chua co task trong database</td></tr>
                            ) : latestGoalTasks.map((task, index) => {
                                const actual = Number(task.actualOutput ?? 0);
                                const target = Number(task.outputTarget ?? 0);
                                const progressPct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : (task.completionPercentage || 0);

                                let displayStatusKey = task.status;
                                if (target > 0) {
                                    if (progressPct >= 100) {
                                        displayStatusKey = 'COMPLETED';
                                    } else if (progressPct > 0) {
                                        displayStatusKey = 'IN_PROGRESS';
                                    } else {
                                        displayStatusKey = 'PENDING';
                                    }
                                }
                                const status = STATUS_COLORS[displayStatusKey] || STATUS_COLORS.PENDING;
                                return (
                                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>{index + 1}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 13 }}>{task.title}</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>{task.productionStage || task.taskCode}</div>
                                            {task.dependencyTaskTitles && task.dependencyTaskTitles.length > 0 && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>Depends on: {task.dependencyTaskTitles.join(', ')}</div>}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>{task.memberName || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>{task.backupMemberName || '-'}</td>
                                        <td style={{ padding: '10px 12px' }}><span style={{ background: status.bg, color: status.color, padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>{status.label}</span></td>
                                        <td style={{ padding: '10px 12px', minWidth: 120 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 999, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${progressPct}%`, background: status.color, borderRadius: 999 }} />
                                                </div>
                                                <span style={{ color: status.color, fontSize: 12, fontWeight: 800, minWidth: 34 }}>{progressPct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* ===== GOAL STRATEGIC OVERVIEW (LEGACY AI TEXT) ===== */}
            {false && isAdmin && latestGoal && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 18 }}>
                {[latestGoal].map(g => {
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
                        <div key={g.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 26px rgba(15,23,42,0.06)' }}>
                            <div style={{ padding: '16px 20px', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, borderBottom: '1px solid #edf2f7', background: 'linear-gradient(180deg, #fffaf3, #fff)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
                                    <span style={{ width: 36, height: 36, borderRadius: 10, background: '#f3dfc6', color: '#8a5a2d', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                        <ion-icon name="flag-outline" style={{ fontSize: 18 }}></ion-icon>
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 11, color: '#9a6b3b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mục tiêu sản xuất</div>
                                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#172033', lineHeight: 1.35 }}>{displayTitle}</h3>
                                    </div>
                                </div>
                                <span style={{ background: '#f3dfc6', color: '#6b4321', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{displayPhase}</span>
                            </div>
                            <div style={{ padding: 20 }}>
                                <div style={{ marginBottom: aiData?.contingency ? 16 : 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Kế hoạch hiện tại</div>
                                    <div style={{ fontSize: 14, color: '#24324a', fontWeight: 500, lineHeight: 1.65 }} className="markdown-body goal-roadmap-markdown">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayDesc}</ReactMarkdown>
                                    </div>
                                </div>
                                {aiData?.contingency && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Phương án dự phòng</div>
                                        <div style={{ fontSize: 13, color: '#b42318', background: '#fff4f2', padding: '10px 12px', borderRadius: 10, border: '1px solid #ffd7d0', lineHeight: 1.55 }}>
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
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 18 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                            <ion-icon name="list-outline" style={{ verticalAlign: 'middle', marginRight: 6, color: '#d4a574' }}></ion-icon>
                            CÔNG VIỆC
                        </h3>
                        {isAdmin && (
                            <button onClick={() => { if (!selectedGoalId && goals.length > 0) setSelectedGoalId(goals[0].id); setShowAddTask(!showAddTask); }} style={{ background: '#d4a574', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                                background: taskFilter === 'my' ? '#d4a574' : '#f1f5f9',
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
                                {latestGoalTasks.filter(t => t.memberId === user?.id).length}
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
                                    background: taskFilter === 'all' ? '#d4a574' : '#f1f5f9',
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
                                    {latestGoalTasks.length}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Add task modal */}
                {showAddTask && isAdmin && (
                    <div className="modal-overlay" onClick={() => setShowAddTask(false)} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '90%', background: 'var(--bg-panel, #fff)', color: 'var(--text-primary, #1a1a1a)', borderRadius: 16, padding: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>Tạo công việc mới</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Loại công việc / Mục tiêu</label>
                                    <select value={selectedGoalId || ''} onChange={e => setSelectedGoalId(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)' }}>
                                        <option value="">Công việc thủ công</option>
                                        {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Tên task <span style={{ color: '#dc2626' }}>*</span></label>
                                    <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Tên task" style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} autoFocus />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mô tả</label>
                                    <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Mô tả công việc..." style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 14 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Giai đoạn</label>
                                        <select value={newTaskStage} onChange={e => setNewTaskStage(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)' }}>
                                            {['Roasting', 'Cooling', 'Grinding', 'Packaging', 'Quality Check', 'Inventory'].map(stage => <option key={stage} value={stage}>{stage}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mức ưu tiên</label>
                                        <select value={newTaskPriority} onChange={e => setNewTaskPriority(Number(e.target.value))} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)' }}>
                                            <option value={1}>Thấp</option>
                                            <option value={2}>Trung bình</option>
                                            <option value={3}>Cao</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 14 }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Hạn chót (Deadline)</label>
                                        <input value={newTaskDueTime} onChange={e => setNewTaskDueTime(e.target.value)} type="datetime-local" style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Giờ công</label>
                                        <input value={newTaskWorkload} onChange={e => setNewTaskWorkload(e.target.value)} placeholder="0" type="number" min="0" style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Đơn vị <span style={{ color: '#94a3b8', fontWeight: 400 }}>(tự đoán)</span></label>
                                        <input
                                            value={newTaskUnit || inferUnitFromText(`${newTaskTitle} ${newTaskDesc}`, newTaskStage)}
                                            onChange={e => setNewTaskUnit(e.target.value)}
                                            placeholder="kg, gói, hộp, chai, tem, mẫu, đơn..."
                                            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28 }}>
                                <button onClick={() => setShowAddTask(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border, #e2e8f0)', background: 'transparent', color: 'var(--text-primary, #64748b)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                                <button onClick={handleAddTask} disabled={loading || !newTaskTitle.trim()} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#d4a574', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (loading || !newTaskTitle.trim()) ? 0.6 : 1 }}>
                                    {loading ? 'Đang tạo...' : 'Tạo công việc'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            {['Tên công việc', 'Tiến độ', 'Ưu tiên', 'Thành viên', ''].map((h, i) => (
                                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const filtered = (taskFilter === 'my' || !isAdmin) ? latestGoalTasks.filter(t => t.memberId === user?.id) : latestGoalTasks;
                            if (filtered.length === 0) {
                                return <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Chưa có công việc nào trong danh sách này</td></tr>;
                            }
                            return filtered.map(t => {
                                const actual = Number(t.actualOutput ?? 0);
                                const target = Number(t.outputTarget ?? t.workload ?? 0);
                                const progressPct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : (t.completionPercentage || 0);

                                let displayStatusKey = t.status;
                                if (target > 0) {
                                    if (progressPct >= 100) {
                                        displayStatusKey = 'COMPLETED';
                                    } else if (progressPct > 0) {
                                        displayStatusKey = 'IN_PROGRESS';
                                    } else {
                                        displayStatusKey = 'PENDING';
                                    }
                                }
                                const st = STATUS_COLORS[displayStatusKey] || STATUS_COLORS.PENDING;
                                return (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            {editingTaskId === t.id ? (
                                                <div style={{ display: 'grid', gap: 6, minWidth: 220 }}>
                                                    <input value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)} placeholder="Tên công việc" style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--accent-primary)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-input)' }} />
                                                    <input value={editTaskDesc} onChange={e => setEditTaskDesc(e.target.value)} placeholder="Mô tả" style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)' }} />
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        <select value={editTaskStage} onChange={e => setEditTaskStage(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                                                            {['Roasting', 'Cooling', 'Grinding', 'Packaging', 'Quality Check', 'Inventory'].map(stage => <option key={stage} value={stage}>{stage}</option>)}
                                                        </select>
                                                        <select value={editTaskPriority} onChange={e => setEditTaskPriority(Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                                                            <option value={1}>Thấp</option>
                                                            <option value={2}>TB</option>
                                                            <option value={3}>Cao</option>
                                                        </select>
                                                        <input value={editTaskDueTime} onChange={e => setEditTaskDueTime(e.target.value)} type="datetime-local" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)' }} />
                                                        <input value={editTaskUnit || inferUnitFromText(`${editTaskTitle} ${editTaskDesc}`, editTaskStage)} onChange={e => setEditTaskUnit(e.target.value)} placeholder="Đơn vị" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)', width: 90 }} title="Đơn vị (kg, gói, hộp, chai, tem, mẫu, đơn...)" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {t.taskCode && <div style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 2 }}>{t.taskCode}</div>}
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{t.title}</div>
                                                    {t.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t.description}</div>}
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                                        {t.productionStage && <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 6, padding: '2px 6px' }}>{t.productionStage}</span>}
                                                        {t.dependencyTaskTitles && t.dependencyTaskTitles.length > 0 && <span style={{ fontSize: 11, color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)', borderRadius: 6, padding: '2px 6px' }}>Depends on: {t.dependencyTaskTitles.join(', ')}</span>}
                                                        {(t.dueTime || t.deadline) && <span style={{ fontSize: 11, color: '#f59e0b' }}><ion-icon name="time-outline" style={{ fontSize: 11 }}></ion-icon> Hạn: {new Date(t.dueTime || t.deadline).toLocaleDateString('vi')}</span>}
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', minWidth: 200 }}>
                                            {(() => {
                                                const target = Number(t.outputTarget ?? t.workload ?? 0);
                                                const actual = Number(t.actualOutput ?? 0);
                                                const unit = t.unit && t.unit.trim() ? t.unit : inferUnitFromText(`${t.title || ''} ${t.description || ''}`, t.productionStage);
                                                const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : (t.completionPercentage || 0);
                                                const PROGRESS_COLOR = '#d4a574';
                                                const clampActual = (val: number) => Math.max(0, target > 0 ? Math.min(val, target) : val);
                                                const persistActual = (val: number) => {
                                                    taskService.update(t.id, { actualOutput: val })
                                                        .catch((err: any) => setError(err?.response?.data?.error || 'Khong the cap nhat'))
                                                        .then(() => { if (id) { goalService.getByTeam(id).then(g => { setGoals(g); Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat())); }); } });
                                                };
                                                return (
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 12 }}>
                                                            <span style={{ color: 'var(--text-secondary)' }}>Số lượng hiện tại:</span>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={target > 0 ? target : undefined}
                                                                value={actual}
                                                                onChange={(e) => {
                                                                    const val = clampActual(Number(e.target.value) || 0);
                                                                    setAllTasks(prev => prev.map(tk => tk.id === t.id ? { ...tk, actualOutput: val } : tk));
                                                                }}
                                                                onBlur={(e) => persistActual(Number(e.target.value) || 0)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
                                                                style={{ width: 72, padding: '6px 8px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#0f172a', textAlign: 'right', background: '#fff' }}
                                                            />
                                                            <span style={{ color: 'var(--text-secondary)' }}>/</span>
                                                            {isAdmin ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    defaultValue={target || ''}
                                                                    placeholder={String(target || '')}
                                                                    onBlur={async e => {
                                                                        const value = e.currentTarget.value;
                                                                        try {
                                                                            setError('');
                                                                            await taskService.update(t.id, { outputTarget: value === '' ? undefined : Number(value) });
                                                                            if (id) { goalService.getByTeam(id).then(g => { setGoals(g); Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat())); }); }
                                                                        } catch (err: any) {
                                                                            setError(err?.response?.data?.error || 'Không thể cập nhật mục tiêu');
                                                                        }
                                                                    }}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                                                    style={{ width: 72, padding: '6px 8px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#0f172a', textAlign: 'right', background: '#fff' }}
                                                                />
                                                            ) : (
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{target}</span>
                                                            )}
                                                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{unit}</span>
                                                            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: PROGRESS_COLOR }}>{pct}%</span>
                                                        </div>
                                                        <div style={{ position: 'relative', marginTop: 8, height: 18 }}>
                                                            <div style={{ position: 'absolute', left: 0, right: 0, top: 7, height: 4, background: 'var(--border)', borderRadius: 2 }} />
                                                            <div style={{ position: 'absolute', left: 0, top: 7, height: 4, width: `${pct}%`, background: PROGRESS_COLOR, borderRadius: 2, transition: 'width 0.15s ease' }} />
                                                            <input
                                                                type="range"
                                                                min={0}
                                                                max={Math.max(target, 1)}
                                                                value={Math.min(actual, target > 0 ? target : actual)}
                                                                onChange={(e) => {
                                                                    const val = clampActual(Number(e.target.value));
                                                                    setAllTasks(prev => prev.map(tk => tk.id === t.id ? { ...tk, actualOutput: val } : tk));
                                                                }}
                                                                onMouseUp={(e) => persistActual(Number((e.currentTarget as HTMLInputElement).value))}
                                                                onTouchEnd={(e) => persistActual(Number((e.currentTarget as HTMLInputElement).value))}
                                                                style={{ position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: 18, margin: 0, accentColor: PROGRESS_COLOR, cursor: 'pointer', background: 'transparent' }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ background: t.priority >= 3 ? '#f5e6d3' : t.priority >= 2 ? '#f9f1e3' : '#f0fdf4', color: t.priority >= 3 ? '#a0673c' : t.priority >= 2 ? '#c9884a' : '#16a34a', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                                {t.priority >= 3 ? 'Cao' : t.priority >= 2 ? 'TB' : 'Thấp'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {isAdmin ? (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <select value={t.memberId || ''} onChange={async e => {
                                                        const nextMemberId = e.target.value;
                                                        if (!nextMemberId) return;
                                                        if (t.memberId && t.memberId !== nextMemberId) {
                                                            const reason = window.prompt('Lý do chuyển giao công việc?', 'Điều phối lại nhân sự') || 'Điều phối lại nhân sự';
                                                            await taskService.transfer(t.id, nextMemberId, reason);
                                                        } else {
                                                            await taskService.assign(t.id, nextMemberId);
                                                        }
                                                        const g = await goalService.getByTeam(id!);
                                                        setGoals(g);
                                                        Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat()));
                                                    }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer', minWidth: 100 }}>
                                                        <option value="">— Giao —</option>
                                                        {team?.members?.map(m => <option key={m.userId} value={m.userId}>{m.fullName || m.username}</option>)}
                                                    </select>
                                                    <select value={t.backupMemberId || ''} onChange={async e => { await taskService.setBackup(t.id, e.target.value); const g = await goalService.getByTeam(id!); setGoals(g); Promise.all(g.map(goal => taskService.getByGoal(goal.id))).then(a => setAllTasks(a.flat())); }} style={{ background: '#fff7ed', border: '1px solid #fde3c7', borderRadius: 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer', minWidth: 120 }}>
                                                        <option value="">— Sao lưu —</option>
                                                        {team?.members?.map(m => <option key={m.userId} value={m.userId}>{m.fullName || m.username}</option>)}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {t.memberName && <div style={{ width: 24, height: 24, borderRadius: '50%', background: avatarColor(t.memberName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{getInitials(t.memberName)}</div>}
                                                    <span style={{ fontSize: 12, color: '#475569' }}>{t.memberName || 'Chưa giao'}</span>
                                                    {t.backupMemberName && <span style={{ marginLeft: 8, fontSize: 11, color: '#9a8a6f' }}>Sao lưu: {t.backupMemberName}</span>}
                                                    {t.memberId && t.memberId !== user?.id && (
                                                        <ion-icon
                                                            name="chatbubble-ellipses"
                                                            onClick={() => { setChatTab('dm'); setDmUserId(t.memberId!); setShowChat(true); }}
                                                            style={{ cursor: 'pointer', color: '#d4a574', marginLeft: 4, fontSize: 16 }}
                                                            title={`Nhắn tin với ${t.memberName}`}
                                                        ></ion-icon>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {isAdmin && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {editingTaskId === t.id ? (
                                                        <>
                                                            <button onClick={() => handleUpdateTask(t.id)} disabled={loading || !editTaskTitle.trim()} title="Lưu" style={{ background: '#16a34a', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', fontSize: 13, width: 28, height: 28, display: 'grid', placeItems: 'center', opacity: loading || !editTaskTitle.trim() ? 0.55 : 1 }}><ion-icon name="checkmark-outline"></ion-icon></button>
                                                            <button onClick={cancelEditTask} title="Hủy" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, color: '#64748b', cursor: 'pointer', fontSize: 13, width: 28, height: 28, display: 'grid', placeItems: 'center' }}><ion-icon name="close-outline"></ion-icon></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEditTask(t)} title="Sửa" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, color: '#64748b', cursor: 'pointer', fontSize: 13, width: 28, height: 28, display: 'grid', placeItems: 'center' }}><ion-icon name="create-outline"></ion-icon></button>
                                                            <button onClick={() => handleDeleteTask(t.id)} title="Xóa" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, opacity: 0.75, width: 28, height: 28, display: 'grid', placeItems: 'center' }}><ion-icon name="trash-outline"></ion-icon></button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
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
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 18 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}><ion-icon name="cube-outline" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6, color: '#d4a574' }}></ion-icon> KHO HÀNG ({inventoryItems.length})</h3>
                    {isAdmin && (
                        <button onClick={() => setShowAddInventory(!showAddInventory)} style={{ background: '#d4a574', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ion-icon name="add"></ion-icon> Nhập kho
                        </button>
                    )}
                </div>



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
                                                <input type="number" value={updateInvQty} onChange={e => setUpdateInvQty(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d4a574', width: 70, fontSize: 12 }} autoFocus />
                                                <button onClick={() => handleUpdateInvQty(item.id)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '0 8px', fontSize: 11, cursor: 'pointer' }}>OK</button>
                                                <button onClick={() => setUpdatingInvId(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, padding: '0 8px', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setUpdatingInvId(item.id); setUpdateInvQty(item.quantity.toString()); }} style={{ background: '#f8fafc', color: '#d4a574', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Chỉnh sửa</button>
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

                        {/* ===== CHAT PANEL (Messenger-style) ===== */}
            {showChat && (
                <div style={{
                    position: 'fixed', right: 80, bottom: 0,
                    width: chatExpanded ? 800 : 440, height: 480,
                    background: 'var(--bg-card, #ffffff)', boxShadow: 'var(--shadow-lg, 0 4px 24px rgba(0,0,0,0.15))',
                    zIndex: 9999, display: 'flex', flexDirection: 'row',
                    border: '1px solid var(--border, #e4e6eb)', borderBottom: 'none',
                    borderTopLeftRadius: 12, borderTopRightRadius: 12,
                    transition: 'width 0.3s ease',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                    overflow: 'hidden'
                }}>
                    {/* ===== LEFT: conversation list ===== */}
                    <div style={{
                        width: chatExpanded ? 320 : 0, flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        borderRight: '1px solid var(--border, #e4e6eb)',
                        background: 'var(--bg-secondary, #fff)',
                        overflow: 'hidden',
                        transition: 'width 0.3s ease'
                    }}>
                        {/* Sidebar header — chỉ 1 nút đóng (X) gọn */}
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border, #e4e6eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #050505)', letterSpacing: '-0.5px' }}>Đoạn chat</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button onClick={() => setShowChat(false)} aria-label="Đóng" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input, #e4e6eb)', border: 'none', color: 'var(--text-primary, #050505)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Đóng chat"
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger, #f02849)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-input, #e4e6eb)'; e.currentTarget.style.color = 'var(--text-primary, #050505)'; }}>
                                    <ion-icon name="close" style={{ fontSize: 22 }}></ion-icon>
                                </button>
                            </div>
                        </div>

                        {/* Search box */}
                        <div style={{ padding: '8px 12px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input, #f0f2f5)', borderRadius: 20, padding: '8px 12px' }}>
                                <ion-icon name="search-outline" style={{ color: 'var(--text-secondary, #65676b)', fontSize: 16 }}></ion-icon>
                                <input placeholder="Tìm kiếm nhân viên" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #050505)' }} />
                            </div>
                        </div>

                        {/* Tab pills: Nhóm / Cá nhân */}
                        <div style={{ display: 'flex', padding: '4px 12px 8px', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => { setChatTab('group'); setDmUserId(null); }} style={{ flex: 1, padding: '8px 12px', borderRadius: 18, border: 'none', cursor: 'pointer', background: chatTab === 'group' ? '#d4a574' : 'var(--bg-input, #e4e6eb)', color: chatTab === 'group' ? '#fff' : 'var(--text-primary, #050505)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <ion-icon name="people" style={{ fontSize: 14 }}></ion-icon> Nhóm {chatTab === 'group' && renderUnreadBadge(unreadGroupCount)}
                            </button>
                            <button onClick={() => setChatTab('dm')} style={{ flex: 1, padding: '8px 12px', borderRadius: 18, border: 'none', cursor: 'pointer', background: chatTab === 'dm' ? '#d4a574' : 'var(--bg-input, #e4e6eb)', color: chatTab === 'dm' ? '#fff' : 'var(--text-primary, #050505)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <ion-icon name="person" style={{ fontSize: 14 }}></ion-icon> Cá nhân {chatTab === 'dm' && renderUnreadBadge(unreadDmTotal)}
                            </button>
                        </div>

                        {/* Conversation list */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Group chat row (always first when on group tab) */}
                            {chatTab === 'group' && (
                                <div onClick={() => { setChatTab('group'); setDmUserId(null); }} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 8, margin: '2px 8px', background: chatTab === 'group' && !dmUserId ? 'rgba(212, 165, 116, 0.15)' : 'transparent' }}
                                    onMouseEnter={e => { if (!(chatTab === 'group' && !dmUserId)) e.currentTarget.style.background = 'var(--bg-card-hover, #f0f2f5)'; }} onMouseLeave={e => { if (!(chatTab === 'group' && !dmUserId)) e.currentTarget.style.background = 'transparent'; }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#d4a574', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                            <ion-icon name="people" style={{ fontSize: 24 }}></ion-icon>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #050505)' }}>Nhóm chung</span>
                                            {renderUnreadBadge(unreadGroupCount)}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary, #65676b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {team.members?.length || 0} thành viên • Trò chuyện nhóm
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DM rows */}
                            {(chatTab === 'dm' || chatTab === 'group') && (team.members?.filter(m => m.userId !== user?.id) || []).map(m => {
                                const isOnline = onlineUsers.includes(m.userId);
                                const preview = dmPreviews.find(p => p.senderId === m.userId || p.recipientId === m.userId);
                                const unreadCount = unreadDmCounts[m.userId] || 0;
                                const previewText = preview ? (preview.content.length > 35 ? preview.content.substring(0, 35) + '…' : preview.content) : 'Bắt đầu trò chuyện';
                                const previewTime = preview ? new Date(preview.createdAt) : null;
                                const timeLabel = previewTime ? (() => {
                                    const diff = Date.now() - previewTime.getTime();
                                    if (diff < 60000) return 'Vừa xong';
                                    if (diff < 3600000) return `${Math.floor(diff / 60000)} ph`;
                                    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ`;
                                    return previewTime.toLocaleDateString('vi-VN');
                                })() : '';
                                const isActive = chatTab === 'dm' && dmUserId === m.userId;
                                const isUnread = unreadCount > 0;
                                return (
                                    <div key={m.userId} onClick={() => { setChatTab('dm'); setDmUserId(m.userId); }} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 8, margin: '2px 8px', background: isActive ? 'rgba(212, 165, 116, 0.15)' : (isUnread ? 'rgba(212, 165, 116, 0.08)' : 'transparent') }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover, #f0f2f5)'; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isUnread ? 'rgba(212, 165, 116, 0.08)' : 'transparent'; }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarColor(m.fullName || m.username), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{getInitials(m.fullName || m.username)}</div>
                                            {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#31a24c', border: '2.5px solid #fff' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: isUnread ? 800 : 600, fontSize: 15, color: 'var(--text-primary, #050505)' }}>{m.fullName || m.username}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 11, color: isUnread ? '#d4a574' : 'var(--text-secondary, #65676b)', fontWeight: isUnread ? 700 : 500 }}>{timeLabel}</span>
                                                    {renderUnreadBadge(unreadCount)}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 13, color: isUnread ? 'var(--text-primary, #050505)' : 'var(--text-secondary, #65676b)', fontWeight: isUnread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {previewText}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ===== RIGHT: chat conversation ===== */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-card, #fff)' }}>
                        {/* Conversation header (Messenger style) — có nút đóng tắt (X) + mở rộng/thu nhỏ */}
                        <div style={{ flexShrink: 0, padding: '10px 12px', borderBottom: '1px solid var(--border, #e4e6eb)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card, #fff)' }}>
                            {chatTab === 'dm' && dmUserId ? (() => {
                                const m = team.members?.find(mem => mem.userId === dmUserId);
                                const isOnline = m ? onlineUsers.includes(m.userId) : false;
                                return (
                                    <>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor(m?.fullName || m?.username || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>{getInitials(m?.fullName || m?.username || '?')}</div>
                                            {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#31a24c', border: '2.5px solid #fff' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #050505)' }}>{m?.fullName || m?.username}</div>
                                            <div style={{ fontSize: 12, color: isOnline ? '#31a24c' : 'var(--text-secondary, #65676b)' }}>{isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</div>
                                        </div>
                                    </>
                                );
                            })() : (
                                <>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#d4a574', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                        <ion-icon name="people" style={{ fontSize: 22 }}></ion-icon>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #050505)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nhóm chung</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary, #65676b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.members?.length || 0} thành viên</div>
                                    </div>
                                </>
                            )}
                            {/* Nhóm nút hành động bên phải — gọn, kiểu Messenger */}
                            <button onClick={() => alert('Tính năng gọi thoại đang được phát triển')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 'none', color: '#d4a574', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Gọi thoại" onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input, #f0f2f5)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <ion-icon name="call" style={{ fontSize: 20 }}></ion-icon>
                            </button>
                            <button onClick={() => setShowVideoCall(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 'none', color: '#d4a574', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Gọi video" onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input, #f0f2f5)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <ion-icon name="videocam" style={{ fontSize: 20 }}></ion-icon>
                            </button>

                            <button onClick={() => setChatExpanded(!chatExpanded)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-secondary, #65676b)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={chatExpanded ? "Ẩn danh sách" : "Xem danh sách thành viên"} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input, #f0f2f5)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <ion-icon name={chatExpanded ? "chevron-forward-outline" : "people-outline"} style={{ fontSize: 22 }}></ion-icon>
                            </button>
                            <button onClick={() => setShowChat(false)} aria-label="Đóng" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input, #e4e6eb)', border: 'none', color: 'var(--text-primary, #050505)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Đóng chat"
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger, #f02849)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-input, #e4e6eb)'; e.currentTarget.style.color = 'var(--text-primary, #050505)'; }}>
                                <ion-icon name="close" style={{ fontSize: 22 }}></ion-icon>
                            </button>
                        </div>

                        {/* Messages area */}
                        {(chatTab === 'group' || (chatTab === 'dm' && dmUserId)) ? (
                            <>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-card, #fff)' }}>
                                    {chatMessages.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary, #65676b)', fontSize: 14, padding: '60px 20px', margin: 'auto' }}>
                                            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--bg-input, #f0f2f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                                <ion-icon name="chatbubbles" style={{ fontSize: 48, color: '#d4a574' }}></ion-icon>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary, #050505)', marginBottom: 4 }}>Bắt đầu cuộc trò chuyện</div>
                                            <div>Gửi tin nhắn cho {chatTab === 'dm' ? 'bạn bè' : 'nhóm'} của bạn</div>
                                        </div>
                                    )}
                                    {chatMessages.map((msg, idx) => {
                                        const isMe = msg.senderId === user?.id;
                                        const prev = idx > 0 ? chatMessages[idx - 1] : null;
                                        const isFirstOfGroup = !prev || prev.senderId !== msg.senderId;
                                        return (
                                            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end', marginTop: isFirstOfGroup ? 12 : 2, marginBottom: 2 }}>
                                                {!isMe ? (
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(msg.senderName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0, visibility: isFirstOfGroup ? 'visible' : 'hidden' }}>
                                                        {getInitials(msg.senderName)}
                                                    </div>
                                                ) : (
                                                    <div style={{ width: 28, flexShrink: 0 }} />
                                                )}
                                                <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                    {isFirstOfGroup && !isMe && chatTab === 'group' && (
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #65676b)', marginBottom: 2, paddingLeft: 10 }}>{msg.senderName}</div>
                                                    )}
                                                    <div style={{
                                                        background: isMe ? '#d4a574' : 'var(--bg-input, #f0f2f5)',
                                                        color: isMe ? '#fff' : 'var(--text-primary, #050505)',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                        padding: '8px 12px',
                                                        fontSize: 14,
                                                        lineHeight: 1.4,
                                                        wordBreak: 'break-word',
                                                        whiteSpace: 'pre-wrap',
                                                        boxShadow: 'none'
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted, #65676b)', marginTop: 2, padding: '0 6px' }}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {showChatTokens && ` • ${formatTokenCount(estimateTokens(msg.content))} token`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Attachment preview */}
                                {chatAttachment && (
                                    <div style={{ padding: '10px 16px', background: 'var(--bg-input, #f0f2f5)', borderTop: '1px solid var(--border, #e4e6eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary, #050505)' }}>
                                            <ion-icon name="document-text" style={{ color: '#d4a574', fontSize: 20 }}></ion-icon>
                                            <span style={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chatAttachment.name}</span>
                                        </div>
                                        <button onClick={() => setChatAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #65676b)', display: 'flex' }}><ion-icon name="close-circle" style={{ fontSize: 20 }}></ion-icon></button>
                                    </div>
                                )}

                                {/* Chat input (Messenger-style) */}
                                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border, #e4e6eb)', background: 'var(--bg-card, #fff)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => { if(e.target.files && e.target.files[0]) setChatAttachment(e.target.files[0]) }} />
                                    <button onClick={() => alert('Tính năng gửi ảnh đang được phát triển')} style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: '#d4a574', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Gửi ảnh"
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input, #f0f2f5)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <ion-icon name="image" style={{ fontSize: 24 }}></ion-icon>
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: '#d4a574', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Đính kèm file"
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input, #f0f2f5)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <ion-icon name="attach" style={{ fontSize: 24 }}></ion-icon>
                                    </button>
                                    <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-input, #f0f2f5)', borderRadius: 20, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder={chatTab === 'dm' ? "Aa" : "Aa, nhắn cho nhóm..."} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #050505)' }} />
                                    </div>
                                    <button onClick={handleSendChat} disabled={!chatInput.trim() && !chatAttachment} style={{ width: 40, height: 40, borderRadius: '50%', background: chatInput.trim() || chatAttachment ? '#d4a574' : 'var(--bg-input, #e4e6eb)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: chatInput.trim() || chatAttachment ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s' }} title="Gửi">
                                        <ion-icon name={chatInput.trim() || chatAttachment ? "send" : "thumbs-up"} style={{ fontSize: 18, marginLeft: chatInput.trim() || chatAttachment ? 2 : 0 }}></ion-icon>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', color: 'var(--text-secondary, #65676b)' }}>
                                <div>
                                    <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--bg-input, #f0f2f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <ion-icon name="chatbubbles" style={{ fontSize: 60, color: '#d4a574' }}></ion-icon>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary, #050505)', marginBottom: 6 }}>Chào mừng bạn đến với đoạn chat</div>
                                    <div style={{ fontSize: 14 }}>Chọn một cuộc trò chuyện bên trái để bắt đầu nhắn tin</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== MODALS (preserved) ===== */}
            {/* Video Call Modal */}
            {showVideoCall && (
                <div style={{ position: 'fixed', inset: 0, background: '#111827', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                        <h2 style={{ margin: 0, fontWeight: 500, fontSize: 18 }}>Cuộc gọi nhóm {team?.name}</h2>
                        <button onClick={() => setShowVideoCall(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', display: 'flex' }}><ion-icon name="expand"></ion-icon></button>
                    </div>

                    {/* Main Content */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: 160, height: 160, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #4b5563' }}>
                            <ion-icon name="person" style={{ fontSize: 80, color: '#9ca3af' }}></ion-icon>
                        </div>
                        <div style={{ position: 'absolute', bottom: 40, color: '#fff', fontSize: 20, fontWeight: 500 }}>Đang gọi...</div>
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', gap: 24, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                        <button style={{ width: 64, height: 64, borderRadius: '50%', background: '#374151', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ion-icon name="mic-outline"></ion-icon></button>
                        <button style={{ width: 64, height: 64, borderRadius: '50%', background: '#374151', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ion-icon name="videocam-outline"></ion-icon></button>
                        <button onClick={() => setShowVideoCall(false)} style={{ width: 64, height: 64, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ion-icon name="call-outline" style={{ transform: 'rotate(135deg)' }}></ion-icon></button>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showAddMember && (
                <div className="modal-overlay" onClick={closeModal} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: 0, borderRadius: 20, overflow: 'hidden', background: '#fff', border: 'none', color: '#1a1a1a', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '24px 32px', textAlign: 'center' }}>
                            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Mời thành viên</h2>
                            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Gửi lời mời bằng email cho người bạn muốn thêm vào nhóm.</p>
                        </div>
                        <div style={{ padding: '0 32px 24px' }}>
                            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Email người được mời</label>
                            <input
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="name@example.com"
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12, fontSize: 14 }}
                            />
                            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Chỉ chủ nhóm hoặc quản trị viên mới có thể gửi lời mời.</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={closeModal} style={{ flex: 1, background: '#f8fafc', color: '#1f2937', border: '1px solid #e2e8f0', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Hủy</button>
                                <button onClick={handleInviteMember} disabled={loading} style={{ flex: 1, background: loading ? '#e5e7eb' : '#d4a574', color: loading ? '#9ca3af' : '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Đang gửi...' : 'Gửi lời mời'}</button>
                            </div>
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
                            <button onClick={() => handleCreateGoal(true)} disabled={loading || !trialActive} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#d4a574', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: trialActive ? 1 : 0.5 }}>{loading ? 'Đang tạo...' : `AI tạo task (${trialDays} ngày)`}</button>
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
                            <button onClick={handleSaveAdSettings} disabled={loading} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#d4a574', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
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
                            <button onClick={handleSaveLabels} disabled={loading} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#d4a574', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                {loading ? 'Đang lưu...' : 'Lưu nhãn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Inventory Modal */}
            {showAddInventory && isAdmin && (
                <div className="modal-overlay" onClick={() => setShowAddInventory(false)} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '90%', background: 'var(--bg-panel, #fff)', color: 'var(--text-primary, #1a1a1a)', borderRadius: 16, padding: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>Nhập hàng hóa mới</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Tên hàng hóa <span style={{ color: '#dc2626' }}>*</span></label>
                                <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Ví dụ: Cà phê hạt loại A..." style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border, #cbd5e1)', fontSize: 15, outline: 'none', background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} autoFocus />
                            </div>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Số lượng <span style={{ color: '#dc2626' }}>*</span></label>
                                    <input type="number" value={invQty} onChange={e => setInvQty(e.target.value)} placeholder="0" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border, #cbd5e1)', fontSize: 15, outline: 'none', background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Đơn vị</label>
                                    <input value={invUnit} onChange={e => setInvUnit(e.target.value)} placeholder="VD: kg, hộp..." style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border, #cbd5e1)', fontSize: 15, outline: 'none', background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mức báo sắp hết</label>
                                <input type="number" value={invThreshold} onChange={e => setInvThreshold(e.target.value)} placeholder="Cảnh báo khi nhỏ hơn hoặc bằng (VD: 10)" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border, #cbd5e1)', fontSize: 15, outline: 'none', background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1a1a1a)', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
                            <button onClick={() => setShowAddInventory(false)} style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border, #e2e8f0)', background: 'transparent', color: 'var(--text-primary, #64748b)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                            <button onClick={handleAddInventory} disabled={loading || !invName.trim() || !invQty} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#d4a574', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (loading || !invName.trim() || !invQty) ? 0.6 : 1 }}>
                                {loading ? 'Đang lưu...' : 'Lưu vào kho'}
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
                                    <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0', background: msg.role === 'user' ? '#d4a574' : '#fff', color: msg.role === 'user' ? '#fff' : '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: 14, lineHeight: 1.5, border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none' }}>{msg.content}</div>
                                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{msg.role === 'user' ? 'Bạn' : 'AI'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}><button onClick={() => setShowChatHistory(false)} style={{ background: '#d4a574', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Đóng</button></div>
                    </div>
                </div>
            )}
            {/* Stats Modal */}
            {showStatsModal && (
                <div className="modal-overlay" onClick={() => setShowStatsModal(false)} style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', zIndex: 10000, position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', transition: 'all 0.3s ease' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 1200, width: '92%', background: 'var(--bg-card, #1e293b)', color: 'var(--text-primary, #f8fafc)', borderRadius: 24, padding: '32px', border: '1px solid var(--border, #334155)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border, #334155)', paddingBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(212,165,116,0.15)', display: 'grid', placeItems: 'center', color: '#d4a574' }}>
                                    <ion-icon name="analytics-outline" style={{ fontSize: 24 }}></ion-icon>
                                </span>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                                        Báo cáo & Phân tích Thống kê Sản xuất
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary, #94a3b8)' }}>Dữ liệu thời gian thực của nhóm: <b>{team.name}</b></p>
                                </div>
                            </div>
                            <button onClick={() => setShowStatsModal(false)} style={{ background: 'var(--bg-input, #f1f5f9)', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><ion-icon name="close" style={{ fontSize: 22 }}></ion-icon></button>
                        </div>

                        {/* Top Metrics Grid */}
                        {(() => {
                            const total = latestGoalTasks.length;
                            const completed = latestGoalTasks.filter(t => t.status === 'COMPLETED').length;
                            const inProgress = latestGoalTasks.filter(t => t.status === 'IN_PROGRESS').length;
                            const pending = latestGoalTasks.filter(t => t.status === 'PENDING').length;

                            // Calculate total yield rate
                            let totalTarget = 0;
                            let totalActual = 0;
                            latestGoalTasks.forEach(t => {
                                totalTarget += Number(t.outputTarget ?? t.workload ?? 0);
                                totalActual += Number(t.actualOutput ?? 0);
                            });
                            const yieldRate = totalTarget > 0 ? Math.min(100, Math.round((totalActual / totalTarget) * 100)) : 0;

                            return (
                                <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                                    {[
                                        { label: 'Tổng số công việc', value: total, unit: 'nhiệm vụ', icon: 'clipboard-outline', bg: 'rgba(212,165,116,0.1)', color: '#d4a574' },
                                        { label: 'Đã hoàn thành', value: completed, unit: 'nhiệm vụ', icon: 'checkmark-circle-outline', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
                                        { label: 'Đang thực hiện', value: inProgress, unit: 'nhiệm vụ', icon: 'sync-outline', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
                                        { label: 'Hiệu suất sản lượng', value: `${yieldRate}%`, unit: `${totalActual}/${totalTarget} mục tiêu`, icon: 'trending-up-outline', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
                                    ].map((m, idx) => (
                                        <div key={idx} style={{ background: 'var(--bg-secondary, #1e293b)', padding: '20px', borderRadius: 16, border: '1px solid var(--border, #334155)', display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, fontSize: 24 }}>
                                                <ion-icon name={m.icon}></ion-icon>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>{m.label}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{m.unit}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Main Dashboard Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>

                                    {/* Left Column: Radial Chart & Completion Rate Details */}
                                    <div style={{ background: 'var(--bg-secondary, #1e293b)', padding: '24px', borderRadius: 18, border: '1px solid var(--border, #334155)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <ion-icon name="pie-chart-outline" style={{ color: '#d4a574' }}></ion-icon>
                                            Phân tích tỷ lệ hoàn thành
                                        </h3>

                                        {(() => {
                                            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                                            const rad = 60;
                                            const circ = 2 * Math.PI * rad;
                                            const offset = circ - (rate / 100) * circ;
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 0' }}>
                                                    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                                                        <svg style={{ transform: 'rotate(-90deg)', width: 140, height: 140 }}>
                                                            <circle cx="70" cy="70" r={rad} fill="transparent" stroke="var(--border, #334155)" strokeWidth="10" />
                                                            <circle cx="70" cy="70" r={rad} fill="transparent" stroke="url(#radialGoldGradMain)" strokeWidth="12" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} />
                                                            <defs>
                                                                <linearGradient id="radialGoldGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                    <stop offset="0%" stopColor="#f59e0b" />
                                                                    <stop offset="100%" stopColor="#d4a574" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                                                            <span style={{ fontSize: 32, fontWeight: 900 }}>{rate}%</span>
                                                            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Tỷ lệ đạt</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Tổng quan công việc</h4>
                                                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                                            Tiến độ chung của toàn đội đạt <b>{rate}%</b>. Có <b>{completed}</b> nhiệm vụ đã được xác nhận hoàn thành, <b>{inProgress}</b> nhiệm vụ đang tiến hành, và <b>{pending}</b> nhiệm vụ đang chờ xử lý.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Horizontal Task Breakdown Chart */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                <span>Trạng thái công việc chi tiết</span>
                                                <span>{completed} / {total} hoàn thành</span>
                                            </div>
                                            <div style={{ height: 16, background: 'var(--border, #334155)', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                                                <div style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%`, background: '#10b981', transition: 'width 0.4s' }} title={`Hoàn thành: ${completed}`} />
                                                <div style={{ width: `${total > 0 ? (inProgress / total) * 100 : 0}%`, background: '#3b82f6', transition: 'width 0.4s' }} title={`Đang làm: ${inProgress}`} />
                                                <div style={{ width: `${total > 0 ? (pending / total) * 100 : 0}%`, background: '#94a3b8', transition: 'width 0.4s' }} title={`Chờ xử lý: ${pending}`} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 16, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span> Hoàn thành ({completed})</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></span> Đang làm ({inProgress})</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }}></span> Chờ xử lý ({pending})</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Yield Target vs. Actual (Real CSS/SVG Bar Charts) */}
                                    <div style={{ background: 'var(--bg-secondary, #1e293b)', padding: '24px', borderRadius: 18, border: '1px solid var(--border, #334155)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <ion-icon name="cube-outline" style={{ color: '#d4a574' }}></ion-icon>
                                            Tổng hợp sản lượng theo đơn vị mục tiêu
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                                            {(() => {
                                                const map: Record<string, { target: number; actual: number }> = {};
                                                latestGoalTasks.forEach(t => {
                                                    const unit = (t.unit && t.unit.trim()) ? t.unit : 'kg';
                                                    const target = Number(t.outputTarget ?? t.workload ?? 0);
                                                    const actual = Number(t.actualOutput ?? 0);
                                                    if (!map[unit]) map[unit] = { target: 0, actual: 0 };
                                                    map[unit].target += target;
                                                    map[unit].actual += actual;
                                                });
                                                const items = Object.entries(map);
                                                if (items.length === 0) {
                                                    return <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Chưa có dữ liệu sản lượng.</div>;
                                                }
                                                return items.map(([unit, val]) => {
                                                    const pct = val.target > 0 ? Math.min(100, Math.round((val.actual / val.target) * 100)) : 0;
                                                    return (
                                                        <div key={unit} style={{ background: 'var(--bg-card, #1e293b)', padding: '16px', borderRadius: 14, border: '1px solid var(--border, #334155)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ion-icon name="pricetag-outline" style={{ color: '#d4a574', fontSize: 14 }}></ion-icon> Đơn vị: {unit}</span>
                                                                <span style={{ color: '#d4a574' }}>{val.actual} / {val.target} {unit} ({pct}%)</span>
                                                            </div>
                                                            <div style={{ height: 20, background: 'var(--bg-input, #0f172a)', borderRadius: 10, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                <div style={{ height: '100%', background: 'linear-gradient(90deg, #d4a574 0%, #f59e0b 100%)', width: `${pct}%`, borderRadius: 10, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                                                <span style={{ position: 'absolute', right: 10, fontSize: 11, fontWeight: 800, color: pct > 80 ? '#fff' : 'var(--text-secondary)' }}>{pct}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Grid: Employee Performance & Stage Breakdown */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>

                                    {/* Left: Employee Productivity Ranking */}
                                    <div style={{ background: 'var(--bg-secondary, #1e293b)', padding: '24px', borderRadius: 18, border: '1px solid var(--border, #334155)' }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <ion-icon name="people-outline" style={{ color: '#d4a574' }}></ion-icon>
                                            Xếp hạng hiệu suất nhân sự
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                                            {(() => {
                                                const map: Record<string, { total: number; completed: number; name: string }> = {};
                                                latestGoalTasks.forEach(t => {
                                                    const mId = t.memberId || 'unassigned';
                                                    const mName = t.memberName || 'Chưa giao';
                                                    if (!map[mId]) map[mId] = { total: 0, completed: 0, name: mName };
                                                    map[mId].total += 1;
                                                    if (t.status === 'COMPLETED') map[mId].completed += 1;
                                                });

                                                const items = Object.values(map).sort((a, b) => {
                                                    const pctA = a.total > 0 ? (a.completed / a.total) : 0;
                                                    const pctB = b.total > 0 ? (b.completed / b.total) : 0;
                                                    return pctB - pctA;
                                                });

                                                if (items.length === 0) {
                                                    return <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Chưa có nhân sự phụ trách.</div>;
                                                }
                                                return items.map((m, i) => {
                                                    const pct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
                                                    const rankGold = i === 0 && pct > 0;
                                                    return (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card, #1e293b)', padding: '12px 16px', borderRadius: 14, border: rankGold ? '1px solid #f59e0b' : '1px solid var(--border, #334155)', position: 'relative' }}>
                                                            {rankGold && (
                                                                <span style={{ position: 'absolute', top: -8, right: 12, background: 'linear-gradient(135deg, #f59e0b, #d4a574)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>Top 1</span>
                                                            )}
                                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(m.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                                                {getInitials(m.name)}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                                                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.name}</span>
                                                                    <span style={{ color: pct === 100 ? '#10b981' : '#d4a574' }}>{m.completed}/{m.total} task ({pct}%)</span>
                                                                </div>
                                                                <div style={{ height: 6, background: 'var(--bg-input, #0f172a)', borderRadius: 3, overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #d4a574 0%, #f59e0b 100%)', width: `${pct}%`, borderRadius: 3, transition: 'width 0.5s ease' }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Right: Production Stage Distribution Chart */}
                                    <div style={{ background: 'var(--bg-secondary, #1e293b)', padding: '24px', borderRadius: 18, border: '1px solid var(--border, #334155)', display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <ion-icon name="git-network-outline" style={{ color: '#d4a574' }}></ion-icon>
                                            Phân bổ theo giai đoạn sản xuất
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                                            {(() => {
                                                const map: Record<string, number> = {};
                                                let maxCount = 0;
                                                latestGoalTasks.forEach(t => {
                                                    const stage = t.productionStage || 'Chưa phân loại';
                                                    map[stage] = (map[stage] || 0) + 1;
                                                    if (map[stage] > maxCount) maxCount = map[stage];
                                                });
                                                const items = Object.entries(map);
                                                if (items.length === 0) {
                                                    return <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Không có giai đoạn nào.</div>;
                                                }
                                                return items.map(([stage, count], i) => {
                                                    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                                                    return (
                                                        <div key={i} style={{ background: 'var(--bg-card, #1e293b)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border, #334155)', display: 'flex', alignItems: 'center', gap: 16 }}>
                                                            <div style={{ width: 100, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                {stage}
                                                            </div>
                                                            <div style={{ flex: 1, height: 16, background: 'var(--bg-input, #0f172a)', borderRadius: 8, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                <span style={{ position: 'absolute', right: 8, fontSize: 10, fontWeight: 800, color: '#fff' }}>{count} task</span>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                </>
                            );
                        })()}

                        {/* Footer buttons */}
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border, #334155)', paddingTop: 20, textAlign: 'right' }}>
                            <button onClick={() => setShowStatsModal(false)} style={{ background: '#d4a574', color: '#fff', border: 'none', padding: '12px 36px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 12px rgba(212,165,116,0.2)', transition: 'all 0.2s' }}>Đóng báo cáo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="modal-overlay" onClick={() => setShowScheduleModal(false)} style={{ background: 'rgba(10, 10, 12, 0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', transition: 'all 0.3s ease' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 1250, width: '92%', background: '#121214', color: '#ffffff', borderRadius: 20, padding: '24px', border: '1px solid #232328', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #232328', paddingBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'grid', placeItems: 'center', color: '#3b82f6' }}>
                                    <ion-icon name="calendar-outline" style={{ fontSize: 24 }}></ion-icon>
                                </span>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
                                        Lịch trình & Kế hoạch Sản xuất
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8e8e93' }}>Theo dõi lịch hạn công việc và tiến độ trực quan</p>
                                </div>
                            </div>
                            <button onClick={() => setShowScheduleModal(false)} style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#ffffff', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}><ion-icon name="close" style={{ fontSize: 22 }}></ion-icon></button>
                        </div>

                        {/* Calendar Body Layout (Split Panel) */}
                        {(() => {
                            const year = calendarDate.getFullYear();
                            const month = calendarDate.getMonth();

                            // Days calculations
                            const numDays = new Date(year, month + 1, 0).getDate();
                            const startDay = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1
                            const offset = startDay === 0 ? 6 : startDay - 1; // Align to Monday start

                            const days = [];

                            // Prev month padding
                            const prevMonthNumDays = new Date(year, month, 0).getDate();
                            for (let i = offset - 1; i >= 0; i--) {
                                days.push({ day: prevMonthNumDays - i, isCurrentMonth: false, monthOffset: -1 });
                            }

                            // Current month days
                            for (let d = 1; d <= numDays; d++) {
                                days.push({ day: d, isCurrentMonth: true, monthOffset: 0 });
                            }

                            // Next month padding to fill grid to 35 or 42 cells
                            const totalCells = days.length <= 35 ? 35 : 42;
                            const nextPadding = totalCells - days.length;
                            for (let d = 1; d <= nextPadding; d++) {
                                days.push({ day: d, isCurrentMonth: false, monthOffset: 1 });
                            }

                            // Filter tasks for current calendar view
                            const getTasksForDay = (cellDay: number, cellMonthOffset: number) => {
                                const targetMonth = month + cellMonthOffset;
                                const targetDate = new Date(year, targetMonth, cellDay);
                                targetDate.setHours(0,0,0,0);

                                return latestGoalTasks.filter(t => {
                                    const start = t.createdAt ? new Date(t.createdAt) : null;
                                    if (start) start.setHours(0,0,0,0);
                                    const end = (t.dueTime || t.deadline) ? new Date(t.dueTime || t.deadline) : null;
                                    if (end) end.setHours(0,0,0,0);

                                    const isStart = start && start.getTime() === targetDate.getTime();
                                    const isEnd = end && end.getTime() === targetDate.getTime();
                                    const isBetween = start && end && targetDate.getTime() > start.getTime() && targetDate.getTime() < end.getTime() && t.status === 'IN_PROGRESS';

                                    return isStart || isEnd || isBetween;
                                });
                            };

                            const handlePrevMonth = () => {
                                setCalendarDate(new Date(year, month - 1, 1));
                            };

                            const handleNextMonth = () => {
                                setCalendarDate(new Date(year, month + 1, 1));
                            };

                            const selectedTasks = getTasksForDay(selectedCalendarDay, 0);

                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, alignItems: 'start', width: '100%' }}>

                                    {/* Left Side: Calendar Grid */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* Month Header Controller */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                                                Tháng {month + 1}, {year}
                                            </h3>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={handlePrevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#1e1e24', color: '#ffffff', border: '1px solid #2d2d34', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#2a2a32'} onMouseLeave={e => e.currentTarget.style.background = '#1e1e24'}>
                                                    <ion-icon name="chevron-back-outline" style={{ fontSize: 16 }}></ion-icon>
                                                </button>
                                                <button onClick={handleNextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: '#1e1e24', color: '#ffffff', border: '1px solid #2d2d34', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#2a2a32'} onMouseLeave={e => e.currentTarget.style.background = '#1e1e24'}>
                                                    <ion-icon name="chevron-forward-outline" style={{ fontSize: 16 }}></ion-icon>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Days Header */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#8e8e93' }}>
                                            {['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'].map(d => (
                                                <div key={d} style={{ padding: '6px 0' }}>{d}</div>
                                            ))}
                                        </div>

                                        {/* Days Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                                            {days.map((item, idx) => {
                                                const cellDate = new Date(year, month + item.monthOffset, item.day);
                                                cellDate.setHours(0,0,0,0);

                                                // Find events for this cell
                                                const dayEvents: any[] = [];
                                                latestGoalTasks.forEach(t => {
                                                    const start = t.createdAt ? new Date(t.createdAt) : null;
                                                    if (start) start.setHours(0,0,0,0);
                                                    const end = (t.dueTime || t.deadline) ? new Date(t.dueTime || t.deadline) : null;
                                                    if (end) end.setHours(0,0,0,0);

                                                    const isStart = start && start.getTime() === cellDate.getTime();
                                                    const isEnd = end && end.getTime() === cellDate.getTime();
                                                    const isBetween = start && end && cellDate.getTime() > start.getTime() && cellDate.getTime() < end.getTime() && t.status === 'IN_PROGRESS';

                                                    if (isStart) dayEvents.push({ type: 'START', task: t });
                                                    if (isEnd) dayEvents.push({ type: 'END', task: t });
                                                    if (isBetween) dayEvents.push({ type: 'BETWEEN', task: t });
                                                });

                                                const isSelected = item.isCurrentMonth && item.day === selectedCalendarDay;
                                                const hasStart = dayEvents.some(e => e.type === 'START');
                                                const hasEnd = dayEvents.some(e => e.type === 'END');
                                                const hasBetween = dayEvents.some(e => e.type === 'BETWEEN');
                                                const hasTasks = dayEvents.length > 0;

                                                let borderStyle = '1px solid #232328';
                                                let bgStyle = '#16161a';
                                                let colorStyle = item.isCurrentMonth ? '#ffffff' : '#4e4e54';
                                                let shadowStyle = 'none';

                                                if (hasEnd) {
                                                    borderStyle = '1px solid #ef4444';
                                                    bgStyle = 'rgba(239,68,68,0.06)';
                                                } else if (hasBetween) {
                                                    borderStyle = '1px solid #f59e0b';
                                                    bgStyle = 'rgba(245,158,11,0.06)';
                                                } else if (hasStart) {
                                                    borderStyle = '1px solid #3b82f6';
                                                    bgStyle = 'rgba(59,130,246,0.06)';
                                                }

                                                if (isSelected) {
                                                    borderStyle = '1.5px solid #e2b053';
                                                    bgStyle = '#1e1e1e';
                                                    shadowStyle = '0 0 12px rgba(226, 176, 83, 0.15)';
                                                }

                                                return (
                                                     <div
                                                         key={idx}
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             if (item.monthOffset !== 0) {
                                                                 setCalendarDate(new Date(year, month + item.monthOffset, 1));
                                                             }
                                                             setSelectedCalendarDay(item.day);
                                                         }}
                                                         style={{
                                                             aspectRatio: '1/1',
                                                             minHeight: 80,
                                                             borderRadius: 10,
                                                             border: borderStyle,
                                                             background: bgStyle,
                                                             boxShadow: shadowStyle,
                                                             padding: '10px',
                                                             display: 'flex',
                                                             flexDirection: 'column',
                                                             justifyContent: 'space-between',
                                                             cursor: 'pointer',
                                                             position: 'relative',
                                                             transition: 'all 0.2s ease',
                                                             opacity: item.isCurrentMonth ? 1 : 0.45
                                                         }}
                                                     >
                                                         {/* Day number */}
                                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                             <span style={{ fontSize: 14, fontWeight: 700, color: colorStyle }}>{item.day}</span>
                                                             {hasEnd && (
                                                                 <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} title="Hạn chót nhiệm vụ!" />
                                                             )}
                                                         </div>

                                                         {/* Task List Pills (Only if present) */}
                                                          {hasTasks && (
                                                              <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                                                                  {dayEvents.slice(0, 3).map((ev, evIdx) => {
                                                                      let dotColor = '#94a3b8';
                                                                      if (ev.type === 'START') dotColor = '#3b82f6';
                                                                      else if (ev.type === 'END') dotColor = '#ef4444';
                                                                      else if (ev.type === 'BETWEEN') dotColor = '#f59e0b';
                                                                      if (ev.task.status === 'COMPLETED') dotColor = '#10b981';

                                                                      return (
                                                                          <span
                                                                              key={evIdx}
                                                                              style={{
                                                                                  width: 6,
                                                                                  height: 6,
                                                                                  borderRadius: '50%',
                                                                                  background: dotColor
                                                                              }}
                                                                              title={`${ev.task.title}`}
                                                                          />
                                                                      );
                                                                  })}
                                                              </div>
                                                          )}
                                                     </div>
                                                 );
                                             })}
                                        </div>

                                        {/* Legend indicator */}
                                        <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 500, color: '#8e8e93', borderTop: '1px solid #232328', paddingTop: 16, flexWrap: 'wrap' }}>
                                             <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></span> Đang làm</span>
                                             <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span> Quá hạn</span>
                                             <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span> Hoàn thành</span>
                                             <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8e8e93' }}></span> Chờ xử lý</span>
                                        </div>
                                    </div>

                                    {/* Right Side: Selected Day Details & Deadlines List */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        {/* Selected Day Details Card */}
                                        <div style={{ background: '#1c1c1e', padding: '20px', borderRadius: 16, border: '1px solid #2d2d34', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>Ngày {selectedCalendarDay}/{month + 1}</span>
                                                <span style={{ fontSize: 12, fontWeight: 500, color: '#8e8e93', background: '#2c2c2e', padding: '3px 10px', borderRadius: 12 }}>{selectedTasks.length} công việc</span>
                                            </h3>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 120, justifyContent: selectedTasks.length === 0 ? 'center' : 'flex-start', alignItems: selectedTasks.length === 0 ? 'center' : 'stretch' }}>
                                                {selectedTasks.length === 0 ? (
                                                    <>
                                                        <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1.5px dashed #3a3a3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', marginBottom: 4 }}>
                                                            <ion-icon name="calendar-outline" style={{ fontSize: 28 }}></ion-icon>
                                                        </div>
                                                        <div style={{ textAlign: 'center', color: '#8e8e93', fontSize: 13, fontWeight: 500 }}>Không có lịch trình nào vào ngày này.</div>
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                                                        {selectedTasks.map(t => {
                                                            const isTaskOverdue = (t.dueTime || t.deadline) && new Date(t.dueTime || t.deadline!).getTime() < Date.now() && t.status !== 'COMPLETED';
                                                            const inProgress = t.status === 'IN_PROGRESS';

                                                            let pillBg = '#262629';
                                                            let pillBorder = '1px solid #3a3a3c';
                                                            let pillColor = '#ffffff';

                                                            if (isTaskOverdue) {
                                                                pillBg = 'rgba(239,68,68,0.1)';
                                                                pillBorder = '1px solid #ef4444';
                                                                pillColor = '#ef4444';
                                                            } else if (inProgress) {
                                                                pillBg = 'rgba(245,158,11,0.1)';
                                                                pillBorder = '1px solid #f59e0b';
                                                                pillColor = '#f59e0b';
                                                            } else if (t.status === 'COMPLETED') {
                                                                pillBg = 'rgba(16,185,129,0.1)';
                                                                pillBorder = '1px solid #10b981';
                                                                pillColor = '#10b981';
                                                            }

                                                            return (
                                                                <div key={t.id} style={{ background: pillBg, border: pillBorder, color: pillColor, padding: '12px', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{t.title}</span>
                                                                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#1c1c1e', color: pillColor }}>
                                                                            {STATUS_COLORS[t.status]?.label || t.status}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8e8e93' }}>
                                                                        <span>Giai đoạn: {t.productionStage || '—'}</span>
                                                                        <span>Phụ trách: {t.memberName || 'Chưa giao'}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Highlight Panel: In progress & Deadlines list */}
                                        <div style={{ background: '#1c1c1e', padding: '20px', borderRadius: 16, border: '1px solid #2d2d34', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                                                Công việc Đang làm & Hạn chót
                                            </h3>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 140, justifyContent: 'center', alignItems: 'center' }}>
                                                {latestGoalTasks.filter(t => t.status === 'IN_PROGRESS').length === 0 ? (
                                                    <>
                                                        <div style={{ width: 56, height: 56, borderRadius: 12, border: '1.5px solid #3a3a3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', marginBottom: 4 }}>
                                                            <ion-icon name="checkmark-outline" style={{ fontSize: 28 }}></ion-icon>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 500, textAlign: 'center', marginBottom: 12 }}>Không có công việc nào đang thực hiện.</div>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => {
                                                                    setShowScheduleModal(false);
                                                                    if (!selectedGoalId && goals.length > 0) setSelectedGoalId(goals[0].id);
                                                                    setShowAddTask(true);
                                                                }}
                                                                style={{
                                                                    width: '85%',
                                                                    background: '#cbd5e1',
                                                                    color: '#0f172a',
                                                                    border: 'none',
                                                                    padding: '10px 16px',
                                                                    borderRadius: 10,
                                                                    fontWeight: 700,
                                                                    fontSize: 13,
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: 6,
                                                                    transition: 'background 0.2s'
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                                                onMouseLeave={e => e.currentTarget.style.background = '#cbd5e1'}
                                                            >
                                                                <ion-icon name="add" style={{ fontSize: 16 }}></ion-icon>
                                                                Tạo công việc mới
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                                                        {latestGoalTasks.filter(t => t.status === 'IN_PROGRESS').map(t => {
                                                            const dueTime = t.dueTime || t.deadline;
                                                            const formatted = dueTime ? new Date(dueTime).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Không có hạn';
                                                            return (
                                                                <div key={t.id} style={{ background: '#262629', padding: '10px 12px', borderRadius: 10, border: '1px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.title}</div>
                                                                        <div style={{ fontSize: 10, color: '#8e8e93', marginTop: 2 }}>Giai đoạn: {t.productionStage || '—'}</div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{formatted}</div>
                                                                        <div style={{ fontSize: 9, color: '#8e8e93', textTransform: 'uppercase', marginTop: 1 }}>Hạn chót</div>
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
                            );
                        })()}

                        {/* Footer buttons */}
                        <div style={{ marginTop: 12, borderTop: '1px solid #232328', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowScheduleModal(false)} style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: 'none', padding: '10px 32px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}>Đóng</button>
                        </div>
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
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [hourlyRateOverride, setHourlyRateOverride] = useState<Record<string, number>>({});
    const [editingRate, setEditingRate] = useState<string | null>(null);
    const [tempRate, setTempRate] = useState('');

    const loadSalary = async () => {
        setLoadingSalary(true);
        try {
            const data = await taskService.getSalaryReport(teamId);
            setSalaryData(data);
        } catch { /* ignore */ }
        setLoadingSalary(false);
    };

    const handleRateEdit = (memberId: string, currentRate: number) => {
        setEditingRate(memberId);
        setTempRate(currentRate.toString());
    };

    const handleRateSave = (memberId: string) => {
        const newRate = parseFloat(tempRate);
        if (!isNaN(newRate) && newRate > 0) {
            setHourlyRateOverride(prev => ({ ...prev, [memberId]: newRate }));
        }
        setEditingRate(null);
    };

    const getEffectiveRate = (memberId: string, defaultRate: number) => {
        return hourlyRateOverride[memberId] || defaultRate;
    };

    const calculateSalary = (report: SalaryReport) => {
        const rate = getEffectiveRate(report.memberId, report.hourlyRate);
        return Math.round(report.totalWorkload * rate);
    };

    const totalSalary = salaryData.reduce((sum, s) => sum + calculateSalary(s), 0);
    const totalTasks = salaryData.reduce((sum, s) => sum + s.totalTasks, 0);
    const totalCompleted = salaryData.reduce((sum, s) => sum + s.completedTasks, 0);
    const totalWorkload = salaryData.reduce((sum, s) => sum + s.totalWorkload, 0);
    const avgCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;


    return (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 18 }}>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                        <ion-icon name="card-outline" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6, color: '#d4a574' }}></ion-icon> BẢNG LƯƠNG NHÂN VIÊN
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Theo dõi & quản lý chi phí nhân sự</p>
                </div>
                <button onClick={() => { setShowSalary(p => !p); if (!showSalary) loadSalary(); }} style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: 'none',
                    padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    {showSalary ? 'Ẩn bảng' : 'Xem chi tiết'}
                    <ion-icon name={showSalary ? "chevron-up-outline" : "chevron-down-outline"}></ion-icon>
                </button>
            </div>

            {/* Month Selector & Content */}
            {showSalary && (
                <div style={{ borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => {
                                    const [y, m] = selectedMonth.split('-').map(Number);
                                    const prev = new Date(y, m - 2);
                                    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                                }}
                                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                style={{
                                    padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                                    background: '#fff', fontSize: 13, fontWeight: 600, color: '#1e293b',
                                    cursor: 'pointer', outline: 'none'
                                }}
                            >
                                {Array.from({ length: 12 }, (_, i) => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() - i);
                                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                    return <option key={val} value={val} style={{ color: '#000' }}>{d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</option>;
                                })}
                            </select>
                            <button
                                onClick={() => {
                                    const [y, m] = selectedMonth.split('-').map(Number);
                                    const next = new Date(y, m);
                                    const now = new Date();
                                    if (next <= now) {
                                        setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                                    }
                                }}
                                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 4 }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                Tự động cập nhật theo giờ công
                            </span>
                        </div>
                    </div>

                    <div style={{ background: '#fff' }}>
                        {/* Summary Stats */}
                        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            {[
                                { label: 'Tổng nhân viên', value: salaryData.length, icon: '👥', color: '#1e293b' },
                                { label: 'Tổng công việc', value: totalTasks.toLocaleString(), icon: '📋', color: '#1e293b' },
                                { label: 'Hoàn thành', value: `${avgCompletion}%`, icon: '✅', color: '#10b981' },
                                { label: 'Tổng quỹ lương', value: `${(totalSalary / 1000000).toFixed(1)}M`, icon: '💰', color: '#d4a574' }
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    padding: 16, borderRadius: 12, background: '#f8fafc',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ fontSize: 18 }}>{stat.icon}</span>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{stat.label}</span>
                                    </div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {loadingSalary ? (
                            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#d4a574', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
                                <p>Đang tải dữ liệu...</p>
                            </div>
                        ) : salaryData.length === 0 ? (
                            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Chưa có dữ liệu lương</p>
                                <p style={{ fontSize: 13 }}>Nhân viên chưa có task hoàn thành trong tháng này</p>
                            </div>
                        ) : (
                            <div style={{ padding: '0 28px 24px' }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.3fr',
                                    gap: 12, padding: '12px 16px',
                                    background: '#f8fafc', borderRadius: '12px 12px 0 0',
                                    borderBottom: '1px solid #e2e8f0'
                                }}>
                                    {['Nhân viên', 'Tổng task', 'Hoàn thành', 'Giờ công', 'Đơn giá/giờ', 'Lương thực nhận'].map((h, i) => (
                                        <div key={i} style={{
                                            fontSize: 11, fontWeight: 700, color: '#64748b',
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                            textAlign: i >= 1 ? 'center' : 'left'
                                        }}>{h}</div>
                                    ))}
                                </div>

                                {salaryData.map((s, idx) => {
                                    const salary = calculateSalary(s);
                                    const completionRate = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
                                    const isEditing = editingRate === s.memberId;

                                    return (
                                        <div key={s.memberId} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.3fr',
                                            gap: 12, padding: '14px 16px',
                                            borderBottom: '1px solid #e2e8f0',
                                            alignItems: 'center',
                                            background: idx % 2 === 0 ? '#fff' : '#fcfcfc'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: 12,
                                                    background: ['#d4a574', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'][idx % 6],
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontWeight: 700, fontSize: 14
                                                }}>
                                                    {(s.memberName || '?').split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{s.memberName}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>ID: {s.memberId?.slice(0, 8)}...</div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{s.totalTasks}</div>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '4px 10px', borderRadius: 20,
                                                    background: completionRate >= 80 ? 'rgba(16, 185, 129, 0.1)' : completionRate >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'
                                                }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.completedTasks}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{completionRate}%</div>
                                            </div>

                                            {/* Workload */}
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{s.totalWorkload.toFixed(1)}</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8' }}>giờ</div>
                                            </div>

                                            {/* Hourly Rate */}
                                            <div style={{ textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                                        <input
                                                            type="number"
                                                            value={tempRate}
                                                            onChange={e => setTempRate(e.target.value)}
                                                            autoFocus
                                                            style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #d4a574', fontSize: 13, textAlign: 'center', background: '#fff', color: '#1e293b' }}
                                                        />
                                                        <button onClick={() => handleRateSave(s.memberId)} style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✓</button>
                                                        <button onClick={() => setEditingRate(null)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => handleRateEdit(s.memberId, s.hourlyRate)}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            padding: '4px 10px', borderRadius: 8,
                                                            background: hourlyRateOverride[s.memberId] ? 'rgba(212,165,116,0.1)' : '#f8fafc',
                                                            color: hourlyRateOverride[s.memberId] ? '#d4a574' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                            border: hourlyRateOverride[s.memberId] ? '1px dashed #d4a574' : '1px dashed #e2e8f0'
                                                        }}
                                                        title="Nhấp để chỉnh sửa đơn giá"
                                                    >
                                                        {getEffectiveRate(s.memberId, s.hourlyRate).toLocaleString('vi-VN')}
                                                        <span style={{ fontSize: 10 }}>đ</span>
                                                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Salary */}
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ color: '#d4a574', fontWeight: 800, fontSize: 15 }}>
                                                    {salary.toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Total Row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.3fr',
                                    gap: 12, padding: '18px 16px',
                                    background: '#f8fafc',
                                    borderTop: '1px solid #e2e8f0',
                                    borderRadius: '0 0 16px 16px',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Tổng cộng</div>
                                    <div style={{ textAlign: 'center', color: '#1e293b' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalTasks}</span></div>
                                    <div style={{ textAlign: 'center', color: '#10b981' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalCompleted}</span></div>
                                    <div style={{ textAlign: 'center', color: '#1e293b' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalWorkload.toFixed(1)}h</span></div>
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>—</div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{
                                            color: '#d4a574', fontWeight: 900, fontSize: 17
                                        }}>
                                            {totalSalary.toLocaleString('vi-VN')} đ
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
                            <button style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Xuất Excel
                            </button>
                            <button style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#d4a574', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                Phát lương
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
