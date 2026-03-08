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
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title"><ion-icon name="business-outline" style={{ fontSize: '22px', verticalAlign: 'middle', marginRight: 8 }}></ion-icon> Nhóm xưởng</h1>
                    <p className="page-subtitle">Bạn đang trong <strong>{teams.length}</strong> nhóm làm việc</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
                    <span style={{ fontSize: 18 }}>+</span> Tạo nhóm mới
                </button>
            </div>

            {/* === JOIN BY INVITE CODE === */}
            <div className="glass-panel" style={{
                background: 'linear-gradient(135deg, rgba(212,156,87,0.1) 0%, rgba(0,0,0,0.2) 100%)',
                padding: '16px 20px', marginBottom: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span className="icon-container glow" style={{ width: 36, height: 36, fontSize: 20 }}><ion-icon name="key-outline"></ion-icon></span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Tham gia bằng mã mời</h3>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>Nhập mã 6 ký tự từ trưởng nhóm để tham gia</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        className="form-input"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
                        placeholder="VD: AB12CD"
                        maxLength={6}
                        style={{
                            flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: 6, textAlign: 'center',
                            textTransform: 'uppercase',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleJoinByCode}
                        disabled={joining || !joinCode.trim()}
                        style={{ whiteSpace: 'nowrap', padding: '8px 18px', background: 'var(--accent-gradient)', color: '#1a1410', border: 'none', fontWeight: 600 }}
                    >
                        {joining ? 'Đang tham gia...' : 'Tham gia'}
                    </button>
                </div>
                {joinError && <div style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}><ion-icon name="warning-outline" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> {joinError}</div>}
                {joinSuccess && <div style={{ marginTop: 8, fontSize: 12, color: '#34d399' }}>{joinSuccess}</div>}
            </div>

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
