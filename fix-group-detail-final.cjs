const fs = require('fs');
const path = require('path');

const groupPage = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(groupPage, 'utf8');

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

if (!content.includes('const renderAttendanceButtons = () => {')) {
    content = content.replace('const renderUnreadBadge =', renderButtons + '\n    const renderUnreadBadge =');
}

// Ensure the buttons are rendered next to the AI button
if (!content.includes('{renderAttendanceButtons()}')) {
    content = content.replace('{isAdmin && (', '{renderAttendanceButtons()}\n                    {isAdmin && (');
}

// Add history modal if not present
if (!content.includes('Lịch sử chấm công</h3>')) {
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
    // Find the ending </div> of the page. Usually before `</style>\n        </div>` or `</div>\n    );\n}`
    // Let's replace the final return statement block closing.
    content = content.replace(/(?:\r?\n)(?=\s*<\/div>\s*<style>)/, '\n' + modalStr);
    
    // If <style> is not at the end:
    if (!content.includes('Lịch sử chấm công</h3>')) {
        const lastDivMatch = content.lastIndexOf('</div>');
        if (lastDivMatch > -1) {
            content = content.substring(0, lastDivMatch) + modalStr + content.substring(lastDivMatch);
        }
    }
}

fs.writeFileSync(groupPage, content, 'utf8');
console.log('Fixed GroupDetailPage final injection');
