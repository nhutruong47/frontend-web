import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamService } from '../services/groupService';
import { interGroupOrderService } from '../services/interGroupOrderService';
import type { Team, InterGroupOrder } from '../types/types';


export default function OrderManagementPage() {
    const { user } = useAuth();
    const [myTeams, setMyTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound');

    const [orders, setOrders] = useState<InterGroupOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const teams = await teamService.getMyTeams();
                // We only care about teams where the user is the owner (can manage orders)
                const ownedTeams = teams.filter(t => t.ownerId === user?.id);
                setMyTeams(ownedTeams);
                if (ownedTeams.length > 0) {
                    setSelectedTeam(ownedTeams[0].id);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTeams();
    }, [user]);

    useEffect(() => {
        if (!selectedTeam) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            setLoading(true);
            try {
                if (activeTab === 'outbound') {
                    const data = await interGroupOrderService.getOutboundOrders(selectedTeam);
                    setOrders(data);
                } else {
                    const data = await interGroupOrderService.getInboundOrders(selectedTeam);
                    setOrders(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [selectedTeam, activeTab]);

    const handleAccept = async (orderId: string) => {
        if (!confirm('Chấp nhận đơn hàng này? Một mục tiêu (Goal) mới sẽ được tạo tự động trong xưởng của bạn.')) return;
        try {
            await interGroupOrderService.acceptOrder(orderId);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'ACCEPTED' } : o));
            alert('Đã chấp nhận đơn hàng và tạo Mục tiêu thành công!');
        } catch (err) {
            alert('Có lỗi xảy ra khi chấp nhận đơn.');
            console.error(err);
        }
    };

    const handleReject = async (orderId: string) => {
        if (!confirm('Từ chối đơn hàng này?')) return;
        try {
            await interGroupOrderService.rejectOrder(orderId);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'REJECTED' } : o));
        } catch (err) {
            alert('Có lỗi xảy ra khi từ chối đơn.');
            console.error(err);
        }
    };

    const handleCancel = async (orderId: string) => {
        if (!confirm('Hủy đơn hàng này? Điều này sẽ ảnh hưởng đến độ uy tín của bạn.')) return;
        try {
            await interGroupOrderService.cancelOrder(orderId);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'CANCELED' } : o));
        } catch (err) {
            alert('Có lỗi xảy ra khi hủy đơn.');
            console.error(err);
        }
    };

    const handleComplete = async (orderId: string) => {
        if (!confirm('Đánh dấu đơn này đã hoàn thành?')) return;
        try {
            await interGroupOrderService.completeOrder(orderId);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'COMPLETED' } : o));
        } catch (err) {
            alert('Có lỗi xảy ra.');
            console.error(err);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <span className="status-badge status-pending"><ion-icon name="time-outline" style={{ fontSize: '13px' }}></ion-icon> Chờ xử lý</span>;
            case 'ACCEPTED': return <span className="status-badge status-accepted"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Đã nhận làm</span>;
            case 'REJECTED': return <span className="status-badge status-rejected"><ion-icon name="close-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Bị từ chối</span>;
            case 'COMPLETED': return <span className="status-badge status-completed"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Hoàn thành</span>;
            case 'CANCELED': return <span className="status-badge status-canceled"><ion-icon name="ban-outline" style={{ fontSize: '13px' }}></ion-icon> Đã hủy</span>;
            default: return <span className="status-badge">{status}</span>;
        }
    };

    if (myTeams.length === 0) {
        return (
            <div className="page-container">
                <header className="page-header">
                    <h1 className="page-title text-glow-active" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="icon-container glow" style={{ width: 32, height: 32, fontSize: 20 }}><ion-icon name="cube-outline"></ion-icon></span> Quản lý đơn hàng
                    </h1>
                </header>
                <div className="empty-state glass-panel" style={{ padding: '80px 20px', borderStyle: 'dashed' }}>
                    <div className="empty-icon"><span className="icon-container glow" style={{ width: 64, height: 64, fontSize: 40 }}><ion-icon name="file-tray-outline"></ion-icon></span></div>
                    <p>Bạn phải là Chủ của ít nhất một phân xưởng để xem và quản lý đơn đặt hàng.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <header className="page-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title text-glow-active" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="icon-container glow" style={{ width: 32, height: 32, fontSize: 20 }}><ion-icon name="cube-outline"></ion-icon></span> Quản lý đơn hàng
                    </h1>
                    <p className="page-subtitle">Theo dõi đơn đi đặt tại xưởng khác và đơn nhận gia công.</p>
                </div>
                <div>
                    <label style={{ marginRight: '10px', color: 'var(--text-secondary)' }}>Chọn Xưởng của bạn:</label>
                    <select
                        className="form-input"
                        style={{ display: 'inline-block', width: 'auto', padding: '8px 16px', cursor: 'pointer' }}
                        value={selectedTeam}
                        onChange={e => setSelectedTeam(e.target.value)}
                    >
                        {myTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="tabs-container glass-panel" style={{ marginBottom: '20px', display: 'inline-block', padding: 4 }}>
                <div className="tabs-header" style={{ gap: 8 }}>
                    <button
                        className={`tab-btn ${activeTab === 'outbound' ? 'active' : ''}`}
                        onClick={() => setActiveTab('outbound')}
                    >
                        <ion-icon name="arrow-up-outline" style={{ fontSize: '15px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Đơn đã đi đặt (Mua)
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'inbound' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inbound')}
                    >
                        <ion-icon name="arrow-down-outline" style={{ fontSize: '15px', verticalAlign: 'middle', marginRight: 4 }}></ion-icon> Đơn xưởng khác đặt (Bán/Gia công)
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <p>Đang tải đơn hàng...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="empty-state glass-panel" style={{ padding: '80px 20px', borderStyle: 'dashed' }}>
                    <div className="empty-icon"><span className="icon-container glow" style={{ width: 64, height: 64, fontSize: 40 }}><ion-icon name="cube-outline"></ion-icon></span></div>
                    <p>Chưa có đơn hàng nào trong thư mục này.</p>
                </div>
            ) : (
                <div className="table-responsive glass-panel" style={{ padding: 16 }}>
                    <table className="goals-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Đơn hàng</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>{activeTab === 'outbound' ? 'Nhà cung cấp (Bán)' : 'Người đặt (Mua)'}</th>
                                {activeTab === 'inbound' && <th style={{ textAlign: 'center', padding: '12px' }}>Uy tín</th>}
                                <th style={{ textAlign: 'center', padding: '12px' }}>Số lượng</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Hạn chót</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Trạng thái</th>
                                <th style={{ textAlign: 'right', padding: '12px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px' }}>
                                        <strong>{order.title}</strong>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {order.description}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="group-icon" style={{ fontSize: '1rem', padding: '4px' }}><ion-icon name="business-outline" style={{ fontSize: '16px' }}></ion-icon></span>
                                            {activeTab === 'outbound' ? order.sellerTeamName : order.buyerTeamName}
                                        </div>
                                    </td>
                                    {activeTab === 'inbound' && (
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span className={`status-badge ${(order.buyerTrustScore ?? 100) >= 80 ? 'status-completed' : (order.buyerTrustScore ?? 100) >= 50 ? 'status-pending' : 'status-rejected'}`}>
                                                {(order.buyerTrustScore ?? 100) >= 80 ? 'Tốt' : (order.buyerTrustScore ?? 100) >= 50 ? 'TB' : 'Yếu'} {order.buyerTrustScore ?? 100}%
                                            </span>
                                        </td>
                                    )}
                                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                                        {order.quantity}
                                    </td>
                                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                                        {new Date(order.deadline).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {/* Inbound PENDING: Accept/Reject */}
                                            {activeTab === 'inbound' && order.status === 'PENDING' && (
                                                <>
                                                    <button className="btn btn-secondary" onClick={() => handleReject(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Từ chối</button>
                                                    <button className="btn btn-primary" onClick={() => handleAccept(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Chấp nhận</button>
                                                </>
                                            )}
                                            {/* Inbound ACCEPTED: Complete */}
                                            {activeTab === 'inbound' && order.status === 'ACCEPTED' && (
                                                <button className="btn btn-primary" onClick={() => handleComplete(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> Hoàn thành</button>
                                            )}
                                            {/* Both: Cancel (PENDING or ACCEPTED) */}
                                            {(order.status === 'PENDING' || order.status === 'ACCEPTED') && (
                                                <button className="btn btn-secondary" onClick={() => handleCancel(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}><ion-icon name="ban-outline" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> Hủy</button>
                                            )}
                                            {/* Show canceller */}
                                            {order.status === 'CANCELED' && order.cancelledBy && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bởi: {order.cancelledBy === 'BUYER' ? 'Bên mua' : 'Bên bán'}</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
