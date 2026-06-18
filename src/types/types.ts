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
    aiPlan?: string;
    aiPlanExpiresAt?: string | null;
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
    jobLabels?: string[];
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
    factoryType?: string;
    capacityValue?: number;
    capacityUnit?: string;
    factoryImageUrl?: string;
    factoryImages?: string[];
    verificationStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
    businessLicense?: string;
    businessAddress?: string;
    websiteUrl?: string;
    facebookUrl?: string;
    certificates?: string[];
    certificationDocument?: string;
    verificationRejectReason?: string;

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
    taskCode?: string;
    goalId: string;
    goalTitle: string;
    orderId?: string;
    orderCode?: string;
    batchId?: string;
    batchCode?: string;
    memberId: string;
    memberName: string;
    title: string;
    description: string;
    priority: number;
    status: string; // PENDING / BLOCKED / READY / IN_PROGRESS / WAITING_APPROVAL / COMPLETED / CANCELLED
    acceptanceStatus: string; // WAITING / ACCEPTED / REJECTED
    hourlyRate: number;
    workload: number;
    actualWorkload: number;
    completionPercentage: number;
    productionStage?: string;
    startTime?: string;
    dueTime?: string;
    estimatedDurationMinutes?: number;
    actualStart?: string;
    actualEnd?: string;
    outputTarget?: number;
    actualOutput?: number;
    defectQuantity?: number;
    deadline: string;
    createdById?: string;
    createdByName?: string;
    createdByType?: string;
    updatedById?: string;
    updatedByName?: string;
    updatedByType?: string;
    updatedAt?: string;
    createdAt: string;
    backupMemberId?: string;
    backupMemberName?: string;
    supervisorId?: string;
    supervisorName?: string;
    dependencyTaskCodes?: string[];
    dependencyTaskTitles?: string[];
}

export interface ProductionOrder {
    id: string;
    teamId?: string;
    orderCode: string;
    title: string;
    description?: string;
    customerName?: string;
    productType?: string;
    processType?: string;
    roastLevel?: string;
    packageSize?: string;
    totalPackages?: number;
    expectedYield?: number;
    expectedLoss?: number;
    orderDate?: string;
    confirmDate?: string;
    productionStartDate?: string;
    customerDeliveryDate?: string;
    safetyBufferDays?: number;
    recipientName?: string;
    recipientPhone?: string;
    shippingNote?: string;
    completedQuantity?: number;
    progressPercent?: number;
    internalDeadline?: string;
    inputRequired?: number;
    remainingQuantity?: number;
    outputTarget?: number;
    unit?: string;
    status: string;
    deadline?: string;
    createdAt: string;
    updatedAt?: string;
    contactPhoneAlt?: string;
    deliveryAddress?: string;
    preferredDeliveryFrom?: string;
    preferredDeliveryTo?: string;
    deliveryFailureAction?: string;
    deliveryNote?: string;
    cancelRequested?: boolean;
    buyerViewed?: boolean;
    sellerViewed?: boolean;
}

export interface ProductionBatch {
    id: string;
    teamId?: string;
    order?: ProductionOrder;
    batchCode: string;
    name: string;
    plannedQuantity?: number;
    actualQuantity?: number;
    unit?: string;
    status: string;
    startTime?: string;
    dueTime?: string;
    createdAt: string;
    updatedAt?: string;
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
    buyerTeamId?: string | null;
    buyerTeamName?: string | null;
    buyerUserId?: string | null;
    buyerUserName?: string | null;
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
    // Delivery profile
    contactPhone?: string;
    contactPhoneAlt?: string;
    deliveryAddress?: string;
    preferredDeliveryFrom?: string;
    preferredDeliveryTo?: string;
    deliveryFailureAction?: string; // RETRY_LATER, LEAVE_AT_DOOR, RETURN_TO_SENDER, CONTACT_ALTERNATIVE
    deliveryNote?: string;
    cancelRequested?: boolean;
    buyerViewed?: boolean;
    sellerViewed?: boolean;
    deliveryStatus?: string;
    deliveryConfirmed?: boolean;
}

// === Reviews ===
export interface Review {
    id: string;
    teamId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
    qualityScore?: number;
    timeScore?: number;
    communicationScore?: number;
    supportScore?: number;
    replyText?: string;
    deliveryResult?: string;
    buyerTeamId?: string;
    buyerTeamName?: string;
    buyerUserId?: string;
    buyerUserName?: string;
}

