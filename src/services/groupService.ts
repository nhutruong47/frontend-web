import api from './api';
import type { Team, Goal, Task } from '../types/types';

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
}

export const aiService = {
    parseText: (text: string) =>
        api.post<AiParseResult>('/api/ai/parse', { text }).then(r => r.data),
};
