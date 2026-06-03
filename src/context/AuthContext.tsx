import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/authService';
import type { UserInfo, LoginRequest, RegisterRequest } from '../types/types';

interface AuthContextType {
    user: UserInfo | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!token && !!user;

    // Verify token on mount
    useEffect(() => {
        const verifyToken = async () => {
            const savedToken = localStorage.getItem('token');
            if (!savedToken) {
                setIsLoading(false);
                return;
            }

            try {
                const userInfo = await authService.getMe();
                setUser(userInfo);
                setToken(savedToken);
            } catch {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, []);

    const login = useCallback(async (data: LoginRequest) => {
        const response = await authService.login(data);
        localStorage.setItem('token', response.token);
        setToken(response.token);

        // Fetch full user info
        const userInfo = await authService.getMe();
        setUser(userInfo);
        localStorage.setItem('user', JSON.stringify(userInfo));
    }, []);

    const register = useCallback(async (data: RegisterRequest) => {
        const response = await authService.register(data);
        localStorage.setItem('token', response.token);
        setToken(response.token);

        // Fetch full user info
        const userInfo = await authService.getMe();
        setUser(userInfo);
        localStorage.setItem('user', JSON.stringify(userInfo));
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
