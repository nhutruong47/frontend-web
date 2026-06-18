const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

// 1. Fix Total Row columns to match 8 columns
const totalRowContent = `<div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Tổng cộng</div>
                                <div style={{ textAlign: 'center', color: '#fff' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalTasks}</span></div>
                                <div style={{ textAlign: 'center', color: '#fff' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalCompleted}</span></div>
                                <div style={{ textAlign: 'center', color: '#fff' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalRegularHours.toFixed(1)}h</span></div>
                                <div style={{ textAlign: 'center', color: '#fff' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalOvertimeHours.toFixed(1)}h</span></div>
                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>—</div>
                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>—</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        padding: '10px 16px', borderRadius: 12,
                                        background: '#d4a574',
                                        color: '#fff', fontWeight: 900, fontSize: 17,
                                        boxShadow: '0 4px 16px rgba(212,165,116,0.4)'
                                    }}>
                                        {totalSalary.toLocaleString('vi-VN')} đ
                                    </div>
                                </div>`;

content = content.replace(/<div style=\{\{ fontSize: 15, fontWeight: 800, color: '#fff' \}\}>Tổng cộng<\/div>[\s\S]*?\{totalSalary\.toLocaleString\('vi-VN'\)\} đ\s*<\/div>\s*<\/div>/, totalRowContent);


// 2. Fix Input Styles for Rate and Overtime Rate
const rateInputReplaced = `{isEditing ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(212, 165, 116, 0.4)' }}>
                                                    <input 
                                                        type="number" 
                                                        value={tempRate}
                                                        onChange={e => setTempRate(e.target.value)}
                                                        autoFocus
                                                        placeholder="Nhập giá..."
                                                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f8fafc', fontSize: 13, textAlign: 'center', outline: 'none', fontWeight: 600 }}
                                                    />
                                                    <div style={{display: 'flex', gap: 4}}>
                                                        <button onClick={() => handleRateSave(s.memberId)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }}>✓</button>
                                                        <button onClick={() => setEditingRate(null)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }}>✕</button>
                                                    </div>
                                                </div>
                                            ) : (`;

const overtimeRateInputReplaced = `{editingOvertimeRate === s.memberId ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                                                    <input 
                                                        type="number" 
                                                        value={tempOvertimeRate}
                                                        onChange={e => setTempOvertimeRate(e.target.value)}
                                                        autoFocus
                                                        placeholder="Nhập giá..."
                                                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f8fafc', fontSize: 13, textAlign: 'center', outline: 'none', fontWeight: 600 }}
                                                    />
                                                    <div style={{display: 'flex', gap: 4}}>
                                                        <button onClick={() => handleOvertimeRateSave(s.memberId)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }}>✓</button>
                                                        <button onClick={() => setEditingOvertimeRate(null)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, cursor: 'pointer', transition: '0.2s' }}>✕</button>
                                                    </div>
                                                </div>
                                            ) : (`;

content = content.replace(/\{isEditing \? \([\s\S]*?\) : \(/, rateInputReplaced);
content = content.replace(/\{editingOvertimeRate === s\.memberId \? \([\s\S]*?\) : \(/, overtimeRateInputReplaced);

// Update unused variables removal if we no longer use totalWorkload
content = content.replace('const totalWorkload = salaryData.reduce((sum, s) => sum + s.totalWorkload, 0);', '// const totalWorkload = salaryData.reduce((sum, s) => sum + s.totalWorkload, 0);');

fs.writeFileSync(pageFile, content, 'utf8');
console.log('GroupDetailPage.tsx UI fixed.');
