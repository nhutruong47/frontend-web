import { useState, useEffect } from 'react';
import { teamService } from '../services/groupService';
import { interGroupOrderService } from '../services/interGroupOrderService';
import type { Team, InterGroupOrder } from '../types/types';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Marketplace.css';

const TEAM_IMAGES = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD2Grsxce0CV44WTikHOdsd39cY-uSEdsgGwONXoT4hrYzt3pJ9FNgyqjzJ5CCQTg7nQXJAiyHCnJ97RoapRmAc_oPcqKWEiuMiAPhE1oHfvW_MybmEeSCkRc4BhVuRVenPLLI1cBWLSeMnv9XtJTTpy-U1zISpxoijniuDPo1KbnkkoQ79VrDg7JjUixHmhbdNCIV808JY-9g5X6dXY0DBJOziKdGKXjAGIIkiAxlpZlXxfjXUbGIVLp1ejsheOlQBO1FaqLY-wJdZ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDaKOpexRAVADwQ8C3EbJKvC7UJS7i5NiR66SPA6pfSqZNnDwEOcvA4PsoBHqBcqnvoJzfKChiOdGaMSNIYop2A_QATkyPo7_ul8Z2RZJitzz3Q64Wqx9jf4XAeZvB5n82WOFFF4afKbI00UUCTQGM67CX7zVt5Ygr8fv4ymqWc7Us44O-hgo84sn-a0aHWNIARMmO9M--qWiyKMoQ-VS_1GAm8uJaM9OGsAiCjw1zNYwqSQ3sqXXQU_XP4hs2Mwpm1W95e61vg3if6',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBxcLYrrbNrLsREN_XApLJwxJKwhmqyKajVHwyJLD_HV2Huf_RQqcOkLj6TRXa4oMW3b7RC0JlPfWYz0AeRmLFaax0ULt2R4skTmyVTCCJOPcEvMipSBd390QyRnbIt_qfPU3WzU0Q_xJeVbYbrtjxAHWC4CSaa51mtJaT_ydO_0wYiivYUu4OOe_kzn_2-gPfxQr524HIEjLygJvKtw_HMmI-BfNwmQ68pvbP8YOOyC6YpWeEts6YDRhPN9UuN8qxyeyO12hIEJne4',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCMUd-cQ5Vpg8vzlaG8K_770SmKstx5FPRYXN6IiUG_N4mYVAH2EjttWFR56Z7PQmJpdxcG-uU1lJdus4HLYdCb-nOrhDs4tUmIXmIxkysAvZVA9YGknj98eTqQOWqYFcgtgJxlyIFNQLtqQ2oWk3uhAJ9XUo4FKH-OW1BLQdZpSPsDpCzefgTLO_qu-TFhv5gtjqR5ILq_MQcB7Cob_AQ2Xs1jrsIi2QN-Lik3JAtfHGgH8a7o3y3ic5bjQlMA8gy5mhYlGCVidejd',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAxyR7jqDGDBgkNE9bE7A-YquHFGGUIxNL_peaYxl6vQjW9rLNR7lat3pemyrh34QyBA_hKuOs5PeJqf8jB3bHtSzgsS1RgutmY86Qi02L8N7qMDPu_QOgDqQtYsi6h6psEo6CBg6Fqha1qIbPJIKgjCwfMikqcsnSMVdx0TXpyO9OQMtiDSAamMyDtLJ_9KTWV-8ThbSsRddP1Q2WgW1A9_Tbpw9BZz-IqJQ3fQ9ryf8z_mA4hvyTQ6UK2QuRf6pXK0VWYCDvzDmlM',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDgvSbTYxxHapjHIc1b8jzffIS4KZBSpLHh1CwSTM5zQQOCUCBPhM60ugCGSXOxGuWeyfCpNzccdG2XrHDRgm6ow5MxnMMzPAc2EuV8cfCgIyX7X3Y1oLrOYcGjWMKHdlZIN2Ov7rBL4Nt5cnfOoBK-Ett7d92LJ5Zr_nn18bhQvSMUs8Rza1evmz6mQVeoesEBcWrByShzjImH4ehCok57cgRXh2u0GZZAvOiu8zS4jrpxl4DKD4TRMkaNSRPdQSPRR_qVwblB_2l2',
];

const MARKET_HERO_IMAGE = TEAM_IMAGES[3];

