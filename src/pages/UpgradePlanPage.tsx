import { useState } from 'react';
import { Check } from 'lucide-react';
import './UpgradePlanPage.css';

interface Plan {
    id: string;
    name: string;
    subTitle: string;
    price: string;
    priceNote: string;
    featured?: boolean;
    current?: boolean;
    description: string;
    features: string[];
    accent: 'starter' | 'professional' | 'enterprise';
}

const plans: Plan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: '0đ',
        priceNote: '/tháng',
        subTitle: 'AI quản lý công việc',
        description: 'Dành cho xưởng nhỏ',
        features: [
            'AI tạo task từ đơn hàng',
            'AI giao việc cho nhân viên',
            'Theo dõi tiến độ sản xuất',
            'Quản lý đơn hàng và batch',
            'Báo cáo vận hành cơ bản'
        ],
        accent: 'starter',
        current: true,
    },
    {
        id: 'plus', // internal ID maps to 'plus' on backend/vnpay
        name: 'Professional',
        price: '129.000đ',
        priceNote: '/tháng',
        subTitle: 'AI điều phối sản xuất',
        description: 'Dành cho xưởng đang tăng trưởng',
        features: [
            'Cảnh báo công việc có nguy cơ trễ',
            'Cảnh báo thiếu nguyên liệu',
            'Phân tích hiệu suất sản xuất',
            'Phát hiện điểm nghẽn trong quy trình',
            'Đề xuất tối ưu tiến độ và nguồn lực'
        ],
        accent: 'professional',
        featured: true,
    },
    {
        id: 'pro', // internal ID maps to 'pro' on backend/vnpay
        name: 'Enterprise',
        price: '249.000đ',
        priceNote: '/tháng',
        subTitle: 'AI quản lý doanh nghiệp',
        description: 'Dành cho doanh nghiệp nhiều xưởng',
        features: [
            'Lập kế hoạch sản xuất dài hạn',
            'Dự báo nhu cầu và công suất',
            'Mô phỏng trước các kịch bản sản xuất',
            'Quản lý nhiều xưởng trên một nền tảng',
            'Thương hiệu riêng cho doanh nghiệp'
        ],
        accent: 'enterprise',
    },
];

export default function UpgradePlanPage() {
    const [selectedPlanId, setSelectedPlanId] = useState(() => localStorage.getItem('orca-ai-plan') || 'plus');

    const handleSelectPlan = (plan: Plan) => {
        if (plan.current) {
            setSelectedPlanId(plan.id);
            return;
        }
        localStorage.setItem('orca-ai-plan-pending', plan.id);
        window.location.href = `/vnpay-mock-checkout?planId=${plan.id}`;
    };

    return (
        <div className="upgrade-page">
            <section className="upgrade-header">
                <h1>Giải pháp AI cho sản xuất</h1>
                <p>Chọn gói phù hợp để tối ưu quy trình và nâng cao năng suất nhà máy của bạn.</p>
            </section>

            <section className="upgrade-grid">
                {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;

                    return (
                        <article
                            key={plan.id}
                            className={`plan-card accent-${plan.accent} ${plan.current ? 'current' : ''} ${plan.featured ? 'featured' : ''} ${isSelected ? 'selected' : ''}`}
                        >
                            {plan.featured && (
                                <div className="plan-badge-wrapper">
                                    <span className="plan-badge">★ Phổ biến nhất</span>
                                </div>
                            )}
                            
                            <div className="plan-name">{plan.name}</div>
                            
                            <div className="plan-price">
                                <strong className="price-value">{plan.price}</strong>
                                <span className="price-note">{plan.priceNote}</span>
                            </div>

                            <div className="plan-sub-info">
                                <div className="plan-subtitle">{plan.subTitle}</div>
                                <p className="plan-description">{plan.description}</p>
                            </div>

                            <button
                                type="button"
                                className="plan-action"
                                onClick={() => handleSelectPlan(plan)}
                                disabled={plan.current && plan.id === 'starter'}
                            >
                                {plan.id === 'starter' ? 'Bắt đầu' : 'Nâng cấp ngay'}
                            </button>

                            <ul className="plan-features">
                                {plan.features.map((feature) => (
                                    <li key={feature}>
                                        <span className="feature-check-circle">
                                            <Check size={10} strokeWidth={4} />
                                        </span>
                                        <span className="feature-text">{feature}</span>
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
