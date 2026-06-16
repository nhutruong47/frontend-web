import api from './api';
import type { Team, Goal, Task, InventoryItem, ProductionOrder, ProductionBatch } from '../types/types';
import type { AppNotification, SalaryReport } from '../types/types';

// === Team/Group API ===
export const teamService = {
    getAllTeams: () => api.get<Team[]>('/api/teams/all').then(r => r.data),
    getMyTeams: () => api.get<Team[]>('/api/teams').then(r => r.data),
    getDetail: (id: string) => api.get<Team>(`/api/teams/${id}`).then(r => r.data),
    create: (data: { name: string; description?: string }) =>
        api.post<Team>('/api/teams', data).then(r => r.data),
    update: (id: string, data: { name: string; description?: string }) =>
        api.put<Team>(`/api/teams/${id}`, data).then(r => r.data),
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
    submitVerification: (teamId: string, data: Partial<Team>) =>
        api.put<Team>(`/api/teams/${teamId}/verification`, data).then(r => r.data),
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
    update: (id: string, data: Partial<Task>) =>
        api.patch<Task>(`/api/tasks/${id}`, data).then(r => r.data),
    updateStatus: (id: string, status: string) =>
        api.patch<Task>(`/api/tasks/${id}/status`, { status }).then(r => r.data),
    updateProgress: (id: string, percentage: number) =>
        api.patch<Task>(`/api/tasks/${id}/progress`, { percentage }).then(r => r.data),
    assign: (id: string, memberId: string) =>
        api.patch<Task>(`/api/tasks/${id}/assign`, { memberId }).then(r => r.data),
    setBackup: (id: string, memberId: string) =>
        api.patch<Task>(`/api/tasks/${id}/backup`, { memberId }).then(r => r.data),
    setSupervisor: (id: string, memberId: string) =>
        api.patch<Task>(`/api/tasks/${id}/supervisor`, { memberId }).then(r => r.data),
    transfer: (id: string, toMemberId: string, reason?: string) =>
        api.patch<Task>(`/api/tasks/${id}/transfer`, { toMemberId, reason, actorType: 'MANAGER' }).then(r => r.data),
    getTransfers: (id: string) =>
        api.get(`/api/tasks/${id}/transfers`).then(r => r.data),
    addDependency: (id: string, dependsOnTaskId: string, dependencyType = 'FINISH_TO_START') =>
        api.post<Task>(`/api/tasks/${id}/dependencies`, { dependsOnTaskId, dependencyType }).then(r => r.data),
    getDependencies: (id: string) =>
        api.get(`/api/tasks/${id}/dependencies`).then(r => r.data),
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

export const productionService = {
    getOrders: (teamId: string) =>
        api.get<ProductionOrder[]>(`/api/production/teams/${teamId}/orders`).then(r => r.data),
    createOrder: (teamId: string, data: Partial<ProductionOrder>) =>
        api.post<ProductionOrder>(`/api/production/teams/${teamId}/orders`, data).then(r => r.data),
    getBatches: (teamId: string) =>
        api.get<ProductionBatch[]>(`/api/production/teams/${teamId}/batches`).then(r => r.data),
    createBatch: (teamId: string, data: Partial<ProductionBatch>) =>
        api.post<ProductionBatch>(`/api/production/teams/${teamId}/batches`, data).then(r => r.data),
};

export const workforceService = {
    getSkills: (teamId: string) =>
        api.get(`/api/workforce/teams/${teamId}/skills`).then(r => r.data),
    createSkill: (teamId: string, data: { name: string; description?: string }) =>
        api.post(`/api/workforce/teams/${teamId}/skills`, data).then(r => r.data),
    getSkillMatrix: (teamId: string) =>
        api.get(`/api/workforce/teams/${teamId}/skill-matrix`).then(r => r.data),
    setWorkerSkill: (teamMemberId: string, skillId: string, level: number) =>
        api.put(`/api/workforce/members/${teamMemberId}/skills/${skillId}`, { level }).then(r => r.data),
};

export const aiPlanService = {
    getByTeam: (teamId: string) =>
        api.get(`/api/ai-plans/teams/${teamId}`).then(r => r.data),
    createDraft: (teamId: string, data: any) =>
        api.post(`/api/ai-plans/teams/${teamId}`, data).then(r => r.data),
    updateStatus: (planId: string, status: string) =>
        api.patch(`/api/ai-plans/${planId}/status`, { status }).then(r => r.data),
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
    tasks?: { title: string, description: string, priority: number, workload: number, suggestedAssignee?: string, suggestedAssigneeId?: string | null, suggestedReason?: string | null, assignee?: string, assigneeRole?: string }[];
}

export const aiService = {
    parseText: (text: string, teamId: string, history?: string) =>
        api.post<AiParseResult>('/api/ai/parse', { text, teamId, history }).then(r => r.data),
};

export interface AiV2ExtractResponse {
    intent: 'PRODUCTION_PLAN' | 'OPERATION_TASK' | 'UNKNOWN';
    confidence: number;
    fields: Record<string, any>;
    missingFields: string[];
    clarifyingQuestion?: string | null;
}

export interface AiV2TaskDraft {
    title: string;
    description?: string | null;
    priority: number;
    workload: number;
    suggestedAssigneeId?: string | null;
    suggestedAssigneeName?: string | null;
    suggestedReason?: string | null;
}

export interface AiV2PlanDraft {
    goalTitle: string;
    outputTarget: string;
    deadline?: string | null;
    priority: number;
    tasks: AiV2TaskDraft[];
}

export const aiWorkflowService = {
    extract: (teamId: string, text: string) =>
        api.post<AiV2ExtractResponse>('/api/ai/v2/extract', { teamId, text }).then(r => r.data),
    plan: (teamId: string, intent: AiV2ExtractResponse['intent'], fields: Record<string, any>) =>
        api.post<AiV2PlanDraft>('/api/ai/v2/plan', { teamId, intent, fields }).then(r => r.data),
    revise: (teamId: string, instruction: string, draft: AiV2PlanDraft) =>
        api.post<AiV2PlanDraft>('/api/ai/v2/revise', { teamId, instruction, draft }).then(r => r.data),
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
