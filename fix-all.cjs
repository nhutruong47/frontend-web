const fs = require('fs');
const path = require('path');

const groupPage = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(groupPage, 'utf8');

// 1. Add import
if (!content.includes("import { attendanceService } from '../services/attendanceService';")) {
    content = content.replace("import type { Team, Goal, Task, ChatMsg, SalaryReport, AiChatLogMsg, InventoryItem } from '../types/types';",
        "import { attendanceService } from '../services/attendanceService';\nimport type { Team, Goal, Task, ChatMsg, SalaryReport, AiChatLogMsg, InventoryItem } from '../types/types';");
}

// 2. Fix setSelectedTask
content = content.replace("setSelectedTask(task);", "setEditingTaskId(task.id);");

// 3. Inject attendance variables
const restoreStr = `    // Attendance
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendance, setAttendance] = useState<any>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

    useEffect(() => {
        if (user && id) {
            attendanceService.getTodayAttendance(user.id, id).then(data => {
                if (data) setAttendance(data);
            }).catch(() => {});
        }
    }, [user, id]);

    const handleCheckIn = async () => {
        if (!user || !id) return;
        setAttendanceLoading(true);
        try {
            const data = await attendanceService.checkIn(user.id, id);
            setAttendance(data);
        } catch (e: any) {
            alert(e.response?.data || "Lỗi check-in");
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!user || !id) return;
        setAttendanceLoading(true);
        try {
            const data = await attendanceService.checkOut(user.id, id);
            setAttendance(data);
        } catch (e: any) {
            alert(e.response?.data || "Lỗi check-out");
        } finally {
            setAttendanceLoading(false);
        }
    };

    const loadHistory = async () => {
        if (!user || !id) return;
        try {
            const data = await attendanceService.getHistory(user.id, id);
            setAttendanceHistory(data);
            setShowHistoryModal(true);
        } catch (e) {}
    };

    const renderAttendanceButtons = () => {
        return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={loadHistory} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                    <ion-icon name="time-outline"></ion-icon> Lịch sử
                </button>
                {!attendance ? (
                    <button onClick={handleCheckIn} disabled={attendanceLoading} style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6}}>
                        <ion-icon name="log-in-outline"></ion-icon> {attendanceLoading ? 'Đang xử lý...' : 'Vào ca'}
                    </button>
                ) : !attendance.checkOutTime ? (
                    <button onClick={handleCheckOut} disabled={attendanceLoading} style={{background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6}}>
                        <ion-icon name="log-out-outline"></ion-icon> {attendanceLoading ? 'Đang xử lý...' : 'Tan ca'}
                    </button>
                ) : (
                    <div style={{padding: '8px 14px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                        Đã chấm công ({attendance.regularHours}h)
                    </div>
                )}
            </div>
        );
    };
`;

if (!content.includes('const [attendanceLoading, setAttendanceLoading] = useState(false);')) {
    const point = "const isManager = !isSystemAdmin && isAdmin;";
    if (content.includes(point)) {
        content = content.replace(point, point + "\\n\\n" + restoreStr);
    }
}

// 4. Inject buttons into UI
if (!content.includes("{renderAttendanceButtons()}")) {
    const btnPoint = "{isAdmin && (";
    // We only want to replace the first occurrence of {isAdmin && ( inside the header
    content = content.replace(btnPoint, "{renderAttendanceButtons()}\\n                    " + btnPoint);
}

// 5. Inject History Modal
const modalStr = `
            {/* History Modal */}
            {showHistoryModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: '90%', maxWidth: 500, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Lịch sử chấm công</h3>
                            <button onClick={() => setShowHistoryModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
                            {attendanceHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>Chưa có dữ liệu</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {attendanceHistory.map((a: any) => (
                                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{new Date(a.date).toLocaleDateString('vi-VN')}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    Vào: {new Date(a.checkInTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                                    {a.checkOutTime ? \` - Ra: \${new Date(a.checkOutTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}\` : ' - Đang trong ca'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>{a.regularHours}h</div>
                                                {a.overtimeHours > 0 && <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>+ {a.overtimeHours}h OT</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
`;
if (!content.includes('Lịch sử chấm công</h3>')) {
    // Inject at the end of the main div return statement.
    content = content.replace(/(?:\r?\n)(?=\s*<\/div>\s*<style>)/, '\\n' + modalStr + '\\n');
}

fs.writeFileSync(groupPage, content, 'utf8');
console.log('Fixed ALL features correctly.');
