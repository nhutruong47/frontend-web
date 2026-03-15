import { useState, useRef, useEffect } from 'react';
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

    const [team, setTeam] = useState<Team | null>(null);
    const [category, setCategory] = useState('Rang xay');
    const [priority, setPriority] = useState('Trung bình');

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [trialActive, setTrialActive] = useState(true);
    const [trialDays, setTrialDays] = useState(30);

    const [previewResult, setPreviewResult] = useState<AiParseResult | null>(null);
    const [isEditingPreview, setIsEditingPreview] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescriptionList, setEditDescriptionList] = useState<string[]>([]);
    const [editDeadline, setEditDeadline] = useState('');
    const [editPriority, setEditPriority] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!teamId) return;
        teamService.getDetail(teamId).then(setTeam).catch(() => { });
        getTrialStatus().then(s => { setTrialActive(s.aiTrialActive); setTrialDays(s.daysRemaining); }).catch(() => { });
    }, [teamId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

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
            const res = await aiService.parseText(userMsg.content, teamId || '');

            const aiMsg: ChatMessage = {
                id: Date.now().toString() + '-ai',
                role: 'assistant',
                content: res.description || 'Tôi đã phân tích yêu cầu của bạn. Vui lòng xác nhận tạo mục tiêu bên dưới.',
                result: res,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);

            if (!res.needsClarification && res.title) {
                // Show preview panel automatically
                setPreviewResult(res);
                setIsEditingPreview(false);
                setEditTitle(res.title || '');
                // Try splitting by common punctuation for bullets
                let bulletItems = res.description ? res.description.split(/(?=\s*- |\s*• )|\.\s+|;\s+/).map(s => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean) : [userMsg.content];
                if (bulletItems.length === 0) bulletItems = [userMsg.content];
                setEditDescriptionList(bulletItems);
                setEditDeadline(res.deadline || '');
                setEditPriority(res.priority || 'Medium');
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
                chatLog: JSON.stringify(messages)
            } as any);
            
            // Navigate back to group after creating
            navigate(`/groups/${teamId}`);
        } catch (e: any) {
            const errorMsg: ChatMessage = {
                id: Date.now().toString() + '-err',
                role: 'assistant',
                content: e?.response?.data?.error || 'Không thể tạo mục tiêu',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
            setLoading(false);
        }
    };

    const renderPreviewPanel = () => {
        if (!previewResult) return null;

        // Group tasks by assignee for the UI
        const assigneeMap = new Map<string, { workload: number, tasks: any[] }>();
        if (previewResult.tasks) {
            previewResult.tasks.forEach(t => {
                const assignee = t.suggestedAssignee || 'Chưa phân công';
                if (!assigneeMap.has(assignee)) {
                    assigneeMap.set(assignee, { workload: 0, tasks: [] });
                }
                const data = assigneeMap.get(assignee)!;
                data.workload += t.workload || 0;
                data.tasks.push(t);
            });
        }
        const assigneesList = Array.from(assigneeMap.entries()).map(([name, data]) => ({ name, ...data }));
        const totalWorkload = assigneesList.reduce((sum, a) => sum + a.workload, 0) || 1; // avoid div by 0

        const renderTaskList = () => {
            if (!previewResult.tasks || previewResult.tasks.length === 0) return null;
            return (
                <div style={{ marginBottom: 32, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <ion-icon name="list-outline" style={{ color: '#6366f1', fontSize: 20 }}></ion-icon>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Danh sách nhiệm vụ chi tiết ({previewResult.tasks.length})</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {previewResult.tasks.map((task, i) => (
                            <div key={i} style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                    <div style={{ minWidth: 28, height: 28, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                        {i+1}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{task.title}</div>
                                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{task.description}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Phân công</div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{task.suggestedAssignee || '—'}</div>
                                    </div>
                                    <div style={{ background: '#eef2ff', color: '#6366f1', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                                        {task.workload}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        const renderAssignments = () => {
            if (assigneesList.length === 0) return null;
            return (
                <div style={{ marginTop: 24, paddingBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <ion-icon name="flash" style={{ color: '#d97706', fontSize: 20 }}></ion-icon>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Tổng hợp phân bổ nhân sự</h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                        {assigneesList.map((assignee, idx) => {
                            const ratio = Math.min(100, Math.round((assignee.workload / totalWorkload) * 100));
                            // Simple mock matching scores & roles based on index for demo purposes
                            const matchingScore = [88, 75, 92, 64][idx % 4];
                            const roles = ['Chuyên viên', 'Vận hành', 'Kiểm soát chất lượng', 'Bảo trì'];
                            const reason = assignee.tasks.map(t => t.title).join(', ');
                            
                            return (
                                <div key={idx} style={{ minWidth: 260, flexShrink: 0, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                                                {assignee.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 2 }}>{assignee.name}</div>
                                                <div style={{ fontSize: 12, color: '#64748b' }}>{roles[idx % roles.length]}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{matchingScore}%</div>
                                    </div>
                                    
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, fontWeight: 600, color: '#8b5cf6', marginBottom: 6 }}>
                                            Khối lượng {ratio}%
                                        </div>
                                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${ratio}%`, background: '#8b5cf6', borderRadius: 3 }}></div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
                                        "Phù hợp nhất để phụ trách: {reason}"
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Add Member Mock Card */}
                        <div style={{ minWidth: 220, flexShrink: 0, borderRadius: 12, border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s', minHeight: 180 }}>
                            <ion-icon name="add" style={{ fontSize: 24, marginBottom: 8 }}></ion-icon>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Thêm thành viên</span>
                        </div>
                    </div>
                </div>
            );
        };

        if (isEditingPreview) {
            return (
                <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    {/* Header */}
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Xem trước công việc</h2>
                                <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 4 }}>Xem lại chi tiết công việc và phân bổ nhân sự trước khi xác nhận.</p>
                            </div>
                            <div style={{ background: '#e0e7ff', color: '#6366f1', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ion-icon name="checkmark-outline"></ion-icon> AI ĐÃ XỬ LÝ
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                                <span style={{ fontSize: 20, color: '#94a3b8' }}><ion-icon name="clipboard-outline"></ion-icon></span>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Công việc đã chuẩn hóa</h3>
                            </div>

                            {/* Form Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'start', marginBottom: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', paddingTop: 10 }}>Tên công việc</div>
                                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'start', marginBottom: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', paddingTop: 10 }}>Chi tiết mô tả</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {editDescriptionList.map((desc, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }}></div>
                                            <input type="text" value={desc} onChange={e => {
                                                const newList = [...editDescriptionList];
                                                newList[idx] = e.target.value;
                                                setEditDescriptionList(newList);
                                            }} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }} />
                                            <button onClick={() => setEditDescriptionList(editDescriptionList.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ion-icon name="close-outline" style={{ fontSize: 20 }}></ion-icon>
                                            </button>
                                        </div>
                                    ))}
                                    <div>
                                        <button onClick={() => setEditDescriptionList([...editDescriptionList, ''])} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#8b5cf6', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <ion-icon name="add-outline"></ion-icon> Thêm mục
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Hạn chót</div>
                                <div style={{ position: 'relative', width: 'fit-content' }}>
                                    <input type="text" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} style={{ width: 250, padding: '10px 14px', paddingRight: 40, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }} />
                                    <ion-icon name="calendar-outline" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}></ion-icon>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'center', marginBottom: 32 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Ưu tiên</div>
                                <div style={{ display: 'flex', width: 300, borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    {['Low', 'Medium', 'High'].map(level => {
                                        const isSelected = editPriority.toLowerCase() === level.toLowerCase() || 
                                                          (editPriority === 'Trung bình' && level === 'Medium') ||
                                                          (editPriority === 'Thấp' && level === 'Low') ||
                                                          (editPriority === 'Cao' && level === 'High');
                                        return (
                                            <button
                                                key={level}
                                                onClick={() => setEditPriority(level)}
                                                style={{
                                                    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
                                                    background: isSelected ? '#8b5cf6' : '#fff',
                                                    color: isSelected ? '#fff' : '#64748b',
                                                    border: 'none', borderRight: level !== 'High' ? '1px solid #e2e8f0' : 'none',
                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                {level}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button onClick={() => { setIsEditingPreview(false); }} style={{ padding: '10px 24px', background: '#fff', border: '1px solid #cbd5e1', color: '#64748b', fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}>
                                    Hủy
                                </button>
                                <button onClick={() => { 
                                    setIsEditingPreview(false); 
                                    setPreviewResult({...previewResult, title: editTitle, description: editDescriptionList.filter(Boolean).join('; '), deadline: editDeadline, priority: editPriority}); 
                                }} style={{ padding: '10px 24px', background: '#6366f1', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}>
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>

                        {renderTaskList()}
                        {renderAssignments()}

                    </div>
                </div>
            );
        }

        // READ ONLY MODE
        return (
            <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Xem trước công việc</h2>
                            <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 4 }}>Xem lại chi tiết công việc và phân bổ nhân sự trước khi xác nhận.</p>
                        </div>
                        <div style={{ background: '#e0e7ff', color: '#6366f1', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ion-icon name="checkmark-outline"></ion-icon> AI ĐÃ XỬ LÝ
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20, color: '#94a3b8' }}><ion-icon name="clipboard-outline"></ion-icon></span>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Công việc đã chuẩn hóa</h3>
                            </div>
                            <button onClick={() => {
                                setIsEditingPreview(true);
                                setEditTitle(previewResult.title || '');
                                setEditDescriptionList(previewResult.description ? previewResult.description.split('; ').filter(Boolean) : []);
                                setEditDeadline(previewResult.deadline || '');
                                setEditPriority(previewResult.priority || 'Medium');
                            }} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: 4, display: 'flex' }}>
                                <ion-icon name="pencil" style={{ fontSize: 18 }}></ion-icon>
                            </button>
                        </div>

                        {/* Meta values */}
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
                            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Tên công việc</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{previewResult.title || '—'}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
                            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Mô tả</div>
                            <div style={{ fontSize: 14, color: '#475569', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.5 }}>
                                {previewResult.description ? previewResult.description.split('; ').map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ color: '#94a3b8', marginTop: 2 }}>•</div>
                                        <div>{item}</div>
                                    </div>
                                )) : '—'}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Hạn chót</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ion-icon name="calendar-outline" style={{ color: '#8b5cf6' }}></ion-icon> {previewResult.deadline || 'Chưa xác định'}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Ưu tiên</div>
                            <div>
                                <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                                    {previewResult.priority || 'MEDIUM'}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center', marginBottom: 32 }}>
                            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Kỹ năng</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['VẬN HÀNH MÁY SẤY', 'KIỂM SOÁT CHẤT LƯỢNG', 'AN TOÀN LAO ĐỘNG'].map(skill => (
                                    <span key={skill} style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700 }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button onClick={() => setPreviewResult(null)} style={{ padding: '10px 24px', background: '#e11d48', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}>
                                Từ chối
                            </button>
                            <button onClick={() => handleCreateGoal(previewResult)} style={{ padding: '10px 24px', background: '#6366f1', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ion-icon name="checkmark-outline"></ion-icon> Phê duyệt
                            </button>
                        </div>
                    </div>
                    {renderTaskList()}
                    {renderAssignments()}
                </div>
            </div>
        );
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
            padding: '32px 48px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Navigation Header */}
            <div style={{ marginBottom: 32 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32, alignItems: 'start' }}>
                
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
                </div>

                {/* Right Panel: AI Chat interface OR Preview */}
                {previewResult ? renderPreviewPanel() : (
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column',
                    height: 'calc(100vh - 180px)', // Fill remaining viewport height
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
                                <ion-icon name="sparkles"></ion-icon>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>AI Xử Lý Công Việc</h3>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Mô tả mục tiêu một cách tự nhiên</p>
                            </div>
                        </div>
                        <button style={{ background: 'none', border: 'none', color: '#8b5cf6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ion-icon name="book-outline"></ion-icon> Xem ví dụ
                        </button>
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
                                }}>
                                    <div style={{
                                        maxWidth: '75%',
                                        padding: '14px 18px',
                                        borderRadius: '20px',
                                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
                                        borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '20px',
                                        background: msg.role === 'user' ? '#8b5cf6' : '#f1f5f9',
                                        color: msg.role === 'user' ? '#fff' : '#334155',
                                        fontSize: '15px',
                                        lineHeight: '1.6',
                                    }}>
                                        {msg.content}
                                    </div>

                                    {/* AI Parsed Result UI Container */}
                                    {msg.result && (
                                        <div style={{
                                            marginTop: '12px',
                                            width: '100%',
                                            maxWidth: '75%',
                                            background: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '16px',
                                            padding: '20px',
                                            alignSelf: 'flex-start',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: 14 }}>
                                                <div>
                                                    <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tiêu đề</span>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', marginTop: 4 }}>{msg.result.title || '—'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Khối lượng</span>
                                                    <div style={{ fontWeight: 600, color: '#3b82f6', marginTop: 4 }}>{msg.result.quantity || '—'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Hạn chót</span>
                                                    <div style={{ fontWeight: 600, color: '#ef4444', marginTop: 4 }}>{msg.result.deadline || '—'}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mức ưu tiên</span>
                                                    <div style={{ fontWeight: 600, color: '#f59e0b', marginTop: 4 }}>{priority}</div>
                                                </div>
                                            </div>

                                            {!msg.result.needsClarification && (
                                                <button
                                                    onClick={() => handleCreateGoal(msg.result!)}
                                                    style={{
                                                        marginTop: 20, width: '100%', padding: '12px',
                                                        background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                                                        color: '#8b5cf6', fontWeight: 700, fontSize: 14, borderRadius: 10,
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <ion-icon name="checkmark-circle-outline" style={{ fontSize: '18px' }}></ion-icon> Xác nhận & Tạo Công Việc
                                                </button>
                                            )}
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
                )}
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
            `}</style>
        </div>
    );
}
