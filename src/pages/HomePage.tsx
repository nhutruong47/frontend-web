import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  CheckCircle,
  Clock,
  ClipboardCheck,
  Factory,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  TrendingUp,
  Users
} from 'lucide-react';
import orcaLogo from '../assets/orca-logo.svg';
import './HomePage.css';

const productionPoster =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=85';

const solutionPoster =
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1600&q=85';

const solutionVideo =
  'https://www.shutterstock.com/shutterstock/videos/4061367707/preview/stock-footage-cafe-workers-standing-near-coffee-machine-station-female-operating-equipment-and-pressing-controls.mp4';

const productionVideo =
  'https://www.shutterstock.com/shutterstock/videos/3852235011/preview/stock-footage-caucasian-man-male-guy-clipboard-inventory-inspection-coffee-warehouse-packaging-shelf-factory.mp4';

const roastingVideo =
  'https://www.shutterstock.com/shutterstock/videos/1107166639/preview/stock-footage-production-of-fresh-fried-coffee-beans-roast-master-opens-roasting-coffee-machine-roasted-coffee.mp4';

const navItems = [
  { label: 'Trang chủ', target: 'hero' },
  { label: 'Giới thiệu', target: 'solution' },
  { label: 'Tính năng', target: 'features' },
  { label: 'Hỏi đáp', target: 'ai' }
];

const stats = [
  { label: 'Đơn hàng', value: 'Quản lý tập trung', detail: 'Theo dõi yêu cầu gia công, trạng thái xử lý và lịch bàn giao trong một nơi.', icon: ClipboardCheck },
  { label: 'Nhân viên', value: 'Phân quyền theo vai trò', detail: 'Tách rõ quyền của quản lý xưởng, nhân viên rang, QC, đóng gói và admin.', icon: Users },
  { label: 'Batch', value: 'Theo dõi realtime', detail: 'Cập nhật tiến độ từng mẻ sản xuất từ lúc nhận đơn đến khi hoàn tất QC.', icon: Package },
  { label: 'Xưởng', value: 'Liên kết đa đối tác', detail: 'Kết nối nhiều xưởng gia công để điều phối đơn theo năng lực và lịch sản xuất.', icon: Factory }
];

const problems = [
  'Đơn hàng nằm rải rác giữa chat, file Excel và cuộc gọi nội bộ.',
  'Khó biết batch đang ở công đoạn nào và ai đang phụ trách.',
  'Thông tin QC, mẫu thử và lịch giao hàng không được nối thành một luồng.',
  'Chủ xưởng thiếu số liệu để dự báo công suất và điều phối nhân sự.'
];

const solutions = [
  'Gom đơn hàng, xưởng, nhân viên và batch vào một bảng điều phối duy nhất.',
  'Theo dõi tiến độ từng batch theo thời gian thực, từ nhận nguyên liệu đến bàn giao.',
  'Chuẩn hóa giao việc, QC, tasting notes và lịch giao hàng cho từng đơn sản xuất.'
];

const featureSlides = [
  {
    title: 'Quản lý đơn gia công',
    text: 'Tạo đơn, chọn xưởng, đặt deadline và theo dõi trạng thái trong một luồng ngắn gọn.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85'
  },
  {
    title: 'Theo dõi batch sản xuất',
    text: 'Nắm profile rang, khối lượng, QC và người phụ trách của từng batch.',
    image: 'https://images.unsplash.com/photo-1606791405792-1004f1718d0c?auto=format&fit=crop&w=1200&q=85'
  },
  {
    title: 'Phân quyền nhân viên',
    text: 'Giao việc theo vai trò: quản lý xưởng, QC, đóng gói, giao hàng và admin.',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=85'
  },
  {
    title: 'Báo cáo vận hành',
    text: 'Xem công suất, tỷ lệ trễ hẹn, chất lượng batch và hiệu quả từng xưởng.',
    image: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=1200&q=85'
  }
];

const workflowSteps = [
  'Tiếp nhận đơn hàng',
  'Chọn xưởng phù hợp',
  'Giao việc cho nhân viên',
  'Theo dõi batch và QC',
  'Bàn giao và nghiệm thu'
];

