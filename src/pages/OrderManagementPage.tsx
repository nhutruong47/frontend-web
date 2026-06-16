import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamService } from '../services/groupService';
import { interGroupOrderService } from '../services/interGroupOrderService';
import type { Team, InterGroupOrder } from '../types/types';

const PERSONAL_BUYER = '__personal__';

export default function OrderManagementPage() {
    const { user } = useAuth();
    const [myTeams, setMyTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>(PERSONAL_BUYER);
    const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound');

    const [orders, setOrders] = useState<InterGroupOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [unreadOutboundCount, setUnreadOutboundCount] = useState(0);
    const [unreadInboundCount, setUnreadInboundCount] = useState(0);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const teams = await teamService.getMyTeams();
                // We only care about teams where the user is the owner (can manage orders)
                const ownedTeams = teams.filter(t => t.ownerId === user?.id);
                setMyTeams(ownedTeams);
                if (ownedTeams.length > 0) {
                    setSelectedTeam(ownedTeams[0].id);
                } else {
                    setSelectedTeam(PERSONAL_BUYER);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTeams();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'inbound' && selectedTeam === PERSONAL_BUYER) {
            setOrders([]);
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            setLoading(true);
            try {
                if (activeTab === 'outbound') {
                    const data = selectedTeam === PERSONAL_BUYER
                        ? await interGroupOrderService.getMyOutboundOrders()
                        : await interGroupOrderService.getOutboundOrders(selectedTeam);
                    
                    const unreadIds = data.filter(o => o.buyerViewed === false).map(o => o.id);
                    if (unreadIds.length > 0) {
                        interGroupOrderService.markViewed(unreadIds, 'BUYER').catch(console.error);
                        data.forEach(o => { if (unreadIds.includes(o.id)) o.buyerViewed = true; });
                    }
                    setOrders(data);
                } else {
                    const data = await interGroupOrderService.getInboundOrders(selectedTeam);
                    const unreadIds = data.filter(o => o.sellerViewed === false).map(o => o.id);
                    if (unreadIds.length > 0) {
                        interGroupOrderService.markViewed(unreadIds, 'SELLER').catch(console.error);
                        data.forEach(o => { if (unreadIds.includes(o.id)) o.sellerViewed = true; });
                    }
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

    useEffect(() => {
        const fetchUnreadCounts = async () => {
            if (!user) return;
            try {
                const outb = selectedTeam === PERSONAL_BUYER
                    ? await interGroupOrderService.getMyOutboundOrders()
                    : await interGroupOrderService.getOutboundOrders(selectedTeam);
                setUnreadOutboundCount(outb.filter(o => o.buyerViewed === false).length);

                if (selectedTeam !== PERSONAL_BUYER) {
                    const inb = await interGroupOrderService.getInboundOrders(selectedTeam);
                    setUnreadInboundCount(inb.filter(o => o.sellerViewed === false).length);
                } else {
                    setUnreadInboundCount(0);
                }
            } catch (err) {}
        };
        fetchUnreadCounts();
    }, [selectedTeam, orders, user]);

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

    const handleApproveCancel = async (orderId: string) => {
        if (!confirm('Bạn có chắc chắn muốn đồng ý hủy đơn hàng này?')) return;
        try {
            await interGroupOrderService.approveCancelOrder(orderId);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'CANCELED', cancelRequested: false, cancelledBy: 'BUYER' } : o));
        } catch (err) {
            alert('Có lỗi xảy ra.');
            console.error(err);
        }
    };

    const handleRejectCancel = async (orderId: string) => {
        if (!confirm('Từ chối yêu cầu hủy đơn này? Đơn hàng sẽ tiếp tục trạng thái bình thường.')) return;
        try {
            await interGroupOrderService.rejectCancelOrder(orderId);
            setOrders(orders.map(o => o.id === orderId ? { ...o, cancelRequested: false } : o));
        } catch (err) {
            alert('Có lỗi xảy ra.');
            console.error(err);
        }
    };

    const getStatusBadge = (order: InterGroupOrder) => {
        if (order.cancelRequested) return <span className="status-badge status-rejected"><ion-icon name="alert-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Yêu cầu hủy</span>;
        switch (order.status) {
            case 'PENDING': return <span className="status-badge status-pending"><ion-icon name="time-outline" style={{ fontSize: '13px' }}></ion-icon> Chờ xử lý</span>;
            case 'ACCEPTED': return <span className="status-badge status-accepted"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Đã nhận làm</span>;
            case 'REJECTED': return <span className="status-badge status-rejected"><ion-icon name="close-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Bị từ chối</span>;
            case 'COMPLETED': return <span className="status-badge status-completed"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Hoàn thành</span>;
            case 'CANCELED': return <span className="status-badge status-canceled"><ion-icon name="ban-outline" style={{ fontSize: '13px' }}></ion-icon> Đã hủy</span>;
            default: return <span className="status-badge">{status}</span>;
        }
    };

    const pendingInboundCount = activeTab === 'inbound'
        ? orders.filter(order => order.status === 'PENDING').length
        : 0;

    const deliveryFailureLabel = (action?: string) => {
        switch (action) {
            case 'RETRY_LATER': return 'Giao lại sau';
            case 'LEAVE_AT_DOOR': return 'Để hàng tại cổng/kho';
            case 'RETURN_TO_SENDER': return 'Trả hàng về cho xưởng';
            case 'CONTACT_ALTERNATIVE': return 'Liên hệ SĐT phụ';
            default: return action || 'Chưa chọn';
        }
    };

    const formatDeliveryTime = (from?: string, to?: string) => {
        if (!from && !to) return null;
        const fmt = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        if (from && to) return `${fmt(from)} → ${fmt(to)}`;
        if (from) return `Từ ${fmt(from)}`;
        return `Đến ${fmt(to!)}`;
    };

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
                    <label style={{ marginRight: '10px', color: 'var(--text-secondary)' }}>Bên đặt / xưởng quản lý:</label>
                    <select
                        className="form-input"
                        style={{ display: 'inline-block', width: 'auto', padding: '8px 16px', cursor: 'pointer' }}
                        value={selectedTeam}
                        onChange={e => setSelectedTeam(e.target.value)}
                    >
                        <option value={PERSONAL_BUYER}>Tài khoản cá nhân</option>
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
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <ion-icon name="arrow-up-outline" style={{ fontSize: '15px' }}></ion-icon> Đơn đã đi đặt (Mua)
                        {unreadOutboundCount > 0 && <span className="nav-badge" style={{ background: '#E53935', color: '#fff', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', marginLeft: 4 }}>{unreadOutboundCount}</span>}
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'inbound' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('inbound');
                            if (selectedTeam === PERSONAL_BUYER && myTeams[0]) setSelectedTeam(myTeams[0].id);
                        }}
                        disabled={myTeams.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <ion-icon name="arrow-down-outline" style={{ fontSize: '15px' }}></ion-icon> Đơn xưởng khác đặt (Bán/Gia công)
                        {unreadInboundCount > 0 && <span className="nav-badge" style={{ background: '#E53935', color: '#fff', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', marginLeft: 4 }}>{unreadInboundCount}</span>}
                    </button>
                </div>
            </div>

            {!loading && pendingInboundCount > 0 && (
                <div
                    className="glass-panel"
                    style={{
                        marginBottom: 20,
                        padding: '16px 20px',
                        border: '1px solid rgba(217, 156, 95, 0.42)',
                        background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.96), rgba(255, 255, 255, 0.92))',
                        color: '#3b2414',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <span className="icon-container glow" style={{ width: 34, height: 34, fontSize: 20 }}>
                        <ion-icon name="notifications-outline"></ion-icon>
                    </span>
                    <div>
                        <strong>Bạn có {pendingInboundCount} đơn đặt hàng mới cần phản hồi.</strong>
                        <p style={{ margin: '4px 0 0', color: '#7a563c' }}>Kiểm tra thông tin đơn, sau đó chấp nhận hoặc từ chối ngay trong bảng bên dưới.</p>
                    </div>
                </div>
            )}

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
                                <>
                                <tr key={order.id} style={{ borderBottom: expandedOrderId === order.id ? 'none' : '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <ion-icon name={expandedOrderId === order.id ? 'chevron-down-outline' : 'chevron-forward-outline'} style={{ fontSize: '14px', color: 'var(--text-secondary)', flexShrink: 0 }}></ion-icon>
                                            <div>
                                                <strong>{order.title}</strong>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                    {order.description}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="group-icon" style={{ fontSize: '1rem', padding: '4px' }}><ion-icon name="business-outline" style={{ fontSize: '16px' }}></ion-icon></span>
                                            {activeTab === 'outbound' ? order.sellerTeamName : (order.buyerTeamName || order.buyerUserName || 'Khách thuê gia công')}
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
                                        {getStatusBadge(order)}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                                            {/* Inbound PENDING: Accept/Reject */}
                                            {activeTab === 'inbound' && order.status === 'PENDING' && !order.cancelRequested && (
                                                <>
                                                    <button className="btn btn-secondary" onClick={() => handleReject(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Từ chối</button>
                                                    <button className="btn btn-primary" onClick={() => handleAccept(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Chấp nhận</button>
                                                </>
                                            )}
                                            {/* Inbound ACCEPTED: Complete */}
                                            {activeTab === 'inbound' && order.status === 'ACCEPTED' && !order.cancelRequested && (
                                                <button className="btn btn-primary" onClick={() => handleComplete(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> Hoàn thành</button>
                                            )}
                                            {/* Inbound CANCEL_REQUESTED: Approve/Reject Cancel */}
                                            {activeTab === 'inbound' && order.cancelRequested && (
                                                <>
                                                    <button className="btn btn-secondary" onClick={() => handleRejectCancel(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Từ chối hủy</button>
                                                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#d32f2f' }} onClick={() => handleApproveCancel(order.id)}>Đồng ý hủy</button>
                                                </>
                                            )}
                                            {/* Both: Cancel (PENDING or ACCEPTED) */}
                                            {(order.status === 'PENDING' || order.status === 'ACCEPTED') && !order.cancelRequested && (
                                                <button className="btn btn-secondary" onClick={() => handleCancel(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}><ion-icon name="ban-outline" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> {activeTab === 'outbound' ? 'Hủy / Xin hủy' : 'Hủy'}</button>
                                            )}
                                            {/* Show canceller */}
                                            {order.status === 'CANCELED' && order.cancelledBy && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bởi: {order.cancelledBy === 'BUYER' ? 'Bên mua' : 'Bên bán'}</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {/* Expandable delivery detail row */}
                                {expandedOrderId === order.id && (
                                    <tr key={`${order.id}-detail`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td colSpan={activeTab === 'inbound' ? 7 : 6} style={{ padding: '0 12px 16px 40px' }}>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 8,
                                                padding: '16px 20px',
                                                marginTop: 4,
                                            }}>
                                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <ion-icon name="location-outline" style={{ fontSize: '16px' }}></ion-icon>
                                                    Thông tin giao nhận hàng
                                                </h4>
                                                {(!order.contactPhone && !order.deliveryAddress) ? (
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Chưa có thông tin giao hàng cho đơn này.</p>
                                                ) : (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px 24px', fontSize: '0.85rem' }}>
                                                        {order.contactPhone && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-secondary)' }}>SĐT liên hệ:</span>
                                                                <strong style={{ marginLeft: 6 }}>{order.contactPhone}</strong>
                                                            </div>
                                                        )}
                                                        {order.contactPhoneAlt && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-secondary)' }}>SĐT phụ:</span>
                                                                <strong style={{ marginLeft: 6 }}>{order.contactPhoneAlt}</strong>
                                                            </div>
                                                        )}
                                                        {order.deliveryAddress && (
                                                            <div style={{ gridColumn: 'span 2' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Địa chỉ giao:</span>
                                                                <strong style={{ marginLeft: 6 }}>{order.deliveryAddress}</strong>
                                                            </div>
                                                        )}
                                                        {formatDeliveryTime(order.preferredDeliveryFrom, order.preferredDeliveryTo) && (
                                                            <div style={{ gridColumn: 'span 2' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Giờ giao mong muốn:</span>
                                                                <strong style={{ marginLeft: 6 }}>{formatDeliveryTime(order.preferredDeliveryFrom, order.preferredDeliveryTo)}</strong>
                                                            </div>
                                                        )}
                                                        {order.deliveryFailureAction && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Nếu không giao được:</span>
                                                                <strong style={{ marginLeft: 6 }}>{deliveryFailureLabel(order.deliveryFailureAction)}</strong>
                                                            </div>
                                                        )}
                                                        {order.deliveryNote && (
                                                            <div style={{ gridColumn: 'span 2' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Ghi chú giao hàng:</span>
                                                                <span style={{ marginLeft: 6 }}>{order.deliveryNote}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
