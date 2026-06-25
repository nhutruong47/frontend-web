import api from './api';
import type { InterGroupOrder, Review, ReviewSummary } from '../types/types';

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

    /** Người mua xác nhận đã nhận hàng + đánh giá sao */
    buyerConfirmDelivery: (orderId: string, payload: {
        deliveryStatus: 'ON_TIME' | 'LATE' | 'NOT_DELIVERED';
        rating: number;
        comment: string;
    }) =>
        api.post<InterGroupOrder>(`/api/inter-orders/${orderId}/buyer-confirm`, payload).then(r => r.data),

    markViewed: (orderIds: string[], role: 'BUYER' | 'SELLER') =>
        api.post('/api/inter-orders/mark-viewed', { orderIds, role }).then(r => r.data),
};

export const reviewService = {
    getByTeam: (teamId: string) =>
        api.get<Review[]>(`/api/reviews/team/${teamId}`).then(r => r.data),

    getSummary: (teamId: string) =>
        api.get<ReviewSummary>(`/api/reviews/team/${teamId}/summary`).then(r => r.data),

    update: (reviewId: string, payload: {
        rating: number;
        comment: string;
        deliveryResult: 'ON_TIME' | 'LATE' | 'NOT_DELIVERED';
    }) =>
        api.put<Review>(`/api/reviews/${reviewId}`, payload).then(r => r.data),

    remove: (reviewId: string) =>
        api.delete(`/api/reviews/${reviewId}`).then(r => r.data),
};

export const manufacturingRequestService = {
    getAll: () =>
        api.get<any[]>('/api/manufacturing-requests').then(r => r.data),
    create: (data: any) =>
        api.post<any>('/api/manufacturing-requests', data).then(r => r.data),
};
