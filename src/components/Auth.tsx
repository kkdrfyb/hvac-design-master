import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, quickSwitch } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                const data = await api.post('/auth/login', { username, password });
                login(data.token, data.user);
            } else {
                await api.post('/auth/register', { username, password });
                const data = await api.post('/auth/login', { username, password });
                login(data.token, data.user);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-200/60 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                    <div className="text-center mb-10 relative z-10">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-100 mx-auto mb-6">H</div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">暖通设计管家</h2>
                        <p className="text-slate-400 font-bold text-sm tracking-wide">{isLogin ? '智享高效协同设计流程' : '加入专业的暖通设计协作平台'}</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl animate-bounce">
                            ⚠️ {error}
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
                                placeholder="输入安全密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-100 transform active:scale-[0.98] transition-all duration-200 mt-4 tracking-widest uppercase text-sm"
                        >
                            {isLogin ? '进入工作空间' : '创建新账户'}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs font-black text-slate-400 hover:text-blue-600 transition tracking-widest uppercase"
                        >
                            {isLogin ? '还没有账户？立即注册' : '已有账户？返回登录'}
                        </button>
                    </div>
                </div>

                {/* Quick Switch Panel */}
                <div className="bg-slate-800 rounded-[2rem] p-8 shadow-2xl border border-slate-700 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded">Debug Mode</span>
                    </div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 px-1">快速切换测试账户</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { name: 'admin', label: '管理员', color: 'bg-amber-500' },
                            { name: 'user1', label: '设计师 A', color: 'bg-emerald-500' },
                            { name: 'user2', label: '设计师 B', color: 'bg-violet-500' }
                        ].map(acc => (
                            <button
                                key={acc.name}
                                onClick={() => quickSwitch(acc.name)}
                                className="flex flex-col items-center gap-3 p-4 bg-slate-900 hover:bg-slate-700 rounded-2xl transition-all border border-slate-700/50 group/btn"
                            >
                                <div className={`w-10 h-10 ${acc.color} rounded-full flex items-center justify-center text-white font-black shadow-lg group-hover/btn:scale-110 transition-transform`}>
                                    {acc.name[0].toUpperCase()}
                                </div>
                                <span className="text-[10px] font-black text-slate-400 group-hover/btn:text-white transition-colors uppercase tracking-tight">{acc.label}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mt-6 text-[9px] text-slate-600 font-bold text-center italic">测试账户密码默认为: password123</p>
                </div>
            </div>
        </div>
    );
};