const MARKET_FILTERS = [
    { icon: 'all_inclusive', label: 'Tất cả' },
    { icon: 'eco', label: 'Hạt xanh' },
    { icon: 'coffee_maker', label: 'Dịch vụ rang' },
    { icon: 'precision_manufacturing', label: 'Thiết bị' },
    { icon: 'factory', label: 'Xưởng gia công' },
];

type MarketplaceWorkshop = Team & {
    image: string;
    services: string[];
    equipment: string;
    priceRange: string;
    leadTime: string;
    minOrder: string;
    quality: string;
    certifications: string[];
    sample?: boolean;
};

const DEMO_WORKSHOPS: MarketplaceWorkshop[] = [
    {
        id: 'demo-ember-roastery',
        name: 'Ember Roastery Đà Lạt',
        description: 'Xưởng rang specialty tập trung Arabica Cầu Đất, phù hợp đơn hàng rang profile riêng, rang mẫu và đóng gói thương hiệu.',
        ownerId: 'demo',
        ownerName: 'ORCA Partner',
        memberCount: 18,
        createdAt: new Date().toISOString(),
        isPublished: true,
        specialty: 'Arabica specialty, rang profile riêng',
        capacity: '650kg/ngày',
        region: 'Đà Lạt, Lâm Đồng',
        completedOrders: 186,
        totalOrders: 194,
        trustScore: 97,
        image: TEAM_IMAGES[0],
        services: ['Rang gia công', 'Rang mẫu 1-5kg', 'Đóng gói túi van một chiều', 'Tư vấn profile'],
        equipment: 'Loring S35, máy đo màu Agtron, phòng cupping 12 chỗ',
        priceRange: '38.000đ - 62.000đ/kg',
        leadTime: '3-5 ngày làm việc',
        minOrder: '30kg/mẻ',
        quality: 'Kiểm soát độ ẩm, màu rang và cupping từng lô',
        certifications: ['HACCP', 'Cupping Lab', 'Traceable Lot'],
        sample: true,
    },
    {
        id: 'demo-origins-craft',
        name: 'Origins Craft Lab',
        description: 'Đơn vị sơ chế, phân loại và rang thử nghiệm cho các dòng Fine Robusta, Natural Arabica và blend thương mại.',
        ownerId: 'demo',
        ownerName: 'ORCA Partner',
        memberCount: 12,
        createdAt: new Date().toISOString(),
        isPublished: true,
        specialty: 'Fine Robusta, rang test, sơ chế mẫu',
        capacity: '420kg/ngày',
        region: 'Buôn Ma Thuột',
        completedOrders: 143,
        totalOrders: 151,
        trustScore: 94,
        image: TEAM_IMAGES[1],
        services: ['Rang test profile', 'Phân loại hạt xanh', 'Blend theo công thức', 'QC trước giao'],
        equipment: 'Probatino 5kg, roaster 30kg, moisture meter, density analyzer',
        priceRange: '32.000đ - 55.000đ/kg',
        leadTime: '2-4 ngày làm việc',
        minOrder: '20kg/mẻ',
        quality: 'Có biên bản QC độ ẩm, defect và roast curve',
        certifications: ['Robusta Fine', 'QC Report', 'Sample Roast'],
        sample: true,
    },
    {
        id: 'demo-legacy-beans',
        name: 'Legacy Beans Factory',
        description: 'Xưởng quy mô lớn chuyên gia công cà phê thương mại, rang số lượng lớn, phối trộn và đóng gói OEM.',
        ownerId: 'demo',
        ownerName: 'ORCA Partner',
        memberCount: 42,
        createdAt: new Date().toISOString(),
        isPublished: true,
        specialty: 'OEM, rang công nghiệp, blend thương mại',
        capacity: '2.5 tấn/ngày',
        region: 'Bình Dương',
        completedOrders: 512,
        totalOrders: 530,
        trustScore: 96,
        image: TEAM_IMAGES[2],
        services: ['Rang số lượng lớn', 'Đóng gói OEM', 'Xay theo size', 'Dán nhãn thương hiệu'],
        equipment: 'Dây chuyền rang 120kg/mẻ, máy đóng gói tự động, metal detector',
        priceRange: '18.000đ - 34.000đ/kg',
        leadTime: '5-9 ngày làm việc',
        minOrder: '300kg/lô',
        quality: 'Batch record, kiểm trọng lượng và lưu mẫu 30 ngày',
        certifications: ['ISO 22000', 'OEM Ready', 'Large Batch'],
        sample: true,
    },
    {
        id: 'demo-highland-process',
        name: 'Highland Process Station',
        description: 'Trạm gia công hạt sau thu hoạch, sấy, phân loại, lưu kho và chuẩn bị hạt xanh cho các xưởng rang.',
        ownerId: 'demo',
        ownerName: 'ORCA Partner',
        memberCount: 26,
        createdAt: new Date().toISOString(),
        isPublished: true,
        specialty: 'Sơ chế, sấy, phân loại hạt xanh',
        capacity: '4 tấn hạt xanh/ngày',
        region: 'Gia Lai',
        completedOrders: 208,
        totalOrders: 219,
        trustScore: 92,
        image: TEAM_IMAGES[3],
        services: ['Sấy hạt', 'Tách size', 'Lưu kho kiểm ẩm', 'Chuẩn bị lô rang'],
        equipment: 'Máy sấy tĩnh, color sorter, kho kiểm soát ẩm 12%',
        priceRange: '9.000đ - 22.000đ/kg',
        leadTime: '4-7 ngày làm việc',
        minOrder: '500kg/lô',
        quality: 'Theo dõi độ ẩm, density và tỷ lệ lỗi trước xuất kho',
        certifications: ['Green Bean QC', 'Moisture Control', 'Warehouse Lot'],
        sample: true,
    },
];

