import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useNavigate } from 'react-router-dom';
import { teamService, aiWorkflowService, goalService, getTrialStatus } from '../services/groupService';
import type { AiParseResult, AiV2PlanDraft } from '../services/groupService';
import type { Team, TeamMemberInfo } from '../types/types';
import { estimateTokens, formatTokenCount } from '../utils/tokenUsage';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    result?: AiParseResult;
    timestamp: Date;
}

const priorityLabel = (priority: number) => {
    if (priority >= 4) return 'high';
    if (priority <= 1) return 'low';
    return 'medium';
};

const priorityNumber = (priority?: string) => {
    const value = priority?.toLowerCase();
    if (value === 'high') return 4;
    if (value === 'low') return 1;
    return 2;
};

const draftToResult = (draft: AiV2PlanDraft): AiParseResult => ({
    title: draft.goalTitle || 'Mục tiêu mới',
    description: `Tôi đã tạo bản nháp gồm ${draft.tasks?.length || 0} công việc. Vui lòng xem lại trước khi lưu.`,
    quantity: draft.outputTarget || null,
    quantityNumber: null,
    unit: null,
    deadline: draft.deadline || null,
    priority: priorityLabel(draft.priority || 2),
    needsClarification: false,
    source: 'ai-v2',
    tasks: (draft.tasks || []).map((task) => ({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        workload: task.workload,
        suggestedAssignee: task.suggestedAssigneeName || undefined,
        suggestedAssigneeId: task.suggestedAssigneeId,
        suggestedReason: task.suggestedReason,
    })),
});

const resultToDraft = (result: AiParseResult): AiV2PlanDraft => ({
    goalTitle: result.title || 'Mục tiêu mới',
    outputTarget: result.quantity || result.description || '',
    deadline: result.deadline,
    priority: priorityNumber(result.priority),
    tasks: (result.tasks || []).map((task) => ({
        title: task.title || task.description || 'Công việc mới',
        description: task.description || task.title || '',
        priority: task.priority || 2,
        workload: task.workload || 1,
        suggestedAssigneeId: task.suggestedAssigneeId || null,
        suggestedAssigneeName: task.suggestedAssignee || null,
        suggestedReason: task.suggestedReason || null,
    })),
});

function friendlyTaskError(error?: string) {
    const text = error || '';
    const lower = text.toLowerCase();
    if (lower.includes('could not execute statement') || (lower.includes('constraint') && lower.includes('sql'))) {
        return 'Không thể lưu kế hoạch do dữ liệu bị trùng hoặc không hợp lệ. Vui lòng bấm tạo lại.';
    }
    return text || 'Không thể tạo công việc, vui lòng thử lại';
}

