// === Request DTOs ===
export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
}

// === Response DTOs ===
export interface AuthResponse {
    token: string;
    username: string;
    role: string;
}

export interface UserInfo {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    chipId: string;
}

// === Auth State ===
export interface AuthState {
    user: UserInfo | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

// === Team/Group ===
export interface TeamMemberInfo {
    userId: string;
    username: string;
    fullName: string;
    groupRole: string; // OWNER / MEMBER
    joinedAt: string;
    totalTasks?: number;
    completedTasks?: number;
    completionRate?: number;
}

export interface Team {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    ownerName: string;
    memberCount: number;
    members?: TeamMemberInfo[];
    createdAt: string;

    // Advertisement
    isPublished?: boolean;
    specialty?: string;
    capacity?: string;
    region?: string;

    // Trust
    completedOrders?: number;
    cancelledOrders?: number;
    totalOrders?: number;
    trustScore?: number;

    // Invite
    inviteCode?: string;
}

// === Goals & Tasks ===
export interface AiTaskSuggestion {
    title: string;
    description: string;
    workload: number;
    priority: number;
    assigneeRole: 'Senior' | 'Junior' | 'Intern';
}

export interface AiParsedResult {
    phase: string;
    mainGoal: string;
    contingency: string;
    needsClarification: boolean;
    description: string;
    source: string;
    tasks: AiTaskSuggestion[];
}

export interface Goal {
    id: string;
    teamId: string;
    teamName: string;
    ownerId: string;
    ownerName: string;
    title: string;
    outputTarget: string;
    rawInstruction: string;
    aiParsedData: string; // JSON string of AiParsedResult
    priority: number;
    status: string;
    deadline: string;
    totalTasks: number;
    completedTasks: number;
    createdAt: string;
    chatLog?: string;
}

export interface Task {
    id: string;
    goalId: string;
    goalTitle: string;
    memberId: string;
    memberName: string;
    title: string;
    description: string;
    priority: number;
    status: string; // PENDING / IN_PROGRESS / COMPLETED
    acceptanceStatus: string; // WAITING / ACCEPTED / REJECTED
    hourlyRate: number;
    workload: number;
    actualWorkload: number;
    completionPercentage: number;
    deadline: string;
    createdAt: string;
}

// === Chat ===
export interface ChatMsg {
    id: string;
    teamId: string;
    senderId: string;
    senderName: string;
    recipientId?: string;
    recipientName?: string;
    content: string;
    createdAt: string;
}

export interface AiChatLogMsg {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

// === Inter-Group Orders ===
export interface InterGroupOrder {
    id: string;
    buyerTeamId: string;
    buyerTeamName: string;
    sellerTeamId: string;
    sellerTeamName: string;
    title: string;
    description: string;
    quantity: number;
    deadline: string;
    status: string; // PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELED
    linkedGoalId?: string;
    createdAt: string;
    buyerTrustScore?: number;
    cancelledBy?: string;
}

// === Notifications ===
export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: string; // TASK_ASSIGNED / TASK_ACCEPTED / TASK_REJECTED
    taskId: string;
    read: boolean;
    createdAt: string;
}

// === Salary Report ===
export interface SalaryReport {
    memberId: string;
    memberName: string;
    totalTasks: number;
    completedTasks: number;
    totalWorkload: number;
    totalActualWorkload: number;
    hourlyRate: number;
    estimatedSalary: number;
}
