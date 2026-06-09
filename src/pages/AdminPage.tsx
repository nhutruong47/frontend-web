import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  | 'monitoring'
  | 'audit'
  | 'workflow'
  | 'alerts'
  | 'reports';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

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

const percentValue = (part: number, total: number) => total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0%';

const periodChangeNote = (current: number, previous: number, period = 'tháng trước') => {
  if (previous <= 0) return realDataNote;
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}% so với ${period}`;
};

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
  { label: 'Batch sản xuất', value: number(overview.totalBatches), detail: `${number(overview.activeBatches)} batch đang chạy`, icon: GitBranch, tone: 'green' },
  { label: 'Tài khoản nhân viên', value: number(overview.memberUsers), detail: `${number(overview.adminUsers)} admin`, icon: UserCheck, tone: 'violet' },
  { label: 'Doanh thu tháng', value: money(overview.revenueThisMonth), detail: periodChangeNote(overview.revenueThisMonth, overview.revenuePreviousMonth), icon: DollarSign, tone: 'green' },
  { label: 'Doanh thu năm', value: money(overview.revenueThisYear), detail: periodChangeNote(overview.revenueThisYear, overview.revenuePreviousYear, 'năm trước'), icon: DollarSign, tone: 'coffee' },
  { label: 'User mới tháng này', value: number(overview.newUsersThisMonth), detail: periodChangeNote(overview.newUsersThisMonth, overview.newUsersPreviousMonth), icon: ArrowUpDown, tone: 'blue' },
  { label: 'Xưởng mới tháng này', value: number(overview.newTeamsThisMonth), detail: periodChangeNote(overview.newTeamsThisMonth, overview.newTeamsPreviousMonth), icon: Building2, tone: 'amber' },
  { label: 'Công việc hoàn thành', value: percentValue(overview.completedTasks, overview.totalTasks), detail: `${number(overview.completedTasks)}/${number(overview.totalTasks)} task`, icon: Percent, tone: 'green' },
  { label: 'Việc quá hạn', value: number(overview.overdueTasks + overview.overdueProductionOrders), detail: 'Task + đơn sản xuất quá hạn', icon: AlertTriangle, tone: 'amber' },
  { label: 'Mục tiêu đang chạy', value: number(overview.activeGoals), detail: `${number(overview.totalGoals)} mục tiêu tổng`, icon: Gauge, tone: 'violet' }
];

const plans = [
  { name: 'Starter', price: 499000, period: 'Tháng', users: 5, orders: 100, batches: 300, workshops: 1, ai: 5000, features: ['Order board', 'Batch tracking', 'Basic reports'] },
  { name: 'Growth', price: 1499000, period: 'Tháng', users: 30, orders: 1000, batches: 5000, workshops: 5, ai: 40000, features: ['QC workflow', 'AI assistant', 'Billing export'] },
  { name: 'Enterprise', price: 0, period: 'Năm', users: 500, orders: 99999, batches: 99999, workshops: 50, ai: 500000, features: ['SLA', 'Custom workflow', 'Dedicated AI limit'] }
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
  return <span className={`admin-badge admin-badge-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>;
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
  const [workflowStages, setWorkflowStages] = useState(['Order', 'Assignment', 'Production', 'QC', 'Packaging', 'Delivery']);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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
    status: item.published ? 'Published' : 'Private'
  })).filter(item => {
    const matchesText = `${item.name} ${item.code} ${item.owner}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'All' || item.status === status;
    const matchesPlan = plan === 'All' || item.plan === plan;
    return matchesText && matchesStatus && matchesPlan;
  });

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
          <span className="admin-eyebrow">ORCA SaaS Admin</span>
          <h1>Dashboard Tổng Quan Hệ Thống</h1>
          <p>Trung tâm điều hành cho Coffee Production Management Platform: doanh nghiệp, user, billing, AI, monitoring, audit và báo cáo điều hành.</p>
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
          <section className="admin-card"><div className="admin-card-head"><div><h3>Billing Management</h3><p>Hiển thị {number(revenueReport.rangeInvoices.length)} giao dịch thật trong khoảng đã chọn.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã giao dịch</th><th>Người dùng</th><th>Gói</th><th>Số tiền</th><th>Ngày thanh toán</th><th>Ngân hàng</th><th>Trạng thái</th></tr></thead><tbody>{revenueReport.rangeInvoices.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Chưa có giao dịch thanh toán thật trong khoảng này.</td></tr> : revenueReport.rangeInvoices.map(item => <tr key={item.id}><td>{item.txnRef}</td><td>{paymentCustomerName(item)}</td><td>{item.planId}</td><td>{money(Number(item.amount))}</td><td>{formatShortDate(paymentDate(item))}</td><td>{item.bankCode || '-'}</td><td><StatusBadge value={String(item.status)} /></td></tr>)}</tbody></table></div></section>
        </>
      )}

      {active === 'ai' && (
        <>
          <section className="admin-mini-grid">{aiUsage.map(item => <MiniMetric key={item.label} label={item.label} value={item.value} icon={item.icon} />)}</section>
          <section className="admin-card">
            <div className="admin-card-head"><div><h3>AI Management</h3><p>Giới hạn AI usage, bật/tắt AI, quản lý credits và lịch sử AI.</p></div><button className="admin-button admin-button-primary"><Settings size={16} /> Cấu hình AI</button></div>
            <div className="admin-ai-controls"><label><input type="checkbox" defaultChecked /> Bật AI toàn hệ thống</label><label><input type="checkbox" defaultChecked /> Giới hạn theo gói</label><label><input type="checkbox" /> Chặn khi vượt chi phí</label></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Email</th><th>Gói AI</th><th>Hết hạn</th></tr></thead><tbody>{adminUsers.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Chưa có user trong hệ thống.</td></tr> : adminUsers.slice(0, 6).map(item => <tr key={item.id}><td>{item.fullName || item.username}</td><td>{item.email || '-'}</td><td>{item.aiPlan || 'free'}</td><td>{item.aiPlanExpiresAt ? formatShortDate(item.aiPlanExpiresAt) : '-'}</td></tr>)}</tbody></table></div>
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
          <section className="admin-kpi-grid">{kpis.slice(0, 8).map(item => <KpiCard key={`report-${item.label}`} item={{ ...item, icon: FileBarChart }} />)}</section>
        </>
      )}
    </div>
  );
}
