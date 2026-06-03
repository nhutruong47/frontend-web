import api from './api';
import type { AdminOrder, AdminOverview, AdminTask, AdminTeam, AdminUser } from '../types/types';

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
    updateUserRole: (id: string, role: AdminUser['role']) =>
        api.patch<AdminUser>(`/api/admin/users/${id}/role`, { role }).then(r => r.data),
    updateTeamPublication: (id: string, published: boolean) =>
        api.patch<AdminTeam>(`/api/admin/teams/${id}/publication`, { published }).then(r => r.data),
    updateTaskStatus: (id: string, status: AdminTask['status']) =>
        api.patch<AdminTask>(`/api/admin/tasks/${id}/status`, { status }).then(r => r.data),
};
