import sys

content = """
    return (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 18 }}>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                        <ion-icon name="card-outline" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6, color: '#d4a574' }}></ion-icon> BẢNG LƯƠNG NHÂN VIÊN
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Theo dõi & quản lý chi phí nhân sự</p>
                </div>
                <button onClick={() => { setShowSalary(p => !p); if (!showSalary) loadSalary(); }} style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: 'none',
                    padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    {showSalary ? 'Ẩn bảng' : 'Xem chi tiết'}
                    <ion-icon name={showSalary ? "chevron-up-outline" : "chevron-down-outline"}></ion-icon>
                </button>
            </div>

            {/* Month Selector & Content */}
            {showSalary && (
                <div style={{ borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button 
                                onClick={() => {
                                    const [y, m] = selectedMonth.split('-').map(Number);
                                    const prev = new Date(y, m - 2);
                                    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                                }}
                                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <select 
                                value={selectedMonth} 
                                onChange={e => setSelectedMonth(e.target.value)}
                                style={{ 
                                    padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                                    background: '#fff', fontSize: 13, fontWeight: 600, color: '#1e293b',
                                    cursor: 'pointer', outline: 'none'
                                }}
                            >
                                {Array.from({ length: 12 }, (_, i) => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() - i);
                                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                    return <option key={val} value={val} style={{ color: '#000' }}>{d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</option>;
                                })}
                            </select>
                            <button 
                                onClick={() => {
                                    const [y, m] = selectedMonth.split('-').map(Number);
                                    const next = new Date(y, m);
                                    const now = new Date();
                                    if (next <= now) {
                                        setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                                    }
                                }}
                                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 4 }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                Tự động cập nhật theo giờ công
                            </span>
                        </div>
                    </div>
                    
                    <div style={{ background: '#fff' }}>
                        {/* Summary Stats */}
                        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            {[
                                { label: 'Tổng nhân viên', value: salaryData.length, icon: '👥', color: '#1e293b' },
                                { label: 'Tổng công việc', value: totalTasks.toLocaleString(), icon: '📋', color: '#1e293b' },
                                { label: 'Hoàn thành', value: `${avgCompletion}%`, icon: '✅', color: '#10b981' },
                                { label: 'Tổng quỹ lương', value: `${(totalSalary / 1000000).toFixed(1)}M`, icon: '💰', color: '#d4a574' }
                            ].map((stat, i) => (
                                <div key={i} style={{ 
                                    padding: 16, borderRadius: 12, background: '#f8fafc',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ fontSize: 18 }}>{stat.icon}</span>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{stat.label}</span>
                                    </div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {loadingSalary ? (
                            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#d4a574', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
                                <p>Đang tải dữ liệu...</p>
                            </div>
                        ) : salaryData.length === 0 ? (
                            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Chưa có dữ liệu lương</p>
                                <p style={{ fontSize: 13 }}>Nhân viên chưa có task hoàn thành trong tháng này</p>
                            </div>
                        ) : (
                            <div style={{ padding: '0 28px 24px' }}>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.3fr',
                                    gap: 12, padding: '12px 16px',
                                    background: '#f8fafc', borderRadius: '12px 12px 0 0',
                                    borderBottom: '1px solid #e2e8f0'
                                }}>
                                    {['Nhân viên', 'Tổng task', 'Hoàn thành', 'Giờ công', 'Đơn giá/giờ', 'Lương thực nhận'].map((h, i) => (
                                        <div key={i} style={{ 
                                            fontSize: 11, fontWeight: 700, color: '#64748b', 
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                            textAlign: i >= 1 ? 'center' : 'left'
                                        }}>{h}</div>
                                    ))}
                                </div>

                                {salaryData.map((s, idx) => {
                                    const salary = calculateSalary(s);
                                    const completionRate = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
                                    const isEditing = editingRate === s.memberId;
                                    
                                    return (
                                        <div key={s.memberId} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.3fr',
                                            gap: 12, padding: '14px 16px',
                                            borderBottom: '1px solid #e2e8f0',
                                            alignItems: 'center',
                                            background: idx % 2 === 0 ? '#fff' : '#fcfcfc'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: 12,
                                                    background: ['#d4a574', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'][idx % 6],
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontWeight: 700, fontSize: 14
                                                }}>
                                                    {(s.memberName || '?').split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{s.memberName}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>ID: {s.memberId?.slice(0, 8)}...</div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{s.totalTasks}</div>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ 
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '4px 10px', borderRadius: 20,
                                                    background: completionRate >= 80 ? 'rgba(16, 185, 129, 0.1)' : completionRate >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'
                                                }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.completedTasks}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{completionRate}%</div>
                                            </div>

                                            {/* Workload */}
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{s.totalWorkload.toFixed(1)}</div>
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
                                                            style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #d4a574', fontSize: 13, textAlign: 'center', background: '#fff', color: '#1e293b' }}
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
                                                            background: hourlyRateOverride[s.memberId] ? 'rgba(212,165,116,0.1)' : '#f8fafc',
                                                            color: hourlyRateOverride[s.memberId] ? '#d4a574' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                            border: hourlyRateOverride[s.memberId] ? '1px dashed #d4a574' : '1px dashed #e2e8f0'
                                                        }}
                                                        title="Nhấp để chỉnh sửa đơn giá"
                                                    >
                                                        {getEffectiveRate(s.memberId, s.hourlyRate).toLocaleString('vi-VN')}
                                                        <span style={{ fontSize: 10 }}>đ</span>
                                                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Salary */}
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ color: '#d4a574', fontWeight: 800, fontSize: 15 }}>
                                                    {salary.toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Total Row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.3fr',
                                    gap: 12, padding: '18px 16px',
                                    background: '#f8fafc',
                                    borderTop: '1px solid #e2e8f0',
                                    borderRadius: '0 0 16px 16px',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Tổng cộng</div>
                                    <div style={{ textAlign: 'center', color: '#1e293b' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalTasks}</span></div>
                                    <div style={{ textAlign: 'center', color: '#10b981' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalCompleted}</span></div>
                                    <div style={{ textAlign: 'center', color: '#1e293b' }}><span style={{ fontSize: 16, fontWeight: 800 }}>{totalWorkload.toFixed(1)}h</span></div>
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>—</div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{
                                            color: '#d4a574', fontWeight: 900, fontSize: 17
                                        }}>
                                            {totalSalary.toLocaleString('vi-VN')} đ
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
                            <button style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Xuất Excel
                            </button>
                            <button style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#d4a574', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                Phát lương
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
"""

with open("src/pages/GroupDetailPage.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = -1
for i, line in enumerate(lines):
    if "const avgCompletion =" in line:
        start_idx = i + 2
        break

if start_idx != -1:
    end_idx = -1
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() == "}":
            end_idx = i
            break
    
    if end_idx != -1:
        new_lines = lines[:start_idx] + [content] + lines[end_idx:]
        with open("src/pages/GroupDetailPage.tsx", "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print("Success")
    else:
        print("Could not find end")
else:
    print("Could not find start")
