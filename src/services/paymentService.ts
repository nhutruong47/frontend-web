import api from './api';

export interface CreateVnpayPaymentResponse {
    paymentUrl: string;
    txnRef: string;
    planId: string;
    planName: string;
    amount: number;
}

export interface MockTransferResponse {
    status: string;
    txnRef: string;
    planId: string;
    planName: string;
    amount: number;
    message: string;
}

export const paymentService = {
    async createVnpayPayment(planId: string): Promise<CreateVnpayPaymentResponse> {
        const response = await api.post<CreateVnpayPaymentResponse>('/api/payments/vnpay/create', { planId });
        return response.data;
    },

    async createMockTransfer(planId: string): Promise<MockTransferResponse> {
        const response = await api.post<MockTransferResponse>('/api/payments/mock/transfer', { planId });
        return response.data;
    },
};