const enrichWorkshop = (team: Team, index: number): MarketplaceWorkshop => ({
    ...team,
    image: TEAM_IMAGES[index % TEAM_IMAGES.length],
    services: ['Rang gia công', 'Đóng gói theo yêu cầu', 'Theo dõi tiến độ đơn hàng'],
    equipment: team.capacity ? `Dây chuyền phù hợp công suất ${team.capacity}` : 'Máy rang công nghiệp, khu đóng gói và bàn QC',
    priceRange: 'Liên hệ theo sản lượng',
    leadTime: 'Theo lịch nhận đơn',
    minOrder: 'Trao đổi khi đặt hàng',
    quality: 'Theo dõi tiến độ, nghiệm thu và cập nhật trạng thái trên ORCA',
    certifications: ['ORCA Verified', 'Partner Workshop'],
});

export default function MarketplacePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [myTeams, setMyTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(MARKET_FILTERS[0].label);
    const [selectedWorkshop, setSelectedWorkshop] = useState<MarketplaceWorkshop | null>(null);

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
                setAllTeams([]);
                setMyTeams([]);
                setError('');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleOrderClick = (seller: Team) => {
        if (myTeams.length === 0) {
            alert('Bạn cần sở hữu ít nhất 1 xưởng để đặt hàng. Mình sẽ đưa bạn tới trang Nhóm xưởng để tạo nhóm trước.');
            navigate('/groups');
            return;
        }
        setSelectedSeller(seller);
        setOrderTitle('');
        setOrderDesc('');
        setOrderQty(1);
        setOrderDeadline('');
        setShowOrderModal(true);
    };

    const openPublishModal = () => {
        if (myTeams.length === 0) {
            alert('Bạn cần tạo ít nhất 1 nhóm xưởng trước khi đăng tải. Mình sẽ đưa bạn tới trang Nhóm xưởng.');
            navigate('/groups');
            return;
        }
        setShowPublishModal(true);
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyerTeamId || !orderTitle || !orderDeadline || !selectedSeller) return;
        if ((selectedSeller as MarketplaceWorkshop).sample) {
            setShowOrderModal(false);
            alert('Đây là xưởng mẫu để xem giao diện. Yêu cầu gia công mẫu đã được ghi nhận trong giao diện demo.');
            return;
        }
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
            alert('Đặt hàng thành công! Chuyển sang trang Đơn hàng để theo dõi.');
            navigate('/orders');
        } catch {
            alert('Không thể đặt hàng. Vui lòng thử lại.');
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
            alert('Xưởng đã được đăng tải lên thị trường!');
            // Refresh
            const teamsAll = await teamService.getAllTeams();
            setAllTeams(teamsAll.filter(t => t.isPublished && t.ownerId !== user?.id));
        } catch {
            alert('Không thể đăng tải. Vui lòng thử lại.');
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

    const marketplaceTeams: MarketplaceWorkshop[] = [
        ...DEMO_WORKSHOPS,
        ...allTeams.map((team, index) => enrichWorkshop(team, index + DEMO_WORKSHOPS.length)),
    ];

    const displayedTeams = marketplaceTeams.filter(team => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q || team.name.toLowerCase().includes(q) ||
            (team.specialty || '').toLowerCase().includes(q) ||
            (team.region || '').toLowerCase().includes(q) ||
            team.services.some(service => service.toLowerCase().includes(q));
        const filterText = activeFilter.toLowerCase();
        const matchesFilter = activeFilter === 'Tất cả' ||
            team.name.toLowerCase().includes(filterText) ||
            (team.specialty || '').toLowerCase().includes(filterText) ||
            team.services.some(service => service.toLowerCase().includes(filterText));
        return matchesSearch && matchesFilter;
    });

    // My published teams
    const myPublishedTeams = myTeams.filter(t => t.isPublished);
    const marketplaceNavItems = [
        { path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
        { path: '/groups', label: 'Nhóm xưởng', icon: 'groups' },
        { path: '/marketplace', label: 'Thị trường', icon: 'storefront' },
        { path: '/orders', label: 'Đơn hàng', icon: 'package_2' },
        { path: '/upgrade', label: 'Nâng cấp AI', icon: 'auto_awesome' },
        ...(user?.role === 'ADMIN' ? [{ path: '/admin', label: 'Admin', icon: 'shield' }] : []),
        { path: '/profile', label: 'Hồ sơ', icon: 'account_circle' },
        { path: '/settings', label: 'Cài đặt', icon: 'settings' },
    ];
    const isMarketplacePath = location.pathname === '/marketplace'
        || location.pathname === '/dat-hang'
        || location.pathname === '/thi-truong-dat-hang';

    if (loading) {
        return (
            <div className="mp-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="btn-spinner" />
            </div>
        );
    }

    return (
        <div className="mp-body mp-market-style">
            <aside className="mp-sidenav">
                <div className="mp-menu-label">MENU</div>
                <nav className="mp-side-links">
                    {marketplaceNavItems.map(item => {
                        const active = item.path === '/marketplace'
                            ? isMarketplacePath
                            : location.pathname.startsWith(item.path);
                        return (
                            <Link key={item.path} to={item.path} className={active ? 'active' : ''}>
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <header className="mp-topbar">
                <div className="mp-top-search">
                    <span className="material-symbols-outlined">search</span>
                    <input
                        type="text"
                        placeholder="Tìm xưởng, chuyên môn, khu vực..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="mp-top-actions">
                    <button aria-label="Thông báo" onClick={() => window.alert('Chưa có thông báo Marketplace mới.')}>
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button aria-label="Lịch sử" onClick={() => navigate('/orders')}>
                        <span className="material-symbols-outlined">history</span>
                    </button>
                    <button aria-label="Bộ lọc" onClick={() => document.getElementById('mp-filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                        <span className="material-symbols-outlined">tune</span>
                    </button>
                    <div className="mp-user-avatar">{(user?.username || user?.fullName || 'O').charAt(0).toUpperCase()}</div>
                </div>
            </header>

            <main className="mp-main">
                <section className="mp-showcase-hero">
                    <img src={MARKET_HERO_IMAGE} alt="Xưởng rang cà phê chuyên nghiệp" />
                    <div className="mp-showcase-overlay" />
                    <div className="mp-showcase-content">
                        <span className="mp-verified">
                            <span className="material-symbols-outlined">verified</span>
                            Hệ sinh thái đối tác
                        </span>
                        <h1>Mạng Lưới Xưởng Rang<br /><span>Chuyên Nghiệp</span></h1>
                        <p>Kết nối trực tiếp với những xưởng rang thủ công và công nghiệp hàng đầu Việt Nam. Đặt hàng, theo dõi và mở rộng năng lực sản xuất trên cùng một nền tảng.</p>
                        <div className="mp-hero-buttons">
                            <button onClick={() => document.getElementById('mp-partners')?.scrollIntoView({ behavior: 'smooth' })}>Tìm đối tác ngay</button>
                            <button onClick={() => navigate('/orders')}>Theo dõi đơn hàng</button>
                        </div>
                    </div>
                    <div className="mp-quick-widget">
                        <h3>Quản lý Cửa hàng</h3>
                        <div><span>Xưởng đang bán</span><strong>{myPublishedTeams.length}</strong></div>
                        <div><span>Đối tác khả dụng</span><strong>{displayedTeams.length}</strong></div>
                        <div><span>Hỗ trợ đặt hàng</span><strong>24/7</strong></div>
                        <button onClick={openPublishModal}>
                            <span className="material-symbols-outlined">publish</span>
                            Đăng tải sản phẩm
                        </button>
                    </div>
                </section>

                <div id="mp-filters" className="mp-filter-row">
                    {MARKET_FILTERS.map((filter) => (
                        <button
                            key={filter.label}
                            className={activeFilter === filter.label ? 'active' : ''}
                            onClick={() => setActiveFilter(filter.label)}
                        >
                            <span className="material-symbols-outlined">{filter.icon}</span>
                            {filter.label}
                        </button>
                    ))}
                    <span className="mp-result-count">{displayedTeams.length} xưởng</span>
                </div>

                {myPublishedTeams.length > 0 && (
                    <section className="mp-published-panel">
                        <h3><span className="material-symbols-outlined">storefront</span>Xưởng của bạn trên thị trường</h3>
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

                <section id="mp-partners" className="mp-partner-section">
                    <div className="mp-section-title-row">
                        <div>
                            <h2>Xưởng Đối Tác</h2>
                            <p>Những đơn vị rang uy tín hàng đầu trong mạng lưới ORCA</p>
                        </div>
                        <button onClick={() => setSearchQuery('')}>
                            Xem tất cả xưởng
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>

                    {error && <div className="mp-error">{error}</div>}

                    {displayedTeams.length === 0 && !error ? (
                        <div className="mp-empty mp-styled-empty">
                            <span className="material-symbols-outlined">file_tray</span>
                            <h3>Chưa có xưởng nào trên thị trường</h3>
                            <p>Hãy là người đầu tiên đăng tải xưởng của bạn lên mạng lưới ORCA.</p>
                            {myTeams.length > 0 ? (
                                <button className="mp-publish-btn" onClick={openPublishModal}>
                                    Đăng tải xưởng ngay
                                </button>
                            ) : (
                                <button className="mp-publish-btn" onClick={() => navigate('/groups')}>
                                    Tạo nhóm xưởng trước
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mp-partner-grid">
                            {displayedTeams.map((team) => (
                                <article key={team.id} className="mp-partner-card">
                                    <div className="mp-partner-image">
                                        <img src={team.image} alt={team.name} />
                                        <span>Premium Partner</span>
                                    </div>
                                    <div className="mp-partner-body">
                                        <div className="mp-partner-heading">
                                            <h3>{team.name}</h3>
                                            {team.trustScore !== undefined && team.trustScore !== null && (
                                                <strong><span className="material-symbols-outlined">star</span>{team.trustScore}%</strong>
                                            )}
                                        </div>
                                        <p>{team.description || 'Xưởng gia công cà phê chuyên nghiệp với năng lực rang ổn định, phù hợp cho đơn hàng B2B và thử nghiệm profile.'}</p>
                                        <div className="mp-partner-tags">
                                            {team.region && <span>{team.region}</span>}
                                            {team.specialty && <span>{team.specialty}</span>}
                                            {team.capacity && <span>{team.capacity}</span>}
                                            <span>{team.memberCount || 0} thành viên</span>
                                        </div>
                                        <div className="mp-partner-actions">
                                            <button onClick={() => setSelectedWorkshop(team)}>Xem chi tiết</button>
                                            <button onClick={() => setSelectedWorkshop(team)}>Gia công</button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mp-arrivals">
                    <div className="mp-arrivals-header">
                        <h2>Sản phẩm Mới</h2>
                        <div />
                    </div>
                    <div className="mp-arrivals-grid">
                        <article className="mp-feature-product">
                            <img src={TEAM_IMAGES[5]} alt="Hạt cà phê đặc tuyển" />
                            <div>
                                <span>Mới về</span>
                                <h3>Ethiopia Yirgacheffe G1</h3>
                                <p>Sơ chế Natural với nốt hương hoa nhài và trà đen đặc trưng. Số lượng giới hạn từ đối tác ORCA.</p>
                                <strong>450.000đ/kg</strong>
                            </div>
                        </article>
                        <article className="mp-side-product">
                            <img src={TEAM_IMAGES[4]} alt="Thiết bị rang cà phê" />
                            <h3>Máy đo độ ẩm S3</h3>
                            <p>Thiết bị cầm tay độ chính xác cao cho hạt xanh.</p>
                        </article>
                        <article className="mp-side-product">
                            <img src={TEAM_IMAGES[1]} alt="Dịch vụ rang test" />
                            <h3>Dịch vụ Rang Test</h3>
                            <p>Gói 5 mẫu profile khác nhau cho 1kg hạt.</p>
                        </article>
                    </div>
                </section>

                <section className="mp-cta">
                    <h2>Sẵn sàng đưa xưởng của bạn lên ORCA?</h2>
                    <p>Gia nhập cộng đồng xưởng rang lớn nhất Việt Nam. Quản lý bán hàng, tiếp cận khách hàng B2B và tối ưu hóa vận hành trong một nền tảng.</p>
                    <button onClick={openPublishModal}>Đăng ký trở thành Đối tác</button>
                </section>

                <footer className="mp-showcase-footer">
                    <span>ORCA</span>
                    <p>© 2026 Coffee Workshop Ecosystem</p>
                    <div>
                        <a href="#">Điều khoản</a>
                        <a href="#">Bảo mật</a>
                        <a href="#">Hỗ trợ đối tác</a>
                    </div>
                </footer>
            </main>

            {selectedWorkshop && (
                <div className="mp-modal-overlay" onClick={() => setSelectedWorkshop(null)}>
                    <div className="mp-workshop-detail" onClick={e => e.stopPropagation()}>
                        <button className="mp-detail-close" onClick={() => setSelectedWorkshop(null)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="mp-detail-media">
                            <img src={selectedWorkshop.image} alt={selectedWorkshop.name} />
                            <div className="mp-detail-media__overlay">
                                <span>{selectedWorkshop.sample ? 'Xưởng mẫu' : 'Đối tác ORCA'}</span>
                                <h2>{selectedWorkshop.name}</h2>
                                <p>{selectedWorkshop.region}</p>
                            </div>
                        </div>
                        <div className="mp-detail-content">
                            <div className="mp-detail-summary">
                                <div>
                                    <span>Uy tín</span>
                                    <strong>{selectedWorkshop.trustScore ?? 100}%</strong>
                                </div>
                                <div>
                                    <span>Công suất</span>
                                    <strong>{selectedWorkshop.capacity || 'Theo lịch'}</strong>
                                </div>
                                <div>
                                    <span>Đơn hoàn thành</span>
                                    <strong>{selectedWorkshop.completedOrders || 0}</strong>
                                </div>
                            </div>

                            <p className="mp-detail-desc">{selectedWorkshop.description}</p>

                            <div className="mp-detail-grid">
                                <div>
                                    <span>Khoảng giá gia công</span>
                                    <strong>{selectedWorkshop.priceRange}</strong>
                                </div>
                                <div>
                                    <span>Thời gian giao</span>
                                    <strong>{selectedWorkshop.leadTime}</strong>
                                </div>
                                <div>
                                    <span>Đơn tối thiểu</span>
                                    <strong>{selectedWorkshop.minOrder}</strong>
                                </div>
                                <div>
                                    <span>Thiết bị</span>
                                    <strong>{selectedWorkshop.equipment}</strong>
                                </div>
                            </div>

                            <div className="mp-detail-section">
                                <h3>Dịch vụ nhận gia công</h3>
                                <div className="mp-detail-tags">
                                    {selectedWorkshop.services.map(service => <span key={service}>{service}</span>)}
                                </div>
                            </div>

                            <div className="mp-detail-section">
                                <h3>Kiểm soát chất lượng</h3>
                                <p>{selectedWorkshop.quality}</p>
                                <div className="mp-detail-tags">
                                    {selectedWorkshop.certifications.map(cert => <span key={cert}>{cert}</span>)}
                                </div>
                            </div>

                            <div className="mp-detail-actions">
                                <button onClick={() => setSelectedWorkshop(null)}>Để sau</button>
                                <button onClick={() => {
                                    const workshop = selectedWorkshop;
                                    setSelectedWorkshop(null);
                                    handleOrderClick(workshop);
                                }}>
                                    Gửi yêu cầu gia công
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Modal */}
            {showOrderModal && selectedSeller && (
                <div className="mp-modal-overlay" onClick={() => setShowOrderModal(false)}>
                    <div className="mp-modal" onClick={e => e.stopPropagation()}>
                        <div className="mp-modal-header">
                            <h2><ion-icon name="cart-outline" style={{ fontSize: '20px', verticalAlign: 'middle', marginRight: 8 }}></ion-icon> Đặt đơn hàng</h2>
                            <button className="mp-modal-close" onClick={() => setShowOrderModal(false)}><ion-icon name="close-outline" style={{ fontSize: '20px' }}></ion-icon></button>
                        </div>
                        <div className="mp-modal-seller">
                            <ion-icon name="storefront-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Đặt hàng tại: <strong>{selectedSeller.name}</strong>
                        </div>
                        <form onSubmit={handleSubmitOrder}>
                            <div className="mp-form-group">
                                <label><ion-icon name="business-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Từ xưởng của bạn</label>
                                <select value={buyerTeamId} onChange={e => setBuyerTeamId(e.target.value)} required>
                                    {myTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mp-form-group">
                                <label><ion-icon name="document-text-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Tiêu đề đơn hàng</label>
                                <input type="text" placeholder="VD: Gia công 500kg cà phê Arabica" value={orderTitle} onChange={e => setOrderTitle(e.target.value)} required />
                            </div>
                            <div className="mp-form-group">
                                <label><ion-icon name="chatbox-ellipses-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Mô tả chi tiết</label>
                                <textarea rows={3} placeholder="Yêu cầu cụ thể, quy cách, lưu ý..." value={orderDesc} onChange={e => setOrderDesc(e.target.value)} />
                            </div>
                            <div className="mp-form-row">
                                <div className="mp-form-group">
                                    <label><ion-icon name="layers-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Số lượng</label>
                                    <input type="number" min="1" value={orderQty} onChange={e => setOrderQty(parseInt(e.target.value) || 1)} required />
                                </div>
                                <div className="mp-form-group">
                                    <label><ion-icon name="calendar-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Hạn chót</label>
                                    <input type="datetime-local" value={orderDeadline} onChange={e => setOrderDeadline(e.target.value)} required />
                                </div>
                            </div>
                            <div className="mp-modal-actions">
                                <button type="button" className="mp-cancel-btn" onClick={() => setShowOrderModal(false)}><ion-icon name="close-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Hủy</button>
                                <button type="submit" className="mp-submit-btn" disabled={submitting}>
                                    {submitting ? 'Đang gửi...' : <><ion-icon name="send-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Gửi đơn hàng</>}
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
                            <h2><ion-icon name="megaphone-outline" style={{ fontSize: '20px', verticalAlign: 'middle', marginRight: 8 }}></ion-icon> Đăng tải xưởng lên thị trường</h2>
                            <button className="mp-modal-close" onClick={() => setShowPublishModal(false)}><ion-icon name="close-outline" style={{ fontSize: '20px' }}></ion-icon></button>
                        </div>
                        <form onSubmit={handlePublish}>
                            <div className="mp-form-group">
                                <label><ion-icon name="business-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Chọn xưởng muốn đăng</label>
                                <select value={publishTeamId} onChange={e => setPublishTeamId(e.target.value)} required>
                                    {myTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.isPublished ? '(Đã đăng)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mp-form-group">
                                <label><ion-icon name="flask-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Chuyên môn</label>
                                <input type="text" placeholder="VD: Arabica & Robusta Blend, Fine Robusta..." value={pubSpecialty} onChange={e => setPubSpecialty(e.target.value)} />
                            </div>
                            <div className="mp-form-group">
                                <label><ion-icon name="speedometer-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Năng suất</label>
                                <input type="text" placeholder="VD: > 500kg/ngày, 100-500kg/ngày..." value={pubCapacity} onChange={e => setPubCapacity(e.target.value)} />
                            </div>
                            <div className="mp-form-group">
                                <label><ion-icon name="location-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Khu vực</label>
                                <input type="text" placeholder="VD: Tây Nguyên, Đông Nam Bộ..." value={pubRegion} onChange={e => setPubRegion(e.target.value)} />
                            </div>
                            <div className="mp-form-group">
                                <label><ion-icon name="chatbox-ellipses-outline" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Mô tả xưởng</label>
                                <textarea rows={3} placeholder="Giới thiệu ngắn về xưởng, dịch vụ, thế mạnh..." value={pubDescription} onChange={e => setPubDescription(e.target.value)} />
                            </div>
                            <div className="mp-modal-actions">
                                <button type="button" className="mp-cancel-btn" onClick={() => setShowPublishModal(false)}><ion-icon name="close-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Hủy</button>
                                <button type="submit" className="mp-submit-btn" disabled={publishing}>
                                    {publishing ? 'Đang đăng...' : <><ion-icon name="rocket-outline" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Đăng tải ngay</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