const dashboardShowcaseImages = [
  {
    title: 'Marketplace network',
    label: 'Roastery marketplace',
    image: '/luxury-coffee-hero.png'
  },
  {
    title: 'Premium operations',
    label: 'Batch command center',
    image: 'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=1600&q=85'
  },
  {
    title: 'Roast technology',
    label: 'Precision roasting',
    image: '/coffee-hero.png'
  },
  {
    title: 'Warehouse tracking',
    label: 'Inventory workflow',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=85'
  }
];

const roles = [
  {
    name: 'Quản trị viên',
    text: 'Quản lý người dùng, phân quyền, xưởng đối tác và cấu hình hệ thống.'
  },
  {
    name: 'Quản lý xưởng',
    text: 'Nhận đơn, điều phối batch, theo dõi năng lực sản xuất và tiến độ giao hàng.'
  },
  {
    name: 'Nhân viên sản xuất',
    text: 'Nhận việc, cập nhật công đoạn rang, đóng gói, QC và bàn giao.'
  }
];

const aiFeatures = [
  {
    title: 'Dự báo công suất xưởng',
    text: 'AI phân tích đơn hàng, lịch sản xuất và năng lực từng xưởng để gợi ý mức tải phù hợp.',
    icon: TrendingUp
  },
  {
    title: 'Gợi ý phân công nhân viên',
    text: 'Hệ thống đề xuất nhân sự theo vai trò, ca làm việc và trạng thái batch cần xử lý.',
    icon: Users
  },
  {
    title: 'Phân tích tiến độ đơn hàng',
    text: 'AI tổng hợp dữ liệu từ workflow để chỉ ra đơn nào đang chạy chậm hoặc có nguy cơ nghẽn.',
    icon: BarChart3
  },
  {
    title: 'Cảnh báo chậm tiến độ',
    text: 'Tự động cảnh báo khi batch vượt thời gian dự kiến, thiếu QC hoặc trễ lịch bàn giao.',
    icon: AlertTriangle
  }
];

const workshops = [
  {
    name: 'Ember Roastery Đà Lạt',
    rating: '97%',
    description: 'Xưởng rang specialty tập trung Arabica Cầu Đất, phù hợp các đơn cần profile ổn định.',
    tags: ['Light Roast', 'Cupping Score: 85+'],
    image: 'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=1000&q=85'
  },
  {
    name: 'Origins Craft Lab',
    rating: '94%',
    description: 'Đơn vị sơ chế, phân loại và rang thử nghiệm cho các mẻ nhỏ cần kiểm soát chi tiết.',
    tags: ['Lab Testing', 'Batch: 500g - 5kg'],
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=85'
  },
  {
    name: 'Legacy Beans Factory',
    rating: '96%',
    description: 'Xưởng quy mô lớn chuyên gia công cà phê thương mại với năng lực đóng gói nhanh.',
    tags: ['Bulk Processing', 'Batch: 30kg+'],
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85'
  }
];

