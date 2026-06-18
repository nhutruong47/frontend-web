const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

// 1. Add attendanceService import
if (!content.includes("import { attendanceService } from '../services/attendanceService';")) {
    content = content.replace("import { teamService, goalService, taskService, inventoryService, aiService, aiWorkflowService, getTrialStatus } from '../services/groupService';",
        "import { teamService, goalService, taskService, inventoryService, aiService, aiWorkflowService, getTrialStatus } from '../services/groupService';\nimport { attendanceService } from '../services/attendanceService';");
}

// 2. Add Attendance state and load function in GroupDetailPage component
if (!content.includes('const [attendance, setAttendance] = useState')) {
    const attendanceStateStr = `
    const [attendance, setAttendance] = useState<any>(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    useEffect(() => {
        if (user && teamId) {
            attendanceService.getTodayAttendance(user.id, teamId).then(data => {
                setAttendance(data);
            });
        }
    }, [user, teamId]);

    const handleCheckIn = async () => {
        if (!user || !teamId) return;
        setAttendanceLoading(true);
        try {
            const data = await attendanceService.checkIn(user.id, teamId);
            setAttendance(data);
            addNotification('success', 'Chấm công vào làm thành công!');
        } catch (err: any) {
            addNotification('error', err.response?.data || 'Có lỗi xảy ra khi check-in');
        }
        setAttendanceLoading(false);
    };

    const handleCheckOut = async () => {
        if (!user || !teamId) return;
        setAttendanceLoading(true);
        try {
            const data = await attendanceService.checkOut(user.id, teamId);
            setAttendance(data);
            addNotification('success', 'Chấm công ra về thành công!');
        } catch (err: any) {
            addNotification('error', err.response?.data || 'Có lỗi xảy ra khi check-out');
        }
        setAttendanceLoading(false);
    };
`;
    // Find the place after `const [socketError, setSocketError] = useState(false);`
    content = content.replace('const [socketError, setSocketError] = useState(false);', 'const [socketError, setSocketError] = useState(false);\n' + attendanceStateStr);
}

// 3. Add Check-in UI in the header
if (!content.includes('className="gp-action-btn" onClick={handleCheckIn}')) {
    const attendanceUI = `
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                            {!attendance ? (
                                <button className="gp-action-btn" onClick={handleCheckIn} disabled={attendanceLoading} style={{background: '#10b981', color: '#fff', border: 'none'}}>
                                    <span className="material-symbols-outlined">login</span>
                                    {attendanceLoading ? 'Đang xử lý...' : 'Check In (Vào ca)'}
                                </button>
                            ) : !attendance.checkOutTime ? (
                                <button className="gp-action-btn" onClick={handleCheckOut} disabled={attendanceLoading} style={{background: '#f43f5e', color: '#fff', border: 'none'}}>
                                    <span className="material-symbols-outlined">logout</span>
                                    {attendanceLoading ? 'Đang xử lý...' : 'Check Out (Tan ca)'}
                                </button>
                            ) : (
                                <div style={{padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', fontSize: '13px', fontWeight: 600}}>
                                    Đã hoàn thành ca làm ({attendance.regularHours}h chính + {attendance.overtimeHours}h tăng ca)
                                </div>
                            )}
                        </div>
`;
    // Find the place before `</header>` or inside the `.gp-header-actions`
    content = content.replace('<div className="gp-header-actions">', '<div className="gp-header-actions">\n' + attendanceUI);
}

// 4. Modify SalaryPanel props and state
content = content.replace('function SalaryPanel({ teamId }: { teamId: string }) {', 'function SalaryPanel({ teamId }: { teamId: string }) {\n    const [overtimeRateOverride, setOvertimeRateOverride] = useState<Record<string, number>>({});\n    const [editingOvertimeRate, setEditingOvertimeRate] = useState<string | null>(null);\n    const [tempOvertimeRate, setTempOvertimeRate] = useState(\'\');');

// Add handleOvertimeRateSave
const rateSaveLogic = `
    const handleOvertimeRateEdit = (memberId: string, currentRate: number) => {
        setEditingOvertimeRate(memberId);
        setTempOvertimeRate(currentRate.toString());
    };

    const handleOvertimeRateSave = (memberId: string) => {
        const newRate = parseFloat(tempOvertimeRate);
        if (!isNaN(newRate) && newRate > 0) {
            setOvertimeRateOverride(prev => ({ ...prev, [memberId]: newRate }));
        }
        setEditingOvertimeRate(null);
    };

    const getEffectiveOvertimeRate = (memberId: string, defaultRate: number) => {
        return overtimeRateOverride[memberId] || defaultRate;
    };
`;
if (!content.includes('handleOvertimeRateEdit')) {
    content = content.replace('const getEffectiveRate =', rateSaveLogic + '\n    const getEffectiveRate =');
}

// Update calculateSalary
content = content.replace(/const calculateSalary = \(report: SalaryReport\) => \{[\s\S]*?\};/, `const calculateSalary = (report: any) => {
        const rate = getEffectiveRate(report.memberId, report.hourlyRate);
        const otRate = getEffectiveOvertimeRate(report.memberId, report.overtimeRate || (report.hourlyRate * 1.5));
        return Math.round((report.regularHours * rate) + (report.overtimeHours * otRate));
    };`);

