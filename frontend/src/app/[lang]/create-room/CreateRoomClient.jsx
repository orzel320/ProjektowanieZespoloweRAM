'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

function CreateRoomContent({ dict }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const routeParams = useParams();
    const lang = routeParams.lang;

    const [user, setUser] = useState(null);

    const initialMode = searchParams.get('mode') === '1v1' ? '1v1' : 'Battle Royale';

    const [mode, setMode] = useState(initialMode);
    const [topic, setTopic] = useState('General');
    const [playerLimit, setPlayerLimit] = useState(initialMode === '1v1' ? 2 : 20);
    const [roundTime, setRoundTime] = useState(60);
    const [difficulty, setDifficulty] = useState('Medium');

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    useEffect(() => {
        const queryMode = searchParams.get('mode');
        if (queryMode) {
            const translatedMode = queryMode === '1v1' ? '1v1' : 'Battle Royale';
            setMode(translatedMode);
            setPlayerLimit(translatedMode === '1v1' ? 2 : 20);
        }
    }, [searchParams]);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        if (newMode === '1v1') setPlayerLimit(2);
        else if (newMode === 'Battle Royale') setPlayerLimit(20);
    };

    const handleCreate = () => {
        const modeParam = mode === '1v1' ? '1v1' : 'BR';
        const params = new URLSearchParams({
            create: '1',
            mode: modeParam,
            maxPlayers: String(playerLimit),
            roundDurationMs: String(roundTime * 1000),
            difficulty,
            topic: topic.trim() || 'General',
        });
        router.push(`/${lang}/lobby/new?${params.toString()}`);
    };

    return (
        <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[40%] bg-green-200/20 rounded-full blur-[100px] pointer-events-none"></div>

            <header className="w-full flex items-center justify-between px-8 py-5 bg-white/60 backdrop-blur-md border-b border-green-100/50 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <Link href={`/${lang}`} className="text-gray-400 hover:text-emerald-500 transition-colors font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <span>← {dict.createRoom.backMenu}</span>
                    </Link>
                    <div className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <span className="text-gray-700 font-black">connections<span className="text-emerald-500">++</span></span>
                    </div>
                </div>

                <div className="text-[10px] font-black text-emerald-600 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-emerald-50 uppercase tracking-[0.2em]">
                    @{user?.name || 'guest'}
                </div>
            </header>

            <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 md:py-16 relative z-0 flex flex-col justify-center">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-12 tracking-tight text-center md:text-left">{dict.createRoom.title}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-12">
                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em]">{dict.createRoom.mode}</label>
                        <div className="flex gap-3 h-14">
                            {['1v1', 'Battle Royale'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => handleModeChange(m)}
                                    className={`flex-1 rounded-xl font-bold text-lg transition-all duration-200 border outline-none ${
                                        mode === m
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/25 scale-[1.02]'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em]">{dict.createRoom.category}</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Movies, Space, General"
                            className="h-14 w-full bg-white border border-gray-100 rounded-xl px-5 text-lg font-bold text-gray-800 focus:outline-none focus:border-emerald-400 shadow-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em]">{dict.createRoom.playerLimit}</label>
                        <input
                            type="number"
                            value={playerLimit}
                            onChange={(e) => setPlayerLimit(Number(e.target.value))}
                            disabled={mode === '1v1'}
                            className="h-14 w-full bg-white border border-gray-100 rounded-xl px-5 text-xl font-bold text-gray-800 focus:outline-none focus:border-emerald-400 shadow-sm disabled:bg-gray-50/50 disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em]">{dict.createRoom.roundTime}</label>
                        <div className="relative h-14">
                            <input
                                type="number"
                                value={roundTime}
                                onChange={(e) => setRoundTime(Number(e.target.value))}
                                className="h-full w-full bg-white border border-gray-100 rounded-xl px-5 text-xl font-bold text-gray-800 focus:outline-none focus:border-emerald-400 pr-12 shadow-sm"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">s</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:col-span-2">
                        <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em]">{dict.createRoom.difficulty}</label>
                        <div className="flex gap-2 h-14 max-w-md">
                            {['Easy', 'Medium', 'Hard'].map((diff) => (
                                <button
                                    key={diff}
                                    onClick={() => setDifficulty(diff)}
                                    className={`flex-1 rounded-xl font-bold text-md transition-all duration-200 border outline-none ${
                                        difficulty === diff
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/25 scale-[1.02]'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                    }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full border-t border-dashed border-gray-300/60 my-6"></div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">{dict.createRoom.footerText}</p>
                    <button
                        onClick={handleCreate}
                        className="w-full md:w-max px-14 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-center font-black text-lg uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transform hover:-translate-y-1 active:scale-95 transition-all duration-300"
                    >
                        {dict.createRoom.createBtn}
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function CreateRoomPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFCF8]"></div>}>
            <CreateRoomContent dict={dict} />
        </Suspense>
    );
}