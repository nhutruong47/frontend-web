import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ragAssistantService,
    type RagAssistantResponse,
    type RagCitation,
    type RagSuggestedAction,
} from '../services/groupService';
import { aiPlanService } from '../services/groupService';
import { isPaymentRequiredError } from '../services/api';
import { estimateTokens, formatTokenCount } from '../utils/tokenUsage';
import { useAuth } from '../context/AuthContext';

interface AiAssistantPanelProps {
    trialActive: boolean;
    trialDays: number;
    teamId: string;
    onApplyStructuredPlan?: (payload: {
        goalTitle: string;
        outputTarget?: string;
        tasks: { title: string; description?: string | null; priority: number; workload: number }[];
    }) => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    rag?: RagAssistantResponse;
    timestamp: Date;
    sanitized?: boolean;
}

const CONVERSATION_KEY_PREFIX = 'orca.ai.conversation.';

function makeConversationId(teamId: string): string {
    const existing = sessionStorage.getItem(CONVERSATION_KEY_PREFIX + teamId);
    if (existing) return existing;
    const id = `${teamId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(CONVERSATION_KEY_PREFIX + teamId, id);
    return id;
}

const confidenceColor = (level?: string): string => {
    switch (level) {
        case 'high':
            return 'var(--success, #22c55e)';
        case 'medium':
            return 'var(--warning)';
        case 'low':
            return 'var(--danger)';
        default:
            return 'var(--text-secondary)';
    }
};

const sourceBadge = (source: string): { label: string; icon: string } => {
    switch (source) {
        case 'policies':
            return { label: 'Chính sách', icon: 'shield-checkmark-outline' };
        case 'faq':
            return { label: 'FAQ', icon: 'help-circle-outline' };
        case 'manual':
            return { label: 'Hướng dẫn', icon: 'book-outline' };
        case 'inventory':
            return { label: 'Kho', icon: 'cube-outline' };
        case 'orders':
            return { label: 'Đơn hàng', icon: 'receipt-outline' };
        case 'products':
            return { label: 'Sản phẩm', icon: 'cafe-outline' };
        case 'teams':
            return { label: 'Đội', icon: 'people-outline' };
        case 'users':
            return { label: 'Thành viên', icon: 'person-outline' };
        default:
            return { label: source, icon: 'document-outline' };
    }
};

export default function AiAssistantPanel({
    trialActive,
    trialDays,
    teamId,
    onApplyStructuredPlan,
}: AiAssistantPanelProps) {
    const { user } = useAuth();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [showTokens, setShowTokens] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [panelHeight, setPanelHeight] = useState(520);
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartY = useRef(0);
    const resizeStartH = useRef(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationId = useRef<string>(makeConversationId(teamId));

    const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

    useEffect(() => {
        if (!isResizing) return;
        const onMove = (e: MouseEvent) => {
            const delta = resizeStartY.current - e.clientY;
            setPanelHeight(Math.max(280, Math.min(800, resizeStartH.current + delta)));
        };
        const onUp = () => setIsResizing(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isResizing]);

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartY.current = e.clientY;
        resizeStartH.current = panelHeight;
    };

    const send = async () => {
        if (!input.trim() || !trialActive || loading) return;
        const text = input.trim();
        const userMsg: ChatMessage = {
            id: Date.now().toString() + '-user',
            role: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const rag = await ragAssistantService.query({
                query: text,
                teamId,
                userId: user?.id?.toString() ?? 'anonymous',
                conversationId: conversationId.current,
                maxDocuments: 5,
            });

            // Best-effort persistence of the RAG answer as an AI plan draft.
            // Failures here must not break the chat.
            aiPlanService.generateDraft(teamId, text, conversationId.current)
                .catch(() => undefined);

            const aiMsg: ChatMessage = {
                id: Date.now().toString() + '-ai',
                role: 'assistant',
                content: rag.answer || 'Tôi chưa có câu trả lời.',
                rag,
                timestamp: new Date(),
                sanitized:
                    rag.metadata?.sanitization?.is_safe === false ||
                    (rag.metadata?.sanitization?.redactions ?? 0) > 0,
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e: any) {
            if (isPaymentRequiredError(e)) {
                window.dispatchEvent(new CustomEvent('payment-required'));
                return;
            }
            const errorMsg: ChatMessage = {
                id: Date.now().toString() + '-err',
                role: 'assistant',
                content: e?.response?.data?.message || 'Lỗi kết nối AI. Hãy thử lại!',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const clearConversation = async () => {
        try {
            await ragAssistantService.clearHistory(conversationId.current);
        } catch {
            // ignore — local state is what matters
        }
        conversationId.current = makeConversationId(teamId);
        sessionStorage.setItem(CONVERSATION_KEY_PREFIX + teamId, conversationId.current);
        setMessages([]);
    };

    const handleActionClick = (action: RagSuggestedAction) => {
        const path = action.payload?.path || action.payload?.screen;
        if (action.type === 'navigate' && typeof path === 'string') {
            window.location.href = path.startsWith('/') ? path : `/${path}`;
        } else if (action.type === 'create_task' && onApplyStructuredPlan) {
            // Hook up via parent if it asks for structured tasks.
        } else if (action.type === 'external') {
            const url = action.payload?.url;
            if (typeof url === 'string') {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    };

    return (
        <div className="ai-assistant-panel" style={{
            borderRadius: 16,
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            height: isCollapsed ? 'auto' : panelHeight,
            transition: isCollapsed ? 'height 0.2s ease' : 'none',
            overflow: 'hidden',
            position: 'relative',
        }}>
            {!isCollapsed && (
                <div
                    onMouseDown={startResize}
                    style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: 4, cursor: 'ns-resize', zIndex: 2,
                        borderRadius: '16px 16px 0 0',
                    }}
                    title="Kéo dãn khung"
                />
            )}

            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '16px 20px 0',
                flexShrink: 0,
            }}>
                <span className="icon-container glow" style={{ width: 36, height: 36, fontSize: 20, background: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                    <ion-icon name="hardware-chip-outline"></ion-icon>
                </span>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Trợ lý AI ORCA
                    </h3>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                        Trả lời dựa trên tri thức thật của team bạn
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowTokens(prev => !prev)}
                    className={`ai-token-toggle ${showTokens ? 'active' : ''}`}
                >
                    {showTokens ? `Token: ${formatTokenCount(totalTokens)}` : 'Xem token'}
                </button>
                {messages.length > 0 && (
                    <button
                        type="button"
                        onClick={clearConversation}
                        title="Bắt đầu cuộc trò chuyện mới"
                        style={{
                            background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                            padding: '4px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                        }}
                    >
                        <ion-icon name="refresh-outline" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }}></ion-icon>
                        Hội thoại mới
                    </button>
                )}
                {trialActive ? (
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                        <ion-icon name="checkmark-circle-outline" style={{ fontSize: '12px' }}></ion-icon> Còn {trialDays} ngày
                    </span>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span className="badge badge-danger" style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            <ion-icon name="close-circle-outline" style={{ fontSize: '12px' }}></ion-icon> Hết hạn
                        </span>
                        <Link to="/upgrade" className="badge badge-accent" style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                            Nâng cấp
                        </Link>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setIsCollapsed(c => !c)}
                    title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20,
                        padding: '2px 4px', display: 'flex', alignItems: 'center',
                        borderRadius: 6, transition: 'color 0.15s',
                    }}
                >
                    <ion-icon name={isCollapsed ? 'expand-outline' : 'remove-outline'}></ion-icon>
                </button>
            </div>

            {!isCollapsed && (
                <>
                    {/* Chat Messages */}
                    <div className="ai-chat-container" style={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: '200px',
                        maxHeight: `${panelHeight - 220}px`,
                        padding: '16px 20px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }}>
                        {messages.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.6 }}>
                                <ion-icon name="chatbubbles-outline" style={{ fontSize: '40px', marginBottom: '8px' }}></ion-icon>
                                <p style={{ margin: 0, fontSize: '13px' }}>Hãy bắt đầu bằng cách nhập câu hỏi của bạn</p>
                                <p style={{ margin: '4px 0 0', fontSize: '11px' }}>VD: "Trong kho còn bao nhiêu cà phê Arabica?"</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}>
                                    {/* Bubble */}
                                    <div className={`chat-bubble ${msg.role}`} style={{
                                        maxWidth: '92%',
                                        padding: '10px 14px',
                                        borderRadius: '16px',
                                        borderBottomRightRadius: msg.role === 'user' ? '2px' : '16px',
                                        borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '16px',
                                        background: msg.role === 'user' ? 'var(--primary-soft)' : 'var(--bg-input)',
                                        border: `1px solid ${msg.role === 'user' ? 'var(--primary)' : 'var(--border)'}`,
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        lineHeight: 1.55,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}>
                                        {msg.content}
                                    </div>

                                    {msg.sanitized && (
                                        <span style={{ fontSize: 10, color: 'var(--warning)', marginTop: 4, padding: '0 4px' }}>
                                            <ion-icon name="shield-checkmark-outline" style={{ fontSize: 11, verticalAlign: 'middle', marginRight: 4 }}></ion-icon>
                                            Đã lọc bỏ nội dung có dấu hiệu prompt-injection.
                                        </span>
                                    )}

                                    {/* RAG details */}
                                    {msg.rag && (
                                        <div style={{
                                            marginTop: '8px',
                                            width: '100%',
                                            maxWidth: '95%',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            alignSelf: 'flex-start',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10,
                                        }}>
                                            {/* Confidence + Reasoning */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                {msg.rag.confidence && (
                                                    <span style={{
                                                        fontSize: 10,
                                                        padding: '2px 8px',
                                                        borderRadius: 8,
                                                        background: 'rgba(0,0,0,0.2)',
                                                        color: confidenceColor(msg.rag.confidence.level),
                                                        fontWeight: 700,
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    }}>
                                                        <ion-icon name="analytics-outline" style={{ fontSize: 12 }}></ion-icon>
                                                        Độ tin cậy: {msg.rag.confidence.level.toUpperCase()} ({Math.round(msg.rag.confidence.score * 100)}%)
                                                    </span>
                                                )}
                                                {msg.rag.referenced_knowledge && msg.rag.referenced_knowledge.length > 0 && (
                                                    <span style={{
                                                        fontSize: 10, padding: '2px 8px', borderRadius: 8,
                                                        background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 700,
                                                    }}>
                                                        <ion-icon name="library-outline" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }}></ion-icon>
                                                        {msg.rag.referenced_knowledge.length} nguồn
                                                    </span>
                                                )}
                                                {msg.rag.metadata?.processing_time_ms != null && (
                                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                                                        {msg.rag.metadata.processing_time_ms}ms
                                                    </span>
                                                )}
                                            </div>

                                            {msg.rag.reasoning_summary && (
                                                <details>
                                                    <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
                                                        <ion-icon name="bulb-outline" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }}></ion-icon>
                                                        Lý luận của AI
                                                    </summary>
                                                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 8 }}>
                                                        {msg.rag.reasoning_summary}
                                                    </div>
                                                </details>
                                            )}

                                            {/* Citations */}
                                            {msg.rag.referenced_knowledge && msg.rag.referenced_knowledge.length > 0 && (
                                                <details>
                                                    <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
                                                        <ion-icon name="document-text-outline" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }}></ion-icon>
                                                        Trích dẫn ({msg.rag.referenced_knowledge.length})
                                                    </summary>
                                                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        {msg.rag.referenced_knowledge.map((c: RagCitation) => {
                                                            const badge = sourceBadge(c.source);
                                                            return (
                                                                <a
                                                                    key={c.document_id}
                                                                    href={c.url || '#'}
                                                                    target="_blank" rel="noreferrer"
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column', gap: 4,
                                                                        padding: '8px 10px',
                                                                        borderRadius: 8,
                                                                        background: 'var(--bg-input)',
                                                                        textDecoration: 'none',
                                                                        color: 'var(--text-primary)',
                                                                        border: '1px solid var(--border)',
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <ion-icon name={badge.icon} style={{ fontSize: 13, color: 'var(--primary)' }}></ion-icon>
                                                                        <span style={{ fontSize: 11, fontWeight: 600 }}>
                                                                            {c.title || c.source_id}
                                                                        </span>
                                                                        <span style={{
                                                                            fontSize: 9, padding: '1px 6px', borderRadius: 6,
                                                                            background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 700,
                                                                        }}>{badge.label}</span>
                                                                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-secondary)' }}>
                                                                            {Math.round(c.relevance_score * 100)}%
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                                        {c.excerpt}
                                                                    </div>
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </details>
                                            )}

                                            {/* Suggested actions */}
                                            {msg.rag.suggested_actions && msg.rag.suggested_actions.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {msg.rag.suggested_actions.map((action: RagSuggestedAction, i: number) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleActionClick(action)}
                                                            style={{
                                                                fontSize: 11,
                                                                padding: '6px 10px',
                                                                borderRadius: 8,
                                                                border: '1px solid var(--primary)',
                                                                background: 'var(--primary-soft)',
                                                                color: 'var(--primary)',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <ion-icon name="arrow-forward-outline" style={{ fontSize: 11, verticalAlign: 'middle', marginRight: 4 }}></ion-icon>
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: '4px', padding: '0 4px' }}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {showTokens && ` • ${formatTokenCount(estimateTokens(msg.content))} token`}
                                    </span>
                                </div>
                            ))
                        )}

                        {loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div className="chat-bubble assistant" style={{
                                    padding: '10px 14px', borderRadius: '16px', borderBottomLeftRadius: '2px',
                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center'
                                }}>
                                    <span className="dot-typing"></span>
                                    Đang truy xuất tri thức…
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                        <input
                            className="form-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    send();
                                }
                            }}
                            placeholder={trialActive ? 'Hỏi về sản xuất, kho, chính sách, đơn hàng...' : 'Dùng thử đã hết hạn'}
                            disabled={!trialActive || loading}
                            style={{
                                flex: 1, fontSize: 13,
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '10px 14px'
                            }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={send}
                            disabled={!trialActive || loading || !input.trim()}
                            style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '0 18px', borderRadius: '12px' }}
                        >
                            <ion-icon name="send-outline" style={{ fontSize: '16px' }}></ion-icon>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}