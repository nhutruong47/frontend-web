import { useState, useEffect } from 'react';
import { teamService } from '../services/groupService';
import { interGroupOrderService } from '../services/interGroupOrderService';
import type { Team, InterGroupOrder } from '../types/types';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './Marketplace.css';

const TEAM_IMAGES = [
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1620189507195-68309c04c4d0?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=600',
];

export default function MarketplacePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [myTeams, setMyTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Order Modal
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<Team | null>(null);
    const [buyerTeamId, setBuyerTeamId] = useState('');
    const [orderTitle, setOrderTitle] = useState('');
    const [orderDesc, setOrderDesc] = useState('');
    const [orderQty, setOrderQty] = useState(1);
    const [orderDeadline, setOrderDeadline] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Publish Modal
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishTeamId, setPublishTeamId] = useState('');
    const [pubSpecialty, setPubSpecialty] = useState('');
    const [pubCapacity, setPubCapacity] = useState('');
    const [pubRegion, setPubRegion] = useState('');
    const [pubDescription, setPubDescription] = useState('');
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [teamsAll, teamsMine] = await Promise.all([
                    teamService.getAllTeams(),
                    teamService.getMyTeams()
                ]);
                const publishedTeams = teamsAll.filter(t => t.isPublished && t.ownerId !== user?.id);
                setAllTeams(publishedTeams);
                const ownedTeams = teamsMine.filter(t => t.ownerId === user?.id);
                setMyTeams(ownedTeams);
                if (ownedTeams.length > 0) {
                    setBuyerTeamId(ownedTeams[0].id);
                    setPublishTeamId(ownedTeams[0].id);
                }
            } catch (err) {
                console.error("Failed to load marketplace", err);
                setError("Có lỗi xảy ra khi tải dữ liệu thị trường.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleOrderClick = (seller: Team) => {
        if (myTeams.length === 0) {
            alert('Bạn cần sở hữu ít nhất 1 xưởng để đặt hàng!');
            return;
        }
        setSelectedSeller(seller);
        setOrderTitle('');
        setOrderDesc('');
        setOrderQty(1);
        setOrderDeadline('');
        setShowOrderModal(true);
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyerTeamId || !orderTitle || !orderDeadline || !selectedSeller) return;
        try {
            setSubmitting(true);
            const dto: Partial<InterGroupOrder> = {
                buyerTeamId,
                sellerTeamId: selectedSeller.id,
                title: orderTitle,
                description: orderDesc,
                quantity: orderQty,
                deadline: orderDeadline,
            };
            await interGroupOrderService.placeOrder(dto);
            setShowOrderModal(false);
            alert('✅ Đặt hàng thành công! Chuyển sang trang Đơn hàng để theo dõi.');
            navigate('/orders');
        } catch {
            alert('❌ Không thể đặt hàng. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publishTeamId) return;
        try {
            setPublishing(true);
            await teamService.advertise(publishTeamId, {
                specialty: pubSpecialty,
                capacity: pubCapacity,
                region: pubRegion,
                description: pubDescription,
            } as Partial<Team>);
            setShowPublishModal(false);
            alert('✅ Xưởng đã được đăng tải lên thị trường!');
            // Refresh
            const teamsAll = await teamService.getAllTeams();
            setAllTeams(teamsAll.filter(t => t.isPublished && t.ownerId !== user?.id));
        } catch {
            alert('❌ Không thể đăng tải. Vui lòng thử lại.');
        } finally {
            setPublishing(false);
        }
    };

    const handleUnpublish = async (teamId: string) => {
        if (!confirm('Bạn có chắc muốn gỡ xưởng này khỏi thị trường?')) return;
        try {
            await teamService.unpublish(teamId);
            alert('Đã gỡ xưởng khỏi thị trường.');
            const teamsAll = await teamService.getAllTeams();
            setAllTeams(teamsAll.filter(t => t.isPublished && t.ownerId !== user?.id));
        } catch {
            alert('Không thể gỡ xưởng.');
        }
    };

    const displayedTeams = allTeams.filter(team => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return team.name.toLowerCase().includes(q) ||
            (team.specialty || '').toLowerCase().includes(q) ||
            (team.region || '').toLowerCase().includes(q);
    });

    // My published teams
    const myPublishedTeams = myTeams.filter(t => t.isPublished);

    if (loading) {
        return (
            <div className="mp-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="btn-spinner" />
            </div>
        );
    }

    return (
        <div className="mp-body">
            {/* Header */}
            <header className="mp-header">
                <div className="mp-logo">
                    <span style={{ fontSize: '1.3rem' }}>🐋</span> ORCA MARKETPLACE
                </div>
                <div className="mp-actions">
                    <button className="mp-publish-btn" onClick={() => {
                        if (myTeams.length === 0) {
                            alert('Bạn cần tạo ít nhất 1 nhóm xưởng trước khi đăng tải!\nVào Dashboard → Nhóm xưởng → Tạo nhóm mới.');
                            return;
                        }
                        setShowPublishModal(true);
                    }}>
                        📢 Đăng tải xưởng
                    </button>
                    <Link to="/dashboard" className="mp-back-btn">← Dashboard</Link>
                </div>
            </header>

            {/* Hero */}
            <section className="mp-hero">
                <div className="mp-hero-content">
                    <h1>Thị trường Gia công<br />Cà Phê Chuyên Nghiệp</h1>
                    <p>Kết nối với các xưởng gia công cà phê uy tín. Đặt hàng trực tiếp, theo dõi đơn hàng real-time.</p>
                    <div className="mp-hero-stats">
                        <div className="mp-hero-stat">
                            <span className="stat-num">{allTeams.length}</span>
                            <span className="stat-label">Xưởng đang hoạt động</span>
                        </div>
                        <div className="mp-hero-stat">
                            <span className="stat-num">24/7</span>
                            <span className="stat-label">Hỗ trợ đặt hàng</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Search */}
            <div className="mp-search-section">
                <div className="mp-search-wrapper">
                    <span className="mp-search-icon">🔍</span>
                    <input
                        type="text"
                        className="mp-search-input"
                        placeholder="Tìm xưởng theo tên, chuyên môn, khu vực..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <span className="mp-result-count">{displayedTeams.length} xưởng</span>
            </div>

            {/* My Published Section */}
            {myPublishedTeams.length > 0 && (
                <section className="mp-my-published">
                    <h3>📌 Xưởng của bạn trên thị trường</h3>
                    <div className="mp-my-published-list">
                        {myPublishedTeams.map(t => (
                            <div key={t.id} className="mp-my-pub-item">
                                <div>
                                    <strong>{t.name}</strong>
                                    <span className="mp-pub-badge">Đang hiển thị</span>
                                </div>
                                <button className="mp-unpub-btn" onClick={() => handleUnpublish(t.id)}>Gỡ xuống</button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Teams Grid */}
            <section className="mp-section">
                <div className="mp-section-header">
                    <h2>🏭 Danh sách Xưởng Gia công</h2>
                </div>

                {error && <div className="mp-error">{error}</div>}

                {displayedTeams.length === 0 && !error ? (
                    <div className="mp-empty">
                        <span style={{ fontSize: '3rem' }}>🏪</span>
                        <h3>Chưa có xưởng nào trên thị trường</h3>
                        <p>Hãy là người đầu tiên đăng tải xưởng của bạn lên!</p>
                        {myTeams.length > 0 && (
                            <button className="mp-publish-btn" style={{ marginTop: '1rem' }} onClick={() => setShowPublishModal(true)}>
                                📢 Đăng tải xưởng ngay
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="mp-grid">
                        {displayedTeams.map((team, index) => (
                            <div key={team.id} className="mp-card">
                                <div className="mp-card-img-wrapper">
                                    <img src={TEAM_IMAGES[index % TEAM_IMAGES.length]} alt={team.name} className="mp-card-img" />
                                    <div className="mp-card-overlay">
                                        {team.trustScore !== undefined && team.trustScore !== null && (
                                            <span className={`mp-trust-badge ${(team.trustScore ?? 100) >= 80 ? 'high' : (team.trustScore ?? 100) >= 50 ? 'mid' : 'low'}`}>
                                                {(team.trustScore ?? 100) >= 80 ? '✅' : '⚠️'} {team.trustScore}% Uy tín
                                            </span>
                                        )}
                                        <span className="mp-member-badge">👥 {team.memberCount || 0}</span>
                                    </div>
                                </div>
                                <div className="mp-card-content">
                                    <h3 className="mp-card-title">{team.name}</h3>
                                    <div className="mp-card-meta">
                                        {team.region && <span>📍 {team.region}</span>}
                                        {team.specialty && <span>☕ {team.specialty}</span>}
                                        {team.capacity && <span>⚡ {team.capacity}</span>}
                                    </div>
                                    <p className="mp-card-desc">
                                        {team.description || 'Xưởng gia công cà phê chuyên nghiệp.'}
                                    </p>
                                    {team.completedOrders !== undefined && team.completedOrders > 0 && (
                                        <div className="mp-card-orders">
                                            ✅ {team.completedOrders} đơn hoàn thành
                                        </div>
                                    )}
                                    <div className="mp-card-actions">
                                        <button className="mp-order-btn" onClick={() => handleOrderClick(team)}>
                                            📦 Đặt hàng
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer className="mp-footer">
                <p>© 2026 ORCA Marketplace — Nền tảng Gia công Cà Phê Thông minh</p>
            </footer>

            {/* Order Modal */}
            {showOrderModal && selectedSeller && (
                <div className="mp-modal-overlay" onClick={() => setShowOrderModal(false)}>
                    <div className="mp-modal" onClick={e => e.stopPropagation()}>
                        <div className="mp-modal-header">
                            <h2>📦 Đặt đơn hàng</h2>
                            <button className="mp-modal-close" onClick={() => setShowOrderModal(false)}>×</button>
                        </div>
                        <div className="mp-modal-seller">
                            Đặt hàng tại: <strong>{selectedSeller.name}</strong>
                        </div>
                        <form onSubmit={handleSubmitOrder}>
                            <div className="mp-form-group">
                                <label>Từ xưởng của bạn</label>
                                <select value={buyerTeamId} onChange={e => setBuyerTeamId(e.target.value)} required>
                                    {myTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mp-form-group">
                                <label>Tiêu đề đơn hàng</label>
                                <input type="text" placeholder="VD: Gia công 500kg cà phê Arabica" value={orderTitle} onChange={e => setOrderTitle(e.target.value)} required />
                            </div>
                            <div className="mp-form-group">
                                <label>Mô tả chi tiết</label>
                                <textarea rows={3} placeholder="Yêu cầu cụ thể, quy cách, lưu ý..." value={orderDesc} onChange={e => setOrderDesc(e.target.value)} />
                            </div>
                            <div className="mp-form-row">
                                <div className="mp-form-group">
                                    <label>Số lượng</label>
                                    <input type="number" min="1" value={orderQty} onChange={e => setOrderQty(parseInt(e.target.value) || 1)} required />
                                </div>
                                <div className="mp-form-group">
                                    <label>Hạn chót</label>
                                    <input type="datetime-local" value={orderDeadline} onChange={e => setOrderDeadline(e.target.value)} required />
                                </div>
                            </div>
                            <div className="mp-modal-actions">
                                <button type="button" className="mp-cancel-btn" onClick={() => setShowOrderModal(false)}>Hủy</button>
                                <button type="submit" className="mp-submit-btn" disabled={submitting}>
                                    {submitting ? 'Đang gửi...' : '📦 Gửi đơn hàng'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Publish Modal */}
            {showPublishModal && (
                <div className="mp-modal-overlay" onClick={() => setShowPublishModal(false)}>
                    <div className="mp-modal" onClick={e => e.stopPropagation()}>
                        <div className="mp-modal-header">
                            <h2>📢 Đăng tải xưởng lên thị trường</h2>
                            <button className="mp-modal-close" onClick={() => setShowPublishModal(false)}>×</button>
                        </div>
                        <form onSubmit={handlePublish}>
                            <div className="mp-form-group">
                                <label>Chọn xưởng muốn đăng</label>
                                <select value={publishTeamId} onChange={e => setPublishTeamId(e.target.value)} required>
                                    {myTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.isPublished ? '(Đã đăng)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mp-form-group">
                                <label>Chuyên môn</label>
                                <input type="text" placeholder="VD: Arabica & Robusta Blend, Fine Robusta..." value={pubSpecialty} onChange={e => setPubSpecialty(e.target.value)} />
                            </div>
                            <div className="mp-form-group">
                                <label>Năng suất</label>
                                <input type="text" placeholder="VD: > 500kg/ngày, 100-500kg/ngày..." value={pubCapacity} onChange={e => setPubCapacity(e.target.value)} />
                            </div>
                            <div className="mp-form-group">
                                <label>Khu vực</label>
                                <input type="text" placeholder="VD: Tây Nguyên, Đông Nam Bộ..." value={pubRegion} onChange={e => setPubRegion(e.target.value)} />
                            </div>
                            <div className="mp-form-group">
                                <label>Mô tả xưởng</label>
                                <textarea rows={3} placeholder="Giới thiệu ngắn về xưởng, dịch vụ, thế mạnh..." value={pubDescription} onChange={e => setPubDescription(e.target.value)} />
                            </div>
                            <div className="mp-modal-actions">
                                <button type="button" className="mp-cancel-btn" onClick={() => setShowPublishModal(false)}>Hủy</button>
                                <button type="submit" className="mp-submit-btn" disabled={publishing}>
                                    {publishing ? 'Đang đăng...' : '📢 Đăng tải ngay'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
