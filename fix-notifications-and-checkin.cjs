const fs = require('fs');
const path = require('path');

const groupPage = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let groupContent = fs.readFileSync(groupPage, 'utf8');

// 1. Add useSearchParams
if (!groupContent.includes('useSearchParams')) {
    groupContent = groupContent.replace("import { useParams, useNavigate } from 'react-router-dom';", "import { useParams, useNavigate, useSearchParams } from 'react-router-dom';");
    groupContent = groupContent.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n    const [searchParams] = useSearchParams();');
}

// 2. Open task from URL
if (!groupContent.includes("const taskId = searchParams.get('taskId');")) {
    const autoOpenStr = `
    // Auto-open task from URL
    useEffect(() => {
        const taskId = searchParams.get('taskId');
        if (taskId && allTasks.length > 0) {
            const task = allTasks.find(t => t.id === taskId);
            if (task) {
                setSelectedTask(task);
            }
        }
    }, [searchParams, allTasks]);
`;
    groupContent = groupContent.replace('// Chat', autoOpenStr + '\n    // Chat');
}

// 3. Add History State
if (!groupContent.includes('const [showHistoryModal, setShowHistoryModal]')) {
    const historyStateStr = `
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

    const loadHistory = async () => {
        if (!user || !teamId) return;
        try {
            const data = await attendanceService.getHistory(user.id, teamId);
            setAttendanceHistory(data);
            setShowHistoryModal(true);
        } catch (e) {}
    };
`;
    groupContent = groupContent.replace('const [attendanceLoading, setAttendanceLoading] = useState(false);', 'const [attendanceLoading, setAttendanceLoading] = useState(false);\n' + historyStateStr);
}

// 4. Inject Check-in and History buttons
if (!groupContent.includes('const renderAttendanceButtons = () => {')) {
    const renderButtons = `
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
    groupContent = groupContent.replace('const renderUnreadBadge =', renderButtons + '\n    const renderUnreadBadge =');
    
    // Inject the buttons right next to the invite code or AI button
    groupContent = groupContent.replace('{isAdmin && (', '{renderAttendanceButtons()}\n                    {isAdmin && (');
}

// 5. Inject History Modal at the bottom
if (!groupContent.includes('className="gp-history-modal"')) {
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
    groupContent = groupContent.replace('</style>\n        </div>', '</style>\n' + modalStr + '        </div>');
}

fs.writeFileSync(groupPage, groupContent, 'utf8');

// 6. Update Layout.tsx for notification click
const layoutPage = path.join(__dirname, 'src/components/Layout.tsx');
let layoutContent = fs.readFileSync(layoutPage, 'utf8');

if (!layoutContent.includes('taskService.getDetail')) {
    layoutContent = layoutContent.replace("import { notificationService, teamService } from '../services/groupService';", "import { notificationService, teamService, taskService, goalService } from '../services/groupService';");
    
    const clickHandler = `
    const handleNotificationClick = async (notif: AppNotification) => {
        if (!notif.read) {
            try {
                await notificationService.markAsRead(notif.id);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            } catch (e) {}
        }
        setShowNotifications(false);
        if (notif.taskId) {
            try {
                const task = await taskService.getDetail(notif.taskId);
                if (task && task.goalId) {
                    const goal = await goalService.getDetail(task.goalId);
                    if (goal && goal.teamId) {
                        navigate(\`/groups/\${goal.teamId}?taskId=\${task.id}\`);
                    }
                }
            } catch (e) {
                console.error('Failed to load task for notification', e);
            }
        }
    };
`;
    layoutContent = layoutContent.replace(/const handleNotificationClick = async \(notif: AppNotification\) => \{[\s\S]*?\};/, clickHandler.trim());
    fs.writeFileSync(layoutPage, layoutContent, 'utf8');
}

console.log('Features injected successfully.');