// Update Header Titles
content = content.replace(/'Nhân viên', 'Tổng task', 'Hoàn thành', 'Giờ công', 'Đơn giá\/giờ', 'Lương thực nhận'/, "'Nhân viên', 'Tổng task', 'Hoàn thành', 'Giờ chính', 'Giờ tăng ca', 'Đơn giá', 'Đơn giá OT', 'Lương thực nhận'");
content = content.replace(/gridTemplateColumns: '2fr 1fr 1fr 1fr 1\.2fr 1\.3fr'/g, "gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 1fr 1.3fr'");

// Update total stats
content = content.replace('const totalTasks = salaryData.reduce((sum, s) => sum + s.totalTasks, 0);', `const totalTasks = salaryData.reduce((sum, s) => sum + s.totalTasks, 0);
    const totalRegularHours = salaryData.reduce((sum, s: any) => sum + (s.regularHours || 0), 0);
    const totalOvertimeHours = salaryData.reduce((sum, s: any) => sum + (s.overtimeHours || 0), 0);`);

// Update Row content
// We need to replace the columns inside the row rendering map
const oldRowStrRegex = /\{\/\* Workload \*\/\}([\s\S]*?)\{\/\* Salary \*\/\}/;
const newRowStr = `{/* Regular Hours */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{(s as any).regularHours?.toFixed(1) || '0.0'}</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8' }}>giờ</div>
                                        </div>

                                        {/* Overtime Hours */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{(s as any).overtimeHours?.toFixed(1) || '0.0'}</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8' }}>giờ</div>
                                        </div>

                                        {/* Hourly Rate */}
                                        <div style={{ textAlign: 'center' }}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                                    <input 
                                                        type="number" 
                                                        value={tempRate}
                                                        onChange={e => setTempRate(e.target.value)}
                                                        autoFocus
                                                        style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid #d4a574', fontSize: 13, textAlign: 'center' }}
                                                    />
                                                    <button onClick={() => handleRateSave(s.memberId)} style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✓</button>
                                                    <button onClick={() => setEditingRate(null)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => handleRateEdit(s.memberId, s.hourlyRate)}
                                                    style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '4px 10px', borderRadius: 8,
                                                        background: hourlyRateOverride[s.memberId] ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                                                        color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                        border: '1px dashed var(--border, #334155)'
                                                    }}
                                                >
                                                    {getEffectiveRate(s.memberId, s.hourlyRate).toLocaleString('vi-VN')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Overtime Rate */}
                                        <div style={{ textAlign: 'center' }}>
                                            {editingOvertimeRate === s.memberId ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                                    <input 
                                                        type="number" 
                                                        value={tempOvertimeRate}
                                                        onChange={e => setTempOvertimeRate(e.target.value)}
                                                        autoFocus
                                                        style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid #d4a574', fontSize: 13, textAlign: 'center' }}
                                                    />
                                                    <button onClick={() => handleOvertimeRateSave(s.memberId)} style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✓</button>
                                                    <button onClick={() => setEditingOvertimeRate(null)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => handleOvertimeRateEdit(s.memberId, (s as any).overtimeRate || (s.hourlyRate * 1.5))}
                                                    style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '4px 10px', borderRadius: 8,
                                                        background: overtimeRateOverride[s.memberId] ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                                                        color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                        border: '1px dashed var(--border, #334155)'
                                                    }}
                                                >
                                                    {getEffectiveOvertimeRate(s.memberId, (s as any).overtimeRate || (s.hourlyRate * 1.5)).toLocaleString('vi-VN')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Salary */}`;
content = content.replace(oldRowStrRegex, newRowStr);

// Also remove spin buttons using CSS injection inside GroupDetailPage
if (!content.includes('input[type=number]::-webkit-inner-spin-button')) {
    content = content.replace('export default function GroupDetailPage() {', `import './GroupDetailPage.css';\nexport default function GroupDetailPage() {`);
    fs.writeFileSync(path.join(__dirname, 'src/pages/GroupDetailPage.css'), `
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] {
  -moz-appearance: textfield;
}
`);
}

// Update the total row at the bottom
const oldTotalRowStrRegex = /\{\/\* Total \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*\)\s*\}/;
content = content.replace(/<div style=\{\{ fontSize: 16, fontWeight: 700 \}\}>\{totalWorkload\.toFixed\(1\)\}h<\/div>/, '<div style={{ fontSize: 16, fontWeight: 700 }}>{totalRegularHours.toFixed(1)}h</div>\n                                        <div style={{ fontSize: 16, fontWeight: 700 }}>{totalOvertimeHours.toFixed(1)}h</div>\n                                        <div style={{ fontSize: 16, fontWeight: 700 }}>-</div>');

fs.writeFileSync(pageFile, content, 'utf8');
console.log('GroupDetailPage.tsx updated with Check-in and Overtime logic.');
