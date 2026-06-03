import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  BellRing,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle2,
  Cpu,
  CreditCard,
  Database,
  DollarSign,
  Download,
  FileBarChart,
  Filter,
  Gauge,
  GitBranch,
  GripVertical,
  Lock,
  MoreHorizontal,
  Percent,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Unlock,
  UserCheck,
  Users,
  Workflow,
  XCircle
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

type AdminSection =
  | 'overview'
  | 'businesses'
  | 'users'
  | 'subscriptions'
  | 'billing'
  | 'ai'
  | 'monitoring'
  | 'audit'
  | 'workflow'
  | 'alerts'
  | 'reports';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

const parseVietnameseDate = (value: string) => {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, day);
};

const parseDateInput = (value: string, endOfDay = false) => {
  const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10);

const tabs: Array<{ id: AdminSection; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Dashboard', icon: Gauge },
  { id: 'businesses', label: 'Doanh nghiệp / Xưởng', icon: Building2 },
  { id: 'users', label: 'User toàn hệ thống', icon: Users },
  { id: 'subscriptions', label: 'Gói dịch vụ', icon: ReceiptText },
  { id: 'billing', label: 'Thanh toán', icon: CreditCard },
  { id: 'ai', label: 'AI Management', icon: Brain },
  { id: 'monitoring', label: 'System Monitoring', icon: Activity },
  { id: 'audit', label: 'Audit Log', icon: ShieldCheck },
  { id: 'workflow', label: 'Workflow', icon: Workflow },
  { id: 'alerts', label: 'Alert Center', icon: BellRing },
  { id: 'reports', label: 'Executive Report', icon: FileBarChart }
];

const kpis = [
  { label: 'Doanh nghiệp / xưởng', value: '128', change: '+12.4%', icon: Building2, tone: 'coffee' },
  { label: 'Tổng người dùng', value: '8,420', change: '+18.1%', icon: Users, tone: 'blue' },
  { label: 'Đơn đang xử lý', value: '1,284', change: '+6.8%', icon: ShoppingCart, tone: 'amber' },
  { label: 'Batch sản xuất', value: '18,930', change: '+22.7%', icon: GitBranch, tone: 'green' },
  { label: 'Nhân viên hoạt động', value: '3,486', change: '+9.2%', icon: UserCheck, tone: 'violet' },
  { label: 'Doanh thu tháng', value: money(824000000), change: '+15.3%', icon: DollarSign, tone: 'green' },
  { label: 'Doanh thu năm', value: money(8120000000), change: '+31.8%', icon: DollarSign, tone: 'coffee' },
  { label: 'Tăng trưởng user', value: '18.1%', change: '+4.2%', icon: ArrowUpDown, tone: 'blue' },
  { label: 'Tăng trưởng DN', value: '12.4%', change: '+2.8%', icon: Building2, tone: 'amber' },
  { label: 'Đơn đúng hạn', value: '94.6%', change: '+1.7%', icon: Percent, tone: 'green' },
  { label: 'QC đạt', value: '97.2%', change: '+0.9%', icon: CheckCircle2, tone: 'green' },
  { label: 'Sử dụng hệ thống', value: '76.8%', change: '+8.4%', icon: Gauge, tone: 'violet' }
];

const monthlyRevenue = [
  { month: 'T1', revenue: 420, mrr: 310, users: 520, orgs: 32, batches: 980 },
  { month: 'T2', revenue: 510, mrr: 355, users: 680, orgs: 45, batches: 1190 },
  { month: 'T3', revenue: 590, mrr: 390, users: 840, orgs: 52, batches: 1380 },
  { month: 'T4', revenue: 640, mrr: 438, users: 1090, orgs: 64, batches: 1660 },
  { month: 'T5', revenue: 720, mrr: 500, users: 1320, orgs: 80, batches: 1890 },
  { month: 'T6', revenue: 824, mrr: 572, users: 1580, orgs: 96, batches: 2240 }
];

