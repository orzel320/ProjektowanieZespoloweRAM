'use client';

import { useState } from 'react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        const url = `http://localhost:3001${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success === false) {
                throw new Error(data.error || 'Invalid credentials');
            }

            if (!isLogin && data.success) {
                setIsLogin(true);
                setError('Registration successful! Please log in with your new account.');
                setIsLoading(false);
                return;
            }

            if (isLogin && data.success && data.user) {
                onLoginSuccess(data.user.username);
                onClose();
            } else {
                throw new Error('Unexpected server response');
            }

        } catch (err) {
            console.error('Auth Error:', err);
            setError(err.message === 'Failed to fetch'
                ? 'Server is offline. Check if backend is running on port 3001'
                : err.message
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transform transition-all border border-emerald-50">

                <h2 className="text-4xl font-black text-gray-800 mb-8 tracking-tight text-center leading-none">
                    {isLogin ? 'Log In' : 'Sign Up'}
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {error && (
                        <div className={`p-4 border-2 text-[11px] font-black rounded-2xl text-center uppercase tracking-widest animate-shake ${
                            error.includes('successful')
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : 'bg-red-50 border-red-100 text-red-600'       
                        }`}>
                            <span className="block mb-1 text-lg">{error.includes('successful') ? '✅' : '⚠️'}</span>
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.3em] pl-2">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="h-15 w-full bg-[#FAFCF8] border-2 border-gray-100 rounded-2xl px-6 text-lg font-bold text-gray-800 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/5 transition-all"
                            placeholder="Your nickname"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.3em] pl-2">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-15 w-full bg-[#FAFCF8] border-2 border-gray-100 rounded-2xl px-6 text-lg font-bold text-gray-800 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/5 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xl uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isLoading ? (
                            <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            isLogin ? 'Enter Game' : 'Join Now'
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-[11px] font-black text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-widest underline decoration-gray-200 underline-offset-8 decoration-2"
                    >
                        {isLogin ? "Need an account? Sign up" : "Have an account? Log in"}
                    </button>
                </div>
            </div>
        </div>
    );
}