import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  
  Filter,
  Gauge,
  GitBranch,
  
  Lock,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Unlock,
  Users,
  
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
import { adminService } from '../services/adminService';
import type { AdminOrder, AdminOverview, AdminPayment, AdminTask, AdminTeam, AdminUser } from '../types/types';
import './AdminPage.css';

type AdminSection =
  | 'overview'
  | 'businesses'
  | 'users'
  | 'subscriptions'
  | 'billing'
  | 'ai'
  | 'support';



const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

const parseDateInput = (value: string, endOfDay = false) => {
  const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10);

const tabs: Array<{ id: AdminSection; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Tổng quan', icon: Gauge },
  { id: 'businesses', label: 'Doanh nghiệp', icon: Building2 },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'subscriptions', label: 'Gói dịch vụ', icon: ReceiptText },
  { id: 'billing', label: 'Thanh toán', icon: CreditCard },
  { id: 'ai', label: 'Sử dụng AI', icon: Brain },
  { id: 'support', label: 'Hỗ trợ', icon: BellRing }
];

type KpiTone = 'coffee' | 'blue' | 'amber' | 'green' | 'violet';

type KpiItem = {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: KpiTone;
};

const emptyOverview: AdminOverview = {
  totalUsers: 0,
  adminUsers: 0,
  memberUsers: 0,
  newUsersThisMonth: 0,
  newUsersPreviousMonth: 0,
  totalTeams: 0,
  publishedTeams: 0,
  newTeamsThisMonth: 0,
  newTeamsPreviousMonth: 0,
  totalGoals: 0,
  activeGoals: 0,
  totalTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
  totalOrders: 0,
  activeOrders: 0,
  totalProductionOrders: 0,
  activeProductionOrders: 0,
  overdueProductionOrders: 0,
  totalBatches: 0,
  activeBatches: 0,
  completedBatches: 0,
  paidPayments: 0,
  totalPayments: 0,
  revenueThisMonth: 0,
  revenuePreviousMonth: 0,
  revenueThisYear: 0,
  revenuePreviousYear: 0,
  revenueTotal: 0,
  orderStatusCounts: {},
  productionOrderStatusCounts: {},
  batchStatusCounts: {},
  taskStatusCounts: {},
  recentUsers: [],
  recentTeams: [],
};

const realDataNote = 'Từ dữ liệu hệ thống';





const getDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sameMonth = (value: string | null | undefined, monthDate: Date) => {
  const date = getDate(value);
  return Boolean(date && date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth());
};

const paymentDate = (payment: AdminPayment) => getDate(payment.paidAt || payment.createdAt);

const formatShortDate = (value: Date | string | null | undefined) => {
  const date = value instanceof Date ? value : getDate(value);
  return date ? date.toLocaleDateString('vi-VN') : '-';
};

const paymentCustomerName = (payment: AdminPayment) =>
  payment.fullName || payment.username || payment.email || 'Không rõ người dùng';

const buildKpis = (overview: AdminOverview): KpiItem[] => [
  { label: 'Doanh nghiệp / xưởng', value: number(overview.totalTeams), detail: realDataNote, icon: Building2, tone: 'coffee' },
  { label: 'Tổng người dùng', value: number(overview.totalUsers), detail: realDataNote, icon: Users, tone: 'blue' },
  { label: 'Đơn đang xử lý', value: number(overview.activeOrders + overview.activeProductionOrders), detail: 'Đơn liên xưởng + đơn sản xuất', icon: ShoppingCart, tone: 'amber' },
  { label: 'Batch sản xuất', value: number(overview.totalBatches), detail: `${number(overview.activeBatches)} batch đang chạy`, icon: GitBranch, tone: 'green' }
];

