import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import type { SubscriptionPlan } from '../types/types';
import './UpgradePlanPage.css';

export default function UpgradePlanPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        paymentService.getPlans()
            .then(data => {
                // Sắp xếp theo giá tăng dần
                setPlans(data.sort((a, b) => a.price - b.price));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load plans", err);
                setLoading(false);
            });
    }, []);

    const handleSelectPlan = async (plan: SubscriptionPlan) => {
        if (!plan.id || plan.price === 0) {
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

    if (loading) {
        return <div className="pricing-page"><p style={{textAlign: 'center', marginTop: 100}}>Đang tải gói dịch vụ...</p></div>;
    }

    const formatPrice = (price: number) => {
        return price.toLocaleString('vi-VN') + 'đ';
    };

    const getThemeForIndex = (index: number) => {
        if (index === 0) return 'light';
        if (index === 1) return 'beige';
        return 'dark';
    };

    return (
        <div className="pricing-page">
            <section className="pricing-header">
                <h1>Giải pháp AI cho sản xuất</h1>
                <p>Chọn gói phù hợp để tối ưu quy trình và nâng cao năng suất nhà máy của bạn.</p>
            </section>

            <section className="pricing-grid">
                {plans.map((plan, index) => {
                    const theme = getThemeForIndex(index);
                    const isFeatured = index === 1; // Highlight gói ở giữa
                    const features = plan.features ? plan.features.split(',').map(f => f.trim()) : [];
                    
                    return (
                        <article
                            key={plan.id}
                            className={`pricing-card theme-${theme} ${isFeatured ? 'featured' : ''}`}
                        >
                            {isFeatured && <span className="pricing-ribbon">★ Phổ biến nhất</span>}
                            
                            <h2>{plan.name}</h2>
                            
                            <div className="pricing-price">
                                <strong>{formatPrice(plan.price)}</strong>
                                <span>/{plan.period || 'Tháng'}</span>
                            </div>

                            <div className="pricing-subtitle">
                                <strong>Giới hạn: {plan.users} NV, {plan.workshops} Xưởng</strong>
                                <span>{plan.ai > 0 ? `+${plan.ai} AI Tokens` : ''}</span>
                            </div>

                            <button
                                type="button"
                                className="pricing-action"
                                onClick={() => handleSelectPlan(plan)}
                            >
                                {plan.price === 0 ? 'Bắt đầu' : 'Nâng cấp ngay'}
                            </button>

                            <ul className="pricing-features">
                                {features.map((feature, idx) => (
                                    <li key={idx}>
                                        <CheckCircle2 className="check-icon" size={18} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                                <li>
                                    <CheckCircle2 className="check-icon" size={18} />
                                    <span>Tối đa {plan.orders} đơn hàng/tháng</span>
                                </li>
                            </ul>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}