const pricingPlans = [
  {
    name: 'Free Chat',
    price: '0đ',
    note: 'Gói hiện tại để dùng thử AI trong nhóm',
    features: ['50K token/tháng', 'ORCA Lite', 'Chat AI cơ bản']
  },
  {
    name: 'AI Plus',
    price: '129.000đ',
    note: 'Phù hợp cá nhân cần chat dài hơn',
    features: ['500K token/tháng', 'ORCA Smart', 'Ưu tiên tốc độ phản hồi']
  },
  {
    name: 'AI Pro',
    price: '249.000đ',
    note: 'Dành cho người dùng cần xử lý nhiều nội dung',
    features: ['1.5M token/tháng', 'ORCA Max', 'Phân tích yêu cầu dài']
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [featureIndex, setFeatureIndex] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('luxury-home-page');
    document.body.classList.add('luxury-home-page');

    const animatedItems = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.18 }
    );

    animatedItems.forEach((item) => observer.observe(item));

    let frame = 0;
    const updateCamera = () => {
      const scrollY = window.scrollY;
      const max = Math.max(window.innerHeight, 1);
      const pageMax = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(scrollY / max, 1);
      const pageProgress = Math.min(scrollY / pageMax, 1);
      setNavScrolled(scrollY > Math.max(window.innerHeight * 0.58, 280));
      setNavHidden(scrollY > 120);
      document.documentElement.style.setProperty('--coffee-hero-y', `${scrollY * 0.18}px`);
      document.documentElement.style.setProperty('--coffee-hero-scale', (1.05 + progress * 0.12).toFixed(3));
      document.documentElement.style.setProperty('--coffee-copy-y', `${scrollY * -0.045}px`);
      document.documentElement.style.setProperty('--coffee-copy-scale', (1 - progress * 0.025).toFixed(3));
      document.documentElement.style.setProperty('--coffee-story-y', `${(pageProgress - 0.18) * -44}px`);
      document.documentElement.style.setProperty('--coffee-story-scale', (1.02 + pageProgress * 0.08).toFixed(3));
      document.documentElement.style.setProperty('--coffee-cinema-scale', (1.04 + pageProgress * 0.045).toFixed(3));
      frame = 0;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateCamera);
    };

    updateCamera();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.documentElement.classList.remove('luxury-home-page');
      document.body.classList.remove('luxury-home-page');
      document.documentElement.style.removeProperty('--coffee-hero-y');
      document.documentElement.style.removeProperty('--coffee-hero-scale');
      document.documentElement.style.removeProperty('--coffee-copy-y');
      document.documentElement.style.removeProperty('--coffee-copy-scale');
      document.documentElement.style.removeProperty('--coffee-story-y');
      document.documentElement.style.removeProperty('--coffee-story-scale');
      document.documentElement.style.removeProperty('--coffee-cinema-scale');
      window.removeEventListener('scroll', handleScroll);
      animatedItems.forEach((item) => observer.unobserve(item));
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeatureIndex((current) => (current + 1) % featureSlides.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const featureSlots = [-1, 0, 1].map((offset) => {
    const index = (featureIndex + offset + featureSlides.length) % featureSlides.length;
    return {
      ...featureSlides[index],
      slot: offset === 0 ? 'center' : offset < 0 ? 'left' : 'right'
    };
  });

  return (
    <main className="coffee-home">
      <header className={`coffee-nav${navScrolled ? ' coffee-nav--scrolled' : ''}${navHidden ? ' coffee-nav--hidden' : ''}`} aria-label="Điều hướng chính">
        <div className="coffee-nav__inner">
          <button className="coffee-nav__brand" onClick={() => scrollTo('hero')} aria-label="Trang chủ ORCA">
            <img src={orcaLogo} alt="" aria-hidden="true" />
            <strong>ORCA</strong>
          </button>

          <nav className="coffee-nav__links" aria-label="Các mục trên trang">
            {navItems.map((item) => (
              <button
                key={item.target}
                className={`coffee-nav__item${item.target === 'hero' ? ' coffee-nav__item--active' : ''}`}
                onClick={() => scrollTo(item.target)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="coffee-nav__auth" aria-label="Tài khoản">
            <button type="button" onClick={() => navigate('/login')}>Đăng nhập</button>
            <button type="button" onClick={() => navigate('/register')}>Đăng ký</button>
          </div>
        </div>
      </header>

      <section id="hero" className="coffee-hero">
        <div className="coffee-hero__image" aria-hidden="true">
          <video autoPlay muted loop playsInline poster={productionPoster}>
            <source src={productionVideo} type="video/mp4" />
          </video>
        </div>
        <div className="coffee-hero__veil" aria-hidden="true" />

        <div className="coffee-hero__content">
          <span className="coffee-kicker">Coffee Production Management Platform</span>
          <h1>ORCA</h1>
          <p>
            Nền tảng quản lý sản xuất cà phê giúp xưởng, đơn hàng, nhân viên và batch vận hành
            trong một quy trình rõ ràng.
          </p>
          <div className="coffee-hero__actions">
            <button className="coffee-button coffee-button--light" onClick={() => scrollTo('pricing')}>
              Đăng ký dùng thử
            </button>
            <button className="coffee-button coffee-button--ghost" onClick={() => scrollTo('dashboard')}>
              Xem dashboard
            </button>
          </div>
        </div>

        <button className="coffee-scroll-cue" onClick={() => scrollTo('stats')} aria-label="Scroll to statistics">
          <ArrowDown size={18} />
        </button>
      </section>

      <section id="stats" className="coffee-ops-overview">
        <div className="coffee-ops-header" data-reveal="up">
          <span className="coffee-kicker">Năng lực vận hành</span>
          <h2>Các thành phần quản lý cốt lõi của ORCA.</h2>
          <p>Thay vì trình bày số liệu ước tính, trang chủ tập trung vào những nghiệp vụ chính mà hệ thống hỗ trợ.</p>
        </div>

        <div className="coffee-stat-grid">
          {stats.map((item, index) => {
            const Icon = item.icon;
            return (
              <article className="coffee-stat-card" key={item.label} data-reveal="product" style={{ transitionDelay: `${index * 90}ms` }}>
                <div className="coffee-stat-card__top">
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </article>
            );
          })}
        </div>

        <div id="problems" className="coffee-problem-panel" data-reveal="up">
          <div className="coffee-problem-panel__intro">
            <span className="coffee-kicker">Vấn đề khách hàng gặp</span>
            <h2>Khi sản xuất tăng tốc, dữ liệu bắt đầu rời rạc.</h2>
            <p>Các đội cà phê thường mất thời gian để nối lại thông tin giữa người bán, quản lý xưởng, QC và đóng gói.</p>
          </div>
          <div className="coffee-problem-list">
            {problems.map((problem, index) => (
              <article className="coffee-problem-row" key={problem}>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <p>{problem}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solution" className="coffee-story coffee-story--solution">
        <div className="coffee-story__media" data-reveal="left">
          <video autoPlay muted loop playsInline poster={solutionPoster} aria-label="Cafe workers operating a coffee machine station">
            <source src={solutionVideo} type="video/mp4" />
          </video>
        </div>
        <div className="coffee-story__copy" data-reveal="right">
          <span className="coffee-kicker">Giải pháp ORCA</span>
          <h2>Một hệ điều hành cho xưởng cà phê.</h2>
          <p>
            ORCA chuẩn hóa toàn bộ vòng đời sản xuất: từ nhận đơn, phân công, theo dõi batch,
            QC đến bàn giao. Đội vận hành biết việc nào đang chạy, ai phụ trách và điểm nghẽn nằm ở đâu.
          </p>
          <div className="coffee-solution-list">
            {solutions.map((solution) => (
              <div key={solution}>
                <CheckCircle size={18} />
                <span>{solution}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="coffee-features">
        <div className="coffee-section-heading coffee-section-heading--center" data-reveal="up">
          <span className="coffee-kicker">Các tính năng chính</span>
          <h2>Quản lý vận hành bằng những màn hình dễ đọc.</h2>
        </div>

        <div className="coffee-feature-carousel" aria-label="Tính năng ORCA tự động chuyển động">
          {featureSlots.map((slide) => (
            <article className={`coffee-feature-slide coffee-feature-slide--${slide.slot}`} key={`${slide.title}-${slide.slot}`}>
              <img src={slide.image} alt={slide.title} />
              <div>
                <h3>{slide.title}</h3>
                <p>{slide.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="roles" className="coffee-roles">
        <div className="coffee-section-heading" data-reveal="up">
          <div>
            <span className="coffee-kicker">Role Management</span>
            <h2>Phân quyền rõ ràng cho từng nhóm người dùng.</h2>
            <p>Mỗi vai trò chỉ nhìn thấy đúng phần việc cần xử lý, giúp giảm nhầm lẫn khi nhiều bộ phận cùng tham gia sản xuất.</p>
          </div>
        </div>

        <div className="coffee-role-grid">
          {roles.map((role, index) => (
            <article className="coffee-role-card" key={role.name} data-reveal="product" style={{ transitionDelay: `${index * 100}ms` }}>
              <ShieldCheck size={22} />
              <h3>{role.name}</h3>
              <p>{role.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="production" className="coffee-story coffee-story--production production-studio">
        <div className="production-studio__glow" aria-hidden="true" />
        <div className="production-studio__media" data-reveal="left">
          <article className="studio-video-card studio-video-card--main">
            <video autoPlay muted loop playsInline poster={productionPoster}>
              <source src={productionVideo} type="video/mp4" />
            </video>
            <div className="studio-video-card__shade" />
            <div className="studio-video-card__meta">
              <span>Warehouse check</span>
              <strong>Clipboard inventory</strong>
            </div>
          </article>

          <article className="studio-video-card studio-video-card--float">
            <video autoPlay muted loop playsInline poster={productionPoster}>
              <source src={roastingVideo} type="video/mp4" />
            </video>
            <div className="studio-video-card__shade" />
            <div className="studio-video-card__meta">
              <span>Batch camera</span>
              <strong>Roast flow</strong>
            </div>
          </article>

          <div className="studio-signal-card studio-signal-card--top">
            <ClipboardCheck size={18} />
            <span>QC synced</span>
          </div>
          <div className="studio-signal-card studio-signal-card--bottom">
            <BarChart3 size={18} />
            <span>Live capacity</span>
          </div>
        </div>
        <div className="coffee-story__copy production-studio__copy" data-reveal="right">
          <span className="coffee-kicker">Workflow sản xuất</span>
          <h2>Giao việc, chạy batch, kiểm tra tiến độ.</h2>
          <p>
            Mỗi đơn hàng được chuyển thành workflow rõ ràng để quản lý xưởng, nhân viên rang,
            QC và đóng gói cùng nhìn một nguồn dữ liệu.
          </p>
          <div className="coffee-workflow-list production-studio__workflow">
            {workflowSteps.map((step, index) => (
              <div key={step} style={{ transitionDelay: `${index * 80}ms` }}>
                <strong>{index + 1}</strong>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dashboard" className="coffee-dashboard-section">
        <div className="coffee-section-heading" data-reveal="up">
          <div>
            <span className="coffee-kicker">ORCA interface gallery</span>
            <h2>Những không gian vận hành cà phê chuyển động liên tục.</h2>
          </div>
        </div>
        <div className="coffee-interface-gallery" data-reveal="zoom" aria-label="ORCA interface image carousel">
          <div className="coffee-interface-gallery__track">
            {[...dashboardShowcaseImages, ...dashboardShowcaseImages].map((item, index) => (
              <article className="coffee-interface-card" key={`${item.title}-${index}`}>
                <img src={item.image} alt={item.title} />
                <div className="coffee-interface-card__shade" />
                <div className="coffee-interface-card__caption">
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                </div>
              </article>
            ))}
          </div>
          <div className="coffee-interface-gallery__rail" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section id="ai" className="coffee-ai-section">
        <div className="coffee-ai-hero" data-reveal="up">
          <div>
            <span className="coffee-kicker">Công nghệ AI</span>
            <h2>AI hỗ trợ vận hành sản xuất cà phê.</h2>
            <p>
              ORCA không chỉ lưu dữ liệu vận hành. Hệ thống còn dùng AI để phân tích công suất,
              tiến độ và phân công, giúp quản lý xưởng ra quyết định nhanh hơn.
            </p>
          </div>
          <div className="coffee-ai-orb" aria-hidden="true">
            <Brain size={58} />
            <Sparkles size={22} />
          </div>
        </div>

        <div className="coffee-ai-grid">
          {aiFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article className="coffee-ai-card" key={feature.title} data-reveal="product" style={{ transitionDelay: `${index * 90}ms` }}>
                <Icon size={22} />
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workshops" className="coffee-workshops">
        <div className="coffee-section-heading" data-reveal="up">
          <div>
            <span className="coffee-kicker">Xưởng đối tác</span>
            <h2>Mạng lưới gia công nổi bật.</h2>
            <p>Những đơn vị rang uy tín hàng đầu trong mạng lưới ORCA.</p>
          </div>
          <button className="coffee-text-link" onClick={() => navigate('/login?returnUrl=/dat-hang')}>
            Xem tất cả các xưởng <ArrowRight size={18} />
          </button>
        </div>

        <div className="coffee-workshop-grid">
          {workshops.map((workshop, index) => (
            <article className="coffee-workshop-card" key={workshop.name} data-reveal="product" style={{ transitionDelay: `${index * 120}ms` }}>
              <div className="coffee-workshop-card__image">
                <img src={workshop.image} alt={workshop.name} />
                <span>Premium Partner</span>
              </div>
              <div className="coffee-workshop-card__body">
                <div className="coffee-workshop-card__title">
                  <h3>{workshop.name}</h3>
                  <small><Star size={13} fill="currentColor" /> {workshop.rating}</small>
                </div>
                <p>{workshop.description}</p>
                <div className="coffee-workshop-card__tags">
                  {workshop.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="coffee-pricing">
        <div className="coffee-section-heading coffee-section-heading--center" data-reveal="up">
          <span className="coffee-kicker">Pricing</span>
          <h2>Chọn gói phù hợp với quy mô vận hành.</h2>
        </div>
        <div className="coffee-pricing-grid">
          {pricingPlans.map((plan, index) => (
            <article className="coffee-pricing-card" key={plan.name} data-reveal="product" style={{ transitionDelay: `${index * 100}ms` }}>
              <h3>{plan.name}</h3>
              <strong>{plan.price}</strong>
              <p>{plan.note}</p>
              {plan.features.map((feature) => (
                <span key={feature}><CheckCircle size={16} /> {feature}</span>
              ))}
              <button className="coffee-button coffee-button--dark" onClick={() => navigate('/login?returnUrl=/upgrade')}>
                Bắt đầu
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="reserve" className="coffee-reserve">
        <div className="coffee-reserve__inner" data-reveal="up">
          <img className="coffee-reserve__logo" src={orcaLogo} alt="" aria-hidden="true" />
          <h2>Đăng ký dùng thử ORCA.</h2>
          <p>Trải nghiệm quy trình quản lý xưởng, đơn hàng, nhân viên và batch sản xuất trong một workspace.</p>
          <button className="coffee-button coffee-button--dark" onClick={() => navigate('/register')}>
            Đăng ký dùng thử
          </button>
        </div>
        <Sprout className="coffee-reserve__mark" size={160} aria-hidden="true" />
      </section>

      <footer id="contact" className="coffee-contact-footer">
        <div className="coffee-contact-footer__veil" aria-hidden="true" />
        <div className="coffee-contact-footer__grid" data-reveal="up">
          <section className="coffee-contact-column">
            <h2>Office Information</h2>
            <div className="coffee-contact-rule" />
            <ul className="coffee-office-list">
              <li>
                <span><MapPin size={19} /></span>
                <p>121 King Street, New York</p>
              </li>
              <li>
                <span><Phone size={19} /></span>
                <p>+1 (800) 333 44 55</p>
              </li>
              <li>
                <span><Mail size={19} /></span>
                <p>coffee@yoursite.com</p>
              </li>
              <li>
                <span><Building2 size={19} /></span>
                <p>+1 (800) 333 99 88</p>
              </li>
              <li>
                <span><img className="coffee-office-logo" src={orcaLogo} alt="" aria-hidden="true" /></span>
                <p>@orcatheme</p>
              </li>
            </ul>
          </section>

          <section className="coffee-contact-column">
            <h2>News</h2>
            <div className="coffee-contact-rule" />
            <article className="coffee-footer-news">
              <img src="https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=240&q=80" alt="Coffee shop team" />
              <div>
                <h3>A Place of Silence</h3>
                <small><Clock size={13} /> 10 June 2024</small>
              </div>
            </article>
            <article className="coffee-footer-news">
              <img src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=240&q=80" alt="Coffee cups" />
              <div>
                <h3>How to create a Logo like a Pro</h3>
                <small><Clock size={13} /> 10 June 2024</small>
              </div>
            </article>
          </section>

          <section className="coffee-contact-column">
            <h2>Quick Shortcuts</h2>
            <div className="coffee-contact-rule" />
            <div className="coffee-shortcut-grid">
              {['Home', 'City Store', 'Toolkits', 'Employees', 'Teams', 'Benefits', 'Support', 'Maps', 'Careers', 'News', 'Clients', 'Consultation', 'Publicity'].map((link) => (
                <button key={link} onClick={() => scrollTo(link === 'Home' ? 'hero' : 'features')}>
                  <ArrowRight size={16} />
                  {link}
                </button>
              ))}
            </div>
          </section>

          <section className="coffee-contact-column">
            <h2>Working Hours</h2>
            <div className="coffee-contact-rule" />
            <p className="coffee-hours-copy">
              Our support available to help you 24 hours a day, seven days a week.
            </p>
            <div className="coffee-hours-row">
              <span>Monday to Friday</span>
              <strong>8:00 - 16:30</strong>
            </div>
            <div className="coffee-hours-row">
              <span>Saturday</span>
              <strong>8:00 - 13:00</strong>
            </div>
          </section>
        </div>
      </footer>
    </main>
  );
}