export default function CreateTaskPage() {
    const { id: teamId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const categoryMenuRef = useRef<HTMLDivElement>(null);

    const [team, setTeam] = useState<Team | null>(null);
    const [category, setCategory] = useState('Rang xay');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [priority, setPriority] = useState('Trung bình');
    const categoryOptions = ['Rang xay', 'Sơ chế', 'Đóng gói'];

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const pathSegments = window.location.pathname.split('/');
            const idx = pathSegments.indexOf('groups');
            const tid = idx >= 0 && idx + 1 < pathSegments.length ? pathSegments[idx + 1] : null;
            if (tid) {
                const saved = localStorage.getItem(`ai_task_chat_${tid}`);
                if (saved) {
                    return JSON.parse(saved).map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp)
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to map saved chat history", e);
        }
        return [];
    });
    const [loading, setLoading] = useState(false);
    const [trialActive, setTrialActive] = useState(true);
    const [trialDays, setTrialDays] = useState(30);
    const [usageCount, setUsageCount] = useState(0);
    const [maxUsage, setMaxUsage] = useState(10);
    const [planName, setPlanName] = useState('free');
    const [showTokens, setShowTokens] = useState(false);
    const totalTokens = messages.reduce((sum, message) => sum + estimateTokens(message.content), 0);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!teamId || teamId === 'undefined') {
            navigate('/groups');
            return;
        }
        teamService.getDetail(teamId).then(setTeam).catch(() => { });
        getTrialStatus().then(s => { 
            setTrialActive(s.aiTrialActive); 
            setTrialDays(s.daysRemaining); 
            setUsageCount(s.aiUsageCount);
            setMaxUsage(s.aiMaxUsage);
            setPlanName(s.aiPlan);
        }).catch(() => { });
    }, [teamId, navigate]);

    useEffect(() => {
        document.body.classList.add('task-studio-mode');
        return () => document.body.classList.remove('task-studio-mode');
    }, []);

    useEffect(() => {
        if (!categoryOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!categoryMenuRef.current?.contains(event.target as Node)) {
                setCategoryOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [categoryOpen]);

    useEffect(() => {
        if (!teamId) return;
        if (messages.length > 0) {
            localStorage.setItem(`ai_task_chat_${teamId}`, JSON.stringify(messages));
        } else {
            localStorage.removeItem(`ai_task_chat_${teamId}`);
        }
    }, [messages, teamId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const clearHistory = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này?')) {
            setMessages([]);
            if (teamId) {
                localStorage.removeItem(`ai_task_chat_${teamId}`);
            }
        }
    };

    const findActiveDraftMessage = (items: ChatMessage[]) =>
        [...items].reverse().find(msg => msg.result && !msg.result.needsClarification);

    const handleSend = async () => {
        if (!input.trim() || !trialActive || loading) return;
        const activeDraftMessage = findActiveDraftMessage(messages);
        const activeDraft = activeDraftMessage?.result;

        const userMsg: ChatMessage = {
            id: Date.now().toString() + '-user',
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [
            ...(activeDraft ? prev.map(m => m.result ? { ...m, result: undefined } : m) : prev),
            userMsg
        ]);
        setInput('');
        setLoading(true);

        try {
            if (activeDraft) {
                const revisedDraft = await aiWorkflowService.revise(teamId || '', userMsg.content, resultToDraft(activeDraft));
                const res = draftToResult(revisedDraft);
                const aiMsg: ChatMessage = {
                    id: Date.now().toString() + '-ai',
                    role: 'assistant',
                    content: 'Tôi đã sửa draft theo yêu cầu của bạn. Vui lòng xem lại bên dưới.',
                    result: res,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
                return;
            }

            const extracted = await aiWorkflowService.extract(teamId || '', userMsg.content);

            if (extracted.intent === 'UNKNOWN' || extracted.missingFields?.length > 0) {
                const aiMsg: ChatMessage = {
                    id: Date.now().toString() + '-ai',
                    role: 'assistant',
                    content: extracted.clarifyingQuestion || 'Tôi cần thêm thông tin trước khi tạo công việc.',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
                return;
            }

            const draft = await aiWorkflowService.plan(teamId || '', extracted.intent, extracted.fields);
            const res = draftToResult(draft);

            const aiMsg: ChatMessage = {
                id: Date.now().toString() + '-ai',
                role: 'assistant',
                content: res.description || 'Tôi đã tạo draft công việc. Vui lòng xác nhận bên dưới.',
                result: res,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e: any) {
            const errorMsg: ChatMessage = {
                id: Date.now().toString() + '-err',
                role: 'assistant',
                content: e?.response?.data?.message || 'Lỗi kết nối AI. Hãy thử lại!',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGoal = async (result: AiParseResult) => {
        if (!teamId || !trialActive) return;
        setLoading(true);
        try {
            await goalService.create({
                teamId,
                title: result.title || 'Mục tiêu mới',
                outputTarget: result.quantity || result.description || '',
                rawInstruction: result.description || '',
                deadline: result.deadline || undefined,
                priority: priorityNumber(result.priority),
                useAi: false,
                chatLog: JSON.stringify(messages),
                tasks: result.tasks || []
            } as any);

            // Stay on the page and show success message
            const successMsg: ChatMessage = {
                id: Date.now().toString() + '-success',
                role: 'assistant',
                content: '🎉 **Tuyệt vời!** Công việc đã được phân bổ thành công vào nhóm. Vui lòng bấm vào "Quay lại tổng quan" để xem chi tiết, hoặc bạn có thể tiếp tục tạo mục tiêu mới ở đây.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev.map(m => m.result ? { ...m, result: undefined } : m), successMsg]);

        } catch (e: any) {
            const errorMsg: ChatMessage = {
                id: Date.now().toString() + '-err',
                role: 'assistant',
                content: e?.response?.data?.error || 'Không thể tạo công việc, vui lòng thử lại',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const hasActiveDraft = Boolean(findActiveDraftMessage(messages)?.result);

    if (!team) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}><ion-icon name="time-outline" style={{ fontSize: '40px' }}></ion-icon></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="task-gpt-page">
            <style>{`
                body.task-studio-mode .topbar {
                    display: none;
                }
                body.task-studio-mode .layout-content {
                    padding: 0;
                    background: var(--bg-primary);
                }
                body.task-studio-mode .layout-main {
                    background: var(--bg-primary);
                }
                body.task-studio-mode .sidebar {
                    background: var(--bg-secondary);
                    border-right: 1px solid var(--border);
                    box-shadow: none;
                }
                body.task-studio-mode .sidebar-logo {
                    border-bottom: 0;
                    margin-bottom: 20px;
                }
                body.task-studio-mode .logo-text {
                    color: var(--accent-primary) !important;
                    -webkit-text-fill-color: var(--accent-primary);
                    letter-spacing: 0.12em;
                }
                body.task-studio-mode .logo-icon {
                    color: var(--accent-primary) !important;
                    background: var(--bg-secondary);
                    box-shadow: inset 0 0 0 1px var(--border);
                }
                body.task-studio-mode .nav-label {
                    color: var(--text-secondary);
                    opacity: 1;
                }
                body.task-studio-mode .nav-item {
                    color: var(--text-primary);
                    background: transparent;
                    border-radius: 10px;
                    font-weight: 520;
                }
                body.task-studio-mode .nav-item.active,
                body.task-studio-mode .nav-item:hover {
                    color: var(--accent-primary);
                    background: rgba(50, 34, 20, 0.04);
                    box-shadow: none;
                    transform: none;
                }
                body.task-studio-mode .nav-item.active::before {
                    display: none;
                }
                .task-gpt-page {
                    min-height: 100vh;
                    display: grid;
                    grid-template-rows: auto minmax(0, 1fr) auto;
                    color: var(--text-primary);
                    background: var(--bg-primary);
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .task-gpt-topbar {
                    min-height: 56px;
                    display: grid;
                    grid-template-columns: 1fr auto;
                    align-items: center;
                    padding: 0 26px;
                }
                .task-gpt-model {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-primary);
                    font-size: 18px;
                    font-weight: 650;
                }
                .task-gpt-actions {
                    display: inline-flex;
                    align-items: center;
                    gap: 16px;
                    color: var(--text-primary);
                    font-size: 14px;
                    font-weight: 650;
                }
                .task-gpt-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: inherit;
                    background: transparent;
                    border: 0;
                    font: inherit;
                    cursor: pointer;
                }
                .task-gpt-chat {
                    min-height: 0;
                    overflow-y: auto;
                    padding: 34px 24px 170px;
                }
                .task-gpt-inner {
                    width: min(1200px, 100%);
                    margin: 0 auto;
                    display: grid;
                    gap: 28px;
                }
                .task-gpt-empty {
                    min-height: min(58vh, 560px);
                    display: grid;
                    align-content: center;
                    justify-items: center;
                    text-align: center;
                }
                .task-gpt-empty h1 {
                    margin: 0 0 14px;
                    color: var(--text-primary);
                    font-size: clamp(1.8rem, 3vw, 2.6rem);
                    font-weight: 650;
                    letter-spacing: 0;
                }
                .task-gpt-empty p {
                    max-width: 620px;
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 16px;
                    line-height: 1.6;
                }
                .task-gpt-suggestions {
                    margin-top: 28px;
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 12px;
                    width: min(880px, 100%);
                }
                .task-gpt-suggestion {
                    min-height: 54px;
                    padding: 0 16px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    font: inherit;
                    font-size: 14px;
                    font-weight: 520;
                    text-align: left;
                    cursor: pointer;
                }
                .task-gpt-suggestion:hover {
                    background: var(--bg-card-hover);
                }
                .task-gpt-message-row {
                    display: flex;
                    width: 100%;
                }
                .task-gpt-message-row.user {
                    justify-content: flex-end;
                }
                .task-gpt-message-row.assistant {
                    justify-content: flex-start;
                }
                .task-gpt-bubble {
                    max-width: min(960px, 90%);
                    color: var(--text-primary);
                    font-size: 16px;
                    line-height: 1.72;
                }
                .task-gpt-message-row.user .task-gpt-bubble {
                    max-width: min(720px, 75%);
                    padding: 11px 18px;
                    background: var(--bg-secondary);
                    border-radius: 22px;
                }
                .task-gpt-message-row.assistant .task-gpt-bubble {
                    padding: 0;
                    background: transparent;
                }
                .task-gpt-assistant-head {
                    margin-bottom: 8px;
                    color: var(--text-primary);
                    font-size: 15px;
                    font-weight: 650;
                }
                .task-gpt-message-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-top: 14px;
                    color: var(--text-secondary);
                    font-size: 18px;
                }
                .task-gpt-token {
                    margin-left: auto;
                    color: var(--text-muted);
                    font-size: 12px;
                    font-weight: 650;
                }
                .task-gpt-result {
                    margin-top: 20px;
                    padding: 18px;
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    background: var(--bg-card);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
                }
                .task-gpt-loading {
                    color: var(--text-secondary);
                    font-size: 16px;
                    line-height: 1.6;
                }
                .task-gpt-composer-wrap {
                    position: sticky;
                    bottom: 0;
                    z-index: 10;
                    padding: 18px 24px 14px;
                    background: var(--bg-primary);
                    border-top: 1px solid var(--border);
                }
                .task-gpt-composer {
                    width: min(1200px, 100%);
                    min-height: 74px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr) auto auto;
                    align-items: end;
                    gap: 10px;
                    padding: 10px 12px 10px 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 28px;
                    box-shadow: 0 10px 34px rgba(0, 0, 0, 0.08);
                }
                .task-gpt-icon-btn,
                .task-gpt-send {
                    width: 42px;
                    height: 42px;
                    display: grid;
                    place-items: center;
                    border: 0;
                    border-radius: 50%;
                    font: inherit;
                    cursor: pointer;
                }
                .task-gpt-icon-btn {
                    color: var(--text-primary);
                    background: transparent;
                    font-size: 24px;
                }
                .task-gpt-textarea {
                    width: 100%;
                    max-height: 170px;
                    min-height: 42px;
                    padding: 9px 4px;
                    color: var(--text-primary);
                    background: transparent;
                    border: 0;
                    outline: 0;
                    resize: none;
                    font: inherit;
                    font-size: 16px;
                    line-height: 1.5;
                }
                .task-gpt-textarea::placeholder {
                    color: var(--text-muted);
                }
                .task-gpt-mode {
                    min-height: 34px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0 10px;
                    color: var(--text-secondary);
                    background: transparent;
                    border: 0;
                    font: inherit;
                    font-size: 14px;
                }
                .task-gpt-send {
                    color: var(--bg-primary);
                    background: var(--text-primary);
                    font-size: 18px;
                }
                .task-gpt-send:disabled {
                    background: var(--border);
                    color: var(--text-muted);
                    cursor: not-allowed;
                }
                .task-gpt-disclaimer {
                    width: min(880px, 100%);
                    margin: 8px auto 0;
                    color: var(--text-muted);
                    font-size: 12px;
                    text-align: center;
                }
                .markdown-content p {
                    margin: 0 0 12px;
                }
                .markdown-content p:last-child {
                    margin-bottom: 0;
                }
                .markdown-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12px 0;
                    font-size: 13px;
                    background: var(--bg-card);
                }
                .markdown-content th,
                .markdown-content td {
                    border: 1px solid var(--border);
                    padding: 10px;
                    text-align: left;
                }
                .markdown-content th {
                    background: var(--bg-secondary);
                    font-weight: 700;
                }
                @media (max-width: 760px) {
                    .task-gpt-topbar {
                        padding-inline: 16px;
                    }
                    .task-gpt-chat {
                        padding-inline: 16px;
                    }
                    .task-gpt-suggestions {
                        grid-template-columns: 1fr;
                    }
                    .task-gpt-message-row.user .task-gpt-bubble,
                    .task-gpt-bubble {
                        max-width: 92%;
                    }
                    .task-gpt-mode {
                        display: none;
                    }
                    .task-gpt-composer {
                        grid-template-columns: auto minmax(0, 1fr) auto;
                    }
                }
            `}</style>

            <header className="task-gpt-topbar">
                <button className="task-gpt-action" type="button" onClick={() => navigate(`/groups/${teamId}`)}>
                    <ion-icon name="chevron-back-outline"></ion-icon>
                    ORCA
                </button>
                <div className="task-gpt-actions">
                    <button className="task-gpt-action" type="button">
                        <ion-icon name="share-outline"></ion-icon>
                        Chia sẻ
                    </button>
                    <button className="task-gpt-action" type="button" onClick={() => setShowTokens(prev => !prev)}>
                        <ion-icon name="ellipsis-horizontal"></ion-icon>
                    </button>
                </div>
            </header>

            {!trialActive && (
                <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#dc2626', fontWeight: 500, fontSize: 14 }}>
                        <ion-icon name="warning" style={{ fontSize: 18 }}></ion-icon>
                        Bạn đã sử dụng hết lượt giới hạn AI của gói hiện tại.
                    </div>
                    <button 
                        onClick={() => navigate('/upgrade-plan')}
                        style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                        Nâng cấp gói
                    </button>
                </div>
            )}
            
            {trialActive && planName !== 'enterprise' && (
                <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#166534' }}>
                    <span>Bạn đã dùng {usageCount} / {maxUsage} lượt tạo công việc bằng AI.</span>
                    <button 
                        onClick={() => navigate('/upgrade-plan')}
                        style={{ background: 'transparent', color: '#16a34a', border: '1px solid #16a34a', padding: '4px 12px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                    >
                        Nâng cấp
                    </button>
                </div>
            )}

            <main className="task-gpt-chat">
                <div className="task-gpt-inner">
                    {messages.length === 0 && !loading ? (
                        <section className="task-gpt-empty">
                            <h1>Hôm nay bạn muốn tạo công việc gì?</h1>
                            <p>Mô tả kế hoạch rang xay, đóng gói, QC hoặc đơn hàng. ORCA sẽ phân tích và đề xuất task có cấu trúc cho nhóm.</p>
                            <div className="task-gpt-suggestions">
                                {[
                                    'Rang 120kg Arabica trước 17:00 hôm nay',
                                    'Chia việc QC và đóng gói cho đơn hàng mới',
                                    'Tạo kế hoạch sản xuất cho tuần này',
                                    'Phân công nhóm xử lý batch đang trễ',
                                ].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        className="task-gpt-suggestion"
                                        type="button"
                                        onClick={() => {
                                            setInput(suggestion);
                                            window.setTimeout(() => chatInputRef.current?.focus(), 0);
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : (
                        <>
                            {messages.map(msg => (
                                <div key={msg.id} className={`task-gpt-message-row ${msg.role}`}>
                                    <article className="task-gpt-bubble">
                                        {msg.role === 'assistant' && <div className="task-gpt-assistant-head">ORCA</div>}
                                        <div className="markdown-content">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{friendlyTaskError(msg.content)}</ReactMarkdown>
                                        </div>
                                        {msg.result && !msg.result.needsClarification && (
                                            <div className="task-gpt-result">
                                                <AiResultRefinementForm
                                                    result={msg.result}
                                                    members={team?.members || []}
                                                    onConfirm={(finalData) => handleCreateGoal(finalData)}
                                                    onAsk={(question) => {
                                                        setInput(question);
                                                        chatInputRef.current?.focus();
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {msg.role === 'assistant' && (
                                            <div className="task-gpt-message-actions">
                                                <ion-icon name="copy-outline"></ion-icon>
                                                <ion-icon name="thumbs-up-outline"></ion-icon>
                                                <ion-icon name="thumbs-down-outline"></ion-icon>
                                                <ion-icon name="refresh-outline"></ion-icon>
                                                {showTokens && <span className="task-gpt-token">{formatTokenCount(estimateTokens(msg.content))} token</span>}
                                            </div>
                                        )}
                                    </article>
                                </div>
                            ))}
                            {loading && (
                                <div className="task-gpt-message-row assistant">
                                    <article className="task-gpt-bubble task-gpt-loading">ORCA đang phân tích kế hoạch...</article>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            </main>

            <footer className="task-gpt-composer-wrap">
                <div className="task-gpt-composer">
                    <button className="task-gpt-icon-btn" type="button" aria-label="Thêm nội dung">
                        <ion-icon name="add-outline"></ion-icon>
                    </button>
                    <textarea
                        ref={chatInputRef}
                        className="task-gpt-textarea"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={trialActive ? (hasActiveDraft ? 'Nhập yêu cầu sửa draft, ví dụ: Rút gọn còn 2 task' : 'Nhập yêu cầu, ví dụ: Rang 120kg Arabica trước 17:00 hôm nay') : 'Bạn đã dùng hết lượt AI. Vui lòng nâng cấp.'}
                        disabled={!trialActive || loading}
                        rows={1}
                    />
                    <button className="task-gpt-mode" type="button">
                        {hasActiveDraft ? 'Sửa draft' : 'Tạo draft'}
                        <ion-icon name="chevron-down-outline"></ion-icon>
                    </button>
                    <button
                        className="task-gpt-send"
                        type="button"
                        onClick={handleSend}
                        disabled={!trialActive || loading || !input.trim()}
                        aria-label="Gửi"
                    >
                        <ion-icon name={loading ? 'hourglass-outline' : 'arrow-up-outline'}></ion-icon>
                    </button>
                </div>
                <p className="task-gpt-disclaimer">Luồng AI v2: tạo draft, sửa trực tiếp trong ô chat, rồi lưu sau khi xem trước.</p>
            </footer>
        </div>
    );

    return (
        <div className="task-studio-page">
            <style>{`
                body.task-studio-mode .topbar {
                    display: none;
                }
                body.task-studio-mode .layout-content {
                    padding: 0;
                    background: #f7f3ed;
                }
                body.task-studio-mode .layout-main {
                    background: #f7f3ed;
                }
                body.task-studio-mode .sidebar {
                    background: #f4f0e8;
                    border-right: 1px solid #e4d9ca;
                    box-shadow: none;
                }
                body.task-studio-mode .sidebar-logo,
                body.task-studio-mode .nav-label,
                body.task-studio-mode .nav-text,
                body.task-studio-mode .nav-icon {
                    color: #5b3a1f !important;
                }
                body.task-studio-mode .nav-item {
                    color: #5b3a1f;
                    background: transparent;
                    border-radius: 0;
                }
                body.task-studio-mode .nav-item.active,
                body.task-studio-mode .nav-item:hover {
                    background: rgba(255, 171, 102, 0.18);
                    color: #8a4f22;
                }
                body.task-studio-mode .sidebar-user {
                    border-top-color: #e4d9ca;
                }
                .task-studio-page {
                    min-height: 100vh;
                    padding: clamp(28px, 4vw, 56px) clamp(28px, 6vw, 112px);
                    color: #4d3928;
                    background:
                        radial-gradient(circle at 52% 18%, rgba(255, 255, 255, 0.72), transparent 34%),
                        linear-gradient(180deg, #fbf8f3 0%, #f7f1e9 100%);
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .task-studio-shell {
                    width: min(1320px, 100%);
                    margin: 0 auto;
                    display: grid;
                    justify-items: center;
                    gap: 28px;
                }
                .task-studio-top {
                    width: 100%;
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    align-items: center;
                    gap: 16px;
                }
                .task-studio-back,
                .task-studio-ghost {
                    min-height: 34px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 0;
                    color: #8a5a2f;
                    background: transparent;
                    border: 0;
                    font: inherit;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .task-studio-title {
                    text-align: center;
                }
                .task-studio-title h1 {
                    margin: 0 0 7px;
                    color: #3d2b1d;
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 0;
                }
                .task-studio-title p {
                    margin: 0;
                    color: #a49487;
                    font-family: Georgia, "Times New Roman", serif;
                    font-size: 13px;
                    font-style: italic;
                }
                .task-studio-card {
                    width: min(1080px, 100%);
                    min-height: clamp(300px, 34vh, 430px);
                    display: flex;
                    flex-direction: column;
                    padding: clamp(30px, 3.2vw, 44px);
                    background: rgba(255, 255, 255, 0.82);
                    border: 1px solid rgba(213, 198, 181, 0.78);
                    border-radius: 4px;
                    box-shadow: 0 18px 46px rgba(83, 58, 37, 0.09);
                }
                .task-studio-card-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    color: #8a4f22;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }
                .task-studio-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #58c99c;
                    font-size: 10px;
                    font-weight: 900;
                }
                .task-studio-status::before {
                    content: "";
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: currentColor;
                    box-shadow: 0 0 0 4px rgba(88, 201, 156, 0.12);
                }
                .task-studio-input {
                    flex: 1;
                    width: 100%;
                    min-height: clamp(190px, 23vh, 300px);
                    padding: 0;
                    color: #4d3928;
                    background: transparent;
                    border: 0;
                    resize: none;
                    outline: none;
                    font: inherit;
                    font-size: clamp(1.35rem, 2.2vw, 2rem);
                    font-weight: 800;
                    line-height: 1.45;
                }
                .task-studio-input::placeholder {
                    color: rgba(79, 64, 52, 0.16);
                }
                .task-studio-tools {
                    display: flex;
                    justify-content: flex-end;
                    gap: 14px;
                    color: #c8b8a7;
                    font-size: 16px;
                }
                .task-studio-meta {
                    width: min(1080px, 100%);
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: clamp(28px, 4vw, 64px);
                }
                .task-studio-field {
                    min-height: 56px;
                    border-bottom: 1px solid #e8ded3;
                }
                .task-studio-field label {
                    display: block;
                    margin-bottom: 8px;
                    color: #b1a093;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }
                .task-studio-select,
                .task-studio-time {
                    width: 100%;
                    min-height: 28px;
                    color: #3d2b1d;
                    background: transparent;
                    border: 0;
                    outline: 0;
                    font: inherit;
                    font-size: 13px;
                    font-weight: 850;
                }
                .task-studio-priority {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-height: 28px;
                }
                .task-studio-priority button {
                    padding: 0;
                    color: #8b6f58;
                    background: transparent;
                    border: 0;
                    font: inherit;
                    font-size: 13px;
                    font-weight: 850;
                    cursor: pointer;
                }
                .task-studio-priority button.active {
                    color: #3d2b1d;
                }
                .task-studio-priority button.active::before {
                    content: "";
                    display: inline-block;
                    width: 22px;
                    height: 2px;
                    margin-right: 7px;
                    vertical-align: middle;
                    background: #b87536;
                    box-shadow: 10px 0 0 #b87536;
                }
                .task-studio-cta {
                    min-width: 340px;
                    min-height: 64px;
                    margin-top: 6px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    color: #704018;
                    background: #ffb06f;
                    border: 0;
                    border-radius: 8px;
                    font: inherit;
                    font-size: 16px;
                    font-weight: 900;
                    cursor: pointer;
                    box-shadow: 0 18px 32px rgba(255, 176, 111, 0.28);
                    transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
                }
                .task-studio-cta:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .task-studio-cta:not(:disabled):hover {
                    transform: translateY(-1px);
                    box-shadow: 0 22px 38px rgba(255, 176, 111, 0.34);
                }
                .task-studio-note {
                    margin: 0;
                    color: #b6a79a;
                    font-size: 11px;
                    font-weight: 600;
                }
                .task-studio-thread {
                    width: min(1080px, 100%);
                    display: grid;
                    gap: 14px;
                    margin-top: 10px;
                }
                .task-studio-message {
                    padding: 16px 18px;
                    border: 1px solid #eadfd4;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.72);
                    color: #4d3928;
                    line-height: 1.65;
                    box-shadow: 0 10px 24px rgba(83, 58, 37, 0.06);
                }
                .task-studio-message.user {
                    background: rgba(255, 176, 111, 0.18);
                    border-color: rgba(255, 176, 111, 0.42);
                }
                .task-studio-message.assistant {
                    background: rgba(255, 255, 255, 0.86);
                }
                .task-studio-loading {
                    color: #8a5a2f;
                    font-weight: 800;
                }
                .task-studio-token {
                    display: inline-block;
                    margin-top: 8px;
                    color: #a49487;
                    font-size: 11px;
                    font-weight: 800;
                }
                .task-studio-result {
                    margin-top: 14px;
                }
                .task-studio-result .ai-refine-card {
                    box-shadow: none !important;
                }
                @media (max-width: 900px) {
                    .task-studio-page {
                        padding: 26px 18px;
                    }
                    .task-studio-top {
                        grid-template-columns: 1fr;
                        justify-items: center;
                    }
                    .task-studio-back,
                    .task-studio-ghost {
                        justify-self: stretch;
                    }
                    .task-studio-meta {
                        grid-template-columns: 1fr;
                        gap: 18px;
                    }
                    .task-studio-card {
                        padding: 22px;
                        min-height: 300px;
                    }
                    .task-studio-input {
                        min-height: 180px;
                        font-size: 1.25rem;
                    }
                    .task-studio-cta {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="task-studio-shell">
                <div className="task-studio-top">
                    <button className="task-studio-back" onClick={() => navigate(`/groups/${teamId}`)}>
                        <ion-icon name="arrow-back-outline"></ion-icon>
                        Tổng quan
                    </button>
                    <div className="task-studio-title">
                        <h1>Thiết lập Công việc</h1>
                        <p>Studio Minimalist · Quy trình Vận hành Cao cấp</p>
                    </div>
                    <button className="task-studio-ghost" onClick={() => {
                        setInput('Rang 120kg Arabica Cầu Đất trước 17:00 hôm nay, chia việc cho rang, QC và đóng gói.');
                        window.setTimeout(() => chatInputRef.current?.focus(), 0);
                    }}>
                        Xem ví dụ
                    </button>
                </div>

                <section className="task-studio-card" aria-label="Trợ lý AI ORCA">
                    <div className="task-studio-card-head">
                        <span>✦ Trợ lý AI ORCA</span>
                        <span className="task-studio-status">{trialActive ? 'Sẵn sàng' : 'Hết hạn'}</span>
                    </div>
                    <textarea
                        ref={chatInputRef}
                        className="task-studio-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={trialActive ? 'Mô tả nhiệm vụ hoặc kế hoạch rang xay của bạn tại đây...' : 'Dùng thử đã hết hạn'}
                        disabled={!trialActive || loading}
                    />
                    <div className="task-studio-tools" aria-hidden="true">
                        <ion-icon name="mic-outline"></ion-icon>
                        <ion-icon name="attach-outline"></ion-icon>
                    </div>
                </section>

                <section className="task-studio-meta" aria-label="Thông tin công việc">
                    <div className="task-studio-field">
                        <label>Nhóm công tác</label>
                        <select className="task-studio-select" value={category} onChange={event => setCategory(event.target.value)}>
                            {categoryOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <div className="task-studio-field">
                        <label>Mức độ ưu tiên</label>
                        <div className="task-studio-priority">
                            {['Thấp', 'Trung bình', 'Cao'].map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    className={priority === level ? 'active' : ''}
                                    onClick={() => setPriority(level)}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="task-studio-field">
                        <label>Thời hạn</label>
                        <button className="task-studio-time" type="button">
                            Hôm nay, 17:00
                        </button>
                    </div>
                </section>

                <button
                    className="task-studio-cta"
                    onClick={handleSend}
                    disabled={!trialActive || loading || !input.trim()}
                >
                    {loading ? 'Đang phân tích...' : 'Khởi tạo Nhiệm vụ'}
                    <ion-icon name="arrow-forward-outline"></ion-icon>
                </button>
                <p className="task-studio-note">⊙ ORCA sẽ tự động phân loại và giao việc cho các thành viên liên quan.</p>

                {(messages.length > 0 || loading) && (
                    <section className="task-studio-thread" aria-label="Kết quả AI">
                        {messages.map(msg => (
                            <article key={msg.id} className={`task-studio-message ${msg.role}`}>
                                <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{friendlyTaskError(msg.content)}</ReactMarkdown>
                                </div>
                                {msg.result && !msg.result.needsClarification && (
                                    <div className="task-studio-result">
                                            <AiResultRefinementForm
                                                result={msg.result}
                                                members={team?.members || []}
                                                onConfirm={(finalData) => handleCreateGoal(finalData)}
                                                onAsk={(question) => {
                                                    setInput(question);
                                                chatInputRef.current?.focus();
                                            }}
                                        />
                                    </div>
                                )}
                                {showTokens && <span className="task-studio-token">{formatTokenCount(estimateTokens(msg.content))} token</span>}
                            </article>
                        ))}
                        {loading && <div className="task-studio-message assistant task-studio-loading">Đang phân tích...</div>}
                        <div ref={messagesEndRef} />
                    </section>
                )}

                <div style={{ display: 'flex', gap: 12, minHeight: 28 }}>
                    {messages.length > 0 && (
                        <button className="task-studio-ghost" onClick={clearHistory}>
                            <ion-icon name="trash-outline"></ion-icon>
                            Xóa lịch sử
                        </button>
                    )}
                    <button className="task-studio-ghost" onClick={() => setShowTokens(prev => !prev)}>
                        <ion-icon name="analytics-outline"></ion-icon>
                        {showTokens ? `${formatTokenCount(totalTokens)} token` : 'Xem token'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            padding: '32px 24px', // Reduced side padding
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center' // Center the content
        }}>
            <style>{`
                .main-content-layout {
                    width: 100%;
                    max-width: 1440px;
                    display: grid;
                    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
                    gap: 32px;
                    align-items: start;
                }
                .task-select-trigger {
                    width: 100%;
                    min-height: 46px;
                    padding: 0 42px 0 14px;
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    background: rgba(255, 255, 255, 0.03);
                    color: var(--text-primary);
                    font: 500 14px/1 var(--font);
                    text-align: left;
                    cursor: pointer;
                    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
                }
                .task-select-trigger:hover,
                .task-select-trigger[aria-expanded="true"] {
                    background: rgba(255, 255, 255, 0.055);
                    border-color: rgba(212, 165, 116, 0.5);
                    box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.12);
                }
                .task-select-menu {
                    position: absolute;
                    z-index: 30;
                    top: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    padding: 6px;
                    margin: 0;
                    list-style: none;
                    border-radius: 12px;
                    border: 1px solid rgba(212, 165, 116, 0.24);
                    background: #0c1322;
                    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
                    overflow: hidden;
                }
                .task-select-option {
                    width: 100%;
                    min-height: 38px;
                    padding: 0 12px;
                    border: 0;
                    border-radius: 8px;
                    background: transparent;
                    color: #d1bfae;
                    font: 500 14px/1 var(--font);
                    text-align: left;
                    cursor: pointer;
                    transition: background 0.18s, color 0.18s, box-shadow 0.18s;
                }
                .task-select-option:hover {
                    background: rgba(212, 165, 116, 0.12);
                    color: #fdf8f4;
                }
                .task-select-option.active {
                    background: rgba(212, 165, 116, 0.16);
                    color: #fdf8f4;
                    box-shadow: inset 3px 0 0 #d4a574;
                    font-weight: 700;
                }
                @media (max-width: 980px) {
                    .main-content-layout {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            {/* Navigation Header */}
            <div style={{ width: '100%', maxWidth: 1440, marginBottom: 32 }}>
                <button
                    onClick={() => navigate(`/groups/${teamId}`)}
                    style={{
                        background: 'none', border: 'none', color: '#d4a574',
                        fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                        cursor: 'pointer', padding: 0, marginBottom: 16
                    }}
                >
                    <ion-icon name="arrow-back-outline"></ion-icon> Quay lại tổng quan
                </button>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Tạo công việc mới
                </h1>
                <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
                    Mô tả nhiệm vụ cần thực hiện, AI sẽ phân tích và chuẩn hóa thành task có cấu trúc.
                </p>
            </div>

            {/* Split Layout */}
            <div className="main-content-layout">

                {/* Left Panel: Group Info Form */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    padding: 24,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                        <span style={{ color: '#ec4899', fontSize: 20 }}><ion-icon name="business-outline"></ion-icon></span>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Thông tin nhóm</h2>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                            Tên nhóm
                        </label>
                        <input
                            type="text"
                            value={team!.name}
                            readOnly
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 10,
                                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                                color: 'var(--text-secondary)', fontSize: 14, outline: 'none', cursor: 'not-allowed'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                            Danh mục
                        </label>
                        <div ref={categoryMenuRef} style={{ position: 'relative' }}>
                            <button
                                type="button"
                                className="task-select-trigger"
                                aria-haspopup="listbox"
                                aria-expanded={categoryOpen}
                                onClick={() => setCategoryOpen(open => !open)}
                            >
                                {category}
                            </button>
                            <ion-icon name="chevron-down-outline" style={{ position: 'absolute', right: 14, top: '50%', transform: `translateY(-50%) rotate(${categoryOpen ? 180 : 0}deg)`, color: 'var(--text-secondary)', pointerEvents: 'none', transition: 'transform 0.2s' }}></ion-icon>
                            {categoryOpen && (
                                <ul className="task-select-menu" role="listbox">
                                    {categoryOptions.map(option => (
                                        <li key={option}>
                                            <button
                                                type="button"
                                                className={`task-select-option ${category === option ? 'active' : ''}`}
                                                role="option"
                                                aria-selected={category === option}
                                                onClick={() => {
                                                    setCategory(option);
                                                    setCategoryOpen(false);
                                                }}
                                            >
                                                {option}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                            Mức ưu tiên
                        </label>
                        <div style={{ display: 'flex', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            {['Thấp', 'Trung bình', 'Cao'].map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setPriority(level)}
                                    style={{
                                        flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                                        border: 'none', borderRight: level !== 'Cao' ? '1px solid var(--border)' : 'none',
                                        background: priority === level ? '#d4a574' : 'transparent',
                                        color: priority === level ? '#ffffff' : 'var(--text-secondary)',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Team Members with Job Labels */}
                    {team!.members && team!.members!.length > 0 && (
                        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <ion-icon name="people-outline" style={{ color: '#d4a574', fontSize: 18 }}></ion-icon>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Thành viên nhóm ({team!.members!.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {team!.members!.map((m: any) => {
                                    const initials = (m.fullName || m.username || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                                    const colors = ['#d4a574', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
                                    let hash = 0;
                                    for (const c of (m.username || '')) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
                                    const bgColor = colors[hash];
                                    return (
                                        <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: bgColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                                {initials}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {m.fullName || m.username}
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                                    {m.jobLabels && m.jobLabels.length > 0 ? (
                                                        m.jobLabels.map((label: string, idx: number) => (
                                                            <span key={idx} style={{ background: 'rgba(212, 165, 116, 0.12)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                                                                {label}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa gán nhãn</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                                <ion-icon name="information-circle-outline" style={{ fontSize: 12, verticalAlign: 'middle' }}></ion-icon>{' '}
                                AI sẽ tự động phân công dựa trên nhãn dán công việc.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Panel: AI Chat interface */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column',
                    height: 'clamp(560px, calc(100vh - 220px), 680px)',
                    minHeight: 0,
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#d4a574', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
                                <ion-icon name="sparkles"></ion-icon>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>AI Xử Lý Công Việc</h3>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Mô tả mục tiêu một cách tự nhiên</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button onClick={() => setShowTokens(prev => !prev)} style={{ background: showTokens ? 'rgba(167,139,250,0.12)' : 'none', border: '1px solid var(--border)', color: showTokens ? '#7c3aed' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6 }}>
                                <ion-icon name="analytics-outline"></ion-icon> {showTokens ? `${formatTokenCount(totalTokens)} token` : 'Xem token'}
                            </button>
                            {messages.length > 0 && (
                                <button onClick={clearHistory} style={{ background: 'none', border: '1px solid var(--border)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6 }}>
                                    <ion-icon name="trash-outline"></ion-icon> Xóa lịch sử
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setInput('Rang 120kg Arabica Cầu Đất trước 17:00 ngày mai, ưu tiên cao, cần chia việc cho rang, QC và đóng gói.');
                                    window.setTimeout(() => chatInputRef.current?.focus(), 0);
                                }}
                                style={{ background: 'none', border: 'none', color: '#d4a574', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                <ion-icon name="book-outline"></ion-icon> Xem ví dụ
                            </button>
                        </div>
                    </div>

                    {/* Trial Banner */}
                    <div style={{ background: trialActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '8px 24px', fontSize: 12, fontWeight: 600, color: trialActive ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border)' }}>
                        <ion-icon name={trialActive ? "checkmark-circle" : "warning"}></ion-icon> {trialActive ? `Còn ${trialDays} ngày dùng thử API` : 'Hết hạn dùng thử API. Vui lòng nâng cấp.'}
                    </div>

                    {/* Chat Area */}
                    <div style={{
                        flex: 1, minHeight: 0, padding: '24px', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: 16,
                        background: 'var(--bg-input)' // Slight off-white background to match screenshot
                    }}>
                        {messages.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.5 }}>
                                <ion-icon name="chatbubbles-outline" style={{ fontSize: '48px', marginBottom: '12px' }}></ion-icon>
                                <p style={{ margin: 0, fontSize: '15px' }}>Hãy mô tả công việc của bạn...</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    width: '100%'
                                }}>
                                    {msg.role === 'user' ? (
                                        <div style={{
                                            maxWidth: '75%',
                                            padding: '14px 18px',
                                            borderRadius: '20px',
                                            borderBottomRightRadius: '4px',
                                            background: '#d4a574',
                                            color: '#fff',
                                            fontSize: '15px',
                                            lineHeight: '1.6',
                                        }}>
                                            {friendlyTaskError(msg.content)}
                                        </div>
                                    ) : (msg.result && !msg.result.needsClarification) ? (
                                        /* Case 1: Interactive Refinement Form (Matches Screenshot) */
                                        <AiResultRefinementForm
                                            result={msg.result}
                                            members={team?.members || []}
                                            onConfirm={(finalData) => handleCreateGoal(finalData)}
                                            onAsk={(question) => {
                                                setInput(question);
                                                chatInputRef.current?.focus();
                                            }}
                                        />
                                    ) : (
                                        /* Case 2: Clarification Question OR standard assistant msg */
                                        <div style={{
                                            maxWidth: '85%',
                                            padding: '16px 20px',
                                            borderRadius: '20px',
                                            borderBottomLeftRadius: '4px',
                                            background: msg.result?.needsClarification ? '#fff9db' : '#f1f5f9', // Yellowish for questions
                                            border: msg.result?.needsClarification ? '1px solid #f9eb97' : 'none',
                                            color: 'var(--text-primary)',
                                            fontSize: '15px',
                                            lineHeight: '1.6',
                                            alignSelf: 'flex-start',
                                            boxShadow: msg.result?.needsClarification ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                                        }}>
                                            {msg.result?.needsClarification && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#d97706' }}>
                                                    <ion-icon name="alert-circle"></ion-icon> AI CẦN XÁC NHẬN THÊM
                                                </div>
                                            )}
                                            <div className="markdown-content">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{friendlyTaskError(msg.content)}</ReactMarkdown>
                                            </div>

                                            {/* Show Suggested Questions even in clarification mode */}
                                            {msg.result?.suggestedQuestions && msg.result.suggestedQuestions.length > 0 && (
                                                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                    {msg.result.suggestedQuestions.map((q, qIdx) => (
                                                        <button
                                                            key={qIdx}
                                                            onClick={() => {
                                                                setInput(q);
                                                                chatInputRef.current?.focus();
                                                            }}
                                                            style={{
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid #fde68a',
                                                                color: '#d97706',
                                                                padding: '6px 12px',
                                                                borderRadius: '12px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}
                                                        >
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {showTokens && (
                                        <span style={{ marginTop: 6, padding: '0 6px', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}>
                                            {formatTokenCount(estimateTokens(msg.content))} token
                                        </span>
                                    )}
                                </div>
                            ))
                        )}

                        {loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '14px 18px', borderRadius: '20px', borderBottomLeftRadius: '4px',
                                    background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '15px', display: 'flex', gap: '8px', alignItems: 'center'
                                }}>
                                    <span className="dot-typing" style={{ background: '#94a3b8' }}></span> Đang phân tích...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                            <textarea
                                ref={chatInputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={trialActive ? 'Mô tả công việc cần thực hiện...' : 'Dùng thử đã hết hạn'}
                                disabled={!trialActive || loading}
                                rows={2}
                                style={{
                                    flex: 1, fontSize: 15, fontFamily: 'inherit',
                                    background: 'var(--bg-card)',
                                    border: '2px solid #cbd5e1', // Slightly thicker border as per mockup
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    resize: 'none', outline: 'none',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!trialActive || loading || !input.trim()}
                                style={{
                                    height: 52, padding: '0 24px', borderRadius: '12px',
                                    background: (trialActive && input.trim() && !loading) ? '#a78bfa' : '#e2e8f0',
                                    color: (trialActive && input.trim() && !loading) ? '#ffffff' : '#94a3b8',
                                    border: 'none', fontSize: 16, fontWeight: 600, cursor: (trialActive && input.trim() && !loading) ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ width: 18, height: 18, border: '2px solid currentColor', borderRadius: '50%', opacity: 0.5 }}></div> Gửi
                            </button>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ion-icon name="sparkles"></ion-icon> AI sẽ tạo công việc, phân công và hạn chót.
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .dot-typing {
                    position: relative;
                    left: -9999px;
                    width: 6px;
                    height: 6px;
                    border-radius: 5px;
                    background-color: transparent;
                    color: inherit;
                    box-shadow: 9984px 0 0 0 currentcolor, 9999px 0 0 0 currentcolor, 10014px 0 0 0 currentcolor;
                    animation: dot-typing 1.5s infinite linear;
                }
                @keyframes dot-typing {
                    0% { box-shadow: 9984px 0 0 0 currentcolor, 9999px 0 0 0 currentcolor, 10014px 0 0 0 currentcolor; }
                    16.667% { box-shadow: 9984px -6px 0 0 currentcolor, 9999px 0 0 0 currentcolor, 10014px 0 0 0 currentcolor; }
                    33.333% { box-shadow: 9984px 0 0 0 currentcolor, 9999px -6px 0 0 currentcolor, 10014px 0 0 0 currentcolor; }
                    50% { box-shadow: 9984px 0 0 0 currentcolor, 9999px 0 0 0 currentcolor, 10014px -6px 0 0 currentcolor; }
                    66.667% { box-shadow: 9984px 0 0 0 currentcolor, 9999px 0 0 0 currentcolor, 10014px 0 0 0 currentcolor; }
                    100% { box-shadow: 9984px 0 0 0 currentcolor, 9999px 0 0 0 currentcolor, 10014px 0 0 0 currentcolor; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .markdown-content { white-space: pre-wrap; font-size: 14px; }
                .markdown-content table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; background: #fff; }
                .markdown-content th, .markdown-content td { border: 1px solid #fde68a; padding: 10px; text-align: left; }
                .markdown-content th { background: #fef3c7; font-weight: 700; color: #92400e; }
                .markdown-content p { margin: 8px 0; }
                .markdown-content h3 { margin: 16px 0 8px; font-size: 16px; font-weight: 800; color: #92400e; }
            `}</style>
        </div>
    );
}
/**
 * Component to refine and edit the AI parse result before creation.
 * Matches the design in the user's screenshot.
 */
function AiResultRefinementForm({ result, members, onConfirm, onAsk }: { result: AiParseResult, members: TeamMemberInfo[], onConfirm: (data: AiParseResult) => void, onAsk: (q: string) => void }) {
    const [editedResult, setEditedResult] = useState<AiParseResult>({
        ...result,
        tasks: result.tasks ? [...result.tasks] : []
    });

    const updateField = (field: keyof AiParseResult, value: any) => {
        setEditedResult(prev => ({ ...prev, [field]: value }));
    };

    const updateTaskTitle = (index: number, value: string) => {
        const newTasks = [...(editedResult.tasks || [])];
        newTasks[index] = { ...newTasks[index], title: value };
        updateField('tasks', newTasks);
    };

    const updateTaskDescription = (index: number, value: string) => {
        const newTasks = [...(editedResult.tasks || [])];
        newTasks[index] = { ...newTasks[index], description: value };
        updateField('tasks', newTasks);
    };

    const updateTaskAssignee = (index: number, userId: string) => {
        const newTasks = [...(editedResult.tasks || [])];
        if (!userId) {
            newTasks[index] = {
                ...newTasks[index],
                suggestedAssignee: undefined,
                suggestedAssigneeId: null,
                suggestedReason: null,
                assignee: undefined,
            };
            updateField('tasks', newTasks);
            return;
        }

        const member = members.find(item => item.userId === userId);
        newTasks[index] = {
            ...newTasks[index],
            suggestedAssigneeId: userId,
            suggestedAssignee: member?.fullName || member?.username || 'Thành viên',
            suggestedReason: member?.jobLabels?.length
                ? `Bạn chọn thủ công. Nhãn hiện có: ${member.jobLabels.join(', ')}.`
                : 'Bạn chọn thủ công trên draft.',
            assignee: member?.username,
        };
        updateField('tasks', newTasks);
    };

    const clearTaskAssignee = (index: number) => {
        const newTasks = [...(editedResult.tasks || [])];
        newTasks[index] = {
            ...newTasks[index],
            suggestedAssignee: undefined,
            suggestedAssigneeId: null,
            suggestedReason: null,
            assignee: undefined,
        };
        updateField('tasks', newTasks);
    };

    const removeTask = (index: number) => {
        const newTasks = [...(editedResult.tasks || [])].filter((_, i) => i !== index);
        updateField('tasks', newTasks);
    };

    const addTask = () => {
        const newTasks = [...(editedResult.tasks || []), { title: 'Công việc mới', description: '', priority: 2, workload: 1, assignee: '' }];
        updateField('tasks', newTasks);
    };

    const assignedCount = (editedResult.tasks || []).filter(task => task.suggestedAssignee || task.assignee).length;
    const totalTasks = editedResult.tasks?.length || 0;
    const memberName = (member: TeamMemberInfo) => member.fullName || member.username || 'Thành viên';

    return (
        <div style={{
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            marginBottom: 16,
            animation: 'slideUp 0.4s ease-out'
        }}>
            {/* Header Area */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Xem trước công việc</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212, 165, 116, 0.12)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: 11, fontWeight: 700 }}>
                        <ion-icon name="checkmark-done-outline"></ion-icon> AI ĐÃ XỬ LÝ
                    </div>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Xem lại chi tiết công việc và phân bổ nhân sự trước khi xác nhận.</p>
            </div>

            <div style={{ padding: '32px' }}>
                {/* Standardization Card */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <span style={{ fontSize: 20, color: '#f59e0b' }}><ion-icon name="clipboard-outline"></ion-icon></span>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Công việc đã chuẩn hóa</h3>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                                AI đã gợi ý người phụ trách cho {assignedCount}/{totalTasks} task dựa trên job labels.
                            </p>
                        </div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 12px',
                            borderRadius: 999,
                            background: assignedCount > 0 ? '#ecfdf5' : '#f8fafc',
                            color: assignedCount > 0 ? '#047857' : '#64748b',
                            border: `1px solid ${assignedCount > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                            fontSize: 12,
                            fontWeight: 800
                        }}>
                            <ion-icon name="person-add-outline"></ion-icon>
                            {assignedCount > 0 ? `${assignedCount} gợi ý` : 'Chưa gán'}
                        </div>
                    </div>

                    {/* Title Input */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Tên công việc</label>
                        <input
                            type="text"
                            value={editedResult.title || ''}
                            onChange={e => updateField('title', e.target.value)}
                            style={{
                                width: '100%', padding: '14px 18px', borderRadius: '12px',
                                border: '1px solid var(--border)', background: 'var(--bg-card)',
                                color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>

                    {/* Task List (Mô tả chi tiết) */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Chi tiết mô tả</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {editedResult.tasks?.map((task, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 16,
                                    padding: 18,
                                    borderRadius: 18,
                                    border: '1px solid #dbe3ef',
                                    background: 'var(--bg-card)',
                                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                            <span style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: '50%',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#ede9fe',
                                                color: '#6d28d9',
                                                fontSize: 13,
                                                fontWeight: 800
                                            }}>{idx + 1}</span>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 900, textTransform: 'uppercase' }}>Task draft</div>
                                                <input
                                                    type="text"
                                                    value={task.title || ''}
                                                    onChange={e => updateTaskTitle(idx, e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        minWidth: 0,
                                                        marginTop: 3,
                                                        padding: 0,
                                                        border: 0,
                                                        background: 'transparent',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 17,
                                                        fontWeight: 850,
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeTask(idx)}
                                            aria-label="Xóa task"
                                            title="Xóa task"
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: '50%',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid #fecdd3',
                                                color: '#e11d48',
                                                cursor: 'pointer',
                                                fontSize: 20,
                                                display: 'grid',
                                                placeItems: 'center',
                                                flexShrink: 0
                                            }}
                                        >
                                            <ion-icon name="close-circle-outline"></ion-icon>
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(260px, 0.8fr)', gap: 16, alignItems: 'stretch' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                                            <label style={{ fontSize: 12, fontWeight: 850, color: 'var(--text-secondary)' }}>Mô tả chi tiết</label>
                                            <textarea
                                                value={task.description || ''}
                                                onChange={e => updateTaskDescription(idx, e.target.value)}
                                                rows={4}
                                                style={{
                                                    width: '100%',
                                                    minHeight: 112,
                                                    padding: '13px 14px',
                                                    borderRadius: 14,
                                                    border: '1px solid #cbd5e1',
                                                    background: 'var(--bg-input)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 14,
                                                    lineHeight: 1.55,
                                                    resize: 'vertical',
                                                    outline: 'none',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 999, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 750 }}>
                                                    <ion-icon name="barbell-outline"></ion-icon>
                                                    Workload: {task.workload || 1}
                                                </span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 999, background: 'rgba(249, 115, 22, 0.1)', color: 'var(--warning)', fontSize: 12, fontWeight: 750 }}>
                                                    <ion-icon name="flag-outline"></ion-icon>
                                                    Priority: {task.priority || 2}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{
                                            borderRadius: 16,
                                            border: `1px solid ${task.suggestedAssignee || task.assignee ? '#a7f3d0' : '#fde68a'}`,
                                            background: task.suggestedAssignee || task.assignee ? '#f0fdf4' : '#fffbeb',
                                            padding: 14,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 12,
                                            minWidth: 0
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                <span style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: '50%',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: task.suggestedAssignee || task.assignee ? '#10b981' : '#f59e0b',
                                                    color: '#fff',
                                                    flexShrink: 0
                                                }}>
                                                    <ion-icon name={task.suggestedAssignee || task.assignee ? 'person-circle-outline' : 'alert-circle-outline'}></ion-icon>
                                                </span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: 11,
                                                        lineHeight: 1.2,
                                                        color: task.suggestedAssignee || task.assignee ? '#047857' : '#92400e',
                                                        fontWeight: 900,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        Người phụ trách
                                                    </div>
                                                    <div style={{
                                                        marginTop: 2,
                                                        fontSize: 15,
                                                        color: 'var(--text-primary)',
                                                        fontWeight: 900,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {task.suggestedAssignee || task.assignee || 'Chưa chọn'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 850 }}>Chọn member</label>
                                                <select
                                                    value={task.suggestedAssigneeId || ''}
                                                    onChange={e => updateTaskAssignee(idx, e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        minHeight: 42,
                                                        padding: '0 12px',
                                                        borderRadius: 12,
                                                        border: '1px solid #cbd5e1',
                                                        background: 'var(--bg-card)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 14,
                                                        fontWeight: 700,
                                                        outline: 'none'
                                                    }}
                                                >
                                                    <option value="">Chưa gán</option>
                                                    {members.map(member => (
                                                        <option key={member.userId} value={member.userId}>
                                                            {memberName(member)}{member.jobLabels?.length ? ` - ${member.jobLabels.join(', ')}` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={{
                                                padding: 10,
                                                borderRadius: 12,
                                                background: 'rgba(255,255,255,0.72)',
                                                fontSize: 12,
                                                lineHeight: 1.45,
                                                color: task.suggestedAssignee || task.assignee ? '#065f46' : '#92400e'
                                            }}>
                                                <strong style={{ display: 'block', marginBottom: 3 }}>Lý do</strong>
                                                {task.suggestedReason || (task.suggestedAssignee || task.assignee
                                                    ? 'Phù hợp với nhãn công việc của task này.'
                                                    : 'AI không tìm thấy thành viên có nhãn phù hợp. Bạn có thể chọn thủ công ở đây.')}
                                            </div>

                                            {(task.suggestedAssignee || task.assignee) && (
                                                <button
                                                    type="button"
                                                    onClick={() => clearTaskAssignee(idx)}
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        border: '1px solid #bbf7d0',
                                                        background: 'var(--bg-card)',
                                                        color: '#047857',
                                                        borderRadius: 9,
                                                        padding: '7px 10px',
                                                        fontSize: 12,
                                                        fontWeight: 850,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Bỏ gợi ý
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addTask}
                                style={{
                                    alignSelf: 'flex-start', background: '#f5f3ff', border: '1px solid #ddd6fe',
                                    color: '#7c3aed', padding: '8px 16px', borderRadius: '10px',
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                }}
                            >
                                <ion-icon name="add-outline"></ion-icon> Thêm mục
                            </button>
                        </div>
                    </div>

                    {/* Deadline & Priority Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Hạn chót</label>
                            <input
                                type="text"
                                value={editedResult.deadline || ''}
                                onChange={e => updateField('deadline', e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                                    color: 'var(--text-primary)', fontSize: 14, outline: 'none'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Ưu tiên</label>
                            <div style={{ display: 'flex', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                {['Low', 'Medium', 'High'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => updateField('priority', p)}
                                        style={{
                                            flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700,
                                            border: 'none', borderRight: p !== 'High' ? '1px solid #f1f5f9' : 'none',
                                            background: (editedResult.priority?.toLowerCase() || 'medium') === p.toLowerCase() ? '#d4a574' : 'transparent',
                                            color: (editedResult.priority?.toLowerCase() || 'medium') === p.toLowerCase() ? '#fff' : '#64748b',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Suggested Questions */}
                {editedResult.suggestedQuestions && editedResult.suggestedQuestions.length > 0 && (
                    <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#d4a574', fontSize: 13, fontWeight: 700 }}>
                            <ion-icon name="bulb-outline"></ion-icon> Gợi ý từ AI để tối ưu kế hoạch:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {editedResult.suggestedQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onAsk(q)}
                                    style={{
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        color: '#4f46e5', padding: '8px 16px', borderRadius: '12px',
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e0e7ff'; }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                    <button
                        style={{ padding: '12px 32px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() => onConfirm(editedResult)}
                        style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#d4a574', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(212,165,116,0.3)' }}
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
