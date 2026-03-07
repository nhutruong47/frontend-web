import { useState, useEffect } from 'react';
import { teamService } from '../services/groupService';
import { interGroupOrderService } from '../services/interGroupOrderService';
import type { Team, InterGroupOrder } from '../types/types';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Marketplace.css';

const MOCK_IMAGES = [
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1620189507195-68309c04c4d0?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=600'
];

export default function MarketplacePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [myTeams, setMyTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedSeller, setSelectedSeller] = useState<Team | null>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRegion, setFilterRegion] = useState('All');
    const [filterSpecialty, setFilterSpecialty] = useState('All');
    const [filterCapacity, setFilterCapacity] = useState('All');

    // Form state
    const [buyerTeamId, setBuyerTeamId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [deadline, setDeadline] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [teamsAll, teamsMine] = await Promise.all([
                    teamService.getAllTeams(),
                    teamService.getMyTeams()
                ]);

                // Exclude teams the user owns from the marketplace list (can't order from yourself)
                const filteredAll = teamsAll.filter(t => t.ownerId !== user?.id);
                setAllTeams(filteredAll);

                // Only teams the user owns can place outbound orders
                const ownedTeams = teamsMine.filter(t => t.ownerId === user?.id);
                setMyTeams(ownedTeams);

                if (ownedTeams.length > 0) {
                    setBuyerTeamId(ownedTeams[0].id);
                }
            } catch (err) {
                console.error("Failed to load marketplace data", err);
                setError("Có lỗi xảy ra khi tải danh sách xưởng.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handlePlaceOrderClick = (seller: Team) => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (myTeams.length === 0) {
            alert('Bạn phải là Chủ của ít nhất một Xưởng để có thể đi đặt hàng!');
            return;
        }
        setSelectedSeller(seller);
        setShowOrderModal(true);
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyerTeamId || !title || !quantity || !deadline || !selectedSeller) return;

        try {
            setSubmitting(true);
            const dto: Partial<InterGroupOrder> = {
                buyerTeamId,
                sellerTeamId: selectedSeller.id,
                title,
                description,
                quantity,
                deadline
            };
            await interGroupOrderService.placeOrder(dto);
            setShowOrderModal(false);
            alert('Đặt hàng thành công! Vui lòng vào mục "Đơn hàng" để theo dõi.');
            navigate('/orders');
        } catch (err) {
            console.error("Order failed", err);
            alert('Không thể đặt hàng. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const displayedTeams = allTeams.filter(team => {
        // Search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchName = team.name.toLowerCase().includes(query);
            const matchSpecialty = (team.specialty || '').toLowerCase().includes(query);
            if (!matchName && !matchSpecialty) return false;
        }

        // Region
        if (filterRegion !== 'All' && team.region !== filterRegion) return false;

        // Specialty
        if (filterSpecialty !== 'All' && team.specialty !== filterSpecialty) return false;

        // Capacity
        if (filterCapacity !== 'All' && team.capacity !== filterCapacity) return false;

        return true;
    });

    if (loading) return <div className="marketplace-body" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', height: '100vh', justifyContent: 'center' }}><div className="btn-spinner"></div></div>;

    return (
        <div className="marketplace-body">
            {/* Header */}
            <header className="mp-header">
                <div className="mp-logo">
                    <span style={{ fontSize: '1.4rem' }}>🏭</span> ORCA MARKETPLACE
                </div>
                <nav className="mp-nav">
                    <a href="#home">Home</a>
                    <a href="#marketplace" className="active">Marketplace</a>
                    <a href="#services">Services</a>
                    <a href="#partners">Partners</a>
                </nav>
                <div className="mp-actions">
                    <div className="mp-search-btn">
                        <span>🔍</span> Search workshops...
                    </div>
                    {user ? (
                        <Link to="/dashboard" className="mp-login-btn" style={{ background: '#222', color: '#fff' }}>Dashboard</Link>
                    ) : (
                        <Link to="/login" className="mp-login-btn">Login</Link>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="mp-hero">
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '300px', height: '500px', border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: '24px', zIndex: 1, pointerEvents: 'none'
                }}></div>
                <h1>Hệ thống Đối tác Gia công<br />Chuyên nghiệp</h1>
                <p>Kết nối các nhà rang xay cà phê cao cấp và các cơ sở sản xuất công suất lớn trên toàn cầu.</p>
                <div className="mp-hero-buttons">
                    <button className="mp-btn-primary" onClick={() => document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' })}>Explore Marketplace</button>
                    <button className="mp-btn-secondary" onClick={() => navigate('/dashboard')}>Register Factory</button>
                </div>
            </section>

            {/* Filter Bar */}
            <div className="mp-filter-bar">
                <div className="mp-filter-group" style={{ flex: 2 }}>
                    <span className="mp-filter-label">Search Workshop</span>
                    <input
                        type="text"
                        className="mp-filter-input"
                        placeholder="🔍 Search by name, specialty, or service..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="mp-filter-group">
                    <span className="mp-filter-label">Region</span>
                    <select className="mp-filter-select" value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
                        <option value="All">All Regions</option>
                        <option value="Central Highlands">Central Highlands (Tây Nguyên)</option>
                        <option value="North West">North West (Tây Bắc)</option>
                        <option value="South East">South East (Đông Nam Bộ)</option>
                        <option value="Mekong Delta">Mekong Delta (ĐBSCL)</option>
                    </select>
                </div>
                <div className="mp-filter-group">
                    <span className="mp-filter-label">Specialty</span>
                    <select className="mp-filter-select" value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}>
                        <option value="All">All Specialties</option>
                        <option value="Arabica & Robusta Blend">Arabica & Robusta Blend</option>
                        <option value="Fine Robusta">Fine Robusta</option>
                        <option value="Specialty Arabica">Specialty Arabica</option>
                    </select>
                </div>
                <div className="mp-filter-group">
                    <span className="mp-filter-label">Capacity</span>
                    <select className="mp-filter-select" value={filterCapacity} onChange={e => setFilterCapacity(e.target.value)}>
                        <option value="All">All Capacities</option>
                        <option value="> 500kg/day">{'> 500kg/day'}</option>
                        <option value="100 - 500kg/day">{'100 - 500kg/day'}</option>
                        <option value="< 100kg/day">{'< 100kg/day'}</option>
                    </select>
                </div>
            </div>

            {/* Featured Workshops */}
            <section className="mp-section" id="marketplace">
                <div className="mp-section-header">
                    <h2 className="mp-section-title">Featured Workshops</h2>
                    <a href="#all" className="mp-link">View all partners ➔</a>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

                {displayedTeams.length === 0 && !error ? (
                    <div style={{ textAlign: 'center', padding: '4rem', background: '#1a1a1a', borderRadius: '12px', color: '#888' }}>
                        Không có xưởng nào phù hợp với điều kiện tìm kiếm.
                    </div>
                ) : (
                    <div className="mp-grid">
                        {displayedTeams.map((team, index) => {
                            const imgUrl = MOCK_IMAGES[index % MOCK_IMAGES.length];
                            return (
                                <div key={team.id} className="mp-card">
                                    <div className="mp-card-img-wrapper">
                                        <img src={imgUrl} alt={team.name} className="mp-card-img" />
                                        <div className="mp-card-badges">
                                            {team.capacity && <span className="mp-badge mp-badge-green">{team.capacity}</span>}
                                            {index % 2 === 0 && <span className="mp-badge mp-badge-orange">CERTIFIED QUALITY</span>}
                                        </div>
                                    </div>
                                    <div className="mp-card-content">
                                        <div className="mp-card-header">
                                            <h3 className="mp-card-title">{team.name}</h3>
                                            <div className="mp-card-rating" style={{
                                                color: (team.trustScore ?? 100) >= 80 ? '#34d399' : (team.trustScore ?? 100) >= 50 ? '#fbbf24' : '#f87171'
                                            }}>
                                                {(team.trustScore ?? 100) >= 80 ? '✅' : (team.trustScore ?? 100) >= 50 ? '⚠️' : '🚫'} {team.trustScore ?? 100}% Uy tín
                                            </div>
                                        </div>
                                        <div className="mp-card-location">
                                            📍 {team.region || 'Vietnam'} • {team.memberCount} members • {team.completedOrders ?? 0} đơn hoàn thành
                                        </div>
                                        <p className="mp-card-desc">
                                            {team.description || `Cơ sở gia công hiện đại, chuyên gia công ${team.specialty || 'các dòng cà phê'}.`}
                                        </p>
                                        <div className="mp-card-tags">
                                            {team.specialty && <span className="mp-card-tag" style={{ background: 'rgba(88,166,255,0.12)', color: '#58a6ff' }}>{team.specialty}</span>}
                                            <span className="mp-card-tag">ROASTING</span>
                                            <span className="mp-card-tag">PACKING</span>
                                        </div>
                                        <div className="mp-card-actions">
                                            <button className="mp-btn-outline">View Profile</button>
                                            <button className="mp-btn-solid" onClick={() => handlePlaceOrderClick(team)}>Contact Now</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Stats Section */}
            <section className="mp-stats">
                <div>
                    <div className="mp-stat-number">{allTeams.length > 0 ? allTeams.length * 15 : '150'}+</div>
                    <div className="mp-stat-label">Active Factories</div>
                </div>
                <div>
                    <div className="mp-stat-number">50,000</div>
                    <div className="mp-stat-label">Tons Produced / Year</div>
                </div>
                <div>
                    <div className="mp-stat-number">24/7</div>
                    <div className="mp-stat-label">Operational Support</div>
                </div>
                <div>
                    <div className="mp-stat-number">12</div>
                    <div className="mp-stat-label">Regions Covered</div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mp-footer">
                <div className="mp-footer-grid">
                    <div className="mp-footer-col">
                        <div className="mp-logo" style={{ marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>🏭</span> ORCA
                        </div>
                        <p>The world's leading platform for coffee manufacturing and factory partnerships. Precision, quality, and scale.</p>
                        <div className="mp-social-icons">
                            <a href="#1" className="mp-social-icon">IN</a>
                            <a href="#2" className="mp-social-icon">FB</a>
                        </div>
                    </div>
                    <div className="mp-footer-col">
                        <h4>Platform</h4>
                        <ul className="mp-footer-links">
                            <li><a href="#1">Marketplace</a></li>
                            <li><a href="#2">Pricing Models</a></li>
                            <li><a href="#3">Quality Control</a></li>
                            <li><a href="#4">Success Stories</a></li>
                        </ul>
                    </div>
                    <div className="mp-footer-col">
                        <h4>Company</h4>
                        <ul className="mp-footer-links">
                            <li><a href="#1">About Us</a></li>
                            <li><a href="#2">Partnership Program</a></li>
                            <li><a href="#3">Contact Support</a></li>
                            <li><a href="#4">Careers</a></li>
                        </ul>
                    </div>
                    <div className="mp-footer-col">
                        <h4>Contact</h4>
                        <div className="mp-footer-contact">✉️ info@orca-marketplace.com</div>
                        <div className="mp-footer-contact">📞 +84 (0) 28 3456 7890</div>
                        <div className="mp-footer-contact">📍 District 1, Ho Chi Minh City, Vietnam</div>
                    </div>
                </div>
                <div className="mp-footer-bottom">
                    © 2024 ORCA Marketplace System. All rights reserved. <br /> System Version: v2.4.1-PRO
                </div>
            </footer>

            {/* Order Modal */}
            {showOrderModal && selectedSeller && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', background: '#0d1117', color: '#e6edf3' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #333' }}>
                            <h2>Gửi đơn đặt hàng</h2>
                            <button className="btn-close" style={{ color: '#fff' }} onClick={() => setShowOrderModal(false)}>×</button>
                        </div>
                        <p style={{ margin: '1.5rem 0', color: '#8b949e' }}>
                            Bạn đang đặt hàng tại xưởng: <strong style={{ color: '#58a6ff' }}>{selectedSeller.name}</strong>
                        </p>
                        <form onSubmit={handleSubmitOrder} className="login-form">
                            <div className="form-group">
                                <label style={{ color: '#ccc' }}>Từ Xưởng của bạn (Nguồn tiền/nơi nhận)</label>
                                <select
                                    className="mp-filter-select"
                                    value={buyerTeamId}
                                    onChange={e => setBuyerTeamId(e.target.value)}
                                    required
                                >
                                    {myTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#ccc' }}>Tên / Tiêu đề đơn hàng</label>
                                <input
                                    type="text"
                                    className="mp-filter-input"
                                    placeholder="VD: Gia công 500 nắp ly cà phê"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#ccc' }}>Mô tả yêu cầu chi tiết</label>
                                <textarea
                                    className="mp-filter-input"
                                    rows={4}
                                    placeholder="Mô tả chất liệu, quy cách đóng gói, lưu ý..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ color: '#ccc' }}>Số lượng</label>
                                    <input
                                        type="number"
                                        className="mp-filter-input"
                                        min="1"
                                        value={quantity}
                                        onChange={e => setQuantity(parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ color: '#ccc' }}>Hạn chót mong muốn</label>
                                    <input
                                        type="datetime-local"
                                        className="mp-filter-input"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                                <button type="button" className="mp-btn-outline" onClick={() => setShowOrderModal(false)}>Hủy</button>
                                <button type="submit" className="mp-btn-solid" disabled={submitting}>
                                    {submitting ? 'Đang gửi...' : 'Gửi đơn hàng'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
