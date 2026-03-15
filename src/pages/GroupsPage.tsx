import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamService } from '../services/groupService';
import { useAuth } from '../context/AuthContext';
import type { Team } from '../types/types';


function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const CARD_COLORS = [
    'linear-gradient(135deg, rgba(212,156,87,0.06) 0%, rgba(0,0,0,0) 100%)',
    'linear-gradient(135deg, rgba(140,119,101,0.06) 0%, rgba(0,0,0,0) 100%)',
    'linear-gradient(135deg, rgba(156,92,31,0.06) 0%, rgba(0,0,0,0) 100%)',
];

function cardColor(name: string) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % CARD_COLORS.length;
    return CARD_COLORS[h];
}

export default function GroupsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [hovered, setHovered] = useState<string | null>(null);
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [joinSuccess, setJoinSuccess] = useState('');
    const [joining, setJoining] = useState(false);
    const [createError, setCreateError] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        teamService.getMyTeams()
            .then(data => { setTeams(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setCreating(true);
        setCreateError('');
        try {
            const team = await teamService.create({ name, description: desc });
            setTeams([...teams, team]);
            setShowCreate(false);
            setName(''); setDesc('');
        } catch (e: any) {
            const msg = e?.response?.data?.message
                || e?.response?.data?.error
                || e?.message
                || 'Có lỗi xảy ra khi tạo nhóm';
            setCreateError(msg);
            console.error('Create team error:', e?.response?.status, e?.response?.data || e);
        } finally { setCreating(false); }
    };

    const handleJoinByCode = async () => {
        if (!joinCode.trim() || joinCode.trim().length < 4) {
            setJoinError('Mã mời phải có ít nhất 4 ký tự');
            return;
        }
        setJoining(true);
        setJoinError('');
        setJoinSuccess('');
        try {
            const team = await teamService.joinByCode(joinCode.trim());
            setJoinSuccess(`Đã tham gia nhóm "${team.name}" thành công!`);
            setJoinCode('');
            setTeams(await teamService.getMyTeams());
        } catch (e: any) {
            setJoinError(e?.response?.data?.error || 'Mã mời không hợp lệ');
        } finally {
            setJoining(false);
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}><ion-icon name="sync-outline" style={{ fontSize: '40px' }}></ion-icon></div>
                <p>Đang tải nhóm...</p>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            {/* NEW SELECTION FLOW UI */}
            <div style={{
                textAlign: 'center', marginBottom: 48, marginTop: 20,
                display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Chào mừng bạn trở lại!</h1>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40, maxWidth: 600 }}>
                    Vui lòng chọn vai trò để bắt đầu quản lý công việc và cộng tác cùng đội ngũ của bạn.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, width: '100%', maxWidth: 900 }}>
                    {/* Create Team Card */}
                    <div className="glass-panel hover-lift" style={{ padding: 32, textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.1)',
                            color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, marginBottom: 20
                        }}>
                            <ion-icon name="person-add-outline"></ion-icon>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Tạo nhóm mới</h2>
                        <div style={{ marginBottom: 16 }}>
                            <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                                <ion-icon name="ribbon-outline" style={{ verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Bạn sẽ là Trưởng nhóm
                            </span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
                            Thiết lập không gian làm việc mới, mời các thành viên và bắt đầu phân bổ nhiệm vụ với sự hỗ trợ từ AI.
                        </p>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ width: '100%', padding: '12px', justifyContent: 'center', background: 'var(--accent-gradient)', color: '#1a1410', border: 'none' }}>
                            Bắt đầu tạo nhóm <span style={{ marginLeft: 8 }}>→</span>
                        </button>
                    </div>

                    {/* Join Team Card */}
                    <div className="glass-panel hover-lift" style={{ padding: 32, textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 16, background: 'rgba(212,156,87,0.1)',
                            color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, marginBottom: 20
                        }}>
                            <ion-icon name="log-in-outline"></ion-icon>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Tham gia nhóm</h2>
                        <div style={{ marginBottom: 16 }}>
                            <span style={{ fontSize: 11, background: 'rgba(212,156,87,0.15)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                                <ion-icon name="link-outline" style={{ verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Nhập mã mời để tham gia
                            </span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
                            Kết nối với đồng nghiệp thông qua mã được chia sẻ từ Trưởng nhóm để bắt đầu nhận và cập nhật công việc.
                        </p>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
                                placeholder="Nhập mã mời..."
                                maxLength={6}
                                style={{ padding: '12px 100px 12px 16px', background: 'rgba(0,0,0,0.2)' }}
                            />
                            <button
                                className="btn"
                                onClick={handleJoinByCode}
                                disabled={joining || !joinCode.trim()}
                                style={{
                                    position: 'absolute', right: 6, top: 6, bottom: 6,
                                    padding: '0 16px', fontSize: 13, background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                {joining ? '...' : 'Tham gia →'}
                            </button>
                        </div>
                        {joinError && <div style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}><ion-icon name="warning-outline" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> {joinError}</div>}
                        {joinSuccess && <div style={{ marginTop: 8, fontSize: 12, color: '#34d399' }}>{joinSuccess}</div>}
                    </div>
                </div>

                <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                    <ion-icon name="help-circle-outline"></ion-icon>
                    <span>Bạn cần hỗ trợ? <a href="#" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Tìm hiểu thêm về vai trò</a></span>
                </div>
            </div>

            {/* Existing Teams List Header */}
            {teams.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Nhóm của bạn ({teams.length})</h2>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }}></div>
                </div>
            )}

            {/* Empty state */}
            {teams.length === 0 ? (
                <div className="glass-panel" style={{
                    textAlign: 'center', padding: '80px 40px',
                    borderStyle: 'dashed'
                }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}><ion-icon name="business-outline" style={{ fontSize: '56px' }}></ion-icon></div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Chưa có nhóm nào</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Tạo nhóm đầu tiên hoặc chờ được mời vào nhóm</p>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Tạo nhóm ngay</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {teams.map(t => {
                        const isHov = hovered === t.id;
                        const bg = cardColor(t.name);
                        const isOwner = t.ownerId === user?.id;
                        return (
                            <div key={t.id} className="glass-panel hover-lift"
                                onClick={() => navigate(`/groups/${t.id}`)}
                                onMouseEnter={() => setHovered(t.id)}
                                onMouseLeave={() => setHovered(null)}
                                style={{
                                    border: `1px solid ${isHov ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                }}>
                                {/* Banner màu */}
                                <div style={{
                                    height: 6,
                                    background: bg,
                                }} />

                                <div style={{ padding: '20px 20px 16px' }}>
                                    {/* Title row */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                                        {/* Icon nhóm */}
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: bg,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 20, fontWeight: 700, color: '#fff',
                                            flexShrink: 0,
                                        }}>
                                            {getInitials(t.name)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{
                                                margin: 0, fontSize: 16, fontWeight: 700,
                                                color: 'var(--text-primary)',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {t.name}
                                            </h3>
                                            <p style={{
                                                margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)',
                                                overflow: 'hidden', display: '-webkit-box',
                                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                lineHeight: 1.4
                                            }}>
                                                {t.description || 'Không có mô tả'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

                                    {/* Footer info */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {/* Owner */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 26, height: 26, borderRadius: '50%',
                                                background: 'rgba(212,156,87,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)',
                                            }}>
                                                {getInitials(t.ownerName || '?')}
                                            </div>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {t.ownerName}
                                            </span>
                                        </div>

                                        {/* Right: member count + role */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <ion-icon name="people-outline" style={{ fontSize: '14px' }}></ion-icon> {t.memberCount}
                                            </span>
                                            <span style={{
                                                fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                                                background: isOwner ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                                                color: isOwner ? '#f59e0b' : '#818cf8',
                                            }}>
                                                {isOwner ? <><ion-icon name="shield-outline" style={{ fontSize: '12px' }}></ion-icon> Admin</> : <><ion-icon name="person-outline" style={{ fontSize: '12px' }}></ion-icon> Member</>}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hover arrow hint */}
                                {isHov && (
                                    <div style={{
                                        background: 'rgba(212,156,87,0.08)',
                                        borderTop: '1px solid rgba(212,156,87,0.15)',
                                        padding: '8px 20px',
                                        fontSize: 12, color: 'var(--accent-primary)',
                                        fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
                                    }}>
                                        Xem chi tiết nhóm →
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <h2 style={{ marginBottom: 4 }}><ion-icon name="business-outline" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: 6 }}></ion-icon> Tạo nhóm mới</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Bạn sẽ là Admin của nhóm này.</p>
                        <div className="form-group">
                            <label className="form-label">Tên nhóm *</label>
                            <input className="form-input" value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                placeholder="VD: Xưởng Arabica A" autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mô tả</label>
                            <textarea className="form-input" value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="Mô tả ngắn về nhóm..." rows={3}
                                style={{ resize: 'none' }} />
                        </div>
                        {createError && (
                            <div style={{
                                marginTop: 8, padding: '10px 14px', borderRadius: 8,
                                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                                fontSize: 13, color: '#f87171', lineHeight: 1.4
                            }}>
                                <ion-icon name="warning-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> {createError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn" onClick={() => { setShowCreate(false); setCreateError(''); }}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                                {creating ? 'Đang tạo...' : 'Tạo nhóm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
