import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

interface User {
    id: number;
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    quickSwitch: (username: string) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const data = await api.get('/auth/me');
                    setUser(data.user);
                } catch (e) {
                    console.error('Auth check failed', e);
                    logout();
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, [token]);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    const quickSwitch = async (username: string) => {
        setIsLoading(true);
        try {
            // First try to login, if fails try to register then login
            let data;
            try {
                data = await api.post('/auth/login', { username, password: 'password123' });
            } catch (e) {
                await api.post('/auth/register', { username, password: 'password123' });
                data = await api.post('/auth/login', { username, password: 'password123' });
            }
            login(data.token, data.user);
        } catch (e) {
            console.error('Quick switch failed', e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, quickSwitch, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
