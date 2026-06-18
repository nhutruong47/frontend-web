import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamService } from '../services/groupService';
import { interGroupOrderService } from '../services/interGroupOrderService';
import type { Team, InterGroupOrder } from '../types/types';

const PERSONAL_BUYER = '__personal__';

const DEFAULT_MANUAL_ORDER_FORM = {
    title: '',
    description: '',
    quantity: 1,
    deadline: new Date().toISOString().split('T')[0],
    customerName: '',
    contactPhone: '',
    deliveryAddress: '',
    deliveryNote: '',
};
export default function OrderManagementPage() {
    const { user } = useAuth();
    const [, setMyTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>(PERSONAL_BUYER);
    const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound');

    const [orders, setOrders] = useState<InterGroupOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [unreadOutboundCount, setUnreadOutboundCount] = useState(0);
    const [unreadInboundCount, setUnreadInboundCount] = useState(0);

    // Confirm delivery modal
    const [confirmModalOrder, setConfirmModalOrder] = useState<InterGroupOrder | null>(null);
    const [confirmStatus, setConfirmStatus] = useState<'ON_TIME' | 'LATE' | 'NOT_DELIVERED'>('ON_TIME');
    const [confirmRating, setConfirmRating] = useState(5);
    const [confirmComment, setConfirmComment] = useState('');
    const [confirmLoading, setConfirmLoading] = useState(false);

    const [showManualOrderForm, setShowManualOrderForm] = useState(false);
    const [manualCreateLoading, setManualCreateLoading] = useState(false);
    const [manualCreateError, setManualCreateError] = useState('');
    const [manualOrderForm, setManualOrderForm] = useState(DEFAULT_MANUAL_ORDER_FORM);

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
                    setSelectedTeam('');
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTeams();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'inbound' && (selectedTeam === PERSONAL_BUYER || selectedTeam === '')) {
            setOrders([]);
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            setLoading(true);
            try {
                if (activeTab === 'outbound') {
                    const data = (selectedTeam === PERSONAL_BUYER || selectedTeam === '')
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
                const outb = (selectedTeam === PERSONAL_BUYER || selectedTeam === '')
                    ? await interGroupOrderService.getMyOutboundOrders()
                    : await interGroupOrderService.getOutboundOrders(selectedTeam);
                setUnreadOutboundCount(outb.filter(o => o.buyerViewed === false).length);

                if (selectedTeam !== PERSONAL_BUYER && selectedTeam !== '') {
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
        if (!confirm('Xưởng đã giao hàng xong? Đơn sẽ chuyển sang trạng thái "Đã giao — Chờ xác nhận".')) return;
        try {
            await interGroupOrderService.completeOrder(orderId);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'DELIVERED' } : o));
        } catch (err) {
            alert('Có lỗi xảy ra.');
            console.error(err);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!confirmModalOrder) return;
        setConfirmLoading(true);
        try {
            const updated = await interGroupOrderService.buyerConfirmDelivery(confirmModalOrder.id, {
                deliveryStatus: confirmStatus,
                rating: confirmRating,
                comment: confirmComment,
            });
            setOrders(orders.map(o => o.id === confirmModalOrder.id ? { ...o, ...updated } : o));
            setConfirmModalOrder(null);
            setConfirmComment('');
            setConfirmRating(5);
            setConfirmStatus('ON_TIME');
            alert('Xác nhận giao hàng thành công! Cảm ơn bạn đã đánh giá.');
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Có lỗi xảy ra khi xác nhận.');
        } finally {
            setConfirmLoading(false);
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

    const handleManualOrderChange = (field: keyof typeof DEFAULT_MANUAL_ORDER_FORM, value: string | number) => {
        setManualOrderForm(prev => ({ ...prev, [field]: value }));
    };

    const handleCreateManualInboundOrder = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedTeam || selectedTeam === PERSONAL_BUYER) {
            setManualCreateError('Vui lòng chọn xưởng nhận đơn trước khi tạo.');
            return;
        }
        if (!manualOrderForm.title.trim()) {
            setManualCreateError('Vui lòng nhập tên đơn hàng.');
            return;
        }
        if (!manualOrderForm.customerName.trim()) {
            setManualCreateError('Vui lòng nhập tên khách/xưởng đặt.');
            return;
        }

        setManualCreateLoading(true);
        setManualCreateError('');
        try {
            const descriptionParts = [
                manualOrderForm.description.trim(),
                manualOrderForm.customerName.trim() ? `Khách/xưởng đặt: ${manualOrderForm.customerName.trim()}` : '',
                manualOrderForm.deliveryNote.trim() ? `Ghi chú: ${manualOrderForm.deliveryNote.trim()}` : '',
            ].filter(Boolean);

            const created = await interGroupOrderService.placeOrder({
                sellerTeamId: selectedTeam,
                title: manualOrderForm.title.trim(),
                description: descriptionParts.join('\n'),
                quantity: Number(manualOrderForm.quantity) || 1,
                deadline: manualOrderForm.deadline,
                contactPhone: manualOrderForm.contactPhone.trim() || undefined,
                deliveryAddress: manualOrderForm.deliveryAddress.trim() || undefined,
                deliveryNote: manualOrderForm.deliveryNote.trim() || undefined,
            });

            setOrders(prev => [created, ...prev]);
            setActiveTab('inbound');
            setShowManualOrderForm(false);
            setManualOrderForm(DEFAULT_MANUAL_ORDER_FORM);
        } catch (err: any) {
            setManualCreateError(err?.response?.data?.message || err?.response?.data?.error || 'Không thể tạo đơn thủ công.');
            console.error(err);
        } finally {
            setManualCreateLoading(false);
        }
    };

    const getStatusBadge = (order: InterGroupOrder) => {
        if (order.cancelRequested) return <span className="status-badge status-rejected"><ion-icon name="alert-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Yêu cầu hủy</span>;
        switch (order.status) {
            case 'PENDING': return <span className="status-badge status-pending"><ion-icon name="time-outline" style={{ fontSize: '13px' }}></ion-icon> Chờ xử lý</span>;
            case 'ACCEPTED': return <span className="status-badge status-accepted"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Đã nhận làm</span>;
            case 'REJECTED': return <span className="status-badge status-rejected"><ion-icon name="close-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Bị từ chối</span>;
            case 'DELIVERED': return <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e' }}><ion-icon name="car-outline" style={{ fontSize: '13px' }}></ion-icon> Đã giao — {order.deliveryConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}</span>;
            case 'COMPLETED': return <span className="status-badge status-completed"><ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px' }}></ion-icon> Hoàn thành</span>;
            case 'CANCELED': return <span className="status-badge status-canceled"><ion-icon name="ban-outline" style={{ fontSize: '13px' }}></ion-icon> Đã hủy</span>;
            default: return <span className="status-badge">{order.status}</span>;
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
                        }}
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

            {activeTab === 'inbound' && (
                <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20, border: '1px solid rgba(217, 156, 95, 0.28)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Đơn xưởng khác đặt</h2>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                                Quản lý đơn bán/gia công cho xưởng đang chọn.
                            </p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setShowManualOrderForm(true);
                                setManualCreateError('');
                            }}
                        >
                            <ion-icon name="add-circle-outline" style={{ fontSize: 16 }}></ion-icon>
                            Tạo đơn hàng thủ công
                        </button>
                    </div>
                </div>
            )}

            {showManualOrderForm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 24, padding: '40px',
                        maxWidth: 1000, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                        maxHeight: '90vh', overflowY: 'auto', position: 'relative'
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowManualOrderForm(false)}
                            style={{ position: 'absolute', top: 24, right: 32, background: 'transparent', border: 'none', fontSize: 32, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            &times;
                        </button>
                        
                        <div style={{ marginBottom: 32 }}>
                            <h2 style={{ margin: 0, fontSize: 28, color: 'var(--text-primary)', fontWeight: 800 }}>Đơn xưởng khác đặt</h2>
                            <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 16 }}>
                                Tạo nhanh đơn bán/gia công thủ công cho xưởng đang chọn.
                            </p>
                        </div>
                        
                        <form onSubmit={handleCreateManualInboundOrder} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Tên đơn hàng *</label>
                                <input
                                    value={manualOrderForm.title}
                                    onChange={event => handleManualOrderChange('title', event.target.value)}
                                    placeholder="VD: Đơn gia công rang 20kg Robusta"
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Khách / xưởng đặt *</label>
                                <input
                                    value={manualOrderForm.customerName}
                                    onChange={event => handleManualOrderChange('customerName', event.target.value)}
                                    placeholder="Tên khách hoặc xưởng đặt"
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Số điện thoại</label>
                                <input
                                    value={manualOrderForm.contactPhone}
                                    onChange={event => handleManualOrderChange('contactPhone', event.target.value)}
                                    placeholder="SĐT liên hệ"
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Số lượng</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={manualOrderForm.quantity}
                                    onChange={event => handleManualOrderChange('quantity', Number(event.target.value))}
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Hạn chót</label>
                                <input
                                    type="date"
                                    value={manualOrderForm.deadline}
                                    onChange={event => handleManualOrderChange('deadline', event.target.value)}
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
                                />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Mô tả đơn</label>
                                <textarea
                                    value={manualOrderForm.description}
                                    onChange={event => handleManualOrderChange('description', event.target.value)}
                                    placeholder="Mặt hàng, quy cách, yêu cầu gia công/bán hàng..."
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none', minHeight: 120, resize: 'vertical' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Địa chỉ giao hàng</label>
                                <input
                                    value={manualOrderForm.deliveryAddress}
                                    onChange={event => handleManualOrderChange('deliveryAddress', event.target.value)}
                                    placeholder="Địa chỉ nhận/giao"
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600 }}>Ghi chú</label>
                                <input
                                    value={manualOrderForm.deliveryNote}
                                    onChange={event => handleManualOrderChange('deliveryNote', event.target.value)}
                                    placeholder="Giao giờ hành chính, gọi trước..."
                                    style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
                                />
                            </div>
                            {manualCreateError && <div style={{ gridColumn: '1/-1', color: '#ef4444', fontSize: 16, fontWeight: 500, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>{manualCreateError}</div>}
                            <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 16 }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowManualOrderForm(false);
                                        setManualCreateError('');
                                    }}
                                    style={{ padding: '14px 28px', fontSize: 16 }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={manualCreateLoading} style={{ opacity: manualCreateLoading ? 0.65 : 1, padding: '14px 28px', fontSize: 16 }}>
                                    {manualCreateLoading ? 'Đang tạo...' : 'Tạo đơn thủ công'}
                                </button>
                            </div>
                        </form>
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
                                            {/* Inbound ACCEPTED: Mark as Delivered */}
                                            {activeTab === 'inbound' && order.status === 'ACCEPTED' && !order.cancelRequested && (
                                                <button className="btn btn-primary" onClick={() => handleComplete(order.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}><ion-icon name="car-outline" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> Đã giao</button>
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
                                            {/* Outbound DELIVERED: Buyer confirms receipt */}
                                            {activeTab === 'outbound' && order.status === 'DELIVERED' && (
                                                <>
                                                    {order.deliveryConfirmed ? (
                                                        <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 8, fontWeight: 700, background: order.deliveryStatus === 'ON_TIME' ? '#dcfce7' : order.deliveryStatus === 'LATE' ? '#fef3c7' : '#fee2e2', color: order.deliveryStatus === 'ON_TIME' ? '#15803d' : order.deliveryStatus === 'LATE' ? '#92400e' : '#dc2626' }}>
                                                            {order.deliveryStatus === 'ON_TIME' ? 'Giao đúng hẹn' : order.deliveryStatus === 'LATE' ? 'Giao trễ' : 'Chưa giao'}
                                                        </span>
                                                    ) : (
                                                        <button className="btn btn-primary" onClick={() => { setConfirmModalOrder(order); setConfirmRating(5); setConfirmComment(''); }} style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#10b981' }}>
                                                            <ion-icon name="checkmark-circle-outline" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: 2 }}></ion-icon> Xác nhận giao hàng
                                                        </button>
                                                    )}
                                                </>
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

            {/* === XÁC NHẬN GIAO HÀNG + ĐÁNH GIÁ MODAL === */}
            {confirmModalOrder && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(6px)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 20, padding: '28px 32px',
                        maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>
                            Xác nhận giao hàng
                        </h2>
                        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14 }}>
                            Xác nhận đơn <strong>"{confirmModalOrder.title}"</strong> đã được giao như thế nào?
                        </p>

                        {/* Delivery result */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Kết quả giao hàng</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {(['ON_TIME', 'LATE', 'NOT_DELIVERED'] as const).map(s => (
                                    <button key={s} onClick={() => setConfirmStatus(s)} style={{
                                        flex: 1, padding: '10px 8px', borderRadius: 10, border: `2px solid ${confirmStatus === s ? (
                                            s === 'ON_TIME' ? '#10b981' : s === 'LATE' ? '#f59e0b' : '#ef4444'
                                        ) : 'var(--border)'}`, background: confirmStatus === s ? (
                                            s === 'ON_TIME' ? '#dcfce7' : s === 'LATE' ? '#fef3c7' : '#fee2e2'
                                        ) : 'transparent', color: confirmStatus === s ? (
                                            s === 'ON_TIME' ? '#15803d' : s === 'LATE' ? '#92400e' : '#dc2626'
                                        ) : 'var(--text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
                                    }}>
                                        {s === 'ON_TIME' ? '✓ Đúng hẹn' : s === 'LATE' ? '⚠ Trễ hẹn' : '✕ Chưa giao'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Star rating */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Đánh giá xưởng</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} onClick={() => setConfirmRating(star)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 28,
                                        color: star <= confirmRating ? '#f59e0b' : '#d1d5db',
                                        transition: 'transform 0.1s', transform: star <= confirmRating ? 'scale(1.15)' : 'scale(1)',
                                    }}>
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comment */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Nhận xét (tùy chọn)</label>
                            <textarea
                                value={confirmComment}
                                onChange={e => setConfirmComment(e.target.value)}
                                placeholder="Chia sẻ trải nghiệm của bạn với xưởng này..."
                                rows={3}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-input)', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmModalOrder(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                Hủy
                            </button>
                            <button onClick={handleConfirmDelivery} disabled={confirmLoading} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: confirmLoading ? '#a8a29e' : '#10b981', color: '#fff', fontWeight: 700, cursor: confirmLoading ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                                {confirmLoading ? 'Đang xác nhận...' : 'Xác nhận & Gửi đánh giá'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
