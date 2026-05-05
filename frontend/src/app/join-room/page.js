'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function JoinRoomPage() {
    const [roomCode, setRoomCode] = useState('');
    const router = useRouter();

    const handleJoin = (e) => {
        e.preventDefault();
        if (roomCode.trim()) {
            router.push(`/lobby/${roomCode.trim()}`);
        }
    };

    return (
        <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
            {/* Soft background glows */}
            <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-green-200/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-emerald-200/20 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header */}
            <header className="w-full flex items-center justify-between px-8 py-5 bg-white/60 backdrop-blur-md border-b border-green-100/50 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-gray-400 hover:text-emerald-500 transition-colors font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <span>← Menu</span>
                    </Link>
                    <div className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <div>
                            <span className="text-gray-700">connections</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">++</span>
                        </div>
                    </div>
                </div>
                <div className="text-xs font-bold text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                    @player_name
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 md:py-24 relative z-0 flex flex-col justify-center">

                {/* Titles */}
                <div className="mb-12">
                    <h2 className="text-5xl md:text-6xl font-black text-gray-800 mb-4 tracking-tight">
                        Got a code?
                    </h2>
                    <p className="text-lg text-gray-500 font-medium">
                        Paste it below and press join.
                    </p>
                </div>

                {/* Join Form */}
                <form onSubmit={handleJoin} className="flex flex-col gap-3 mb-10">
                    <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em] ml-1">Room Code</label>
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            placeholder="e.g. A7K9"
                            maxLength={8}
                            className="flex-1 h-16 bg-white border-2 border-gray-200 rounded-2xl px-6 text-3xl font-black text-gray-800 tracking-[0.3em] uppercase focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all shadow-sm placeholder:text-gray-300 placeholder:font-bold placeholder:tracking-widest"
                        />
                        <button
                            type="submit"
                            disabled={!roomCode.trim()}
                            className="h-16 px-12 md:w-max w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-xl uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.35)] transform hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        >
                            Join
                        </button>
                    </div>
                </form>

                {/* Light Divider */}
                <div className="w-full border-t border-dashed border-gray-300/60 my-8"></div>

                {/* Recent Rooms */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em]">Recently joined:</span>
                    <div className="flex flex-wrap gap-3">
                        {['X3F2A1', 'P9K2B'].map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => setRoomCode(code)}
                                className="px-5 py-2.5 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 font-bold tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
                            >
                                {code}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </main>
    );
}