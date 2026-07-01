import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Building2,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Lock,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  ServerCrash,
  ShieldCheck,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import type { AdminOverview, AdminPayment, AdminTeam, AdminUser } from '../types/types';
import './AdminPage.css';

type AdminSection =
  | 'overview'
  | 'workspace_requests'
  | 'companies'
  | 'users'
  | 'subscriptions'
  | 'payments'
  | 'reports'
  | 'logs';

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

const parseDateInput = (value: string, endOfDay = false) => {
  const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};


const sidebarModules: Array<{ id: AdminSection; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Tổng quan & Phân tích', icon: Activity },
  { id: 'workspace_requests', label: 'Yêu cầu mở xưởng', icon: ShieldCheck },
  { id: 'companies', label: 'Quản lý doanh nghiệp', icon: Building2 },
  { id: 'users', label: 'Quản lý người dùng', icon: Users },
  { id: 'subscriptions', label: 'Gói dịch vụ', icon: CreditCard },
  { id: 'payments', label: 'Thanh toán & doanh thu', icon: DollarSign },
  { id: 'reports', label: 'Báo cáo thống kê', icon: FileText },
  { id: 'logs', label: 'Nhật ký hệ thống', icon: ServerCrash },
];

type KpiTone = 'blue' | 'green' | 'amber' | 'violet' | 'rose';

