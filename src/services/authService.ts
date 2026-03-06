import api from './api';
import type { LoginRequest, RegisterRequest, AuthResponse, UserInfo } from '../types/types';

export const authService = {
    /**
     * Đăng nhập - POST /api/auth/login
     */
    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/api/auth/login', data);
        return response.data;
    },

    /**
     * Đăng ký - POST /api/auth/register
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/api/auth/register', data);
        return response.data;
    },

    /**
     * Lấy thông tin user hiện tại - GET /api/auth/me
     */
    async getMe(): Promise<UserInfo> {
        const response = await api.get<UserInfo>('/api/auth/me');
        return response.data;
    },
};
