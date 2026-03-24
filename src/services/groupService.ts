import api from './api';
import type { Team, Goal, Task, InventoryItem } from '../types/types';
import type { AppNotification, SalaryReport } from '../types/types';

// === Team/Group API ===
export const teamService = {
    getAllTeams: () => api.get<Team[]>('/api/teams/all').then(r => r.data),
    getMyTeams: () => api.get<Team[]>('/api/teams').then(r => r.data),
    getDetail: (id: string) => api.get<Team>(`/api/teams/${id}`).then(r => r.data),
    create: (data: { name: string; description?: string }) =>
        api.post<Team>('/api/teams', data).then(r => r.data),
    addMember: (teamId: string, email: string) =>
        api.post<{ status: string; message: string; inviteLink?: string }>(`/api/teams/${teamId}/members`, { email }).then(r => r.data),
    removeMember: (teamId: string, userId: string) =>
        api.delete(`/api/teams/${teamId}/members/${userId}`),
    updateMemberLabels: (teamId: string, userId: string, labels: string[]) =>
        api.put<string[]>(`/api/teams/${teamId}/members/${userId}/labels`, { labels }).then(r => r.data),
    deleteTeam: (id: string) => api.delete(`/api/teams/${id}`),
    joinByCode: (inviteCode: string) =>
        api.post<Team>('/api/teams/join', { inviteCode }).then(r => r.data),

    // Advertisement
    advertise: (teamId: string, data: Partial<Team>) =>
        api.put<Team>(`/api/teams/${teamId}/advertise`, data).then(r => r.data),
    unpublish: (teamId: string) =>
        api.put(`/api/teams/${teamId}/unpublish`).then(r => r.data),
};

// === Goal API ===
export const goalService = {
    getByTeam: (teamId: string) =>
        api.get<Goal[]>(`/api/goals?teamId=${teamId}`).then(r => r.data),
    create: (data: Partial<Goal>) =>
        api.post<Goal>('/api/goals', data).then(r => r.data),
    updateStatus: (id: string, status: string) =>
        api.patch<Goal>(`/api/goals/${id}/status`, { status }).then(r => r.data),
    delete: (id: string) => api.delete(`/api/goals/${id}`),
};

// === Task API ===
export const taskService = {
    getByGoal: (goalId: string) =>
        api.get<Task[]>(`/api/tasks/by-goal/${goalId}`).then(r => r.data),
    getMyTasks: (memberId: string) =>
        api.get<Task[]>(`/api/tasks/member/${memberId}`).then(r => r.data),
    create: (data: Partial<Task>) =>
        api.post<Task>('/api/tasks', data).then(r => r.data),
    updateStatus: (id: string, status: string) =>
        api.patch<Task>(`/api/tasks/${id}/status`, { status }).then(r => r.data),
    assign: (id: string, memberId: string) =>
        api.patch<Task>(`/api/tasks/${id}/assign`, { memberId }).then(r => r.data),
    delete: (id: string) => api.delete(`/api/tasks/${id}`),
    getChecklist: (taskId: string) =>
        api.get(`/api/tasks/${taskId}/checklist`).then(r => r.data),
    addChecklistItem: (taskId: string, content: string) =>
        api.post(`/api/tasks/${taskId}/checklist`, { content }).then(r => r.data),
    toggleChecklist: (checklistId: string) =>
        api.patch(`/api/tasks/checklist/${checklistId}/toggle`).then(r => r.data),
    getKpi: (memberId: string) =>
        api.get(`/api/tasks/member/${memberId}/kpi`).then(r => r.data),
    respondToTask: (taskId: string, accepted: boolean) =>
        api.patch<Task>(`/api/tasks/${taskId}/respond`, { accepted }).then(r => r.data),
    getSalaryReport: (teamId: string) =>
        api.get<SalaryReport[]>(`/api/tasks/salary/${teamId}`).then(r => r.data),
};

// === Inventory API ===
export const inventoryService = {
    getByTeam: (teamId: string) =>
        api.get<InventoryItem[]>(`/api/inventory?teamId=${teamId}`).then(r => r.data),
    create: (data: Partial<InventoryItem>) =>
        api.post<InventoryItem>('/api/inventory', data).then(r => r.data),
    updateQuantity: (id: string, quantity: number) =>
        api.patch<InventoryItem>(`/api/inventory/${id}/quantity`, { quantity }).then(r => r.data),
    delete: (id: string) => api.delete(`/api/inventory/${id}`),
};

// === Trial Status ===
export const getTrialStatus = () =>
    api.get<{ aiTrialActive: boolean; daysRemaining: number }>('/api/auth/trial-status').then(r => r.data);

// === AI Service ===
export interface AiParseResult {
    title: string;
    description: string;
    quantity: string | null;
    quantityNumber: number | null;
    unit: string | null;
    deadline: string | null;
    priority: string;
    needsClarification: boolean;
    source: string;
    suggestedQuestions?: string[];
    tasks?: { title: string, description: string, priority: number, workload: number, suggestedAssignee?: string, assignee?: string, assigneeRole?: string }[];
}

export const aiService = {
    parseText: (text: string, teamId: string, history?: string) =>
        api.post<AiParseResult>('/api/ai/parse', { text, teamId, history }).then(r => r.data),
};

// === Chat Service ===
import type { ChatMsg } from '../types/types';

export const chatService = {
    getGroupMessages: (teamId: string) =>
        api.get<ChatMsg[]>(`/api/teams/${teamId}/chat`).then(r => r.data),
    getDirectMessages: (teamId: string, userId: string) =>
        api.get<ChatMsg[]>(`/api/teams/${teamId}/chat/dm/${userId}`).then(r => r.data),
    getDmPreviews: (teamId: string) =>
        api.get<ChatMsg[]>(`/api/teams/${teamId}/chat/dm-previews`).then(r => r.data),
    sendMessage: (teamId: string, content: string, recipientId?: string) =>
        api.post<ChatMsg>(`/api/teams/${teamId}/chat`, { content, recipientId }).then(r => r.data),
    getOnlineUsers: () =>
        api.get<string[]>('/api/presence/online').then(r => r.data),
};

// === Notification Service ===
export const notificationService = {
    getAll: () =>
        api.get<AppNotification[]>('/api/notifications').then(r => r.data),
    getUnreadCount: () =>
        api.get<{ count: number }>('/api/notifications/unread-count').then(r => r.data),
    markAsRead: (id: string) =>
        api.patch(`/api/notifications/${id}/read`).then(r => r.data),
    markAllRead: () =>
        api.patch('/api/notifications/read-all').then(r => r.data),
};