const businesses = [
  ['Highlands Craft', 'ORC-BIZ-001', 'Nguyen Minh An', 'owner@highlands.vn', '0901234567', 84, 420, 1180, 'Enterprise', '12/01/2026', 'Active'],
  ['Da Lat Roastery', 'ORC-BIZ-002', 'Tran Bao Lam', 'ops@dalat.vn', '0912223344', 36, 210, 640, 'Growth', '02/02/2026', 'Active'],
  ['Saigon Roast Lab', 'ORC-BIZ-003', 'Le Hoang', 'hello@roastlab.vn', '0988877665', 18, 82, 210, 'Starter', '18/03/2026', 'Trial'],
  ['Ancient Grain', 'ORC-BIZ-004', 'Pham Quynh', 'admin@ancient.vn', '0934567788', 52, 310, 890, 'Growth', '21/04/2026', 'Locked'],
  ['Coastal Coffee Hub', 'ORC-BIZ-005', 'Do Thanh', 'finance@coastal.vn', '0977135791', 27, 168, 404, 'Growth', '09/05/2026', 'Active']
].map(([name, code, owner, email, phone, employees, orders, batches, plan, date, status]) => ({
  name,
  code,
  owner,
  email,
  phone,
  employees,
  orders,
  batches,
  plan,
  date,
  status
}));

const users = Array.from({ length: 18 }, (_, index) => {
  const roles = ['Admin', 'Business Owner', 'Manager', 'Staff'];
  const orgs = ['Highlands Craft', 'Da Lat Roastery', 'Saigon Roast Lab', 'Ancient Grain'];
  return {
    name: ['An Nguyen', 'Bao Tran', 'Chi Le', 'Duy Pham', 'Hanh Do', 'Khoa Vo'][index % 6],
    email: `user${index + 1}@orca.local`,
    phone: `09${(12345678 + index * 23817).toString().slice(0, 8)}`,
    company: orgs[index % orgs.length],
    role: roles[index % roles.length],
    status: index % 7 === 0 ? 'Locked' : 'Active',
    lastLogin: `${(index % 9) + 1} giờ trước`
  };
});

const plans = [
  { name: 'Starter', price: 499000, period: 'Tháng', users: 5, orders: 100, batches: 300, workshops: 1, ai: 5000, features: ['Order board', 'Batch tracking', 'Basic reports'] },
  { name: 'Growth', price: 1499000, period: 'Tháng', users: 30, orders: 1000, batches: 5000, workshops: 5, ai: 40000, features: ['QC workflow', 'AI assistant', 'Billing export'] },
  { name: 'Enterprise', price: 0, period: 'Năm', users: 500, orders: 99999, batches: 99999, workshops: 50, ai: 500000, features: ['SLA', 'Custom workflow', 'Dedicated AI limit'] }
];

const invoices = [
  ['INV-2026-0001', 'Highlands Craft', 'Enterprise', 24500000, '03/05/2026', 'VNPay', 'Paid'],
  ['INV-2026-0002', 'Da Lat Roastery', 'Growth', 1499000, '07/05/2026', 'Bank Transfer', 'Paid'],
  ['INV-2026-0003', 'Saigon Roast Lab', 'Starter', 499000, '11/05/2026', 'VNPay', 'Pending'],
  ['INV-2026-0004', 'Ancient Grain', 'Growth', 1499000, '15/05/2026', 'Card', 'Failed'],
  ['INV-2026-0005', 'Coastal Coffee Hub', 'Growth', 1499000, '19/05/2026', 'VNPay', 'Paid'],
  ['INV-2026-0006', 'Highlands Craft', 'Enterprise', 24500000, '24/05/2026', 'Bank Transfer', 'Paid'],
  ['INV-2026-0007', 'Da Lat Roastery', 'Growth', 1499000, '30/05/2026', 'VNPay', 'Paid'],
  ['INV-2026-0008', 'Saigon Roast Lab', 'Starter', 499000, '02/06/2026', 'VNPay', 'Paid'],
  ['INV-2026-0009', 'Ancient Grain', 'Growth', 1499000, '08/06/2026', 'Card', 'Pending'],
  ['INV-2026-0010', 'Coastal Coffee Hub', 'Growth', 1499000, '12/06/2026', 'Bank Transfer', 'Paid'],
  ['INV-2026-0011', 'Highlands Craft', 'Enterprise', 24500000, '18/06/2026', 'VNPay', 'Paid'],
  ['INV-2026-0012', 'Da Lat Roastery', 'Growth', 1499000, '22/06/2026', 'Card', 'Failed']
].map(([id, company, plan, amount, date, method, status]) => ({ id, company, plan, amount, date, method, status }));

