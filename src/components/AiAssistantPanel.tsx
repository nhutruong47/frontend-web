import { useState } from 'react';
import { aiService } from '../services/groupService';
import type { AiParseResult } from '../services/groupService';

interface AiAssistantPanelProps {
    onCreateGoal?: (result: AiParseResult) => void;
    trialActive: boolean;
    trialDays: number;
}

export default function AiAssistantPanel({ onCreateGoal, trialActive, trialDays }: AiAssistantPanelProps) {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<AiParseResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleParse = async () => {
        if (!input.trim() || !trialActive) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await aiService.parseText(input);
            setResult(res);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Lỗi kết nối AI. Hãy thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const priorityInfo: Record<string, { label: string; color: string; icon: string }> = {
        high: { label: 'Cao', color: '#ef4444', icon: '🔴' },
        medium: { label: 'Trung bình', color: '#f59e0b', icon: '🟡' },
        low: { label: 'Thấp', color: '#22c55e', icon: '🟢' },
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 100%)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 20,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>🤖</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Trợ lý AI
                    </h3>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                        Gõ yêu cầu bằng ngôn ngữ tự nhiên — AI sẽ phân tích ngay lập tức
                    </p>
                </div>
                {trialActive ? (
                    <span style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 600 }}>
                        ✅ Còn {trialDays} ngày
                    </span>
                ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }}>
                        ❌ Hết hạn
                    </span>
                )}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                    className="form-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleParse()}
                    placeholder='VD: "Rang gấp 200kg cà phê Robusta trước thứ 6 tuần này"'
                    disabled={!trialActive || loading}
                    style={{
                        flex: 1, fontSize: 13,
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(99,102,241,0.3)',
                    }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleParse}
                    disabled={!trialActive || loading || !input.trim()}
                    style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '8px 18px' }}
                >
                    {loading ? '⏳ Đang phân tích...' : '🔍 Phân tích'}
                </button>
            </div>

            {error && (
                <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: result.source === 'gemini' ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)', color: result.source === 'gemini' ? '#818cf8' : '#f59e0b', fontWeight: 700 }}>
                            {result.source === 'gemini' ? '🧠 Gemini AI' : '🔧 Regex'}
                        </span>
                        {result.needsClarification && (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}>
                                ⚠️ Cần bổ sung thông tin
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                        <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>📝 Tiêu đề</span>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{result.title || '—'}</div>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>📦 Khối lượng</span>
                            <div style={{ fontWeight: 600, color: '#60a5fa', marginTop: 2 }}>{result.quantity || 'Chưa xác định'}</div>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>⏰ Hạn chót</span>
                            <div style={{ fontWeight: 600, color: '#f87171', marginTop: 2 }}>{result.deadline || 'Chưa xác định'}</div>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>🎯 Ưu tiên</span>
                            <div style={{ fontWeight: 600, color: priorityInfo[result.priority]?.color || '#f59e0b', marginTop: 2 }}>
                                {priorityInfo[result.priority]?.icon} {priorityInfo[result.priority]?.label || result.priority}
                            </div>
                        </div>
                    </div>

                    {result.description && (
                        <div style={{ marginTop: 10, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            💬 {result.description}
                        </div>
                    )}

                    {onCreateGoal && !result.needsClarification && (
                        <button
                            className="btn btn-primary"
                            onClick={() => onCreateGoal(result)}
                            style={{ marginTop: 14, width: '100%', fontSize: 13, padding: '10px 0' }}
                        >
                            🚀 Tạo mục tiêu từ kết quả AI
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