const plans = [
  { name: 'Cơ bản', price: 499000, period: 'Tháng', users: 5, orders: 100, batches: 300, workshops: 1, ai: 5000, features: ['Bảng đơn hàng', 'Theo dõi lô sản xuất', 'Báo cáo cơ bản'] },
  { name: 'Tăng trưởng', price: 1499000, period: 'Tháng', users: 30, orders: 1000, batches: 5000, workshops: 5, ai: 40000, features: ['Quy trình QC', 'Trợ lý AI', 'Xuất dữ liệu thanh toán'] },
  { name: 'Doanh nghiệp', price: 0, period: 'Năm', users: 500, orders: 99999, batches: 99999, workshops: 50, ai: 500000, features: ['Cam kết dịch vụ', 'Quy trình tùy chỉnh', 'Giới hạn AI riêng'] }
];

const featureRows = [
  'Quản lý đơn hàng',
  'Theo dõi lô sản xuất',
  'Quy trình QC',
  'Trợ lý AI',
  'Xuất dữ liệu thanh toán',
  'Quy trình tùy chỉnh',
  'Hỗ trợ riêng'
];

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  return (
    <article className={`admin-kpi admin-kpi-${item.tone}`}>
      <div className="admin-kpi-icon"><Icon size={20} /></div>
      <div>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
        <small>{item.detail}</small>
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
  const labels: Record<string, string> = {
    Critical: 'Nghiêm trọng',
    High: 'Cao',
    Medium: 'Trung bình',
    Low: 'Thấp',
    Active: 'Đang hoạt động',
    Trial: 'Dùng thử',
    Locked: 'Đã khóa',
    APPROVED: 'Đã duyệt',
    PENDING: 'Chờ duyệt',
    REJECTED: 'Từ chối',
    ACCEPTED: 'Đã nhận',
    COMPLETED: 'Hoàn thành',
    CANCELED: 'Đã hủy',
    REJECTED_ORDER: 'Từ chối',
    free: 'Miễn phí',
  };
  return <span className={`admin-badge admin-badge-${value.toLowerCase().replaceAll(' ', '-')}`}>{labels[value] || value}</span>;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section') as AdminSection | null;
  const active: AdminSection = tabs.some(tab => tab.id === sectionParam) ? sectionParam! : 'overview';
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminTeams, setAdminTeams] = useState<AdminTeam[]>([]);
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [adminPayments, setAdminPayments] = useState<AdminPayment[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [plan, setPlan] = useState('All');
  const [revenueFrom, setRevenueFrom] = useState('2026-05-01');
  const [revenueTo, setRevenueTo] = useState('2026-06-30');
  const [userPage, setUserPage] = useState(1);
  
  

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    setAdminError('');
    Promise.all([
      adminService.getOverview(),
      adminService.getUsers(),
      adminService.getTeams(),
      adminService.getOrders(),
      adminService.getTasks(),
      adminService.getPayments(),
    ])
      .then(([overviewData, userData, teamData, orderData, taskData, paymentData]) => {
        setOverview({ ...emptyOverview, ...overviewData });
        setAdminUsers(userData || []);
        setAdminTeams(teamData || []);
        setAdminOrders(orderData || []);
        setAdminTasks(taskData || []);
        setAdminPayments(paymentData || []);
      })
      .catch(() => {
        setAdminError('Không tải được thống kê thật từ hệ thống.');
      })
      .finally(() => setAdminLoading(false));
  }, [user?.role]);

  const kpis = useMemo(() => buildKpis(overview), [overview]);

  const systemTrendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, offset) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      return {
        month: `T${monthDate.getMonth() + 1}`,
        users: adminUsers.filter(item => sameMonth(item.createdAt, monthDate)).length,
        teams: adminTeams.filter(item => sameMonth(item.createdAt, monthDate)).length,
        orders: adminOrders.filter(item => sameMonth(item.createdAt, monthDate)).length,
        tasks: adminTasks.filter(item => sameMonth(item.createdAt, monthDate)).length,
      };
    });
  }, [adminUsers, adminTeams, adminOrders, adminTasks]);

  const aiUsage = useMemo(() => {
    const paidUsers = adminUsers.filter(item => item.aiPlan && item.aiPlan !== 'free');
    const freeUsers = adminUsers.filter(item => !item.aiPlan || item.aiPlan === 'free');
    const planCount = new Set(adminUsers.map(item => item.aiPlan || 'free')).size;
    return [
      { label: 'Tổng user', value: number(adminUsers.length), icon: Users },
      { label: 'User có gói AI', value: number(paidUsers.length), icon: Brain },
      { label: 'User gói free', value: number(freeUsers.length), icon: Gauge },
      { label: 'Loại gói đang có', value: number(planCount), icon: ReceiptText },
    ];
  }, [adminUsers]);

  const userRows = useMemo(() => {
    return adminUsers
      .map(item => ({
        id: item.id,
        name: item.fullName || item.username,
        email: item.email,
        phone: item.chipId || '-',
        company: '-',
        role: item.role,
        status: item.aiPlan || 'free',
        lastLogin: item.createdAt ? formatShortDate(item.createdAt) : '-'
      }))
      .filter(item => `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(query.toLowerCase()))
      .slice((userPage - 1) * 6, userPage * 6);
  }, [adminUsers, query, userPage]);

  const businessRows = adminTeams.map(item => ({
    id: item.id,
    name: item.name,
    code: item.id.slice(0, 8),
    owner: item.ownerName || '-',
    email: '-',
    phone: '-',
    employees: item.memberCount,
    orders: item.totalOrders,
    batches: 0,
    plan: '-',
    date: item.createdAt ? formatShortDate(item.createdAt) : '-',
    status: item.published ? 'Published' : 'Private',
    verificationStatus: item.verificationStatus || 'NOT_SUBMITTED',
    businessLicense: item.businessLicense || '',
    businessAddress: item.businessAddress || '',
    websiteUrl: item.websiteUrl || '',
    certificationDocument: item.certificationDocument || '',
    verificationRejectReason: item.verificationRejectReason || ''
  })).filter(item => {
    const matchesText = `${item.name} ${item.code} ${item.owner}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'All' || item.status === status;
    const matchesPlan = plan === 'All' || item.plan === plan;
    return matchesText && matchesStatus && matchesPlan;
  });

  const handleNotImplemented = () => {
    const el = document.createElement('div');
    el.textContent = '🚧 Chức năng đang được phát triển';
    Object.assign(el.style, { position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',background:'#333',color:'#fff',padding:'12px 24px',borderRadius:'10px',zIndex:'9999',fontSize:'14px',fontWeight:'500',boxShadow:'0 4px 12px rgba(0,0,0,0.3)',transition:'opacity 0.3s' });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
  };

  const updateTeamVerification = async (teamId: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    const rejectReason = nextStatus === 'REJECTED'
      ? window.prompt('Lý do từ chối hồ sơ xác minh?', 'Hồ sơ chưa đủ thông tin.')
      : '';
    if (nextStatus === 'REJECTED' && rejectReason === null) return;
    try {
      const updated = await adminService.updateTeamVerification(teamId, nextStatus, rejectReason || '');
      setAdminTeams(current => current.map(item => item.id === teamId ? { ...item, ...updated } : item));
    } catch {
      window.alert('Không thể cập nhật trạng thái xác minh.');
    }
  };

  const revenueReport = useMemo(() => {
    const fromDate = parseDateInput(revenueFrom);
    const toDate = parseDateInput(revenueTo, true);
    const safeFrom = fromDate <= toDate ? fromDate : toDate;
    const safeTo = fromDate <= toDate ? toDate : fromDate;
    const rangePayments = adminPayments.filter(item => {
      const date = paymentDate(item);
      return Boolean(date && date >= safeFrom && date <= safeTo);
    });
    const paidPayments = rangePayments.filter(item => item.status === 'PAID');
    const total = paidPayments.reduce((sum, item) => sum + Number(item.amount), 0);
    const pending = rangePayments
      .filter(item => item.status === 'PENDING')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const failed = rangePayments
      .filter(item => item.status === 'FAILED')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const dailyMap = paidPayments.reduce<Record<string, { amount: number; time: number }>>((acc, item) => {
      const date = paymentDate(item);
      const dateKey = formatShortDate(date);
      const current = acc[dateKey] || { amount: 0, time: date?.getTime() || 0 };
      acc[dateKey] = { amount: current.amount + Number(item.amount), time: current.time };
      return acc;
    }, {});
    const timeline = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, revenue: Math.round(data.amount / 1000000), time: data.time }))
      .sort((a, b) => a.time - b.time);
    const customerMap = paidPayments.reduce<Record<string, number>>((acc, item) => {
      const name = paymentCustomerName(item);
      acc[name] = (acc[name] || 0) + Number(item.amount);
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
      rangeInvoices: rangePayments,
      paidInvoices: paidPayments,
      total,
      pending,
      failed,
      rangeDays,
      averagePerDay: Math.round(total / rangeDays),
      topCustomers,
      timeline: timeline.length > 0 ? timeline : [{ date: 'Không có', revenue: 0 }],
    };
  }, [adminPayments, revenueFrom, revenueTo]);

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
      ...revenueReport.rangeInvoices.map(item => `${item.txnRef}, ${paymentCustomerName(item)}, ${item.planId}, ${money(Number(item.amount))}, ${formatShortDate(paymentDate(item))}, ${item.bankCode || '-'}, ${item.status}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orca-revenue-${revenueFrom}-${revenueTo}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  

  if (user?.role !== 'ADMIN') {
    return (
      <div className="admin-access">
        <ShieldCheck size={40} />
        <h1>Không có quyền truy cập bảng quản trị</h1>
        <p>Tài khoản hiện tại cần vai trò quản trị viên để xem dữ liệu toàn nền tảng.</p>
      </div>
    );
  }

  if (adminLoading) {
    return (
      <div className="admin-access">
        <Activity size={40} />
        <h1>Đang tải thống kê hệ thống</h1>
        <p>ORCA đang lấy số liệu thật từ cơ sở dữ liệu.</p>
      </div>
    );
  }

  if (adminError) {
    return (
      <div className="admin-access">
        <AlertTriangle size={40} />
        <h1>Không tải được thống kê</h1>
        <p>{adminError}</p>
      </div>
    );
  }

  return (
    <div className="admin-console">
      <header className="admin-hero">
        <div>
          <span className="admin-eyebrow">Quản trị ORCA SaaS</span>
          <h1>Tổng quan hệ thống</h1>
          <p>Trung tâm điều hành cho Coffee Production Management Platform: doanh nghiệp, user, billing, AI, audit và báo cáo điều hành.</p>
        </div>
        <div className="admin-hero-actions">
          <button type="button" className="admin-button admin-button-soft"><CalendarDays size={16} /> 30 ngày</button>
          <button type="button" className="admin-button admin-button-primary"><Download size={16} /> Xuất báo cáo</button>
        </div>
      </header>

      {active === 'overview' && (
        <>
          <section className="admin-kpi-grid">
            {kpis.map(item => <KpiCard key={item.label} item={item} />)}
          </section>
          <section className="admin-grid-2">
            <ChartPanel title="Đơn phát sinh theo tháng">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={systemTrendData}>
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
                  <Area dataKey="orders" stroke="#d4a574" fill="url(#revenueFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="User mới theo tháng">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={systemTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="users" stroke="#60a5fa" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Xưởng mới theo tháng">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="teams" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Công việc tạo theo tháng">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#22c55e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </section>
          
        </>
      )}

      {active === 'businesses' && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div><h3>Quản lý doanh nghiệp / xưởng</h3><p>Xem, thêm, chỉnh sửa, khóa hoặc xóa doanh nghiệp.</p></div>
            <button type="button" className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Thêm doanh nghiệp</button>
          </div>
          <div className="admin-toolbar">
            <label><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên, mã, người đại diện..." /></label>
            <select value={status} onChange={event => setStatus(event.target.value)}><option value="All">Tất cả</option><option value="Active">Đang hoạt động</option><option value="Trial">Dùng thử</option><option value="Locked">Đã khóa</option></select>
            <select value={plan} onChange={event => setPlan(event.target.value)}><option value="All">Tất cả</option><option value="Starter">Cơ bản</option><option value="Growth">Tăng trưởng</option><option value="Enterprise">Doanh nghiệp</option></select>
            <button type="button" className="admin-button admin-button-soft"><Filter size={16} /> Ngày đăng ký</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Tên doanh nghiệp</th><th>Mã</th><th>Đại diện</th><th>Email</th><th>Điện thoại</th><th>NV</th><th>Đơn</th><th>Batch</th><th>Gói</th><th>Ngày ĐK</th><th>Trạng thái</th><th>Xác minh</th><th></th></tr></thead>
              <tbody>
                {businessRows.map(item => (
                  <tr key={item.code}>
                    <td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.owner}</td><td>{item.email}</td><td>{item.phone}</td><td>{item.employees}</td><td>{item.orders}</td><td>{item.batches}</td><td>{item.plan}</td><td>{item.date}</td><td><StatusBadge value={String(item.status)} /></td>
                    <td>
                      <div className="admin-verification-cell">
                        <StatusBadge value={String(item.verificationStatus)} />
                        <small>GPL: {item.businessLicense || '-'}</small>
                        <small>ĐC: {item.businessAddress || '-'}</small>
                        {item.websiteUrl && <small>Web: {item.websiteUrl}</small>}
                        {item.certificationDocument && <small>Cert: {item.certificationDocument}</small>}
                        {item.verificationRejectReason && <small>Lý do: {item.verificationRejectReason}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button onClick={handleNotImplemented} className="btn-edit">Sửa</button>
                        {item.verificationStatus === 'PENDING' && <>
                          <button onClick={() => updateTeamVerification(item.id, 'APPROVED')} className="btn-approve"><CheckCircle2 size={14} /> Duyệt</button>
                          <button onClick={() => updateTeamVerification(item.id, 'REJECTED')} className="btn-reject"><XCircle size={14} /> Từ chối</button>
                        </>}
                        <button onClick={handleNotImplemented} className="btn-lock"><Lock size={14} /> Khóa</button>
                        <button onClick={handleNotImplemented} className="btn-delete">Xóa</button>
                      </div>
                    </td>
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
            <div><h3>Quản lý người dùng toàn hệ thống</h3><p>Tạo người dùng, đặt lại mật khẩu, gán vai trò và chuyển doanh nghiệp.</p></div>
            <button type="button" className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Tạo người dùng</button>
          </div>
          <div className="admin-toolbar">
            <label><Search size={16} /><input value={query} onChange={event => { setQuery(event.target.value); setUserPage(1); }} placeholder="Tìm người dùng, email, doanh nghiệp..." /></label>
            <button type="button" className="admin-button admin-button-soft"><Filter size={16} /> Role / trạng thái</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Người dùng</th><th>Email</th><th>SĐT</th><th>Doanh nghiệp</th><th>Vai trò</th><th>Trạng thái</th><th>Lần đăng nhập cuối</th><th></th></tr></thead>
              <tbody>
                {userRows.map((item, index) => (
                  <tr key={`${item.email}-${index}`}>
                    <td><div className="admin-user-cell"><span>{item.name.charAt(0)}</span><strong>{item.name}</strong></div></td><td>{item.email}</td><td>{item.phone}</td><td>{item.company}</td><td>{item.role}</td><td><StatusBadge value={item.status} /></td><td>{item.lastLogin}</td>
                    <td><div className="admin-row-actions"><button onClick={handleNotImplemented} className="btn-edit">Sửa</button><button onClick={handleNotImplemented} className="btn-reset"><RotateCcw size={14} /> Đặt lại</button><button onClick={handleNotImplemented} className="btn-lock">{item.status === 'Locked' ? <Unlock size={14} /> : <Lock size={14} />} {item.status === 'Locked' ? 'Kích hoạt' : 'Khóa'}</button></div></td>
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
          <div className="admin-card-head"><div><h3>Quản lý gói dịch vụ SaaS</h3><p>Các gói Cơ bản, Tăng trưởng, Doanh nghiệp cùng giới hạn người dùng, đơn hàng, lô sản xuất, xưởng và điểm AI.</p></div><button className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Tạo gói</button></div>
          <div className="admin-plan-grid">
            {plans.map(item => <article className="admin-plan" key={item.name}><h4>{item.name}</h4><strong>{item.price ? money(item.price) : 'Liên hệ'}</strong><span>{item.period}</span><div className="admin-plan-limits"><p>{item.users} người dùng</p><p>{number(item.orders)} đơn hàng</p><p>{number(item.batches)} lô</p><p>{item.workshops} xưởng</p><p>{number(item.ai)} điểm AI</p></div><ul>{item.features.map(feature => <li key={feature}>{feature}</li>)}</ul><div className="admin-row-actions"><button onClick={handleNotImplemented} className="btn-edit">Sửa</button><button onClick={handleNotImplemented} className="btn-delete">Xóa</button></div></article>)}
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
          <section className="admin-card"><div className="admin-card-head"><div><h3>Billing Management</h3><p>Hiển thị {number(revenueReport.rangeInvoices.length)} giao dịch thật trong khoảng đã chọn.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã giao dịch</th><th>Người dùng</th><th>Gói</th><th>Số tiền</th><th>Ngày thanh toán</th><th>Ngân hàng</th><th>Trạng thái</th></tr></thead><tbody>{revenueReport.rangeInvoices.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Chưa có giao dịch thanh toán thật trong khoảng này.</td></tr> : revenueReport.rangeInvoices.map(item => <tr key={item.id}><td>{item.txnRef}</td><td>{paymentCustomerName(item)}</td><td>{item.planId}</td><td>{money(Number(item.amount))}</td><td>{formatShortDate(paymentDate(item))}</td><td>{item.bankCode || '-'}</td><td><StatusBadge value={String(item.status)} /></td></tr>)}</tbody></table></div></section>
        </>
      )}

      {active === 'ai' && (
        <>
          <section className="admin-mini-grid">{aiUsage.map(item => <MiniMetric key={item.label} label={item.label} value={item.value} icon={item.icon} />)}</section>
          <section className="admin-card">
            <div className="admin-card-head"><div><h3>Quản lý AI</h3><p>Giới hạn sử dụng AI, bật/tắt AI, quản lý điểm và lịch sử AI.</p></div><button className="admin-button admin-button-primary" onClick={handleNotImplemented}><Settings size={16} /> Cấu hình AI</button></div>
            <div className="admin-ai-controls"><label><input type="checkbox" defaultChecked /> Bật AI toàn hệ thống</label><label><input type="checkbox" defaultChecked /> Giới hạn theo gói</label><label><input type="checkbox" /> Chặn khi vượt chi phí</label></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Email</th><th>Gói AI</th><th>Hết hạn</th></tr></thead><tbody>{adminUsers.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Chưa có user trong hệ thống.</td></tr> : adminUsers.slice(0, 6).map(item => <tr key={item.id}><td>{item.fullName || item.username}</td><td>{item.email || '-'}</td><td>{item.aiPlan || 'free'}</td><td>{item.aiPlanExpiresAt ? formatShortDate(item.aiPlanExpiresAt) : '-'}</td></tr>)}</tbody></table></div>
          </section>
        </>
      )}

      
      {active === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <section className="admin-card">
            <h3>Ticket hỗ trợ</h3>
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có ticket nào</div>
          </section>
          <section className="admin-card">
            <h3>Khiếu nại</h3>
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Không có khiếu nại</div>
          </section>
          <section className="admin-card">
            <h3>Yêu cầu xác minh</h3>
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Không có yêu cầu nào</div>
          </section>
        </div>
      )}
    </div>
  );
}