const aiUsage = [
  { label: 'Tổng request AI', value: number(482930), icon: Brain },
  { label: 'Request hôm nay', value: number(14820), icon: Activity },
  { label: 'Request tháng', value: number(128400), icon: CalendarDays },
  { label: 'Token sử dụng', value: '92.4M', icon: Gauge },
  { label: 'Chi phí AI', value: money(43800000), icon: DollarSign },
  { label: 'User dùng nhiều nhất', value: 'Bao Tran', icon: Users },
  { label: 'DN dùng nhiều nhất', value: 'Highlands', icon: Building2 }
];

const systemMetrics = [
  { name: 'CPU', value: 68, icon: Cpu, tone: 'warning' },
  { name: 'RAM', value: 74, icon: Server, tone: 'warning' },
  { name: 'Database', value: 42, icon: Database, tone: 'success' },
  { name: 'API Requests', value: 81, icon: Activity, tone: 'danger' },
  { name: 'Error Rate', value: 2.8, icon: XCircle, tone: 'danger' },
  { name: 'Response Time', value: 184, icon: Gauge, tone: 'success' }
];

const realtimeData = [
  { time: '10:00', cpu: 44, ram: 58, api: 320, errors: 0.8 },
  { time: '10:05', cpu: 52, ram: 61, api: 390, errors: 1.1 },
  { time: '10:10', cpu: 68, ram: 67, api: 470, errors: 2.4 },
  { time: '10:15', cpu: 61, ram: 72, api: 430, errors: 1.7 },
  { time: '10:20', cpu: 74, ram: 76, api: 510, errors: 2.8 }
];

const auditLogs = [
  ['An Nguyen', 'Đăng nhập admin', 'Admin Console', '02/06/2026 10:20', '14.169.2.10'],
  ['Bao Tran', 'Tạo đơn hàng', 'ORD-2092', '02/06/2026 10:14', '14.169.2.11'],
  ['Chi Le', 'Sửa batch', 'BATCH-842', '02/06/2026 09:58', '42.113.9.42'],
  ['Duy Pham', 'Xóa dữ liệu', 'Workshop draft', '02/06/2026 09:35', '42.113.9.49'],
  ['Admin', 'Đổi quyền', 'Manager -> Staff', '02/06/2026 09:02', '10.0.0.1']
].map(([user, action, target, time, ip]) => ({ user, action, target, time, ip }));

const alertRows: Array<{ title: string; source: string; severity: Severity; time: string }> = [
  { title: 'Đơn hàng OR-2041 trễ hạn 14 giờ', source: 'Order SLA', severity: 'Critical', time: '2 phút trước' },
  { title: 'Batch B-842 lỗi QC lần 2', source: 'QC Engine', severity: 'High', time: '8 phút trước' },
  { title: 'Subscription Ancient Grain hết hạn trong 3 ngày', source: 'Billing', severity: 'Medium', time: '21 phút trước' },
  { title: 'Xưởng Đà Lạt vượt 88% công suất', source: 'Capacity', severity: 'High', time: '38 phút trước' },
  { title: 'User staff17 bị khóa do đăng nhập sai', source: 'Security', severity: 'Low', time: '1 giờ trước' },
  { title: 'API /ai/recommend response time cao', source: 'System', severity: 'Critical', time: '1 giờ trước' }
];

const featureRows = [
  'Order management',
  'Batch tracking',
  'QC workflow',
  'AI assistant',
  'Billing export',
  'Custom workflow',
  'Dedicated support'
];

