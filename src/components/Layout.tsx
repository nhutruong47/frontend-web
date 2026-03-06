import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
    const { user, logout } = useAuth();
    const isLight = user?.role === 'MEMBER';

    return (
        <div className={`layout ${isLight ? 'theme-light' : ''}`}>
            <Sidebar />
            <div className="layout-main">
                {/* Top bar */}
                <header className="topbar">
                    <div className="topbar-left">
                        <h2 className="topbar-greeting">
                            Xin chào, <span className="topbar-username">{user?.username}</span>
                        </h2>
                    </div>
                    <div className="topbar-right">
                        <div className="topbar-avatar" onClick={logout} title="Đăng xuất">
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <button className="topbar-logout" onClick={logout}>
                            Đăng xuất
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