type KpiItem = {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: KpiTone;
  trend?: 'up' | 'down';
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

const getDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const paymentDate = (payment: AdminPayment) => getDate(payment.paidAt || payment.createdAt);

const formatShortDate = (value: Date | string | null | undefined) => {
  const date = value instanceof Date ? value : getDate(value);
  return date ? date.toLocaleDateString('vi-VN') : '-';
};

const formatTime = (value: string | null | undefined) => {
  const date = getDate(value);
  return date ? date.toLocaleTimeString('vi-VN') : '-';
};

const paymentCustomerName = (payment: AdminPayment) =>
  payment.fullName || payment.username || payment.email || 'Không rõ người dùng';

const initialPlans = [
  { name: 'Chuyên nghiệp', price: 129000, period: 'Tháng', users: 30, orders: 1000, batches: 5000, workshops: 5, ai: 40000, features: ['Cảnh báo công việc', 'Cảnh báo nguyên liệu', 'Phân tích hiệu suất', 'Phát hiện điểm nghẽn'] },
  { name: 'Doanh nghiệp', price: 249000, period: 'Tháng', users: 500, orders: 99999, batches: 99999, workshops: 50, ai: 500000, features: ['Kế hoạch dài hạn', 'Dự báo nhu cầu', 'Mô phỏng kịch bản', 'Quản lý nhiều xưởng'] }
];

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  return (
    <article className={`admin-kpi admin-kpi-${item.tone}`}>
      <div className="admin-kpi-icon"><Icon size={22} /></div>
      <div className="admin-kpi-content">
        <span>{item.label}</span>
        <strong>{item.value}</strong>
        <small className={item.trend === 'up' ? 'positive' : item.trend === 'down' ? 'negative' : ''}>{item.detail}</small>
      </div>
    </article>
  );
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <article className="admin-mini-metric">
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="admin-card admin-chart-card">
      <div className="admin-card-head">
        <h3>{title}</h3>
        <button type="button" className="btn-icon"><MoreHorizontal size={16} /></button>
      </div>
      <div className="admin-chart">{children}</div>
    </section>
  );
}

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase().replaceAll(' ', '-');
  let type = 'neutral';
  
  if (['active', 'paid', 'approved', 'published', 'completed', 'success'].includes(lower)) type = 'success';
  if (['pending', 'trial', 'processing'].includes(lower)) type = 'warning';
  if (['locked', 'failed', 'rejected', 'suspended', 'canceled', 'rejected_order'].includes(lower)) type = 'danger';
  if (['admin', 'professional', 'enterprise', 'factory_owner'].includes(lower)) type = 'info';

  const labels: Record<string, string> = {
    Active: 'Đang hoạt động', Trial: 'Dùng thử', Locked: 'Đã khóa',
    APPROVED: 'Đã duyệt', PENDING: 'Chờ duyệt', REJECTED: 'Từ chối',
    Suspended: 'Tạm đình chỉ',
    PAID: 'Đã thanh toán', FAILED: 'Thất bại', REFUNDED: 'Hoàn tiền',
    Published: 'Công khai', Private: 'Nội bộ',
    ADMIN: 'Admin Nền Tảng', MEMBER: 'Thành viên', FACTORY_OWNER: 'Chủ xưởng',
    free: 'Miễn phí', professional: 'Chuyên nghiệp', enterprise: 'Doanh nghiệp',
    SUCCESS: 'Thành công'
  };

  return <span className={`admin-badge ${type}`}>{labels[value] || value}</span>;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section') as AdminSection | null;
  const active: AdminSection = sidebarModules.some(tab => tab.id === sectionParam) ? sectionParam! : 'overview';
  
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminTeams, setAdminTeams] = useState<AdminTeam[]>([]);
  const [adminPayments, setAdminPayments] = useState<AdminPayment[]>([]);
  const [plans] = useState<any[]>(initialPlans);
  
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState('');
  
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [revenueFrom] = useState('2026-06-01');
  const [revenueTo] = useState('2026-06-30');

  const handleNotImplemented = () => {
    alert('Tính năng này đang được bảo trì hoặc đang trong quá trình phát triển.');
  };

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
      adminService.getPayments(),
    ])
      .then(([overviewData, userData, teamData, paymentData]) => {
        setOverview({ ...emptyOverview, ...overviewData });
        setAdminUsers(userData || []);
        setAdminTeams(teamData || []);
        setAdminPayments(paymentData || []);
      })
      .catch(() => {
        setAdminError('Không tải được thống kê thật từ hệ thống.');
      })
      .finally(() => setAdminLoading(false));
  }, [user?.role]);



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
    const pending = rangePayments.filter(item => item.status === 'PENDING').reduce((sum, item) => sum + Number(item.amount), 0);
    
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
      
    const planMap = paidPayments.reduce<Record<string, number>>((acc, item) => {
      const planName = !item.planId || item.planId === 'free' ? 'Dùng thử' : item.planId === 'professional' ? 'Chuyên nghiệp' : item.planId === 'enterprise' ? 'Doanh nghiệp' : item.planId;
      acc[planName] = (acc[planName] || 0) + Number(item.amount);
      return acc;
    }, {});
    
    const revenueByPlan = Object.entries(planMap).map(([name, value]) => ({ name, value: Math.round(value / 1000000), amount: value })).sort((a, b) => b.amount - a.amount);
    
    const customerMap = paidPayments.reduce<Record<string, number>>((acc, item) => {
      const name = paymentCustomerName(item);
      acc[name] = (acc[name] || 0) + Number(item.amount);
      return acc;
    }, {});
    
    const topCustomers = Object.entries(customerMap).map(([name, value]) => ({ name, value: Math.round(value / 1000000) })).sort((a, b) => b.value - a.value).slice(0, 5);

    return { total, pending, rangeInvoices: rangePayments, timeline, revenueByPlan, topCustomers };
  }, [adminPayments, revenueFrom, revenueTo]);

  const dashboardKpis: KpiItem[] = [
    { label: 'Tổng số doanh nghiệp', value: number(adminTeams.length), detail: `+${number(overview.newTeamsThisMonth)} tháng này`, icon: Building2, tone: 'blue', trend: 'up' },
    { label: 'Tổng số người dùng', value: number(adminUsers.length), detail: `+${number(overview.newUsersThisMonth)} tháng này`, icon: Users, tone: 'violet', trend: 'up' },
    { label: 'Doanh thu tháng này', value: money(overview.revenueThisMonth), detail: 'so với tháng trước', icon: DollarSign, tone: 'green', trend: 'up' },
    { label: 'Xưởng chờ duyệt', value: number(adminTeams.filter(t => t.verificationStatus === 'PENDING').length), detail: 'Cần xử lý', icon: AlertTriangle, tone: 'amber' },
  ];

  const systemTrendData = [
    { month: 'Jan', revenue: 120, companies: 45, users: 1200 },
    { month: 'Feb', revenue: 150, companies: 52, users: 1450 },
    { month: 'Mar', revenue: 180, companies: 61, users: 1680 },
    { month: 'Apr', revenue: 210, companies: 75, users: 1900 },
    { month: 'May', revenue: 250, companies: 88, users: 2200 },
    { month: 'Jun', revenue: 310, companies: 105, users: 2600 },
  ];

  const pendingRequests = adminTeams.filter(t => t.verificationStatus === 'PENDING');
  const approvedCompanies = adminTeams.filter(t => t.verificationStatus !== 'PENDING');

  const updateTeamVerification = async (teamId: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    const rejectReason = nextStatus === 'REJECTED' ? window.prompt('Reject reason?') : '';
    if (nextStatus === 'REJECTED' && rejectReason === null) return;
    try {
      const updated = await adminService.updateTeamVerification(teamId, nextStatus, rejectReason || '');
      setAdminTeams(current => current.map(item => item.id === teamId ? { ...item, ...updated } : item));
    } catch { window.alert('Error updating status.'); }
  };

  const handleCreateUser = async () => {
    const username = window.prompt("Username:");
    if (!username) return;
    try {
      const created = await adminService.createUser({ username, email: '', fullName: '', role: 'MEMBER' });
      setAdminUsers(current => [created, ...current]);
    } catch { window.alert("Error creating user."); }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="admin-access">
        <ShieldCheck size={40} />
        <h1>Từ chối truy cập</h1>
        <p>Bạn cần quyền Quản trị viên để xem bảng điều khiển này.</p>
      </div>
    );
  }

  if (adminLoading) {
    return (
      <div className="admin-access">
        <Activity size={40} />
        <h1>Đang tải thống kê nền tảng</h1>
        <p>Đang kết nối tới cơ sở dữ liệu bảo mật...</p>
      </div>
    );
  }

  if (adminError) {
    return (
      <div className="admin-access">
        <AlertTriangle size={40} />
        <h1>Lỗi tải bảng điều khiển</h1>
        <p>{adminError}</p>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <main className="admin-main">
        <div className="admin-main-inner">
          <header className="admin-hero">
            <div>
              <h1>{sidebarModules.find(m => m.id === active)?.label || 'Dashboard'}</h1>
              <p>Quản lý cấu hình nền tảng, theo dõi hoạt động và hỗ trợ khách hàng của bạn.</p>
            </div>
            <div className="admin-hero-actions">
              {active === 'users' && <button className="admin-button admin-button-primary" onClick={handleCreateUser}><Plus size={16} /> Thêm người dùng</button>}
              {active === 'overview' && <button className="admin-button admin-button-secondary"><Download size={16} /> Xuất dữ liệu</button>}
            </div>
          </header>

          {active === 'overview' && (
            <>
              <section className="admin-kpi-grid">
                {dashboardKpis.map(item => <KpiCard key={item.label} item={item} />)}
              </section>
              <section className="admin-grid-2">
                <ChartPanel title="Tăng trưởng doanh thu (Hàng tháng)">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={systemTrendData}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#revFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Người dùng & Công ty">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={systemTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} yAxisId="left" />
                      <YAxis axisLine={false} tickLine={false} yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="companies" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </section>
            </>
          )}

          {active === 'workspace_requests' && (
            <section className="admin-card">
              <div className="admin-card-head">
                <div><h3>Yêu cầu chờ duyệt</h3><p>Xem xét và xác minh đăng ký công ty mới.</p></div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Tên công ty</th><th>Chủ sở hữu</th><th>Thông tin kinh doanh</th><th>Ngày đăng ký</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>
                    {pendingRequests.length === 0 ? (
                      <tr><td colSpan={6} style={{textAlign:'center', padding:'32px', color:'#6b7280'}}>Không có yêu cầu chờ duyệt.</td></tr>
                    ) : pendingRequests.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.ownerName || '-'}</td>
                        <td>
                          <div style={{fontSize:'12px', color:'#6b7280'}}>
                            <div>GPKD: {item.businessLicense || '-'}</div>
                            <div>Địa chỉ: {item.businessAddress || '-'}</div>
                          </div>
                        </td>
                        <td>{item.createdAt ? formatShortDate(item.createdAt) : '-'}</td>
                        <td><StatusBadge value={item.verificationStatus || 'PENDING'} /></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="admin-button admin-button-primary" onClick={() => updateTeamVerification(item.id, 'APPROVED')} style={{padding:'4px 10px', fontSize:'12px'}}>Duyệt</button>
                            <button className="admin-button admin-button-secondary" onClick={() => updateTeamVerification(item.id, 'REJECTED')} style={{padding:'4px 10px', fontSize:'12px'}}>Từ chối</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {active === 'companies' && (
            <section className="admin-card">
              <div className="admin-card-head">
                <div><h3>Công ty đã duyệt</h3><p>Quản lý tất cả các tổ chức đang hoạt động trên nền tảng.</p></div>
              </div>
              <div className="admin-toolbar">
                <div className="admin-search-input"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm kiếm công ty..." /></div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Công ty</th><th>Mã Workspace</th><th>Chủ sở hữu</th><th>Thành viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>
                    {approvedCompanies.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td><code style={{background:'rgba(255,255,255,0.1)', color: 'inherit', padding:'4px 8px', borderRadius:'6px', fontSize:'12px', fontWeight: 600, letterSpacing: '0.5px'}}>{item.id.slice(0,8)}</code></td>
                        <td>{item.ownerName || '-'}</td>
                        <td>{item.memberCount} users</td>
                        <td><StatusBadge value="Active" /></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="btn-icon" title="Xem" onClick={handleNotImplemented}><FileText size={16}/></button>
                            <button className="btn-icon danger" title="Đình chỉ" onClick={handleNotImplemented}><Lock size={16}/></button>
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
                <div><h3>Người dùng nền tảng</h3><p>Quản lý tất cả tài khoản đã đăng ký trên hệ thống.</p></div>
              </div>
              <div className="admin-toolbar">
                <div className="admin-search-input"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm kiếm tên, email..." /></div>
                <select className="admin-select" value={status} onChange={e=>setStatus(e.target.value)}>
                  <option value="All">Tất cả vai trò</option>
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="FACTORY_OWNER">Chủ xưởng</option>
                  <option value="MEMBER">Thành viên</option>
                </select>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Người dùng</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
                  <tbody>
                    {adminUsers.filter(u => `${u.fullName} ${u.email}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All' || u.role === status)).slice(0,10).map(item => (
                      <tr key={item.id}>
                        <td><div className="admin-user-cell"><div className="admin-user-avatar">{(item.fullName || item.username || '?').charAt(0)}</div><strong>{item.fullName || item.username}</strong></div></td>
                        <td>{item.email}</td>
                        <td><StatusBadge value={item.role} /></td>
                        <td><StatusBadge value="Active" /></td>
                        <td>{item.createdAt ? formatShortDate(item.createdAt) : '-'}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="btn-icon" title="Cấp lại mật khẩu" onClick={handleNotImplemented}><RotateCcw size={16}/></button>
                            <button className="btn-icon danger" title="Khóa tài khoản" onClick={handleNotImplemented}><Lock size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-pagination">
                <span>Đang hiển thị 10 bản ghi</span>
                <div className="admin-pagination-buttons">
                  <button disabled>&lt;</button>
                  <button className="active">1</button>
                  <button>2</button>
                  <button>&gt;</button>
                </div>
              </div>
            </section>
          )}

          {active === 'subscriptions' && (
            <>
              <div className="admin-hero" style={{marginBottom: 16}}>
                <div><h3>Gói dịch vụ</h3><p>Quản lý các mức giá, giới hạn và tính năng.</p></div>
                <button className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Tạo gói mới</button>
              </div>
              <section className="admin-plan-grid">
                {plans.map(item => (
                  <article className="admin-plan" key={item.name}>
                    <h4>{item.name}</h4>
                    <div className="price">{item.price ? money(item.price) : 'Liên hệ'} <span style={{fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)'}}>/ {item.period}</span></div>
                    <div className="admin-plan-limits">
                      <div className="admin-plan-limit-item"><span>Tối đa người dùng</span><strong>{number(item.users)}</strong></div>
                      <div className="admin-plan-limit-item"><span>Tối đa đơn hàng</span><strong>{number(item.orders)}</strong></div>
                      <div className="admin-plan-limit-item"><span>Số xưởng con</span><strong>{item.workshops}</strong></div>
                      <div className="admin-plan-limit-item"><span>Điểm AI</span><strong>{number(item.ai)}</strong></div>
                    </div>
                    <div className="admin-row-actions" style={{marginTop: 20}}>
                      <button className="admin-button admin-button-secondary" style={{width:'100%'}} onClick={handleNotImplemented}>Chỉnh sửa</button>
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}

          {active === 'payments' && (
            <>
              <section className="admin-mini-grid">
                <MiniMetric label="Tổng doanh thu" value={money(revenueReport.total)} icon={DollarSign} />
                <MiniMetric label="Đang chờ xử lý" value={money(revenueReport.pending)} icon={AlertTriangle} />
              </section>
              <section className="admin-card">
                <div className="admin-card-head">
                  <div><h3>Lịch sử giao dịch</h3><p>Xem tất cả các thanh toán trên toàn hệ thống.</p></div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Mã GD</th><th>Công ty/Người dùng</th><th>Gói</th><th>Số tiền</th><th>Ngày tháng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                    <tbody>
                      {revenueReport.rangeInvoices.slice(0,10).map(item => (
                        <tr key={item.id}>
                          <td><code style={{fontSize:12}}>{item.txnRef}</code></td>
                          <td><strong>{paymentCustomerName(item)}</strong></td>
                          <td>{item.planId}</td>
                          <td>{money(Number(item.amount))}</td>
                          <td>{formatShortDate(paymentDate(item))}</td>
                          <td><StatusBadge value={String(item.status)} /></td>
                          <td><button className="admin-button admin-button-secondary" style={{padding:'4px 8px', fontSize:12}}>Biên lai</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {active === 'reports' && (
            <section className="admin-card">
              <div className="admin-card-head">
                <div><h3>Xuất dữ liệu & Báo cáo</h3><p>Tạo các báo cáo phân tích hiệu suất của nền tảng.</p></div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Loại báo cáo</th><th>Mô tả</th><th>Tạo lần cuối</th><th>Thao tác</th></tr></thead>
                  <tbody>
                    <tr><td><strong>Báo cáo doanh thu</strong></td><td>Thống kê doanh thu thanh toán SaaS hàng tháng</td><td>Hôm nay, 10:30 AM</td><td><button className="admin-button admin-button-secondary" style={{padding:'4px 12px'}}><Download size={14}/> CSV</button></td></tr>
                    <tr><td><strong>Tăng trưởng công ty</strong></td><td>Lượt đăng ký công ty mới và tỷ lệ rời bỏ</td><td>Hôm qua, 14:00 PM</td><td><button className="admin-button admin-button-secondary" style={{padding:'4px 12px'}}><Download size={14}/> Excel</button></td></tr>
                    <tr><td><strong>Mức độ sử dụng</strong></td><td>Sử dụng bộ nhớ, điểm AI và yêu cầu API</td><td>2 ngày trước</td><td><button className="admin-button admin-button-secondary" style={{padding:'4px 12px'}}><Download size={14}/> PDF</button></td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {active === 'logs' && (
            <section className="admin-card">
              <div className="admin-card-head">
                <div><h3>Nhật ký hệ thống</h3><p>Theo dõi hoạt động và bảo mật của nền tảng.</p></div>
                <div className="admin-toolbar" style={{margin:0}}>
                  <select className="admin-select"><option>Tất cả sự kiện</option><option>Đăng nhập</option><option>Thanh toán</option><option>Bảo mật</option></select>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Thời gian</th><th>Loại sự kiện</th><th>Người thực hiện</th><th>Địa chỉ IP</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    <tr><td>{formatShortDate(new Date())} {formatTime(new Date().toISOString())}</td><td><strong>Đăng nhập Admin</strong></td><td>john.admin</td><td>192.168.1.1</td><td><StatusBadge value="SUCCESS" /></td></tr>
                    <tr><td>{formatShortDate(new Date())} {formatTime(new Date(Date.now() - 3600000).toISOString())}</td><td><strong>Hoàn tiền</strong></td><td>system</td><td>-</td><td><StatusBadge value="SUCCESS" /></td></tr>
                    <tr><td>{formatShortDate(new Date())} {formatTime(new Date(Date.now() - 7200000).toISOString())}</td><td><strong>Đăng nhập thất bại</strong></td><td>unknown</td><td>10.0.0.45</td><td><StatusBadge value="FAILED" /></td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
