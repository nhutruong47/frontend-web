import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useNavigate } from 'react-router-dom';
import { teamService, aiService, goalService, getTrialStatus } from '../services/groupService';
import type { AiParseResult } from '../services/groupService';
import type { Team } from '../types/types';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    result?: AiParseResult;
    timestamp: Date;
}

export default function CreateTaskPage() {
    const { id: teamId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    const [team, setTeam] = useState<Team | null>(null);
    const [category, setCategory] = useState('Rang xay');
    const [priority, setPriority] = useState('Trung bình');

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

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!teamId) return;
        teamService.getDetail(teamId).then(setTeam).catch(() => { });
        getTrialStatus().then(s => { setTrialActive(s.aiTrialActive); setTrialDays(s.daysRemaining); }).catch(() => { });
    }, [teamId]);

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

    const handleSend = async () => {
        if (!input.trim() || !trialActive || loading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString() + '-user',
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Build simple string history
            const historyStr = messages.map(m => {
                if (m.role === 'user') return `User: ${m.content}`;
                if (m.result && m.result.tasks) {
                    return `AI đã chia việc: ${JSON.stringify(m.result.tasks.map(t => ({ task: t.title, assignTo: t.assignee || t.suggestedAssignee })))}`;
                }
                return `AI: ${m.content}`;
            }).join('\n');

            const res = await aiService.parseText(userMsg.content, teamId || '', historyStr);

            // Frontend safety net: detect missing key fields and force clarification
            const missingFields: string[] = [];
            if (!res.deadline || res.deadline === '—' || res.deadline === 'YYYY-MM-DD') missingFields.push('Hạn chót (deadline)');
            if (!res.quantity && !res.quantityNumber) missingFields.push('Khối lượng / Số lượng');
            if (!res.unit || res.unit === 'đơn vị') missingFields.push('Đơn vị');

            if (missingFields.length >= 2 && !res.needsClarification) {
                res.needsClarification = true;
                res.description = (res.description ? res.description + '\n\n' : '')
                    + '⚠️ Tôi cần bạn bổ sung thêm thông tin:\n'
                    + missingFields.map((f, i) => `${i + 1}. ${f}`).join('\n')
                    + '\n\nVui lòng trả lời để tôi hoàn thiện kế hoạch nhé!';
            }

            const aiMsg: ChatMessage = {
                id: Date.now().toString() + '-ai',
                role: 'assistant',
                content: res.description || 'Tôi đã điều chỉnh phân công theo yêu cầu của bạn. Vui lòng xác nhận bên dưới.',
                result: res,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);

            if (!res.needsClarification && res.title) {
                // Keep it in chat interface
            }
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
                outputTarget: result.description || result.quantity || '',
                rawInstruction: result.description || '',
                deadline: result.deadline || undefined,
                priority: result.priority?.toLowerCase() === 'high' ? 3 : result.priority?.toLowerCase() === 'low' ? 1 : 2,
                useAi: true,
                chatLog: JSON.stringify(messages),
                tasks: result.tasks || []
            } as any);
            
            // Stay on the page and show success message
            const successMsg: ChatMessage = {
                id: Date.now().toString() + '-success',
                role: 'assistant',
                content: '🎉 **Tuyệt vời!** Công việc đã được phân bổ thành công vào nhóm. Vui lòng bấm vào "Quay lại Dashboard" để xem chi tiết, hoặc bạn có thể tiếp tục tạo mục tiêu mới ở đây.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, successMsg]);

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
                    grid-template-columns: 280px 1fr; // Reduced left sidebar
                    gap: 32px;
                    align-items: start;
                }
            `}</style>

            {/* Navigation Header */}
            <div style={{ width: '100%', maxWidth: 1440, marginBottom: 32 }}>
                <button
                    onClick={() => navigate(`/groups/${teamId}`)}
                    style={{
                        background: 'none', border: 'none', color: '#6366f1',
                        fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                        cursor: 'pointer', padding: 0, marginBottom: 16
                    }}
                >
                    <ion-icon name="arrow-back-outline"></ion-icon> Quay lại Dashboard
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
                            value={team.name}
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
                        <div style={{ position: 'relative' }}>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: 10,
                                    border: '1px solid var(--border)', background: 'transparent',
                                    color: 'var(--text-primary)', fontSize: 14, outline: 'none', cursor: 'pointer',
                                    appearance: 'none'
                                }}
                            >
                                <option value="Rang xay">Rang xay</option>
                                <option value="Sơ chế">Sơ chế</option>
                                <option value="Đóng gói">Đóng gói</option>
                            </select>
                            <ion-icon name="chevron-down-outline" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}></ion-icon>
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
                                        background: priority === level ? '#8b5cf6' : 'transparent',
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
                    {team.members && team.members.length > 0 && (
                        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <ion-icon name="people-outline" style={{ color: '#6366f1', fontSize: 18 }}></ion-icon>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Thành viên nhóm ({team.members.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {team.members.map((m: any) => {
                                    const initials = (m.fullName || m.username || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                                    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
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
                                                            <span key={idx} style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                                                                {label}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Chưa gán nhãn</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>
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
                    height: 'calc(100vh - 120px)', // Increased height
                    minHeight: '800px',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
                                <ion-icon name="sparkles"></ion-icon>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>AI Xử Lý Công Việc</h3>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Mô tả mục tiêu một cách tự nhiên</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {messages.length > 0 && (
                                <button onClick={clearHistory} style={{ background: 'none', border: '1px solid var(--border)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6 }}>
                                    <ion-icon name="trash-outline"></ion-icon> Xóa lịch sử
                                </button>
                            )}
                            <button style={{ background: 'none', border: 'none', color: '#8b5cf6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                        flex: 1, padding: '24px', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: 16,
                        background: '#f8fafc' // Slight off-white background to match screenshot
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
                                            background: '#8b5cf6',
                                            color: '#fff',
                                            fontSize: '15px',
                                            lineHeight: '1.6',
                                        }}>
                                            {msg.content}
                                        </div>
                                    ) : (msg.result && !msg.result.needsClarification) ? (
                                        /* Case 1: Interactive Refinement Form (Matches Screenshot) */
                                        <AiResultRefinementForm 
                                            result={msg.result} 
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
                                            color: '#334155',
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
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        {loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '14px 18px', borderRadius: '20px', borderBottomLeftRadius: '4px',
                                    background: '#f1f5f9', color: '#64748b', fontSize: '15px', display: 'flex', gap: '8px', alignItems: 'center'
                                }}>
                                    <span className="dot-typing" style={{ background: '#94a3b8' }}></span> Đang phân tích...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: '#ffffff' }}>
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
                                    background: '#ffffff',
                                    border: '2px solid #cbd5e1', // Slightly thicker border as per mockup
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    resize: 'none', outline: 'none',
                                    color: '#1e293b'
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
                        <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
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
function AiResultRefinementForm({ result, onConfirm, onAsk }: { result: AiParseResult, onConfirm: (data: AiParseResult) => void, onAsk: (q: string) => void }) {
    const [editedResult, setEditedResult] = useState<AiParseResult>({
        ...result,
        tasks: result.tasks ? [...result.tasks] : []
    });

    const updateField = (field: keyof AiParseResult, value: any) => {
        setEditedResult(prev => ({ ...prev, [field]: value }));
    };

    const updateTask = (index: number, value: string) => {
        const newTasks = [...(editedResult.tasks || [])];
        newTasks[index] = { ...newTasks[index], description: value, title: value };
        updateField('tasks', newTasks);
    };

    const removeTask = (index: number) => {
        const newTasks = [...(editedResult.tasks || [])].filter((_, i) => i !== index);
        updateField('tasks', newTasks);
    };

    const addTask = () => {
        const newTasks = [...(editedResult.tasks || []), { title: '', description: '', assignee: '' }];
        updateField('tasks', newTasks);
    };

    return (
        <div style={{
            width: '100%',
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            marginBottom: 16,
            animation: 'slideUp 0.4s ease-out'
        }}>
            {/* Header Area */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Xem trước công việc</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: '20px', fontSize: 11, fontWeight: 700 }}>
                        <ion-icon name="checkmark-done-outline"></ion-icon> AI ĐÃ XỬ LÝ
                    </div>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Xem lại chi tiết công việc và phân bổ nhân sự trước khi xác nhận.</p>
            </div>

            <div style={{ padding: '32px' }}>
                {/* Standardization Card */}
                <div style={{ background: '#fafafa', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <span style={{ fontSize: 20, color: '#f59e0b' }}><ion-icon name="clipboard-outline"></ion-icon></span>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#334155' }}>Công việc đã chuẩn hóa</h3>
                    </div>

                    {/* Title Input */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Tên công việc</label>
                        <input
                            type="text"
                            value={editedResult.title || ''}
                            onChange={e => updateField('title', e.target.value)}
                            style={{
                                width: '100%', padding: '14px 18px', borderRadius: '12px',
                                border: '1px solid #e2e8f0', background: '#fff',
                                color: '#1e293b', fontSize: 15, fontWeight: 500, outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>

                    {/* Task List (Mô tả chi tiết) */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Chi tiết mô tả</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {editedResult.tasks?.map((task, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: '#cbd5e1', fontSize: 16 }}>•</span>
                                    <input
                                        type="text"
                                        value={task.description || task.title || ''}
                                        onChange={e => updateTask(idx, e.target.value)}
                                        style={{
                                            flex: 1, padding: '12px 16px', borderRadius: '12px',
                                            border: '1px solid #e2e8f0', background: '#fff',
                                            color: '#334155', fontSize: 14, outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={() => removeTask(idx)}
                                        style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 20, display: 'flex' }}
                                    >
                                        <ion-icon name="close-circle-outline"></ion-icon>
                                    </button>
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
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Hạn chót</label>
                            <input
                                type="text"
                                value={editedResult.deadline || ''}
                                onChange={e => updateField('deadline', e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                    border: '1px solid #e2e8f0', background: '#fff',
                                    color: '#334155', fontSize: 14, outline: 'none'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Ưu tiên</label>
                            <div style={{ display: 'flex', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
                                {['Low', 'Medium', 'High'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => updateField('priority', p)}
                                        style={{
                                            flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700,
                                            border: 'none', borderRight: p !== 'High' ? '1px solid #f1f5f9' : 'none',
                                            background: (editedResult.priority?.toLowerCase() || 'medium') === p.toLowerCase() ? '#6366f1' : 'transparent',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#6366f1', fontSize: 13, fontWeight: 700 }}>
                            <ion-icon name="bulb-outline"></ion-icon> Gợi ý từ AI để tối ưu kế hoạch:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {editedResult.suggestedQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onAsk(q)}
                                    style={{
                                        background: '#fff', border: '1px solid #e0e7ff',
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
                        style={{ padding: '12px 32px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() => onConfirm(editedResult)}
                        style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
