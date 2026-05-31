'use client';

import {useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation';
import AuthModal from '@/components/AuthModal';

export default function MainMenuClient({ dict }) {
    const router = useRouter();
    const params = useParams();
    const lang = params.lang;

    const [loggedUser, setLoggedUser] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const handleLogin = async (username, password) => {
        try {
            const response = await fetch("http://localhost:3001/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                }),
                credentials: 'include',
            });

            const data = await response.json();
            console.log(data);
            if(data.success) {
                await handleMe();
            }

        } catch (error) {
            console.error("Login error:", error);
        }
    };


    const handleRegister = async (username, password) => {
        try {
            const response = await fetch("http://localhost:3001/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                }),
                credentials: 'include',
            });

            const data = await response.json();
            console.log(data);

        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [showAuthError, setShowAuthError] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [selectedMode, setSelectedMode] = useState('BR');

    const popupRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                popupRef.current &&
                !popupRef.current.contains(event.target)
            ) {
                setShowStats(false);
            }
        }

        if (showStats) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, [showStats]);

    const handleLoginSuccess = (username) => {
        if (!username) return;
        const userData = { name: username };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthModalOpen(false);
    };

    const handleRegisterSuccess = (username, password) => {
        handleRegister(username, password);
        setUser({ name: username });
        setIsAuthModalOpen(false);
    };

    const handleProtectedAction = (path) => {
        if (!user) {
            setShowAuthError(true);
            setTimeout(() => setShowAuthError(false), 3000);
        } else {
            router.push(path);
        }
    };

    const handleMe = async () => {
        try {
            const response = await fetch("http://localhost:3001/auth/me", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            const data = await response.json();
            if (data.authenticated) {
                setLoggedUser(data.user.username); // Access the nested user object
            }

        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-200/40 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-emerald-200/30 rounded-full blur-[100px] pointer-events-none"></div>
            {/*}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
                    <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h1 className="text-xl font-black">CONNECTIONS<span className="text-emerald-500">++</span></h1>
                        </div>
                    </div>
                </header>

                <div
                    className="max-w-3xl mx-auto px-4 flex flex-col justify-center items-center relative gap-4"
                    style={{ minHeight: '60vh' }}
                >
                </div>*/}
            {/* Header */}
            <header className="w-full flex items-center justify-between px-8 py-6 z-20 bg-white/40 backdrop-blur-xl border-b border-green-100/50 sticky top-0">
                <div className="text-2xl font-black tracking-tight flex items-center leading-none">
                    connections<span className="text-emerald-500">++</span>
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {setShowStats(true)}}
                                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                            >
                                {dict.mainMenu.stats}
                            </button>
                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">@{user.name}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="ml-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-xl transition-all"
                            >
                                {dict.mainMenu.logout}
                            </button>
                            <div
                                ref={popupRef}
                                className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${
                                    showStats
                                        ? "translate-y-0 opacity-100"
                                        : "-translate-y-12 opacity-0 pointer-events-none"
                                }`}
                            >
                                <div className="bg-white border-2 border-emerald-400 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                                    <p className="font-black text-gray-800 uppercase tracking-widest text-xs">
                                        {dict.mainMenu.statsText}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                        >
                            {dict.mainMenu.login}
                        </button>
                    )}
                </div>
            </header>

            {/* Error Notification (A-a-a! Log in first!) */}
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${showAuthError ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
                <div className="bg-white border-2 border-emerald-400 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                    <span className="text-2xl">☝️</span>
                    <p className="font-black text-gray-800 uppercase tracking-widest text-xs">
                        {dict.mainMenu.authErrorStart} <span className="text-emerald-500 underline">{dict.mainMenu.authErrorLink}</span> {dict.mainMenu.authErrorEnd}
                    </p>
                </div>
            </div>

            {/* Split Content Area */}
            <div className="flex-1 w-full max-w-[1400px] mx-auto flex flex-col md:flex-row relative z-10">

                {/* LEFT COLUMN: OFFLINE */}
                <div className="w-full md:w-1/2 p-10 md:p-20 flex flex-col justify-center border-b md:border-b-0 md:border-r border-dashed border-gray-200">
                    <div className="max-w-md">
                        <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">{dict.mainMenu.offlineLabel}</p>
                        <h2 className="text-6xl md:text-7xl font-black text-gray-800 mb-6 tracking-tighter leading-none">
                            {dict.mainMenu.offlineTitle}
                        </h2>
                        <p className="text-lg text-gray-400 mb-12 font-medium leading-relaxed">
                            {dict.mainMenu.offlineDesc}
                        </p>

                        <button
                            onClick={() => router.push(`/${lang}/play`)}
                            className="block w-full sm:w-max px-16 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-xl uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 active:scale-95 active:translate-y-0"
                        >
                            {dict.mainMenu.playBtn}
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: ONLINE */}
                <div className="w-full md:w-1/2 p-10 md:p-20 flex flex-col justify-center">
                    <div className="max-w-md mx-auto md:mx-0">
                        <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">{dict.mainMenu.onlineLabel}</p>
                        <h2 className="text-5xl md:text-6xl font-black text-gray-800 mb-10 tracking-tighter leading-none">
                            {dict.mainMenu.onlineTitle}
                        </h2>

                        {/* Mode Selection */}
                        <div className="flex flex-col gap-4 mb-12">
                            <button
                                onClick={() => setSelectedMode('1v1')}
                                className={`text-left p-6 rounded-3xl transition-all duration-300 border-2 outline-none ${
                                    selectedMode === '1v1'
                                        ? 'bg-white border-emerald-400 shadow-xl shadow-emerald-500/10 scale-[1.02]'
                                        : 'bg-white border-gray-100 hover:border-emerald-200'
                                }`}
                            >
                                <h3 className={`text-2xl font-black mb-1 ${selectedMode === '1v1' ? 'text-emerald-600' : 'text-gray-800'}`}>{dict.mainMenu.duelTitle}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{dict.mainMenu.duelDesc}</p>
                            </button>

                            <button
                                onClick={() => setSelectedMode('BR')}
                                className={`text-left p-6 rounded-3xl transition-all duration-300 border-2 outline-none ${
                                    selectedMode === 'BR'
                                        ? 'bg-white border-emerald-400 shadow-xl shadow-emerald-500/10 scale-[1.02]'
                                        : 'bg-white border-gray-100 hover:border-emerald-200'
                                }`}
                            >
                                <h3 className={`text-2xl font-black mb-1 ${selectedMode === 'BR' ? 'text-emerald-600' : 'text-gray-800'}`}>{dict.mainMenu.brTitle}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{dict.mainMenu.brDesc}</p>
                            </button>
                        </div>

                        {/* Action Buttons with Protection */}
                        <div className="flex flex-col sm:flex-row gap-5">
                            <button
                                onClick={() => handleProtectedAction(`/${lang}/create-room?mode=${selectedMode}`)}
                                className="flex-1 py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-lg uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 active:scale-95 active:translate-y-0"
                            >
                                {dict.mainMenu.createRoomBtn}
                            </button>

                            <button
                                onClick={() => handleProtectedAction(`/${lang}/join-room`)}
                                className="flex-1 py-5 bg-white border-2 border-emerald-50 hover:border-emerald-200 text-emerald-600 font-black text-lg uppercase tracking-[0.15em] rounded-2xl shadow-sm transition-all transform hover:-translate-y-1 active:scale-95 active:translate-y-0"
                            >
                                {dict.mainMenu.joinRoomBtn}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Auth Modal Component */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                onRegisterSuccess={handleRegisterSuccess}
                dict={dict.auth}
            />
        </main>
    );
}