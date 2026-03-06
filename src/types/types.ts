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
}

// === Goals & Tasks ===
export interface Goal {
    id: string;
    teamId: string;
    teamName: string;
    ownerId: string;
    ownerName: string;
    title: string;
    outputTarget: string;
    rawInstruction: string;
    aiParsedData: string;
    priority: number;
    status: string;
    deadline: string;
    totalTasks: number;
    completedTasks: number;
    createdAt: string;
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
    workload: number;
    actualWorkload: number;
    completionPercentage: number;
    deadline: string;
    createdAt: string;
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
