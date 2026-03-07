import { useState, useEffect } from 'react';
import { teamService } from '../services/groupService';
import type { Team } from '../types/types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Marketplace.css';

const TEAM_IMAGES = [
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1620189507195-68309c04c4d0?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80&w=600'
];

export default function MarketplacePage() {
    const { user } = useAuth();
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const teams = await teamService.getAllTeams();
                setAllTeams(teams);
            } catch (err) {
                console.error("Failed to load marketplace data", err);
                setError("Có lỗi xảy ra khi tải danh sách nhóm.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const displayedTeams = allTeams.filter(team => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return team.name.toLowerCase().includes(query) ||
            (team.description || '').toLowerCase().includes(query);
    });

    if (loading) {
        return (
            <div className="mp-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="btn-spinner"></div>
            </div>
        );
    }

    return (
        <div className="mp-body">
            {/* Header */}
            <header className="mp-header">
                <div className="mp-logo">
                    <span style={{ fontSize: '1.4rem' }}>🐋</span> ORCA
                </div>
                <div className="mp-actions">
                    {user ? (
                        <Link to="/dashboard" className="mp-login-btn">← Quay về Dashboard</Link>
                    ) : (
                        <Link to="/login" className="mp-login-btn">Đăng nhập</Link>
                    )}
                </div>
            </header>

            {/* Hero */}
            <section className="mp-hero">
                <h1>Khám phá các Nhóm<br />trên ORCA</h1>
                <p>Tìm kiếm và kết nối với các nhóm làm việc đang hoạt động trên hệ thống quản lý ORCA.</p>
            </section>

            {/* Search */}
            <div className="mp-search-section">
                <input
                    type="text"
                    className="mp-search-input"
                    placeholder="🔍 Tìm kiếm nhóm theo tên..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <span className="mp-result-count">{displayedTeams.length} nhóm</span>
            </div>

            {/* Teams Grid */}
            <section className="mp-section">
                {error && <div className="mp-error">{error}</div>}

                {displayedTeams.length === 0 && !error ? (
                    <div className="mp-empty">
                        <span style={{ fontSize: '2.5rem' }}>📭</span>
                        <h3>Không tìm thấy nhóm nào</h3>
                        <p>Thử thay đổi từ khóa tìm kiếm hoặc tạo nhóm mới từ Dashboard.</p>
                    </div>
                ) : (
                    <div className="mp-grid">
                        {displayedTeams.map((team, index) => (
                            <div key={team.id} className="mp-card">
                                <div className="mp-card-img-wrapper">
                                    <img src={TEAM_IMAGES[index % TEAM_IMAGES.length]} alt={team.name} className="mp-card-img" />
                                    <div className="mp-card-member-badge">
                                        👥 {team.memberCount || 0} thành viên
                                    </div>
                                </div>
                                <div className="mp-card-content">
                                    <h3 className="mp-card-title">{team.name}</h3>
                                    <p className="mp-card-desc">
                                        {team.description || 'Nhóm làm việc trên hệ thống ORCA.'}
                                    </p>
                                    <div className="mp-card-footer">
                                        <span className="mp-card-date">
                                            📅 {team.createdAt ? new Date(team.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}
                                        </span>
                                        <Link to={`/groups/${team.id}`} className="mp-card-link">
                                            Xem chi tiết →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer className="mp-footer">
                <p>© 2026 ORCA — Nền tảng Quản lý Xưởng Cà Phê Thông minh</p>
            </footer>
        </div>
    );
}
