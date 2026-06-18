import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productionService } from '../services/groupService';

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const barColor = color || (pct >= 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444');
    return (
        <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
    );
}

export default function ProductionCalendarPage() {
    const { id } = useParams<{ id: string }>();
    const teamId = id || '';

    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultStart.getDate() + 13);

    const [weekStart, setWeekStart] = useState(() => defaultStart.toISOString().split('T')[0]);
    const [calendar, setCalendar] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadCalendar();
    }, [teamId, weekStart]);

    const loadCalendar = async () => {
        setLoading(true);
        try {
            const start = weekStart;
            const end = new Date(new Date(weekStart).getTime() + 13 * 86400000).toISOString().split('T')[0];
            const data = await productionService.getCalendarBoard(teamId, start, end);
            setCalendar(data || []);
        } catch (e) { console.error(e); setCalendar([]); }
        finally { setLoading(false); }
    };

    const prevWeek = () => {
        const d = new Date(new Date(weekStart).getTime() - 14 * 86400000);
        setWeekStart(d.toISOString().split('T')[0]);
    };
    const nextWeek = () => {
        const d = new Date(new Date(weekStart).getTime() + 14 * 86400000);
        setWeekStart(d.toISOString().split('T')[0]);
    };
    const thisWeek = () => {
        const d = new Date();
        d.setDate(today.getDate() - today.getDay() + 1);
        setWeekStart(d.toISOString().split('T')[0]);
    };

    const formatWeekRange = () => {
        const start = new Date(weekStart);
        const end = new Date(new Date(weekStart).getTime() + 13 * 86400000);
        const fmt = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return `${fmt(start)} - ${fmt(end)}`;
    };

    const dayName = (d: Date) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
    const isToday = (d: Date) => {
        const t = new Date();
        return d.toDateString() === t.toDateString();
    };

    return (
        <div style={{ padding: 24, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => navigate(`/groups/${teamId}`)} style={{
                        background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10,
                        width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-secondary)', fontSize: 18,
                    }}>
                        <ion-icon name="chevron-back-outline" />
                    </button>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Lich San Xuat</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatWeekRange()}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={prevWeek} style={{
                        padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer'
                    }}>← Truoc</button>
                    <button onClick={thisWeek} style={{
                        padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', fontWeight: 600
                    }}>Tuan nay</button>
                    <button onClick={nextWeek} style={{
                        padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer'
                    }}>Sau →</button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Dang tai...</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(120px, 1fr))', gap: 8, minWidth: 800 }}>
                        {/* Header row */}
                        {Array.from({ length: 14 }, (_, i) => {
                            const d = new Date(new Date(weekStart).getTime() + i * 86400000);
                            const day = calendar[i];
                            return (
                                <div key={i} style={{
                                    background: isToday(d) ? 'rgba(139,92,246,0.1)' : isWeekend(d) ? 'rgba(0,0,0,0.03)' : 'var(--bg-card)',
                                    border: `1px solid ${isToday(d) ? '#8b5cf6' : 'var(--border)'}`,
                                    borderRadius: 10, padding: '12px 10px', textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{dayName(d)}</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: isToday(d) ? '#8b5cf6' : 'var(--text-primary)' }}>
                                        {d.getDate()}
                                    </div>
                                    {day && (
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                                            {(day.totalActualKg || 0).toLocaleString('vi-VN')} kg
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Row 1: Tong target */}
                        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Tong san luong (kg)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(120px, 1fr))', gap: 8 }}>
                                {Array.from({ length: 14 }, (_, i) => {
                                    const d = new Date(new Date(weekStart).getTime() + i * 86400000);
                                    const day = calendar[i];
                                    const target = day?.totalTargetKg || 0;
                                    const actual = day?.totalActualKg || 0;
                                    const isSat = d.getDay() === 6 || d.getDay() === 0;
                                    return (
                                        <div key={i} style={{
                                            background: isSat ? 'rgba(0,0,0,0.03)' : 'var(--bg-input)',
                                            borderRadius: 8, padding: '8px 10px', minHeight: 60
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                                                <span>Muc tieu</span>
                                            </div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {target.toLocaleString('vi-VN')}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                                                Thuc te: {actual.toLocaleString('vi-VN')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Row 2: Cong doan Rang */}
                        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cong doan Rang</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(120px, 1fr))', gap: 8 }}>
                                {Array.from({ length: 14 }, (_, i) => {
                                    const d = new Date(new Date(weekStart).getTime() + i * 86400000);
                                    const day = calendar[i];
                                    const roast = day?.roast || {};
                                    const isSat = d.getDay() === 6 || d.getDay() === 0;
                                    return (
                                        <div key={i} style={{
                                            background: isSat ? 'rgba(0,0,0,0.03)' : 'rgba(217,119,6,0.05)',
                                            border: '1px solid rgba(217,119,6,0.15)',
                                            borderRadius: 8, padding: '8px 10px', minHeight: 60
                                        }}>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: '#d97706' }}>
                                                {(roast.actualKg || 0).toLocaleString('vi-VN')}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                / {(roast.targetKg || 0).toLocaleString('vi-VN')} kg
                                            </div>
                                            {roast.completionRate > 0 && (
                                                <ProgressBar value={roast.completionRate} max={100} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Row 3: Cong doan QC */}
                        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cong doan QC</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(120px, 1fr))', gap: 8 }}>
                                {Array.from({ length: 14 }, (_, i) => {
                                    const d = new Date(new Date(weekStart).getTime() + i * 86400000);
                                    const day = calendar[i];
                                    const qc = day?.qc || {};
                                    const isSat = d.getDay() === 6 || d.getDay() === 0;
                                    return (
                                        <div key={i} style={{
                                            background: isSat ? 'rgba(0,0,0,0.03)' : 'rgba(59,130,246,0.05)',
                                            border: '1px solid rgba(59,130,246,0.15)',
                                            borderRadius: 8, padding: '8px 10px', minHeight: 60
                                        }}>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>
                                                {(qc.actualKg || 0).toLocaleString('vi-VN')}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                / {(qc.targetKg || 0).toLocaleString('vi-VN')} kg
                                            </div>
                                            {qc.completionRate > 0 && (
                                                <ProgressBar value={qc.completionRate} max={100} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Row 4: Cong doan Dong goi */}
                        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cong doan Dong goi</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(120px, 1fr))', gap: 8 }}>
                                {Array.from({ length: 14 }, (_, i) => {
                                    const d = new Date(new Date(weekStart).getTime() + i * 86400000);
                                    const day = calendar[i];
                                    const pkg = day?.packaging || {};
                                    const isSat = d.getDay() === 6 || d.getDay() === 0;
                                    return (
                                        <div key={i} style={{
                                            background: isSat ? 'rgba(0,0,0,0.03)' : 'rgba(139,92,246,0.05)',
                                            border: '1px solid rgba(139,92,246,0.15)',
                                            borderRadius: 8, padding: '8px 10px', minHeight: 60
                                        }}>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: '#8b5cf6' }}>
                                                {(pkg.actualKg || 0).toLocaleString('vi-VN')}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                / {(pkg.targetKg || 0).toLocaleString('vi-VN')} kg
                                            </div>
                                            {pkg.completionRate > 0 && (
                                                <ProgressBar value={pkg.completionRate} max={100} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Row 5: Gio cong */}
                        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Gio cong & Nhan su</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(120px, 1fr))', gap: 8 }}>
                                {Array.from({ length: 14 }, (_, i) => {
                                    const d = new Date(new Date(weekStart).getTime() + i * 86400000);
                                    const day = calendar[i];
                                    const isSat = d.getDay() === 6 || d.getDay() === 0;
                                    return (
                                        <div key={i} style={{
                                            background: isSat ? 'rgba(0,0,0,0.03)' : 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 8, padding: '8px 10px', minHeight: 60
                                        }}>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: '#8b5cf6' }}>
                                                {(day?.totalWorkerHours || 0).toFixed(1)}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>gio</div>
                                            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 4 }}>
                                                {day?.totalWorkers || 0} nguoi
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Don hang table */}
            {calendar.length > 0 && (
                <div style={{ marginTop: 32 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Tong hop don hang trong tuan</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-input)' }}>
                                    {['Don hang', 'Khach hang', 'San luong', 'Da xong', 'Con lai', 'Tien do', 'Rui ro'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {calendar.flatMap((day: any) => day?.orderRows || []).filter((v: any, i: number, arr: any[]) =>
                                    arr.findIndex((r: any) => r.orderId === v.orderId) === i
                                ).map((row: any) => {
                                    const riskColors: Record<string, { bg: string; color: string }> = {
                                        NONE: { bg: '#dcfce7', color: '#16a34a' },
                                        LOW: { bg: '#dcfce7', color: '#16a34a' },
                                        MEDIUM: { bg: '#fef3c7', color: '#d97706' },
                                        HIGH: { bg: '#fee2e2', color: '#dc2626' },
                                        CRITICAL: { bg: '#dc2626', color: '#fff' },
                                    };
                                    const risk = riskColors[row.riskLevel] || riskColors.LOW;
                                    return (
                                        <tr key={row.orderId} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: 12 }}>{row.orderCode}</div>
                                                <div style={{ fontWeight: 600 }}>{row.title}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.customerName || '-'}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.outputTarget?.toLocaleString('vi-VN')} kg</td>
                                            <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700 }}>{row.completedQuantity?.toLocaleString('vi-VN')} kg</td>
                                            <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: 600 }}>{row.remainingQuantity?.toLocaleString('vi-VN')} kg</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 60, background: 'var(--bg-input)', borderRadius: 4, height: 6 }}>
                                                        <div style={{ width: `${row.progressPercent}%`, height: '100%', background: '#10b981', borderRadius: 4 }} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 12 }}>{row.progressPercent?.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {row.riskLevel !== 'NONE' && (
                                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: risk.bg, color: risk.color }}>
                                                        {row.riskLevel}
                                                    </span>
                                                )}
                                                {row.riskLevel === 'NONE' && <span style={{ color: '#10b981', fontSize: 12 }}>On dinh</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
