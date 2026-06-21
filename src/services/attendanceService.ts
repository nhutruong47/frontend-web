import api from './api';
export type ShiftType = 'SANG' | 'CHIEU' | 'DEM' | 'NGAY';
export type ProductionStage = 'RANH_VA_CHON' | 'RANG' | 'XAY' | 'DONG_GOI' | 'QA';

export interface AttendanceDTO {
    id: string;
    userId: string;
    userName?: string;
    teamId: string;
    date: string;
    shiftType?: ShiftType;
    shiftStartTime?: string;
    shiftEndTime?: string;
    checkInTime?: string;
    checkOutTime?: string | null;
    productionStage?: ProductionStage;
    orderId?: string;
    orderTitle?: string;
    breakMinutes?: number;
    actualWorkHours?: number;
    regularHours?: number;
    overtimeHours?: number;
    attendanceStatus?: string;
    notes?: string;
}

export interface CheckInPayload {
    shiftType: ShiftType;
    stage: ProductionStage;
    orderId?: string;
    breakMinutes?: number;
}

export const attendanceService = {
    checkIn: (userId: string, teamId: string, payload?: Partial<CheckInPayload>) =>
        api.post<AttendanceDTO>(`/api/attendance/check-in/${userId}/${teamId}`, payload || {}).then(r => r.data),

    checkOut: (userId: string, teamId: string) =>
        api.post<AttendanceDTO>(`/api/attendance/check-out/${userId}/${teamId}`).then(r => r.data),

    getTodayAttendance: (userId: string, teamId: string) =>
        api.get<AttendanceDTO>(`/api/attendance/today/${userId}/${teamId}`).then(r => r.data).catch(() => null),

    getHistory: (userId: string, teamId: string) =>
        api.get<AttendanceDTO[]>(`/api/attendance/history/${userId}/${teamId}`).then(r => r.data),

    getTeamHistory: (teamId: string) =>
        api.get<AttendanceDTO[]>(`/api/attendance/team-history/${teamId}`).then(r => r.data),

    getTeamAttendanceToday: (teamId: string) =>
        api.get<AttendanceDTO[]>(`/api/attendance/team-today/${teamId}`).then(r => r.data),

    updateAttendance: (attendanceId: string, payload: { checkInTime?: string, checkOutTime?: string }) =>
        api.put<AttendanceDTO>(`/api/attendance/update/${attendanceId}`, payload).then(r => r.data),

    getProductionStages: () =>
        api.get<ProductionStage[]>('/api/attendance/stages').then(r => r.data),

    getShiftTypes: () =>
        api.get<ShiftType[]>('/api/attendance/shifts').then(r => r.data),
};
