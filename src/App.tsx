import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import OAuth2Callback from './pages/OAuth2Callback';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import CreateTaskPage from './pages/CreateTaskPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import MarketplacePage from './pages/MarketplacePage';
import OrderManagementPage from './pages/OrderManagementPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import UpgradePlanPage from './pages/UpgradePlanPage';
import PaymentResultPage from './pages/PaymentResultPage';
import VnpayMockCheckoutPage from './pages/VnpayMockCheckoutPage';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/oauth2/callback" element={<OAuth2Callback />} />
                        <Route path="/invite" element={<InviteAcceptPage />} />
                        <Route path="/invite/:code" element={<InviteAcceptPage />} />

                        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/groups" element={<GroupsPage />} />
                            <Route path="/groups/:id" element={<GroupDetailPage />} />
                            <Route path="/groups/:id/create-task" element={<CreateTaskPage />} />
                            <Route path="/orders" element={<OrderManagementPage />} />
                            <Route path="/admin" element={<AdminPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/upgrade" element={<UpgradePlanPage />} />
                            <Route path="/nang-cap-goi" element={<UpgradePlanPage />} />
                            <Route path="/payment-result" element={<PaymentResultPage />} />
                            <Route path="/vnpay-mock-checkout" element={<VnpayMockCheckoutPage />} />
                        </Route>

                        <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
                        <Route path="/dat-hang" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
                        <Route path="/thi-truong-dat-hang" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
                        <Route path="/" element={<HomePage />} />
                        <Route path="/ban-sac" element={<HomePage />} />
                        <Route path="/san-pham" element={<Navigate to="/ban-sac#products" replace />} />
                        <Route path="/cong-nghe" element={<Navigate to="/ban-sac#process" replace />} />
                        <Route path="/lien-he" element={<Navigate to="/ban-sac#footer" replace />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
