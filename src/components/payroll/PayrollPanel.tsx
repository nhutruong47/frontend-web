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

type AdjustmentType = 'BONUS' | 'DEDUCTION';

interface PayrollPanelProps {
    teamId: string;
    onEditAttendance?: (memberId: string, date?: string) => void;
}

export default function PayrollPanel({ teamId, onEditAttendance }: PayrollPanelProps) {
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
    const [rateEditingId, setRateEditingId] = useState<string | null>(null);
    const [adjustingItem, setAdjustingItem] = useState<PayrollItem | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('BONUS');
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [rateDraft, setRateDraft] = useState('');
    const [multiplierDraft, setMultiplierDraft] = useState('1,50');

    const load = useCallback(async () => {
        if (!open) return;
        setLoading(true); setError('');
        try { setReport(await payrollService.getReport(teamId, selectedMonth)); }
        catch (err) { setError(errorMessage(err)); }
        finally { setLoading(false); }
    }, [open, selectedMonth, teamId]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        if (!adjustingItem) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busyAction) setAdjustingItem(null);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [adjustingItem, busyAction]);

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
        if (expandedId === item.memberId) {
            setExpandedId(null);
            setRateEditingId(null);
            return;
        }
        setExpandedId(item.memberId);
        setRateEditingId(null);
    };

    const prepareRateDraft = (item: PayrollItem) => {
        setRateDraft(inputMoney(item.hourlyRateVnd));
        setMultiplierDraft(item.overtimeMultiplier.toFixed(2).replace('.', ','));
    };

    const runAction = async (key: string, action: () => Promise<PayrollReport>) => {
        setBusyAction(key); setError('');
        try { setReport(await action()); }
        catch (err) { setError(errorMessage(err)); }
        finally { setBusyAction(''); }
    };

    const saveRate = async (item: PayrollItem) => {
        if (!report) return;
        const rate = parseMoney(rateDraft);
        const multiplier = Number(multiplierDraft.replace(',', '.'));
        const actionKey = `rate-${item.memberId}`;
        setBusyAction(actionKey);
        setError('');
        try {
            const updatedReport = await payrollService.updateProfile(
                teamId, item.memberId, selectedMonth, rate, multiplier,
            );
            setReport(updatedReport);
            setRateEditingId(null);
        } catch (err) {
            setError(errorMessage(err));
            await load();
        } finally {
            setBusyAction('');
        }
    };

    const openAdjustment = (item: PayrollItem) => {
        const netAdjustment = item.allowanceVnd - item.deductionVnd - item.advanceVnd;
        setAdjustingItem(item);
        setAdjustmentType(netAdjustment < 0 ? 'DEDUCTION' : 'BONUS');
        setAdjustmentAmount(inputMoney(Math.abs(netAdjustment)));
        setAdjustmentReason(item.note || '');
    };

    const saveAdjustment = async () => {
        if (!report || !adjustingItem) return;
        const amount = parseMoney(adjustmentAmount);
        if (amount > 0 && adjustmentReason.trim().length < 5) {
            setError('Vui lòng nhập lý do điều chỉnh ít nhất 5 ký tự.');
            return;
        }
        const actionKey = `adjust-${adjustingItem.memberId}`;
        setBusyAction(actionKey);
        setError('');
        try {
            setReport(await payrollService.updateAdjustments(report.runId, adjustingItem.memberId, {
                allowanceVnd: adjustmentType === 'BONUS' ? amount : 0,
                deductionVnd: adjustmentType === 'DEDUCTION' ? amount : 0,
                advanceVnd: 0,
                note: amount > 0 ? adjustmentReason.trim() : '',
            }));
            setAdjustingItem(null);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusyAction('');
        }
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
                        <SummaryCard icon="people-outline" label="Tổng nhân viên" value={`${summary.memberCount}`} hint={`${summary.paidMemberCount} người có phát sinh lương`} tone="violet" />
                        <SummaryCard icon="time-outline" label="Tổng giờ làm" value={`${hours.format(summary.totalHours)}h`} hint={`${hours.format(summary.regularHours)}h giờ thường`} tone="blue" />
                        <SummaryCard icon="flash-outline" label="Tăng ca" value={`${hours.format(summary.overtimeHours)}h`} hint="Hệ số theo từng nhân viên" tone="amber" />
                        <SummaryCard icon="cash-outline" label="Tổng thực nhận" value={formatMoney(summary.netPayVnd)} hint="Sau thưởng và các khoản trừ" tone="green" />
                    </div>

                    <div className="payroll__table-wrap">
                        <table className="payroll__table">
                            <thead><tr>
                                <th>Nhân viên</th><th>Chấm công</th><th>Lương thường</th><th>Tăng ca</th><th>Thưởng / Trừ</th><th>Thực nhận</th>
                            </tr></thead>
                            <tbody>
                                {report.items.map((item, index) => {
                                    const expanded = expandedId === item.memberId;
                                    const editingRate = rateEditingId === item.memberId;
                                    const adjustment = item.allowanceVnd - item.deductionVnd - item.advanceVnd;
                                    const hasWarnings = item.lateDays > 0 || item.missingCheckoutDays > 0 || (item.totalTasks > 0 && item.completedTasks < item.totalTasks);
                                    return [
                                        <tr key={item.memberId} className={expanded ? 'is-expanded' : ''}>
                                            <td><button className="payroll__employee" type="button" onClick={() => expand(item)}>
                                                <span className={`payroll__avatar payroll__avatar--${index % 6}`}>{initials(item.memberName)}</span>
                                                <span><strong>{item.memberName}</strong><small>Mã: {item.memberId.slice(0, 8).toUpperCase()}</small></span>
                                                <ion-icon className="payroll__employee-chevron" name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} />
                                            </button></td>
                                            <td><strong>{item.attendanceDays} ngày · {hours.format(item.regularHours)}h</strong><small className={item.overtimeHours > 0 ? 'is-overtime' : ''}>{item.overtimeHours > 0 ? `+ ${hours.format(item.overtimeHours)}h tăng ca` : 'Không tăng ca'}</small></td>
                                            <td><strong>{formatMoney(item.regularPayVnd)}</strong><small>{hours.format(item.regularHours)}h × {money.format(item.hourlyRateVnd)}đ</small></td>
                                            <td className={item.overtimePayVnd > 0 ? '' : 'is-muted-value'}><strong>{formatMoney(item.overtimePayVnd)}</strong>{item.overtimePayVnd > 0 && <small>{hours.format(item.overtimeHours)}h × {item.overtimeMultiplier.toFixed(2)}</small>}</td>
                                            <td className={adjustment === 0 ? 'is-muted-value' : ''}><strong className={adjustment < 0 ? 'is-negative' : adjustment > 0 ? 'is-positive' : ''}>{adjustment > 0 ? '+' : ''}{formatMoney(adjustment)}</strong>{adjustment !== 0 && <small>Thưởng − khoản trừ</small>}</td>
                                            <td><strong className="payroll__net">{formatMoney(item.netPayVnd)}</strong><small className={hasWarnings ? 'is-warning' : 'is-ready'}>{hasWarnings ? 'Có dữ liệu cần đối soát' : 'Dữ liệu hợp lệ'}</small></td>
                                        </tr>,
                                        expanded && <tr className="payroll__detail-row" key={`${item.memberId}-detail`}><td colSpan={6}>
                                            <div className="payroll__detail">
                                                <section className="payroll__pay-summary">
                                                    <div className="payroll__detail-heading">
                                                        <div><h4>Thực nhận kỳ này</h4><p>Tóm tắt những khoản thực sự ảnh hưởng đến lương.</p></div>
                                                        <div className="payroll__detail-actions">
                                                            {isEditable ? <>
                                                            <button className="payroll__edit-toggle" type="button" onClick={() => openAdjustment(item)}><ion-icon name="add-circle-outline" /> Điều chỉnh</button>
                                                            <button className="payroll__edit-toggle is-secondary" type="button" onClick={() => {
                                                                prepareRateDraft(item);
                                                                setRateEditingId(editingRate ? null : item.memberId);
                                                            }}><ion-icon name="settings-outline" /> Thiết lập đơn giá</button>
                                                            </> : <span className="payroll__locked"><ion-icon name="lock-closed-outline" /> Đã khóa</span>}
                                                            {onEditAttendance && <button className="payroll__edit-toggle is-secondary" type="button" onClick={() => onEditAttendance(item.memberId, item.attendanceLines?.length ? item.attendanceLines[item.attendanceLines.length - 1].date : undefined)}><ion-icon name="time-outline" /> Sửa chấm công</button>}
                                                        </div>
                                                    </div>
                                                    <div className="payroll__breakdown">
                                                        <div><span>Lương thường</span><strong>{formatMoney(item.regularPayVnd)}</strong></div>
                                                        {item.overtimePayVnd > 0 && <div><span>Lương tăng ca</span><strong className="is-positive">+{formatMoney(item.overtimePayVnd)}</strong></div>}
                                                        {item.allowanceVnd > 0 && <div><span>Thưởng</span><strong className="is-positive">+{formatMoney(item.allowanceVnd)}</strong></div>}
                                                        {item.deductionVnd > 0 && <div><span>Khoản trừ</span><strong className="is-negative">−{formatMoney(item.deductionVnd)}</strong></div>}
                                                        {item.advanceVnd > 0 && <div><span>Tạm ứng</span><strong className="is-negative">−{formatMoney(item.advanceVnd)}</strong></div>}
                                                        <div className="payroll__breakdown-total"><span>Thực nhận</span><strong>{formatMoney(item.netPayVnd)}</strong></div>
                                                    </div>
                                                    <details className="payroll__formula-disclosure">
                                                        <summary>Xem chi tiết cách tính <ion-icon name="chevron-down-outline" /></summary>
                                                        <div className="payroll__formula">
                                                            <div className="payroll__formula-line"><span>Lương thường</span><code>{hours.format(item.regularHours)}h × {money.format(item.hourlyRateVnd)}đ</code><strong>{formatMoney(item.regularPayVnd)}</strong></div>
                                                            {item.overtimeHours > 0 && <div className="payroll__formula-line"><span>Lương tăng ca</span><code>{hours.format(item.overtimeHours)}h × {money.format(item.hourlyRateVnd)}đ × {item.overtimeMultiplier.toFixed(2)}</code><strong>{formatMoney(item.overtimePayVnd)}</strong></div>}
                                                            <div className="payroll__formula-line payroll__formula-line--total"><span>Thực nhận</span><code>Lương + thưởng − khoản trừ</code><strong>{formatMoney(item.netPayVnd)}</strong></div>
                                                        </div>
                                                    </details>
                                                    <div className={`payroll__data-check ${hasWarnings ? 'has-warning' : 'is-clear'}`}>
                                                        <div><ion-icon name={hasWarnings ? 'alert-circle-outline' : 'checkmark-circle-outline'} /><strong>{hasWarnings ? 'Lưu ý' : 'Dữ liệu chấm công hợp lệ'}</strong></div>
                                                        {hasWarnings && <div className="payroll__warning-tags">
                                                            {item.totalTasks > 0 && item.completedTasks < item.totalTasks && <span>{item.completedTasks}/{item.totalTasks} công việc hoàn thành</span>}
                                                            {item.lateDays > 0 && <span>{item.lateDays} ngày đi trễ</span>}
                                                            {item.missingCheckoutDays > 0 && <span>{item.missingCheckoutDays} ca thiếu giờ ra</span>}
                                                        </div>}
                                                        <p>Thông tin này chỉ dùng để đối soát, không tự động cộng hoặc khấu trừ lương.</p>
                                                    </div>
                                                </section>
                                                {editingRate && <section className="payroll__editor">
                                                    <div className="payroll__detail-heading"><div><h4>Thiết lập đơn giá</h4><p>Áp dụng cho các lần tính lương tiếp theo; kỳ đã duyệt vẫn giữ nguyên số liệu.</p></div></div>
                                                    <div className="payroll__editor-group">
                                                        <div className="payroll__fields payroll__fields--rate">
                                                            <MoneyField label="Đơn giá/giờ" value={rateDraft} onChange={setRateDraft} disabled={!isEditable} />
                                                            <label><span>Hệ số tăng ca</span><input value={multiplierDraft} onChange={event => setMultiplierDraft(event.target.value.replace(/[^\d,.]/g, '').slice(0, 4))} disabled={!isEditable} inputMode="decimal" /></label>
                                                        </div>
                                                    </div>
                                                    <div className="payroll__editor-actions">
                                                        <button type="button" className="is-cancel" onClick={() => setRateEditingId(null)} disabled={busyAction !== ''}>Hủy</button>
                                                        <button type="button" className="is-save" onClick={() => void saveRate(item)} disabled={busyAction !== ''}><ion-icon name="save-outline" />{busyAction === `rate-${item.memberId}` ? 'Đang lưu…' : 'Lưu đơn giá'}</button>
                                                    </div>
                                                </section>}
                                                <details className="payroll__attendance-detail">
                                                    <summary className="payroll__attendance-heading">
                                                        <div><h4>Chi tiết chấm công và tăng ca</h4><p>Xem ngày làm, giờ vào/ra và thời gian tăng ca đã dùng để tính lương.</p></div>
                                                        <span>{item.attendanceDays} ngày chấm công <ion-icon name="chevron-down-outline" /></span>
                                                    </summary>
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
                                                </details>
                                            </div>
                                        </td></tr>,
                                    ];
                                })}
                            </tbody>
                            <tfoot><tr><td>Tổng cộng</td><td><strong>{hours.format(summary.regularHours)}h</strong><small>+ {hours.format(summary.overtimeHours)}h tăng ca</small></td><td>{formatMoney(report.items.reduce((sum, item) => sum + item.regularPayVnd, 0))}</td><td>{formatMoney(report.items.reduce((sum, item) => sum + item.overtimePayVnd, 0))}</td><td>{formatMoney(summary.allowanceVnd - summary.deductionVnd - summary.advanceVnd)}</td><td>{formatMoney(summary.netPayVnd)}</td></tr></tfoot>
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
            {adjustingItem && <div className="payroll__modal-backdrop" role="presentation" onMouseDown={() => setAdjustingItem(null)}>
                <section className="payroll__modal" role="dialog" aria-modal="true" aria-labelledby="payroll-adjustment-title" onMouseDown={event => event.stopPropagation()}>
                    <header>
                        <div><small>Điều chỉnh kỳ {selectedMonth.split('-').reverse().join('/')}</small><h3 id="payroll-adjustment-title">{adjustingItem.memberName}</h3></div>
                        <button type="button" onClick={() => setAdjustingItem(null)} aria-label="Đóng"><ion-icon name="close-outline" /></button>
                    </header>
                    <div className="payroll__adjustment-types" role="group" aria-label="Loại điều chỉnh">
                        <button type="button" className={adjustmentType === 'BONUS' ? 'is-active is-bonus' : ''} onClick={() => setAdjustmentType('BONUS')}><ion-icon name="add-circle-outline" /> Thưởng</button>
                        <button type="button" className={adjustmentType === 'DEDUCTION' ? 'is-active is-deduction' : ''} onClick={() => setAdjustmentType('DEDUCTION')}><ion-icon name="remove-circle-outline" /> Trừ</button>
                    </div>
                    <MoneyField label="Số tiền" value={adjustmentAmount} onChange={setAdjustmentAmount} disabled={busyAction !== ''} />
                    <label className="payroll__note"><span>Lý do</span><input value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value)} disabled={busyAction !== ''} placeholder="Ví dụ: thưởng hoàn thành đơn hàng" maxLength={500} /></label>
                    <p className="payroll__modal-help">Khoản này chỉ áp dụng cho kỳ đang chọn. Chấm công, đi trễ và công việc không tự động thay đổi tiền lương.</p>
                    <footer className="payroll__editor-actions">
                        <button type="button" className="is-cancel" onClick={() => setAdjustingItem(null)} disabled={busyAction !== ''}>Hủy</button>
                        <button type="button" className="is-save" onClick={() => void saveAdjustment()} disabled={busyAction !== ''}><ion-icon name="save-outline" />{busyAction === `adjust-${adjustingItem.memberId}` ? 'Đang lưu…' : 'Lưu điều chỉnh'}</button>
                    </footer>
                </section>
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
