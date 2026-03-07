import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import OAuth2Callback from './pages/OAuth2Callback';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import MarketplacePage from './pages/MarketplacePage';
import OrderManagementPage from './pages/OrderManagementPage';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/oauth2/callback" element={<OAuth2Callback />} />
                    <Route path="/invite" element={<InviteAcceptPage />} />

                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/groups" element={<GroupsPage />} />
                        <Route path="/groups/:id" element={<GroupDetailPage />} />
                        <Route path="/orders" element={<OrderManagementPage />} />
                    </Route>

                    <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;