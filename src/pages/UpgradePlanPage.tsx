import {
    CheckCircle2,
} from 'lucide-react';
import { paymentService } from '../services/paymentService';
import './UpgradePlanPage.css';

interface Plan {
    id: string;
    name: string;
    price: string;
    priceNote: string;
    subtitle: string;
    target: string;
    featured?: boolean;
    buttonText: string;
    features: string[];
    theme: 'light' | 'beige' | 'dark';
}

const plans: Plan[] = [
    {
        id: 'starter',
        name: 'Cơ bản',
        price: '0đ',
        priceNote: '/tháng',
        subtitle: 'AI quản lý công việc',
        target: 'Dành cho xưởng nhỏ',
        buttonText: 'Bắt đầu',
        features: [
            'AI tạo task từ đơn hàng',
            'AI giao việc cho nhân viên',
            'Theo dõi tiến độ sản xuất',
            'Quản lý đơn hàng và batch',
            'Báo cáo vận hành cơ bản'
        ],
        theme: 'light',
    },
    {
        id: 'professional',
        name: 'Plus',
        price: '129.000đ',
        priceNote: '/tháng',
        subtitle: 'Dùng AI 100 lần',
        target: 'Dành cho xưởng đang tăng trưởng',
        featured: true,
        buttonText: 'Nâng cấp ngay',
        features: [
            'Cảnh báo công việc có nguy cơ trễ',
            'Cảnh báo thiếu nguyên liệu',
            'Phân tích hiệu suất sản xuất',
            'Phát hiện điểm nghẽn trong quy trình',
            'Đề xuất tối ưu tiến độ và nguồn lực'
        ],
        theme: 'beige',
    },
    {
        id: 'enterprise',
        name: 'Doanh nghiệp',
        price: '249.000đ',
        priceNote: '/tháng',
        subtitle: 'Không giới hạn AI trong 30 ngày',
        target: 'Dành cho doanh nghiệp nhiều xưởng',
        buttonText: 'Nâng cấp ngay',
        features: [
            'Lập kế hoạch sản xuất dài hạn',
            'Dự báo nhu cầu và công suất',
            'Mô phỏng trước các kịch bản sản xuất',
            'Quản lý nhiều xưởng trên một nền tảng',
            'Thương hiệu riêng cho doanh nghiệp'
        ],
        theme: 'dark',
    },
];

export default function UpgradePlanPage() {

    const handleSelectPlan = async (plan: Plan) => {
        if (plan.id === 'starter') {
            return;
        }
        localStorage.setItem('orca-ai-plan-pending', plan.id);
        localStorage.setItem('orca-payment-method', 'PAYOS');
        
        try {
            const res = await paymentService.createPayosPayment(plan.id);
            window.location.href = res.checkoutUrl;
        } catch (err) {
            console.error(err);
            alert('Có lỗi xảy ra khi tạo link thanh toán PayOS. Vui lòng thử lại.');
        }
    };

    return (
        <div className="pricing-page">
            <section className="pricing-header">
                <h1>Giải pháp AI cho sản xuất</h1>
                <p>Chọn gói phù hợp để tối ưu quy trình và nâng cao năng suất nhà máy của bạn.</p>
            </section>



            <section className="pricing-grid">
                {plans.map((plan) => {
                    return (
                        <article
                            key={plan.id}
                            className={`pricing-card theme-${plan.theme} ${plan.featured ? 'featured' : ''}`}
                        >
                            {plan.featured && <span className="pricing-ribbon">★ Phổ biến nhất</span>}
                            
                            <h2>{plan.name}</h2>
                            
                            <div className="pricing-price">
                                <strong>{plan.price}</strong>
                                <span>{plan.priceNote}</span>
                            </div>

                            <div className="pricing-subtitle">
                                <strong>{plan.subtitle}</strong>
                                <span>{plan.target}</span>
                            </div>

                            <button
                                type="button"
                                className="pricing-action"
                                onClick={() => handleSelectPlan(plan)}
                            >
                                {plan.buttonText}
                            </button>

                            <ul className="pricing-features">
                                {plan.features.map((feature) => (
                                    <li key={feature}>
                                        <CheckCircle2 className="check-icon" size={18} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}
