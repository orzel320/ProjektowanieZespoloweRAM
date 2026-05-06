'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function LobbyPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const roomId = params?.roomId || 'A7K9PD';
    const mode = searchParams.get('mode') === '1v1' ? '1v1' : 'BR';

    const [copied, setCopied] = useState(false);
    const [players, setPlayers] = useState(
        mode === '1v1'
            ? [
                { id: 1, username: 'kacper92', isHost: true, isMe: true },
                { id: 2, username: 'magda_x', isHost: false, isMe: false }
            ]
            : [
                { id: 1, username: 'kacper92', isHost: true, isMe: true },
                { id: 2, username: 'magda_x', isHost: false, isMe: false },
                { id: 3, username: 'tomek_3', isHost: false, isMe: false },
                { id: 4, username: 'ola.k', isHost: false, isMe: false },
                { id: 5, username: 'piotr77', isHost: false, isMe: false },
                { id: 6, username: 'ania', isHost: false, isMe: false },
                { id: 7, username: 'zenek', isHost: false, isMe: false },
                { id: 8, username: 'mariusz', isHost: false, isMe: false },
                { id: 9, username: 'kasia_r', isHost: false, isMe: false },
            ]
    );

    const maxPlayers = mode === '1v1' ? 2 : 20;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleKick = (id) => {
        setPlayers(players.filter(player => player.id !== id));
    };

    const handleLeave = () => {
        router.push('/');
    };

    return (
        <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
            {/* Background elements with slightly more saturation */}
            <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/20 rounded-full blur-[110px] pointer-events-none"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-green-200/20 rounded-full blur-[110px] pointer-events-none"></div>

            {/* Header */}
            <header className="w-full flex items-center justify-between px-8 py-5 bg-white/50 backdrop-blur-xl border-b border-emerald-100/50 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <button onClick={handleLeave} className="text-gray-400 hover:text-emerald-500 transition-colors font-bold tracking-widest text-[11px] uppercase">
                        ← Menu
                    </button>
                    <div className="text-xl font-bold tracking-tight">
                        <span className="text-gray-800 font-black">connections<span className="text-emerald-500 font-black">++</span></span>
                    </div>
                </div>
                <div className="text-xs font-bold text-gray-500 px-4 py-2 rounded-2xl bg-white shadow-sm border border-emerald-50">@kacper92</div>
            </header>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-[1300px] mx-auto flex flex-col md:flex-row">

                {/* Left Section: Players */}
                <div className="flex-1 p-8 md:p-12 border-r border-dashed border-emerald-100">
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                                Players <span className="text-emerald-500/40 ml-1">{players.length}/{maxPlayers}</span>
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[11px] font-black uppercase tracking-widest">Waiting...</span>
                        </div>
                    </div>

                    {mode === 'BR' && (
                        <div className="w-full h-2 bg-gray-100 rounded-full mb-10 overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-700 ease-out"
                                style={{ width: `${(players.length / maxPlayers) * 100}%` }}
                            ></div>
                        </div>
                    )}

                    <div className={`grid gap-4 ${mode === 'BR' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-md'}`}>
                        {players.map((p) => (
                            <div key={p.id} className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                                p.isMe ? 'bg-white border-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-md'
                            }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-sm ${
                                        p.isMe ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'
                                    }`}>
                                        {p.username[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base tracking-tight">{p.username}</span>
                                        {p.isHost && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Host</span>}
                                    </div>
                                </div>
                                {!p.isMe && (
                                    <button
                                        onClick={() => handleKick(p.id)}
                                        className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-100"
                                    >
                                        <span className="text-2xl font-light">×</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Bottom Settings Summary */}
                    <div className="mt-16 flex gap-12 border-t border-emerald-50 pt-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em] mb-2">Game Mode</p>
                            <p className="text-base font-black text-gray-700">{mode === 'BR' ? 'Battle Royale' : '1 vs 1 Duel'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em] mb-2">Round Time</p>
                            <p className="text-base font-black text-gray-700">45 seconds</p>
                        </div>
                    </div>
                </div>

                {/* Right Section: Actions */}
                <div className="w-full md:w-[400px] p-8 md:p-12 flex flex-col justify-start bg-white/20">
                    <div className="mb-14">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Invite Link</p>
                        <div className="bg-white border-2 border-emerald-50 rounded-3xl p-8 shadow-sm flex flex-col items-center gap-6 group hover:border-emerald-200 transition-all">
                            <span className="text-5xl font-black text-gray-800 tracking-[0.1em]">{roomId}</span>
                            <button
                                onClick={handleCopyCode}
                                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-sm ${
                                    copied ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-gray-900 text-white hover:bg-black'
                                }`}
                            >
                                {copied ? 'Copied to clipboard' : 'Copy Code'}
                            </button>
                        </div>
                    </div>

                    {/* Main Action Buttons */}
                    <div className="flex flex-col gap-4">
                        <button className="w-full py-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-2xl uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-1 active:scale-95 active:translate-y-0">
                            Start Game
                        </button>
                        <button
                            onClick={handleLeave}
                            className="w-full py-4 bg-white border-2 border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50/30 transition-all text-xs font-black uppercase tracking-[0.2em] rounded-xl"
                        >
                            Leave Room
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium italic mt-8 text-center px-4">
                        The game will start for all players once you press the green button.
                    </p>
                </div>
            </div>
        </main>
    );
}