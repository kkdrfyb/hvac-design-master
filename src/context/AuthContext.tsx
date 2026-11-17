import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { AppUser } from '../types';

interface AuthContextType {
    user: AppUser | null;
    token: string | null;
    login: (token: string, user: AppUser) => void;
    logout: () => void;
    setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
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

    const login = (newToken: string, newUser: AppUser) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, setUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
