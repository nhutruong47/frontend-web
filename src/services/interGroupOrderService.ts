import api from './api';
import type { InterGroupOrder } from '../types/types';

export const interGroupOrderService = {
    getOutboundOrders: (buyerTeamId: string) =>
        api.get<InterGroupOrder[]>(`/api/inter-orders/outbound/${buyerTeamId}`).then(r => r.data),

    getMyOutboundOrders: () =>
        api.get<InterGroupOrder[]>('/api/inter-orders/outbound-personal').then(r => r.data),

    getInboundOrders: (sellerTeamId: string) =>
        api.get<InterGroupOrder[]>(`/api/inter-orders/inbound/${sellerTeamId}`).then(r => r.data),

    placeOrder: (data: Partial<InterGroupOrder>) =>
        api.post<InterGroupOrder>('/api/inter-orders', data).then(r => r.data),

    acceptOrder: (orderId: string) =>
        api.post<InterGroupOrder>(`/api/inter-orders/${orderId}/accept`).then(r => r.data),

    rejectOrder: (orderId: string) =>
        api.post<InterGroupOrder>(`/api/inter-orders/${orderId}/reject`).then(r => r.data),

    cancelOrder: (orderId: string) =>
        api.post<InterGroupOrder>(`/api/inter-orders/${orderId}/cancel`).then(r => r.data),

    approveCancelOrder: (orderId: string) =>
        api.post<InterGroupOrder>(`/api/inter-orders/${orderId}/approve-cancel`).then(r => r.data),

    rejectCancelOrder: (orderId: string) =>
        api.post<InterGroupOrder>(`/api/inter-orders/${orderId}/reject-cancel`).then(r => r.data),

    completeOrder: (orderId: string) =>
        api.post<InterGroupOrder>(`/api/inter-orders/${orderId}/complete`).then(r => r.data),

    markViewed: (orderIds: string[], role: 'BUYER' | 'SELLER') =>
        api.post('/api/inter-orders/mark-viewed', { orderIds, role }).then(r => r.data),
};
