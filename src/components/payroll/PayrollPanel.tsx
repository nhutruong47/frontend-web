import { useCallback, useEffect, useMemo, useState } from 'react';
import { payrollService } from '../../services/groupService';
import type { PayrollItem, PayrollReport, PayrollStatus } from '../../types/types';
import './PayrollPanel.css';

const money = new Intl.NumberFormat('vi-VN');
const hours = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function formatMoney(value: number) { return `${money.format(Math.round(value || 0))} đ`; }
function inputMoney(value: string | number) {
    const digits = String(value).replace(/\D/g, '').slice(0, 10);
    return digits ? money.format(Number(digits)) : '';
}
function parseMoney(value: string) { return Number(value.replace(/\D/g, '')) || 0; }
function initials(name: string) { return name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase(); }
function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
function formatClock(value?: string | null) { return value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'; }
function attendanceStatus(status?: string | null) {
    return ({ ON_TIME: 'Đúng giờ', LATE: 'Đi trễ', MISSING_CHECKOUT: 'Thiếu giờ ra', ABSENT: 'Vắng' } as Record<string, string>)[status || ''] || 'Chưa xác định';
}
function errorMessage(error: unknown) {
    const candidate = error as { response?: { data?: { message?: string; detail?: string; error?: string } } };
    return candidate.response?.data?.message || candidate.response?.data?.detail || candidate.response?.data?.error || 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}

const statusMeta: Record<PayrollStatus, { label: string; hint: string }> = {
    DRAFT: { label: 'Bản nháp', hint: 'Tự đồng bộ theo chấm công' },
    CALCULATED: { label: 'Đã tính', hint: 'Sẵn sàng để kiểm tra và duyệt' },
    APPROVED: { label: 'Đã duyệt', hint: 'Số liệu đã khóa, chờ xác nhận trả' },
    PAID: { label: 'Đã thanh toán', hint: 'Kỳ lương đã hoàn tất' },
};

interface AdjustmentDraft {
    allowanceVnd: string;
    deductionVnd: string;
    advanceVnd: string;
    note: string;
}

export default function PayrollPanel({ teamId }: { teamId: string }) {
    const [open, setOpen] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [report, setReport] = useState<PayrollReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [busyAction, setBusyAction] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rateDraft, setRateDraft] = useState('');
    const [multiplierDraft, setMultiplierDraft] = useState('1,50');
    const [adjustmentDraft, setAdjustmentDraft] = useState<AdjustmentDraft | null>(null);

    const load = useCallback(async () => {
        if (!open) return;
        setLoading(true); setError('');
        try { setReport(await payrollService.getReport(teamId, selectedMonth)); }
        catch (err) { setError(errorMessage(err)); }
        finally { setLoading(false); }
    }, [open, selectedMonth, teamId]);

    useEffect(() => { void load(); }, [load]);

    const monthOptions = useMemo(() => Array.from({ length: 18 }, (_, index) => {
        const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - index);
        return {
            value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
        };
    }), []);

    const changeMonth = (offset: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + offset, 1);
        const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthOptions.some(option => option.value === next)) setSelectedMonth(next);
    };

    const expand = (item: PayrollItem) => {
        if (expandedId === item.memberId) { setExpandedId(null); return; }
        setExpandedId(item.memberId);
        setRateDraft(inputMoney(item.hourlyRateVnd));
        setMultiplierDraft(item.overtimeMultiplier.toFixed(2).replace('.', ','));
        setAdjustmentDraft({
            allowanceVnd: inputMoney(item.allowanceVnd),
            deductionVnd: inputMoney(item.deductionVnd),
            advanceVnd: inputMoney(item.advanceVnd),
            note: item.note || '',
        });
    };

    const runAction = async (key: string, action: () => Promise<PayrollReport>) => {
        setBusyAction(key); setError('');
        try { setReport(await action()); }
        catch (err) { setError(errorMessage(err)); }
        finally { setBusyAction(''); }
    };

    const saveRate = async (item: PayrollItem) => {
        const rate = parseMoney(rateDraft);
        const multiplier = Number(multiplierDraft.replace(',', '.'));
        await runAction(`rate-${item.memberId}`, () => payrollService.updateProfile(
            teamId, item.memberId, selectedMonth, rate, multiplier,
        ));
    };

    const saveAdjustments = async (item: PayrollItem) => {
        if (!report || !adjustmentDraft) return;
        await runAction(`adjust-${item.memberId}`, () => payrollService.updateAdjustments(report.runId, item.memberId, {
            allowanceVnd: parseMoney(adjustmentDraft.allowanceVnd),
            deductionVnd: parseMoney(adjustmentDraft.deductionVnd),
            advanceVnd: parseMoney(adjustmentDraft.advanceVnd),
            note: adjustmentDraft.note,
        }));
    };

    const exportExcel = async () => {
        setBusyAction('export'); setError('');
        try {
            const response = await payrollService.exportExcel(teamId, selectedMonth);
            const url = URL.createObjectURL(new Blob([response.data]));
            const anchor = document.createElement('a');
            anchor.href = url; anchor.download = `bang-luong-${selectedMonth}.xlsx`; anchor.click();
            URL.revokeObjectURL(url);
        } catch (err) { setError(errorMessage(err)); }
        finally { setBusyAction(''); }
    };

    const summary = report?.summary;
    const meta = report ? statusMeta[report.status] : statusMeta.DRAFT;
    const isEditable = report?.status === 'DRAFT' || report?.status === 'CALCULATED';

    return (
        <section className="payroll" aria-labelledby="payroll-title">
            <header className="payroll__header">
                <div className="payroll__heading">
                    <span className="payroll__heading-icon"><ion-icon name="wallet-outline" /></span>
                    <div>
                        <div className="payroll__title-line">
                            <h3 id="payroll-title">Bảng lương nhân viên</h3>
                            {report && <span className={`payroll__status payroll__status--${report.status.toLowerCase()}`}>{meta.label}</span>}
                        </div>
                        <p>Tính lương từ ca làm đã hoàn tất, có đối soát và khóa kỳ.</p>
                    </div>
                </div>
                <button className="payroll__collapse" type="button" onClick={() => setOpen(current => !current)} aria-expanded={open}>
                    {open ? 'Ẩn bảng' : 'Xem bảng'} <ion-icon name={open ? 'chevron-up-outline' : 'chevron-down-outline'} />
                </button>
            </header>

            {open && <div className="payroll__body">
                <div className="payroll__toolbar">
                    <div className="payroll__period">
                        <button type="button" onClick={() => changeMonth(-1)} aria-label="Tháng trước"><ion-icon name="chevron-back-outline" /></button>
                        <select value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} aria-label="Kỳ lương">
                            {monthOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <button type="button" onClick={() => changeMonth(1)} aria-label="Tháng sau"><ion-icon name="chevron-forward-outline" /></button>
                    </div>
                    <div className="payroll__sync-state">
                        <span className={`payroll__sync-dot payroll__sync-dot--${report?.status.toLowerCase() || 'draft'}`} />
                        <span><strong>{meta.label}</strong><small>{meta.hint}</small></span>
                    </div>
                </div>

                {error && <div className="payroll__alert payroll__alert--danger" role="alert">
                    <ion-icon name="alert-circle-outline" /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Đóng">×</button>
                </div>}

                {summary && summary.missingCheckoutCount > 0 && <div className="payroll__alert payroll__alert--warning">
                    <ion-icon name="time-outline" />
                    <span><strong>Cần đối soát {summary.missingCheckoutCount} ca thiếu giờ ra.</strong> Các ca này chưa được tính vào lương và phải xử lý trước khi chốt kỳ.</span>
                </div>}

                {loading && !report ? <div className="payroll__loading"><span />Đang tổng hợp chấm công…</div> : report && summary ? <>
                    <div className="payroll__summary">
                        <SummaryCard icon="people-outline" label="Nhân sự có lương" value={`${summary.paidMemberCount}/${summary.memberCount}`} hint="Không tính người chưa phát sinh giờ" tone="violet" />
                        <SummaryCard icon="time-outline" label="Giờ thường" value={`${hours.format(summary.regularHours)}h`} hint={`${hours.format(summary.totalHours)}h tổng thời gian`} tone="blue" />
                        <SummaryCard icon="flash-outline" label="Tăng ca" value={`${hours.format(summary.overtimeHours)}h`} hint="Hệ số theo từng nhân viên" tone="amber" />
                        <SummaryCard icon="calendar-outline" label="Ngày công" value={`${summary.attendanceDays}`} hint="Tổng ngày công của nhân viên" tone="blue" />
                        <SummaryCard icon="receipt-outline" label="Quỹ lương gộp" value={formatMoney(summary.grossPayVnd)} hint="Lương thường + tăng ca" tone="amber" />
                        <SummaryCard icon="cash-outline" label="Tổng thực nhận" value={formatMoney(summary.netPayVnd)} hint="Sau phụ cấp và các khoản trừ" tone="green" />
                    </div>

                    <div className="payroll__insight">
                        <span><ion-icon name="checkmark-done-outline" /> KPI công việc: <strong>{summary.completedTasks}/{summary.totalTasks} task hoàn thành</strong></span>
                        <span>Chỉ dùng để đánh giá hiệu suất, không tự cộng hoặc trừ lương.</span>
                    </div>

                    <div className="payroll__table-wrap">
                        <table className="payroll__table">
                            <thead><tr>
                                <th>Nhân viên</th><th>Chấm công</th><th>Đơn giá</th><th>Lương thường</th><th>Tăng ca</th><th>Điều chỉnh</th><th>Thực nhận</th><th aria-label="Chi tiết" />
                            </tr></thead>
                            <tbody>
                                {report.items.map((item, index) => {
                                    const expanded = expandedId === item.memberId;
                                    const adjustment = item.allowanceVnd - item.deductionVnd - item.advanceVnd;
                                    return [
                                        <tr key={item.memberId} className={expanded ? 'is-expanded' : ''}>
                                            <td><button className="payroll__employee" type="button" onClick={() => expand(item)}>
                                                <span className={`payroll__avatar payroll__avatar--${index % 6}`}>{initials(item.memberName)}</span>
                                                <span><strong>{item.memberName}</strong><small>Mã: {item.memberId.slice(0, 8).toUpperCase()}</small></span>
                                            </button></td>
                                            <td><strong>{item.attendanceDays} ngày · {hours.format(item.regularHours)}h</strong><small className={item.overtimeHours > 0 ? 'is-overtime' : ''}>{item.overtimeHours > 0 ? `+ ${hours.format(item.overtimeHours)}h tăng ca` : 'Không tăng ca'}</small></td>
                                            <td><strong>{formatMoney(item.hourlyRateVnd)}</strong><small>× {item.overtimeMultiplier.toFixed(2)} tăng ca</small></td>
                                            <td><strong>{formatMoney(item.regularPayVnd)}</strong><small>{hours.format(item.regularHours)}h × đơn giá</small></td>
                                            <td><strong>{formatMoney(item.overtimePayVnd)}</strong><small>{hours.format(item.overtimeHours)}h × hệ số</small></td>
                                            <td><strong className={adjustment < 0 ? 'is-negative' : adjustment > 0 ? 'is-positive' : ''}>{adjustment > 0 ? '+' : ''}{formatMoney(adjustment)}</strong><small>Phụ cấp − các khoản trừ</small></td>
                                            <td><strong className="payroll__net">{formatMoney(item.netPayVnd)}</strong>{item.missingCheckoutDays > 0 ? <small className="is-warning">{item.missingCheckoutDays} ca cần xử lý</small> : <small>Đã tính đủ dữ liệu hợp lệ</small>}</td>
                                            <td><button className="payroll__expand" type="button" onClick={() => expand(item)} aria-expanded={expanded} aria-label={`Xem chi tiết ${item.memberName}`}><ion-icon name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} /></button></td>
                                        </tr>,
                                        expanded && <tr className="payroll__detail-row" key={`${item.memberId}-detail`}><td colSpan={8}>
                                            <div className="payroll__detail">
                                                <div className="payroll__formula">
                                                    <h4>Cách tính thực nhận</h4>
                                                    <div className="payroll__formula-line"><span>Lương thường</span><code>{hours.format(item.regularHours)}h × {money.format(item.hourlyRateVnd)}đ</code><strong>{formatMoney(item.regularPayVnd)}</strong></div>
                                                    <div className="payroll__formula-line"><span>Lương tăng ca</span><code>{hours.format(item.overtimeHours)}h × {money.format(item.hourlyRateVnd)}đ × {item.overtimeMultiplier.toFixed(2)}</code><strong>{formatMoney(item.overtimePayVnd)}</strong></div>
                                                    <div className="payroll__formula-line payroll__formula-line--total"><span>Thực nhận</span><code>Lương + phụ cấp − khấu trừ − tạm ứng</code><strong>{formatMoney(item.netPayVnd)}</strong></div>
                                                    <div className="payroll__kpi"><span>{item.completedTasks}/{item.totalTasks} task</span><span>{item.lateDays} ngày đi trễ</span><span>{item.missingCheckoutDays} ca thiếu giờ ra</span></div>
                                                </div>
                                                <div className="payroll__editor">
                                                    <h4>Thiết lập lương</h4>
                                                    <div className="payroll__fields payroll__fields--rate">
                                                        <MoneyField label="Đơn giá/giờ" value={rateDraft} onChange={setRateDraft} disabled={!isEditable} />
                                                        <label><span>Hệ số tăng ca</span><input value={multiplierDraft} onChange={event => setMultiplierDraft(event.target.value.replace(/[^\d,.]/g, '').slice(0, 4))} disabled={!isEditable} inputMode="decimal" /></label>
                                                        <button type="button" onClick={() => void saveRate(item)} disabled={!isEditable || busyAction !== ''}>{busyAction === `rate-${item.memberId}` ? 'Đang lưu…' : 'Lưu đơn giá'}</button>
                                                    </div>
                                                    <h4>Điều chỉnh kỳ này</h4>
                                                    {adjustmentDraft && <>
                                                        <div className="payroll__fields">
                                                            <MoneyField label="Phụ cấp" value={adjustmentDraft.allowanceVnd} onChange={value => setAdjustmentDraft({ ...adjustmentDraft, allowanceVnd: value })} disabled={!isEditable} />
                                                            <MoneyField label="Khấu trừ" value={adjustmentDraft.deductionVnd} onChange={value => setAdjustmentDraft({ ...adjustmentDraft, deductionVnd: value })} disabled={!isEditable} />
                                                            <MoneyField label="Tạm ứng" value={adjustmentDraft.advanceVnd} onChange={value => setAdjustmentDraft({ ...adjustmentDraft, advanceVnd: value })} disabled={!isEditable} />
                                                        </div>
                                                        <label className="payroll__note"><span>Ghi chú</span><input value={adjustmentDraft.note} onChange={event => setAdjustmentDraft({ ...adjustmentDraft, note: event.target.value })} disabled={!isEditable} placeholder="Ví dụ: phụ cấp ca đêm" maxLength={500} /></label>
                                                        {isEditable && <button className="payroll__save-adjustment" type="button" onClick={() => void saveAdjustments(item)} disabled={busyAction !== ''}>{busyAction === `adjust-${item.memberId}` ? 'Đang lưu…' : 'Lưu điều chỉnh'}</button>}
                                                    </>}
                                                </div>
                                                <div className="payroll__attendance-detail">
                                                    <div className="payroll__attendance-heading">
                                                        <div><h4>Chi tiết chấm công và tăng ca</h4><p>Giờ tăng ca bắt đầu sau 8 giờ làm việc và thời gian nghỉ, kết thúc tại giờ ra ca.</p></div>
                                                        <span>{item.attendanceLines?.length || 0} ca trong kỳ</span>
                                                    </div>
                                                    {item.attendanceLines?.length ? <div className="payroll__attendance-list">
                                                        {item.attendanceLines.map(line => <div className={`payroll__attendance-line ${line.overtimeHours > 0 ? 'has-overtime' : ''} ${!line.payable ? 'is-unpayable' : ''}`} key={line.id}>
                                                            <div><strong>{formatDate(line.date)}</strong><small>{line.shiftType ? `Ca ${line.shiftType.toLocaleLowerCase('vi-VN')}` : 'Ca làm việc'}</small></div>
                                                            <div><span>Vào ca</span><strong>{formatClock(line.checkInTime)}</strong></div>
                                                            <div><span>Ra ca</span><strong>{formatClock(line.checkOutTime)}</strong></div>
                                                            <div><span>Giờ thường</span><strong>{hours.format(line.regularHours)}h</strong></div>
                                                            <div className="payroll__overtime-window"><span>Tăng ca</span>{line.overtimeHours > 0 ? <><strong>{formatClock(line.overtimeStartTime)}–{formatClock(line.checkOutTime)}</strong><small>{hours.format(line.overtimeHours)} giờ</small></> : <strong>Không có</strong>}</div>
                                                            <div><span>Trạng thái</span><strong className={line.payable ? 'is-valid' : 'is-invalid'}>{attendanceStatus(line.attendanceStatus)}</strong></div>
                                                        </div>)}
                                                    </div> : <div className="payroll__no-attendance">Nhân viên chưa có ca làm trong kỳ này.</div>}
                                                </div>
                                            </div>
                                        </td></tr>,
                                    ];
                                })}
                            </tbody>
                            <tfoot><tr><td>Tổng cộng</td><td><strong>{hours.format(summary.regularHours)}h</strong><small>+ {hours.format(summary.overtimeHours)}h tăng ca</small></td><td>—</td><td>{formatMoney(report.items.reduce((sum, item) => sum + item.regularPayVnd, 0))}</td><td>{formatMoney(report.items.reduce((sum, item) => sum + item.overtimePayVnd, 0))}</td><td>{formatMoney(summary.allowanceVnd - summary.deductionVnd - summary.advanceVnd)}</td><td>{formatMoney(summary.netPayVnd)}</td><td /></tr></tfoot>
                        </table>
                    </div>

                    <footer className="payroll__footer">
                        <div><strong>{meta.label}</strong><span>{report.status === 'DRAFT' ? 'Dữ liệu đang đồng bộ; hãy tính lương sau khi đối soát công.' : report.status === 'CALCULATED' ? 'Đã tính xong; kiểm tra chi tiết trước khi duyệt.' : report.status === 'APPROVED' ? 'Số liệu đã khóa, sẵn sàng xác nhận đã trả.' : `Hoàn tất lúc ${report.paidAt ? new Date(report.paidAt).toLocaleString('vi-VN') : ''}`}</span></div>
                        <div className="payroll__actions">
                            <button type="button" className="is-secondary" onClick={() => void exportExcel()} disabled={busyAction !== ''}><ion-icon name="download-outline" /> Xuất Excel</button>
                            {report.status === 'DRAFT' && <>
                                <button type="button" className="is-primary" onClick={() => void runAction('recalculate', () => payrollService.recalculate(report.runId))} disabled={busyAction !== '' || summary.missingCheckoutCount > 0}><ion-icon name="calculator-outline" /> Tính bảng lương</button>
                            </>}
                            {report.status === 'CALCULATED' && <>
                                <button type="button" className="is-secondary" onClick={() => void runAction('recalculate', () => payrollService.recalculate(report.runId))} disabled={busyAction !== ''}><ion-icon name="refresh-outline" /> Tính lại</button>
                                <button type="button" className="is-primary" onClick={() => window.confirm('Duyệt kỳ lương? Sau khi duyệt, đơn giá và điều chỉnh sẽ bị khóa.') && void runAction('approve', () => payrollService.approve(report.runId))} disabled={busyAction !== '' || summary.missingCheckoutCount > 0}><ion-icon name="shield-checkmark-outline" /> Duyệt bảng lương</button>
                            </>}
                            {report.status === 'APPROVED' && <>
                                <button type="button" className="is-secondary" onClick={() => window.confirm('Mở lại kỳ lương để chỉnh sửa?') && void runAction('reopen', () => payrollService.reopen(report.runId))} disabled={busyAction !== ''}>Mở lại</button>
                                <button type="button" className="is-primary" onClick={() => window.confirm(`Xác nhận đã chuyển ${formatMoney(summary.netPayVnd)} cho nhân viên?`) && void runAction('paid', () => payrollService.markPaid(report.runId))} disabled={busyAction !== ''}><ion-icon name="checkmark-circle-outline" /> Xác nhận đã trả</button>
                            </>}
                        </div>
                    </footer>
                </> : !loading && <div className="payroll__empty">Chưa có dữ liệu bảng lương cho kỳ này.</div>}
            </div>}
        </section>
    );
}

function SummaryCard({ icon, label, value, hint, tone }: { icon: string; label: string; value: string; hint: string; tone: string }) {
    return <article className={`payroll__summary-card payroll__summary-card--${tone}`}>
        <span className="payroll__summary-icon"><ion-icon name={icon} /></span>
        <span><small>{label}</small><strong>{value}</strong><em>{hint}</em></span>
    </article>;
}

function MoneyField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
    return <label><span>{label}</span><div className="payroll__money-input"><input value={value} onChange={event => onChange(inputMoney(event.target.value))} disabled={disabled} inputMode="numeric" /><em>đ</em></div></label>;
}