export interface ReviewSummary {
    avgRating: number;
    reviewCount: number;
    onTimeRate: number;
    completedOrders: number;
    totalOrders: number;
    onTimeOrders: number;
    lateOrders: number;
    starCounts: Record<number, number>;
}

// === Production Plans ===
export interface DailyTarget {
    id?: string;
    date: string;
    targetDate?: string;
    targetQuantity: number;
    actualQuantity: number;
    status: string;
    completionRate?: number;
    isHoliday?: boolean;
    targetRoastKg?: number;
    actualRoastKg?: number;
    targetQcKg?: number;
    actualQcKg?: number;
    targetPackagedKg?: number;
    actualPackagedKg?: number;
    notes?: string;
    issues?: string;
}

export interface ProductionPlan {
    id?: string;
    planCode?: string;
    teamId: string;
    orderId: string;
    dailyTargets: DailyTarget[];
    startDate: string;
    endDate: string;
    status: string;
    dailyTargetKg?: number;
    totalWorkingDays?: number;
    totalRoastKg?: number;
    totalQcKg?: number;
    totalPackagedKg?: number;
    totalPackages?: number;
    totalInputKg?: number;
    riskFactors?: string[];
    aiRecommendations?: string[];
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

// === Inventory ===
export interface InventoryItem {
    id: string;
    teamId: string;
    name: string;
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    lastUpdated: string;
}

// === Admin ===
export interface AdminUser {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'MEMBER';
    chipId: string;
    createdAt: string | null;
    aiPlan?: string;
    aiPlanExpiresAt?: string | null;
}

export interface AdminTeam {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    ownerName: string;
    memberCount: number;
    createdAt: string | null;
    published: boolean;
    specialty: string;
    capacity: string;
    region: string;
    factoryType?: string;
    capacityValue?: number;
    capacityUnit?: string;
    factoryImageUrl?: string;
    factoryImages?: string[];
    verificationStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
    businessLicense?: string;
    businessAddress?: string;
    websiteUrl?: string;
    facebookUrl?: string;
    certificates?: string[];
    certificationDocument?: string;
    verificationRejectReason?: string;
    completedOrders: number;
    cancelledOrders: number;
    totalOrders: number;
    trustScore: number;
}

export interface AdminOrder {
    id: string;
    title: string;
    description: string;
    buyerTeamId: string;
    buyerTeamName: string;
    sellerTeamId: string;
    sellerTeamName: string;
    quantity: number;
    deadline: string | null;
    status: string;
    linkedGoalId: string | null;
    createdAt: string | null;
    cancelledBy: string;
}

export interface AdminTask {
    id: string;
    title: string;
    description: string;
    goalId: string;
    goalTitle: string;
    teamId: string;
    teamName: string;
    memberId: string;
    memberName: string;
    priority: number;
    status: 'PENDING' | 'BLOCKED' | 'READY' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED' | 'CANCELLED';
    acceptanceStatus: string;
    completionPercentage: number;
    deadline: string | null;
    createdAt: string | null;
}

export interface AdminPayment {
    id: string;
    txnRef: string;
    userId: string;
    username: string;
    fullName: string;
    email: string;
    planId: string;
    amount: number;
    status: string;
    bankCode: string;
    paymentMethod?: string;
    createdAt: string | null;
    paidAt: string | null;
}

export interface AdminOverview {
    totalUsers: number;
    adminUsers: number;
    memberUsers: number;
    newUsersThisMonth: number;
    newUsersPreviousMonth: number;
    totalTeams: number;
    publishedTeams: number;
    newTeamsThisMonth: number;
    newTeamsPreviousMonth: number;
    totalGoals: number;
    activeGoals: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalOrders: number;
    activeOrders: number;
    totalProductionOrders: number;
    activeProductionOrders: number;
    overdueProductionOrders: number;
    totalBatches: number;
    activeBatches: number;
    completedBatches: number;
    paidPayments: number;
    totalPayments: number;
    revenueThisMonth: number;
    revenuePreviousMonth: number;
    revenueThisYear: number;
    revenuePreviousYear: number;
    revenueTotal: number;
    orderStatusCounts: Record<string, number>;
    productionOrderStatusCounts: Record<string, number>;
    batchStatusCounts: Record<string, number>;
    taskStatusCounts: Record<string, number>;
    recentUsers: AdminUser[];
    recentTeams: AdminTeam[];
}
