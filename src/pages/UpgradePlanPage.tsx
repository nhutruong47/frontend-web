import { useState } from 'react';
import {
    Check,
    ChevronRight,
    Gem,
    MessagesSquare,
    Sparkles,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import './UpgradePlanPage.css';

interface Plan {
    id: string;
    name: string;
    eyebrow: string;
    price: string;
    priceNote: string;
    tokenLimit: string;
    model: string;
    featured?: boolean;
    current?: boolean;
    description: string;
    features: string[];
    icon: LucideIcon;
    accent: 'coffee' | 'violet' | 'green' | 'blue';
}

const plans: Plan[] = [
    {
        id: 'starter',
        name: 'Free Chat',
        eyebrow: 'Gói hiện tại',
        price: '0đ',
        priceNote: 'tháng',
        tokenLimit: '50K token',
        model: 'ORCA Lite',
        current: true,
        description: 'Dùng thử AI để tạo mục tiêu, chia task và hỏi nhanh trong nhóm.',
        features: ['Chat AI cơ bản', 'Lưu lịch sử hội thoại gần đây', 'Tạo task từ mô tả ngắn', 'Hỗ trợ nhóm nhỏ'],
        icon: MessagesSquare,
        accent: 'coffee',
    },
    {
        id: 'plus',
        name: 'AI Plus',
        eyebrow: 'Phù hợp cá nhân',
        price: '129.000đ',
        priceNote: 'tháng',
        tokenLimit: '500K token',
        model: 'ORCA Smart',
        featured: true,
        description: 'Nhiều token hơn cho chat dài, phân tích task kỹ hơn và phản hồi nhanh.',
        features: ['Ưu tiên tốc độ phản hồi', 'Chat dài nhiều ngữ cảnh', 'Tạo kế hoạch công việc chi tiết', 'Gợi ý deadline và ưu tiên'],
        icon: Sparkles,
        accent: 'violet',
    },
    {
        id: 'pro',
        name: 'AI Pro',
        eyebrow: 'Token xịn hơn',
        price: '249.000đ',
        priceNote: 'tháng',
        tokenLimit: '1.5M token',
        model: 'ORCA Max',
        description: 'Dành cho người dùng chat AI thường xuyên và cần xử lý nhiều nội dung hơn.',
        features: ['Mô hình suy luận tốt hơn', 'Phân tích file và yêu cầu dài', 'Tóm tắt lịch sử nhóm', 'Xuất prompt và biên bản công việc'],
        icon: Zap,
        accent: 'green',
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
                <span className="upgrade-header-badge">
                    <Gem size={15} />
                    ORCA AI
                </span>
                <h1>Nâng cấp gói của bạn</h1>
                <p>Chọn gói AI phù hợp để chat dài hơn, tạo task nhanh hơn và xử lý nhiều ngữ cảnh vận hành hơn.</p>
                <div className="upgrade-billing-toggle" aria-label="Chu kỳ thanh toán">
                    <button className="active" type="button">Hàng tháng</button>
                    <button type="button">Hàng năm <span>Tiết kiệm</span></button>
                </div>
            </section>

            <section className="upgrade-grid">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    const isSelected = selectedPlanId === plan.id;

                    return (
                        <article
                            key={plan.id}
                            className={`plan-card accent-${plan.accent} ${plan.current ? 'current' : ''} ${plan.featured ? 'featured' : ''} ${isSelected ? 'selected' : ''}`}
                        >
                            {plan.featured && <span className="plan-ribbon">Phổ biến</span>}
                            <div className="plan-topline">
                                <div className="plan-icon">
                                    <Icon size={20} />
                                </div>
                                <span>{plan.eyebrow}</span>
                            </div>

                            <h2>{plan.name}</h2>
                            <p className="plan-description">{plan.description}</p>

                            <div className="plan-price">
                                <strong>{plan.price}</strong>
                                <span>{plan.priceNote}</span>
                            </div>

                            <div className="plan-quota">
                                <div>
                                    <span>Hạn mức</span>
                                    <strong>{plan.tokenLimit}</strong>
                                </div>
                                <div>
                                    <span>Model</span>
                                    <strong>{plan.model}</strong>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="plan-action"
                                onClick={() => handleSelectPlan(plan)}
                                disabled={plan.current}
                            >
                                {plan.current ? 'Gói hiện tại' : isSelected ? `Đã chọn ${plan.name}` : `Chọn ${plan.name}`}
                                {!plan.current && <ChevronRight size={16} />}
                            </button>

                            <ul className="plan-features">
                                {plan.features.map((feature) => (
                                    <li key={feature}>
                                        <Check size={15} />
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
