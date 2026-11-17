import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export const Auth: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const data = await api.post('/auth/login', { username, password });
            login(data.token, data.user);
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-200/60 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                    <div className="text-center mb-10 relative z-10">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-100 mx-auto mb-6">H</div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">暖通室信息化管理平台</h2>
                        <p className="text-slate-400 font-bold text-sm tracking-wide">项目资料 · 设计过程 · 规范校审</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">用户名</label>
                            <input
                                type="text"
                                required
                                className="w-full px-6 py-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-bold text-slate-700 bg-slate-50 placeholder:text-slate-300"
                                placeholder="输入您的账户名称"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">密码</label>
                            <input
                                type="password"
                                required
                                className="w-full px-6 py-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-bold text-slate-700 bg-slate-50 placeholder:text-slate-300"
                                placeholder="输入登录密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-100 transform active:scale-[0.98] transition-all duration-200 mt-4 tracking-widest uppercase text-sm"
                        >
                            进入工作台
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <span className="text-xs font-black text-slate-400 tracking-widest uppercase">账户由管理员统一创建，默认密码 123456</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
