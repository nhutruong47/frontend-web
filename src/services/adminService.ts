import api from './api';
import type { AdminOrder, AdminOverview, AdminPayment, AdminTask, AdminTeam, AdminUser } from '../types/types';

export const adminService = {
    getOverview: () =>
        api.get<AdminOverview>('/api/admin/overview').then(r => r.data),
    getUsers: () =>
        api.get<AdminUser[]>('/api/admin/users').then(r => r.data),
    getTeams: () =>
        api.get<AdminTeam[]>('/api/admin/teams').then(r => r.data),
    getOrders: () =>
        api.get<AdminOrder[]>('/api/admin/orders').then(r => r.data),
    getTasks: () =>
        api.get<AdminTask[]>('/api/admin/tasks').then(r => r.data),
    getPayments: () =>
        api.get<AdminPayment[]>('/api/admin/payments').then(r => r.data),
    updateUserRole: (id: string, role: AdminUser['role']) =>
        api.patch<AdminUser>(`/api/admin/users/${id}/role`, { role }).then(r => r.data),
    updateUserLock: (id: string, locked: boolean) =>
        api.patch<AdminUser>(`/api/admin/users/${id}/lock`, { locked }).then(r => r.data),
    updateTeamPublication: (id: string, published: boolean) =>
        api.patch<AdminTeam>(`/api/admin/teams/${id}/publication`, { published }).then(r => r.data),
    updateTeamVerification: (id: string, status: 'APPROVED' | 'REJECTED', rejectReason?: string) =>
        api.patch<AdminTeam>(`/api/admin/teams/${id}/verification`, { status, rejectReason }).then(r => r.data),
    updateTaskStatus: (id: string, status: AdminTask['status']) =>
        api.patch<AdminTask>(`/api/admin/tasks/${id}/status`, { status }).then(r => r.data),
    
    // New CRUD Endpoints
    createUser: (details: Partial<AdminUser> & { password?: string }) =>
        api.post<AdminUser>('/api/admin/users', details).then(r => r.data),
    updateUser: (id: string, details: Partial<AdminUser>) =>
        api.put<AdminUser>(`/api/admin/users/${id}`, details).then(r => r.data),
    resetUserPassword: (id: string) =>
        api.post<{ password: string }>(`/api/admin/users/${id}/reset-password`).then(r => r.data),
    
    updateTeam: (id: string, details: Partial<AdminTeam>) =>
        api.put<AdminTeam>(`/api/admin/teams/${id}`, details).then(r => r.data),
    deleteTeam: (id: string) =>
        api.delete(`/api/admin/teams/${id}`).then(r => r.data),
    
    getPlans: () =>
        api.get<any[]>('/api/admin/plans').then(r => r.data),
    createPlan: (plan: any) =>
        api.post<any>('/api/admin/plans', plan).then(r => r.data),
    updatePlan: (id: string, plan: any) =>
        api.put<any>(`/api/admin/plans/${id}`, plan).then(r => r.data),
    deletePlan: (id: string) =>
        api.delete(`/api/admin/plans/${id}`).then(r => r.data),
        
    getAiConfigs: () =>
        api.get<Record<string, string>>('/api/admin/ai-configs').then(r => r.data),
    updateAiConfigs: (configs: Record<string, string>) =>
        api.put('/api/admin/ai-configs', configs).then(r => r.data),
};
