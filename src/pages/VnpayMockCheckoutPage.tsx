import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Landmark, Smartphone, X } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import './VnpayMockCheckoutPage.css';

const planMap: Record<string, { name: string; amount: number }> = {
    plus: { name: 'AI Plus', amount: 129000 },
    pro: { name: 'AI Pro', amount: 249000 },
};

const banks = ['Vietcombank', 'VietinBank', 'BIDV', 'VPBank', 'MBBank', 'ACB', 'TPBank', 'VIB', 'Techcombank', 'OCB', 'MSB', 'HDBank'];

function formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

function FakeQr({ seed }: { seed: string }) {
    const cells = useMemo(() => Array.from({ length: 225 }, (_, index) => {
        const code = seed.charCodeAt(index % seed.length) || 37;
        return (index + code + (index * 7)) % 5 < 2;
    }), [seed]);

    return (
        <div className="mock-qr" aria-label="QR thanh toán mô phỏng">
            {cells.map((filled, index) => (
                <span key={index} className={filled ? 'filled' : ''} />
            ))}
        </div>
    );
}

export default function VnpayMockCheckoutPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const planId = searchParams.get('planId') || 'plus';
    const plan = planMap[planId] ?? planMap.plus;
    const [cardNumber, setCardNumber] = useState('');
    const [cardDate, setCardDate] = useState('');
    const [cardName, setCardName] = useState('');
    const [bank, setBank] = useState('Vietcombank');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canSubmit = cardNumber.trim().length >= 6 && cardDate.trim().length >= 4 && cardName.trim().length >= 2;

    const handleSubmit = async () => {
        if (!canSubmit || loading) return;
        setLoading(true);
        setError('');
        try {
            const response = await paymentService.createMockTransfer(planId);
            localStorage.setItem('orca-ai-plan', planId);
            const params = new URLSearchParams({
                status: response.status,
                txnRef: response.txnRef,
                planId: response.planId,
                message: `Thanh toán ảo qua ${bank} thành công`,
            });
            navigate(`/payment-result?${params.toString()}`);
        } catch (err) {
            const maybeAxios = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
            setError(maybeAxios.response?.data?.message || maybeAxios.response?.data?.error || maybeAxios.message || 'Không thể xác thực giao dịch ảo.');
            setLoading(false);
        }
    };

    return (
        <div className="vnpay-mock-page">
            <header className="vnpay-mock-header">
                <Link to="/upgrade" className="vnpay-back">
                    <ArrowLeft size={18} />
                    Quay lại
                </Link>
                <div className="vnpay-brand">
                    <span>VNPAY</span>
                    <strong>QR</strong>
                </div>
                <button type="button" className="vnpay-close" onClick={() => navigate('/upgrade')} title="Hủy thanh toán">
                    <X size={20} />
                </button>
            </header>

            <main className="vnpay-mock-shell">
                <div className="vnpay-notice">
                    Quý khách vui lòng không tắt trình duyệt cho đến khi nhận được kết quả giao dịch trên website.
                </div>

                <section className="vnpay-columns">
                    <aside className="vnpay-qr-panel">
                        <h2>Ứng dụng mobile quét mã QR</h2>
                        <div className="vnpay-logo-line">
                            <span>VNPAY</span>
                            <strong>QR</strong>
                        </div>
                        <FakeQr seed={`${planId}-${plan.amount}-${bank}`} />
                        <span className="scan-label">Scan to Pay</span>
                        <img
                            className="vnpay-coffee-thumb"
                            src="https://images.pexels.com/photos/32732219/pexels-photo-32732219.jpeg?auto=compress&cs=tinysrgb&w=600"
                            alt="Cà phê đá Việt Nam"
                        />
                        <p>Nạp tiền gói {plan.name}</p>
                        <strong className="vnpay-amount">{formatCurrency(plan.amount)}</strong>
                        <button type="button" className="vnpay-help">Hướng dẫn thanh toán?</button>
                    </aside>

                    <section className="vnpay-bank-panel">
                        <h2>Thanh toán qua Ngân hàng {bank}</h2>

                        <label className="vnpay-field">
                            <span><CreditCard size={15} /> Số thẻ</span>
                            <input
                                value={cardNumber}
                                onChange={event => setCardNumber(event.target.value)}
                                placeholder="9704 0000 0000 0018"
                                inputMode="numeric"
                            />
                        </label>

                        <label className="vnpay-field">
                            <span>MM/YY</span>
                            <input
                                value={cardDate}
                                onChange={event => setCardDate(event.target.value)}
                                placeholder="07/30"
                            />
                        </label>

                        <label className="vnpay-field">
                            <span>Tên chủ thẻ không dấu</span>
                            <input
                                value={cardName}
                                onChange={event => setCardName(event.target.value)}
                                placeholder="NGUYEN VAN A"
                            />
                        </label>

                        <label className="vnpay-field">
                            <span><Landmark size={15} /> Ngân hàng</span>
                            <select value={bank} onChange={event => setBank(event.target.value)}>
                                {banks.map(item => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>

                        {error && <div className="vnpay-error">{error}</div>}

                        <button type="button" className="vnpay-confirm" onClick={handleSubmit} disabled={!canSubmit || loading}>
                            {loading ? 'Đang xác thực...' : 'Xác thực'}
                        </button>
                        <button type="button" className="vnpay-cancel" onClick={() => navigate('/upgrade')}>
                            Hủy
                        </button>
                    </section>
                </section>

                <section className="vnpay-bank-list" aria-label="Ngân hàng hỗ trợ">
                    <div className="vnpay-bank-title">
                        <Smartphone size={16} />
                        Sử dụng ứng dụng mở bởi VNPAY
                    </div>
                    <div className="vnpay-bank-grid">
                        {banks.map((item, index) => (
                            <button
                                type="button"
                                key={item}
                                className={bank === item ? 'active' : ''}
                                onClick={() => setBank(item)}
                            >
                                <CheckCircle2 size={14} />
                                <span>{item}</span>
                                <small>{index % 2 === 0 ? 'Mobile Banking' : 'Smart OTP'}</small>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