function KpiCard({ item }: { item: typeof kpis[number] }) {
  const Icon = item.icon;
  return (
    <article className={`admin-kpi admin-kpi-${item.tone}`}>
      <div className="admin-kpi-icon"><Icon size={20} /></div>
      <div>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
        <small>{item.change} so với kỳ trước</small>
      </div>
    </article>
  );
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <article className="admin-mini-metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="admin-card admin-chart-card">
      <div className="admin-card-head">
        <h3>{title}</h3>
        <button type="button" className="admin-icon-button"><MoreHorizontal size={16} /></button>
      </div>
      <div className="admin-chart">{children}</div>
    </section>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`admin-badge admin-badge-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<AdminSection>('overview');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [plan, setPlan] = useState('All');
  const [revenueFrom, setRevenueFrom] = useState('2026-05-01');
  const [revenueTo, setRevenueTo] = useState('2026-06-30');
  const [userPage, setUserPage] = useState(1);
  const [workflowStages, setWorkflowStages] = useState(['Order', 'Assignment', 'Production', 'QC', 'Packaging', 'Delivery']);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const userRows = useMemo(() => {
    return users
      .filter(item => `${item.name} ${item.email} ${item.company} ${item.role}`.toLowerCase().includes(query.toLowerCase()))
      .slice((userPage - 1) * 6, userPage * 6);
  }, [query, userPage]);

  const businessRows = businesses.filter(item => {
    const matchesText = `${item.name} ${item.code} ${item.owner} ${item.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'All' || item.status === status;
    const matchesPlan = plan === 'All' || item.plan === plan;
    return matchesText && matchesStatus && matchesPlan;
  });

  const revenueReport = useMemo(() => {
    const fromDate = parseDateInput(revenueFrom);
    const toDate = parseDateInput(revenueTo, true);
    const safeFrom = fromDate <= toDate ? fromDate : toDate;
    const safeTo = fromDate <= toDate ? toDate : fromDate;
    const rangeInvoices = invoices.filter(item => {
      const paidDate = parseVietnameseDate(String(item.date));
      return paidDate >= safeFrom && paidDate <= safeTo;
    });
    const paidInvoices = rangeInvoices.filter(item => item.status === 'Paid');
    const total = paidInvoices.reduce((sum, item) => sum + Number(item.amount), 0);
    const pending = rangeInvoices
      .filter(item => item.status === 'Pending')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const failed = rangeInvoices
      .filter(item => item.status === 'Failed')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const dailyMap = paidInvoices.reduce<Record<string, number>>((acc, item) => {
      acc[String(item.date)] = (acc[String(item.date)] || 0) + Number(item.amount);
      return acc;
    }, {});
    const timeline = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, revenue: Math.round(amount / 1000000) }))
      .sort((a, b) => parseVietnameseDate(a.date).getTime() - parseVietnameseDate(b.date).getTime());
    const customerMap = paidInvoices.reduce<Record<string, number>>((acc, item) => {
      acc[String(item.company)] = (acc[String(item.company)] || 0) + Number(item.amount);
      return acc;
    }, {});
    const topCustomers = Object.entries(customerMap)
      .map(([name, value]) => ({ name, value: Math.round(value / 1000000), amount: value }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const rangeDays = Math.max(1, Math.ceil((safeTo.getTime() - safeFrom.getTime()) / 86400000));

    return {
      fromDate: safeFrom,
      toDate: safeTo,
      rangeInvoices,
      paidInvoices,
      total,
      pending,
      failed,
      rangeDays,
      averagePerDay: Math.round(total / rangeDays),
      topCustomers,
      timeline: timeline.length > 0 ? timeline : [{ date: 'Không có', revenue: 0 }],
    };
  }, [revenueFrom, revenueTo]);

  const exportRevenueReport = () => {
    const lines = [
      'ORCA - Bao cao doanh thu',
      `Tu ngay: ${formatInputDate(revenueReport.fromDate)}`,
      `Den ngay: ${formatInputDate(revenueReport.toDate)}`,
      `Doanh thu da thu: ${money(revenueReport.total)}`,
      `Dang cho thanh toan: ${money(revenueReport.pending)}`,
      `That bai: ${money(revenueReport.failed)}`,
      '',
      'Hoa don:',
      ...revenueReport.rangeInvoices.map(item => `${item.id}, ${item.company}, ${item.plan}, ${money(Number(item.amount))}, ${item.date}, ${item.method}, ${item.status}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orca-revenue-${revenueFrom}-${revenueTo}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const moveStage = (from: number, to: number) => {
    if (from === to) return;
    setWorkflowStages(current => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="admin-access">
        <ShieldCheck size={40} />
        <h1>Không có quyền truy cập Admin Console</h1>
        <p>Tài khoản hiện tại cần role Admin để xem dữ liệu toàn nền tảng.</p>
      </div>
    );
  }

  return (
    <div className="admin-console">
      <header className="admin-hero">
        <div>
          <span className="admin-eyebrow">ORCA SaaS Admin</span>
          <h1>Dashboard Tổng Quan Hệ Thống</h1>
          <p>Trung tâm điều hành cho Coffee Production Management Platform: doanh nghiệp, user, billing, AI, monitoring, audit và báo cáo điều hành.</p>
        </div>
        <div className="admin-hero-actions">
          <button type="button" className="admin-button admin-button-soft"><CalendarDays size={16} /> 30 ngày</button>
          <button type="button" className="admin-button admin-button-primary"><Download size={16} /> Xuất báo cáo</button>
        </div>
      </header>

      <nav className="admin-nav" aria-label="Admin sections">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={active === tab.id ? 'active' : ''} onClick={() => setActive(tab.id)} type="button">
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {active === 'overview' && (
        <>
          <section className="admin-kpi-grid">
            {kpis.map(item => <KpiCard key={item.label} item={item} />)}
          </section>
          <section className="admin-grid-2">
            <ChartPanel title="Biểu đồ doanh thu">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#d4a574" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#d4a574" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area dataKey="revenue" stroke="#d4a574" fill="url(#revenueFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Tăng trưởng user">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="users" stroke="#60a5fa" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Tăng trưởng doanh nghiệp">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orgs" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Sản lượng batch">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="batches" fill="#22c55e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </section>
          <section className="admin-card">
            <div className="admin-card-head">
              <h3>Danh sách cảnh báo hệ thống</h3>
              <button type="button" className="admin-button admin-button-soft">Xem tất cả</button>
            </div>
            <div className="admin-alert-list">
              {alertRows.slice(0, 5).map(item => (
                <div key={item.title} className={`admin-alert admin-alert-${item.severity.toLowerCase()}`}>
                  <AlertTriangle size={18} />
                  <div><strong>{item.title}</strong><span>{item.source} · {item.time}</span></div>
                  <StatusBadge value={item.severity} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {active === 'businesses' && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div><h3>Quản lý doanh nghiệp / xưởng</h3><p>Xem, thêm, chỉnh sửa, khóa hoặc xóa doanh nghiệp.</p></div>
            <button type="button" className="admin-button admin-button-primary"><Plus size={16} /> Thêm doanh nghiệp</button>
          </div>
          <div className="admin-toolbar">
            <label><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên, mã, người đại diện..." /></label>
            <select value={status} onChange={event => setStatus(event.target.value)}><option>All</option><option>Active</option><option>Trial</option><option>Locked</option></select>
            <select value={plan} onChange={event => setPlan(event.target.value)}><option>All</option><option>Starter</option><option>Growth</option><option>Enterprise</option></select>
            <button type="button" className="admin-button admin-button-soft"><Filter size={16} /> Ngày đăng ký</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Tên doanh nghiệp</th><th>Mã</th><th>Đại diện</th><th>Email</th><th>Điện thoại</th><th>NV</th><th>Đơn</th><th>Batch</th><th>Gói</th><th>Ngày ĐK</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {businessRows.map(item => (
                  <tr key={item.code}>
                    <td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.owner}</td><td>{item.email}</td><td>{item.phone}</td><td>{item.employees}</td><td>{item.orders}</td><td>{item.batches}</td><td>{item.plan}</td><td>{item.date}</td><td><StatusBadge value={String(item.status)} /></td>
                    <td><div className="admin-row-actions"><button>Sửa</button><button><Lock size={14} /> Khóa</button><button>Xóa</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active === 'users' && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div><h3>Quản lý User toàn hệ thống</h3><p>Tạo user, reset mật khẩu, gán role và chuyển doanh nghiệp.</p></div>
            <button type="button" className="admin-button admin-button-primary"><Plus size={16} /> Tạo user</button>
          </div>
          <div className="admin-toolbar">
            <label><Search size={16} /><input value={query} onChange={event => { setQuery(event.target.value); setUserPage(1); }} placeholder="Tìm user, email, doanh nghiệp..." /></label>
            <button type="button" className="admin-button admin-button-soft"><Filter size={16} /> Role / trạng thái</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>User</th><th>Email</th><th>SĐT</th><th>Doanh nghiệp</th><th>Vai trò</th><th>Trạng thái</th><th>Lần đăng nhập cuối</th><th></th></tr></thead>
              <tbody>
                {userRows.map((item, index) => (
                  <tr key={`${item.email}-${index}`}>
                    <td><div className="admin-user-cell"><span>{item.name.charAt(0)}</span><strong>{item.name}</strong></div></td><td>{item.email}</td><td>{item.phone}</td><td>{item.company}</td><td>{item.role}</td><td><StatusBadge value={item.status} /></td><td>{item.lastLogin}</td>
                    <td><div className="admin-row-actions"><button>Sửa</button><button><RotateCcw size={14} /> Reset</button><button>{item.status === 'Locked' ? <Unlock size={14} /> : <Lock size={14} />} {item.status === 'Locked' ? 'Kích hoạt' : 'Khóa'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination"><button disabled={userPage === 1} onClick={() => setUserPage(1)}>1</button><button disabled={userPage === 2} onClick={() => setUserPage(2)}>2</button><span>Hiển thị 6 user / trang</span></div>
        </section>
      )}

      {active === 'subscriptions' && (
        <section className="admin-card">
          <div className="admin-card-head"><div><h3>Quản lý gói dịch vụ SaaS</h3><p>Starter, Growth, Enterprise cùng giới hạn user, đơn hàng, batch, xưởng và AI credits.</p></div><button className="admin-button admin-button-primary"><Plus size={16} /> Tạo gói</button></div>
          <div className="admin-plan-grid">
            {plans.map(item => <article className="admin-plan" key={item.name}><h4>{item.name}</h4><strong>{item.price ? money(item.price) : 'Liên hệ'}</strong><span>{item.period}</span><div className="admin-plan-limits"><p>{item.users} users</p><p>{number(item.orders)} orders</p><p>{number(item.batches)} batch</p><p>{item.workshops} xưởng</p><p>{number(item.ai)} AI credits</p></div><ul>{item.features.map(feature => <li key={feature}>{feature}</li>)}</ul><div className="admin-row-actions"><button>Sửa</button><button>Xóa</button></div></article>)}
          </div>
          <div className="admin-feature-table">
            <table className="admin-table"><thead><tr><th>Tính năng</th>{plans.map(item => <th key={item.name}>{item.name}</th>)}</tr></thead><tbody>{featureRows.map(feature => <tr key={feature}><td>{feature}</td>{plans.map((item, index) => <td key={`${item.name}-${feature}`}>{index === 0 && feature.includes('Custom') ? <XCircle size={16} /> : <CheckCircle2 size={16} />}</td>)}</tr>)}</tbody></table>
          </div>
        </section>
      )}

      {active === 'billing' && (
        <>
          <section className="admin-card admin-revenue-filter">
            <div>
              <span className="admin-eyebrow">Revenue Report</span>
              <h3>Doanh thu theo khoảng thời gian</h3>
              <p>Admin chọn ngày bắt đầu và ngày kết thúc để xem, lọc bảng hóa đơn và xuất báo cáo doanh thu theo đúng khoảng đó.</p>
            </div>
            <div className="admin-date-range">
              <label>
                <span>Từ ngày</span>
                <input type="date" value={revenueFrom} onChange={event => setRevenueFrom(event.target.value)} />
              </label>
              <label>
                <span>Đến ngày</span>
                <input type="date" value={revenueTo} onChange={event => setRevenueTo(event.target.value)} />
              </label>
              <button type="button" className="admin-button admin-button-primary" onClick={exportRevenueReport}>
                <Download size={16} /> Xuất doanh thu
              </button>
            </div>
          </section>

          <section className="admin-mini-grid">
            <MiniMetric label="Doanh thu trong khoảng" value={money(revenueReport.total)} icon={DollarSign} />
            <MiniMetric label="Số ngày đã chọn" value={number(revenueReport.rangeDays)} icon={CalendarDays} />
            <MiniMetric label="Trung bình / ngày" value={money(revenueReport.averagePerDay)} icon={ReceiptText} />
            <MiniMetric label="Chờ + lỗi" value={money(revenueReport.pending + revenueReport.failed)} icon={AlertTriangle} />
          </section>
          <section className="admin-grid-2">
            <ChartPanel title="Biểu đồ doanh thu theo ngày"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueReport.timeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value) => [`${value} triệu`, 'Doanh thu']} /><Area dataKey="revenue" stroke="#d4a574" fill="#d4a57433" strokeWidth={3} /></AreaChart></ResponsiveContainer></ChartPanel>
            <ChartPanel title="Top khách hàng theo khoảng ngày">{revenueReport.topCustomers.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={revenueReport.topCustomers} dataKey="value" nameKey="name" outerRadius={92}>{revenueReport.topCustomers.map((_, index) => <Cell key={index} fill={['#d4a574', '#60a5fa', '#22c55e', '#8b5cf6', '#f97316'][index]} />)}</Pie><Tooltip formatter={(value) => [`${value} triệu`, 'Doanh thu']} /></PieChart></ResponsiveContainer> : <div className="admin-chart-empty">Không có doanh thu trong khoảng ngày đã chọn.</div>}</ChartPanel>
          </section>
          <section className="admin-card"><div className="admin-card-head"><div><h3>Billing Management</h3><p>Hiển thị {number(revenueReport.rangeInvoices.length)} hóa đơn trong khoảng đã chọn.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã hóa đơn</th><th>Doanh nghiệp</th><th>Gói</th><th>Số tiền</th><th>Ngày thanh toán</th><th>Phương thức</th><th>Trạng thái</th></tr></thead><tbody>{revenueReport.rangeInvoices.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.company}</td><td>{item.plan}</td><td>{money(Number(item.amount))}</td><td>{item.date}</td><td>{item.method}</td><td><StatusBadge value={String(item.status)} /></td></tr>)}</tbody></table></div></section>
        </>
      )}

      {active === 'ai' && (
        <>
          <section className="admin-mini-grid">{aiUsage.map(item => <MiniMetric key={item.label} label={item.label} value={item.value} icon={item.icon} />)}</section>
          <section className="admin-card">
            <div className="admin-card-head"><div><h3>AI Management</h3><p>Giới hạn AI usage, bật/tắt AI, quản lý credits và lịch sử AI.</p></div><button className="admin-button admin-button-primary"><Settings size={16} /> Cấu hình AI</button></div>
            <div className="admin-ai-controls"><label><input type="checkbox" defaultChecked /> Bật AI toàn hệ thống</label><label><input type="checkbox" defaultChecked /> Giới hạn theo gói</label><label><input type="checkbox" /> Chặn khi vượt chi phí</label></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Doanh nghiệp</th><th>Request</th><th>Token</th><th>Chi phí</th><th>Credits còn lại</th></tr></thead><tbody>{users.slice(0, 6).map((item, index) => <tr key={item.email}><td>{item.name}</td><td>{item.company}</td><td>{number(1200 + index * 387)}</td><td>{number(240000 + index * 8900)}</td><td>{money(420000 + index * 62000)}</td><td>{number(12000 - index * 850)}</td></tr>)}</tbody></table></div>
          </section>
        </>
      )}

      {active === 'monitoring' && (
        <>
          <section className="admin-system-grid">{systemMetrics.map(item => { const Icon = item.icon; return <article className={`admin-system-card admin-system-${item.tone}`} key={item.name}><Icon size={20} /><span>{item.name}</span><strong>{item.value}{item.name === 'Response Time' ? 'ms' : '%'}</strong><div><i style={{ width: `${Math.min(Number(item.value), 100)}%` }} /></div></article>; })}</section>
          <ChartPanel title="Biểu đồ realtime CPU / RAM / API / Error"><ResponsiveContainer width="100%" height="100%"><LineChart data={realtimeData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="time" /><YAxis /><Tooltip /><Line dataKey="cpu" stroke="#d4a574" strokeWidth={2} /><Line dataKey="ram" stroke="#60a5fa" strokeWidth={2} /><Line dataKey="api" stroke="#22c55e" strokeWidth={2} /><Line dataKey="errors" stroke="#ef4444" strokeWidth={2} /></LineChart></ResponsiveContainer></ChartPanel>
          <section className="admin-card"><h3>Log hệ thống</h3><div className="admin-log-list"><p><StatusBadge value="Critical" /> API latency vượt 800ms tại /api/ai/recommend</p><p><StatusBadge value="Medium" /> Database connection pool đạt 78%</p><p><StatusBadge value="Low" /> Backup daily hoàn tất</p></div></section>
        </>
      )}

      {active === 'audit' && (
        <section className="admin-card">
          <div className="admin-card-head"><div><h3>Audit Log</h3><p>Theo dõi ai đăng nhập, tạo đơn hàng, sửa batch, xóa dữ liệu và đổi quyền.</p></div></div>
          <div className="admin-toolbar"><label><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm user, hành động, IP..." /></label><button className="admin-button admin-button-soft"><Filter size={16} /> Nâng cao</button></div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Hành động</th><th>Đối tượng</th><th>Thời gian</th><th>IP</th></tr></thead><tbody>{auditLogs.filter(item => `${item.user} ${item.action} ${item.ip}`.toLowerCase().includes(query.toLowerCase())).map(item => <tr key={`${item.user}-${item.time}`}><td>{item.user}</td><td>{item.action}</td><td>{item.target}</td><td>{item.time}</td><td>{item.ip}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {active === 'workflow' && (
        <section className="admin-card">
          <div className="admin-card-head"><div><h3>Workflow Management</h3><p>Kéo thả để sắp xếp workflow: Order | Assignment | Production | QC | Packaging | Delivery.</p></div><button className="admin-button admin-button-primary"><Plus size={16} /> Tạo workflow</button></div>
          <div className="admin-workflow-board">
            {workflowStages.map((stage, index) => (
              <div key={stage} className="admin-workflow-step" draggable onDragStart={() => setDragIndex(index)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragIndex !== null) moveStage(dragIndex, index); setDragIndex(null); }}>
                <GripVertical size={18} /><span>{index + 1}</span><strong>{stage}</strong><button>Sửa</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {active === 'alerts' && (
        <section className="admin-card">
          <div className="admin-card-head"><div><h3>Trung tâm cảnh báo</h3><p>Cảnh báo realtime theo Critical, High, Medium, Low.</p></div><button className="admin-button admin-button-primary"><BellRing size={16} /> Tạo rule</button></div>
          <div className="admin-alert-list">{alertRows.map(item => <div key={item.title} className={`admin-alert admin-alert-${item.severity.toLowerCase()}`}><AlertTriangle size={18} /><div><strong>{item.title}</strong><span>{item.source} · {item.time}</span></div><StatusBadge value={item.severity} /></div>)}</div>
        </section>
      )}

      {active === 'reports' && (
        <>
          <section className="admin-card">
            <div className="admin-card-head"><div><h3>Báo cáo điều hành</h3><p>Doanh thu, tăng trưởng, doanh nghiệp mới, user mới, batch, hiệu suất xưởng, nhân viên và QC pass rate.</p></div><div className="admin-row-actions"><button><Download size={14} /> PDF</button><button><Download size={14} /> Excel</button><button><CalendarDays size={14} /> Chọn khoảng thời gian</button></div></div>
          </section>
          <section className="admin-kpi-grid">{['Doanh thu 8.12B', 'Tăng trưởng 31.8%', 'DN mới 24', 'User mới 1,240', 'Batch 18,930', 'Hiệu suất xưởng 88%', 'Hiệu suất nhân viên 91%', 'QC pass rate 97.2%'].map(item => { const value = item.split(' ').at(-1) ?? item; return <article className="admin-kpi" key={item}><div className="admin-kpi-icon"><FileBarChart size={20} /></div><div><span>{item.replace(value, '')}</span><strong>{value}</strong><small>Executive KPI</small></div></article>; })}</section>
        </>
      )}
    </div>
  );
}
