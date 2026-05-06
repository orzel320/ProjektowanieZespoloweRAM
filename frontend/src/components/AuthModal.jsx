'use client';

import { useState } from 'react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, onRegisterSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
        isLogin ? onLoginSuccess(username) : onRegisterSuccess(username);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Card */}
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-emerald-900/20 animate-in zoom-in-95 duration-300 border border-emerald-50">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-8 text-gray-300 hover:text-gray-500 text-2xl font-light"
                >
                    ×
                </button>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">
                        {isLogin ? 'Welcome Back' : 'Join the Club'}
                    </h2>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                        {isLogin ? 'Log in to your account' : 'Register to start playing'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="h-14 w-full bg-gray-50 border-2 border-transparent focus:border-emerald-400 focus:bg-white rounded-2xl px-5 text-lg font-bold text-gray-800 transition-all outline-none"
                            placeholder="Your nickname"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-14 w-full bg-gray-50 border-2 border-transparent focus:border-emerald-400 focus:bg-white rounded-2xl px-5 text-lg font-bold text-gray-800 transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full h-14 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-lg uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center"
                    >
                        {isLoading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? 'Log In' : 'Sign Up')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-[10px] font-black text-gray-400 hover:text-emerald-600 uppercase tracking-widest transition-colors border-b border-gray-100 hover:border-emerald-200 pb-1"
                    >
                        {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
                    </button>
                </div>
            </div>
        </div>
    );
}