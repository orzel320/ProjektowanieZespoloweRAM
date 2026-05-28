'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

const CATEGORY_COLORS = ['bg-yellow-400', 'bg-emerald-400', 'bg-blue-400', 'bg-purple-400'];

export default function PlayRoomPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const roomId = params?.roomId;
    const sessionId = searchParams.get('sessionId');
    const isHost = searchParams.get('host') === '1';
    const expectedPlayers = Number(searchParams.get('expected')) || 2;

    const [user, setUser] = useState(null);
    const [round, setRound] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [solved, setSolved] = useState([]);
    const [displayWords, setDisplayWords] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [eliminated, setEliminated] = useState(false);
    const [finished, setFinished] = useState(false);
    const [error, setError] = useState('');

    // === HINT SYSTEM (MULTIPLAYER) ===
    const [isHintModalOpen, setIsHintModalOpen] = useState(false);
    const [hintWords, setHintWords] = useState([]);
    const [hintCategory, setHintCategory] = useState(null);

    const socketRef = useRef(null);

    useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(i);
    }, []);

    useEffect(() => {
        if (!sessionId) {
            router.push('/');
            return;
        }
        let cancelled = false;

        const buildWords = (board) => {
            const words = [];
            board.categories.forEach((cat, i) => {
                cat.words.forEach((w, j) => {
                    words.push({ id: `${i}-${j}-${w}`, text: w, categoryIdx: i });
                });
            });
            return words.sort(() => Math.random() - 0.5);
        };

        const connect = (u) => {
            const socket = io('http://localhost:3001/battle-royale');
            socketRef.current = socket;

            socket.on('br:session_state', (state) => {
                setRound(state);
                setLeaderboard(state.leaderboard);
                if (state.status === 'round_active' && state.board) {
                    setDisplayWords((prev) => (prev.length === 0 ? buildWords(state.board) : prev));
                }
            });

            socket.on('br:round_started', (state) => {
                setRound(state);
                setLeaderboard(state.leaderboard);
                setSolved([]);
                setSelectedIds([]);
                setCooldownUntil(0);
                if (state.board) setDisplayWords(buildWords(state.board));
                setHintWords([]);
                setHintCategory(null);
            });

            socket.on('br:round_ended', ({ state, leaderboard }) => {
                setRound(state);
                setLeaderboard(leaderboard);
                setSelectedIds([]);
            });

            socket.on('br:guess_result', (res) => {
                if (res.correct) {
                    setSolved((prev) => [...prev, { idx: res.categoryIndex, name: res.categoryName }]);
                    setDisplayWords((prev) => prev.filter((w) => w.categoryIdx !== res.categoryIndex));
                    setSelectedIds([]);
                    setCooldownUntil(0);
                    setHintWords([]); // Reset hint on success
                } else if (res.cooldownMs > 0) {
                    setCooldownUntil(Date.now() + res.cooldownMs);
                    setSelectedIds([]);
                }
            });

            socket.on('br:leaderboard', (lb) => setLeaderboard(lb));
            socket.on('br:eliminated', () => setEliminated(true));
            socket.on('br:game_finished', ({ leaderboard }) => {
                setFinished(true);
                setLeaderboard(leaderboard);
            });
            socket.on('br:error', ({ message }) => setError(message));

            socket.on('connect', () => {
                socket.emit('br:join_session', {
                    sessionId,
                    userId: u.id,
                    username: u.username,
                });
            });
        };

        const setup = async () => {
            try {
                const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
                const data = await res.json();
                if (!data.authenticated) {
                    router.push('/');
                    return;
                }
                if (cancelled) return;
                setUser(data.user);
                connect(data.user);
            } catch (e) {
                console.error(e);
                router.push('/');
            }
        };

        setup();

        return () => {
            cancelled = true;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    useEffect(() => {
        if (!isHost || finished || eliminated || !round) return;
        if (round.status !== 'waiting' && round.status !== 'round_end') return;

        const active = leaderboard.filter((p) => !p.isEliminated);
        if (active.length < 2) return;

        const allHere = leaderboard.length >= expectedPlayers;
        const delay = round.status === 'round_end' || allHere ? 700 : 5000;

        const t = setTimeout(() => {
            socketRef.current?.emit('br:start_round', { sessionId });
        }, delay);
        return () => clearTimeout(t);
    }, [isHost, finished, eliminated, round, leaderboard, expectedPlayers, sessionId]);

    const cooldownRemaining = Math.max(0, cooldownUntil - now);
    const roundEndsAtMs = round?.roundEndsAt ? new Date(round.roundEndsAt).getTime() : 0;
    const roundRemaining = roundEndsAtMs ? Math.max(0, roundEndsAtMs - now) : 0;
    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
        return (b.score || 0) - (a.score || 0);
    });

    const toggleSelection = (id) => {
        if (eliminated || finished || round?.status !== 'round_active' || cooldownRemaining > 0) return;
        setSelectedIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 4) return prev;
            return [...prev, id];
        });
    };

    const submit = () => {
        if (selectedIds.length !== 4 || cooldownRemaining > 0 || !user) return;
        const words = displayWords
            .filter((w) => selectedIds.includes(w.id))
            .map((w) => w.text);
        socketRef.current?.emit('br:guess', {
            sessionId,
            userId: user.id,
            words,
        });
    };

    const handleLeave = () => {
        router.push('/');
    };

    const handleHintRequest = (type) => {
        setIsHintModalOpen(false);
        // Nałożenie wizualnej kary - blokuje siatkę i zgadywanie na 20 sekund
        setCooldownUntil(Date.now() + 20000);
        setSelectedIds([]);

        // Mock: Symulacja odpowiedzi z br:hint_result
        if (type === 'words') {
            const availableCats = [...new Set(displayWords.map(w => w.categoryIdx))];
            if (availableCats.length > 0) {
                const targetCat = availableCats[0];
                const matching = displayWords.filter(w => w.categoryIdx === targetCat).slice(0, 2);
                setHintWords(matching.map(w => w.id));
                setTimeout(() => setHintWords([]), 8000);
            }
        } else if (type === 'category') {
            setHintCategory("MYSTERY CATEGORY (MOCK)");
            setTimeout(() => setHintCategory(null), 8000);
        }
    };

    const formatMs = (ms) => {
        const total = Math.ceil(ms / 1000);
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
            <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/20 rounded-full blur-[110px] pointer-events-none"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-green-200/20 rounded-full blur-[110px] pointer-events-none"></div>

            <header className="w-full flex items-center justify-between px-8 py-5 bg-white/50 backdrop-blur-xl border-b border-emerald-100/50 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <button onClick={handleLeave} className="text-gray-400 hover:text-emerald-500 transition-colors font-bold tracking-widest text-[11px] uppercase">
                        ← Leave
                    </button>
                    <div className="text-xl font-bold tracking-tight">
                        <span className="text-gray-800 font-black">connections<span className="text-emerald-500 font-black">++</span></span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {round && (
                        <div className="text-[10px] font-black text-emerald-600 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-emerald-50 uppercase tracking-[0.2em]">
                            Round {round.round || 0} / {round.maxRounds}
                        </div>
                    )}
                    {round?.status === 'round_active' && (
                        <div className="text-[10px] font-black text-gray-700 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-emerald-50 uppercase tracking-[0.2em] tabular-nums">
                            {formatMs(roundRemaining)}
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 w-full max-w-[1300px] mx-auto flex flex-col md:flex-row relative">

                {/* Wyświetlanie wylosowanej kategorii jako podpowiedzi */}
                {hintCategory && (
                    <div className="absolute top-4 left-0 w-full md:w-[calc(100%-340px)] flex justify-center z-10 animate-pop-in pointer-events-none">
                        <div className="bg-blue-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/30">
                            Hint: {hintCategory}
                        </div>
                    </div>
                )}

                <div className="flex-1 p-8 md:p-12 border-r border-dashed border-emerald-100 relative">

                    {/* Wizualna kara czasowa na środku planszy */}
                    {cooldownRemaining > 0 && round?.status === 'round_active' && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/30 backdrop-blur-[2px] rounded-3xl m-8 pointer-events-none animate-in fade-in duration-200">
                            <span className="text-5xl font-black text-red-500 mb-2">{Math.ceil(cooldownRemaining / 1000)}s</span>
                            <span className="text-xs font-bold text-red-400 uppercase tracking-widest bg-white/80 px-4 py-1 rounded-full">Penalty Cooldown Active</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 border-2 border-red-100 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center">
                            {error}
                        </div>
                    )}

                    {finished ? (
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-emerald-50 text-center">
                            <h2 className="text-3xl font-black text-emerald-500 uppercase mb-2">Game Over</h2>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-8">Final Standings</p>
                            <div className="flex flex-col gap-2 mb-8">
                                {sortedLeaderboard.map((p, i) => (
                                    <div key={p.userId} className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 ${p.userId === user?.id ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-100 bg-white'}`}>
                                        <span className="font-black text-gray-800">#{i + 1} {p.username}</span>
                                        <span className="font-black text-emerald-600">{p.score} pts</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleLeave} className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                                Back to Menu
                            </button>
                        </div>
                    ) : eliminated ? (
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-emerald-50 text-center">
                            <h2 className="text-3xl font-black text-gray-700 uppercase mb-2">Eliminated</h2>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">You can watch the rest of the game.</p>
                        </div>
                    ) : round?.status !== 'round_active' ? (
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-emerald-50 text-center">
                            <h2 className="text-2xl font-black text-gray-700 uppercase mb-2">
                                {round?.status === 'round_end' ? 'Round Finished' : 'Waiting for round to start'}
                            </h2>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                {leaderboard.length}/{expectedPlayers} players ready
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 mb-6 relative z-10">
                                {solved.map((s) => (
                                    <div key={s.idx} className={`${CATEGORY_COLORS[s.idx % CATEGORY_COLORS.length]} rounded-2xl p-5 text-center shadow-md`}>
                                        <h3 className="font-black uppercase text-slate-900 tracking-widest">{s.name}</h3>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-8 relative z-10">
                                {displayWords.map((w) => {
                                    const isSelected = selectedIds.includes(w.id);
                                    const isHinted = hintWords.includes(w.id);

                                    // Dodatkowy styl dla podpowiedzi
                                    const hintStyle = isHinted ? 'ring-4 ring-purple-400 shadow-[0_0_20px_rgba(167,139,250,0.6)] animate-pulse' : '';

                                    return (
                                        <button
                                            key={w.id}
                                            onClick={() => toggleSelection(w.id)}
                                            disabled={cooldownRemaining > 0}
                                            className={`aspect-[4/3] rounded-2xl font-bold text-xs sm:text-base uppercase transition-all duration-300 flex items-center justify-center p-2 text-center ${
                                                isSelected
                                                    ? 'bg-emerald-200 text-emerald-950 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] scale-95'
                                                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-sm'
                                            } ${cooldownRemaining > 0 ? 'opacity-40 grayscale-[50%]' : ''} ${hintStyle}`}
                                        >
                                            {w.text}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex justify-center gap-3 mt-2 h-12 flex-wrap relative z-10">
                                <button
                                    onClick={() => setDisplayWords([...displayWords].sort(() => Math.random() - 0.5))}
                                    className="px-5 sm:px-6 py-3 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl font-bold active:scale-95 transition-all text-sm sm:text-base"
                                >
                                    SHUFFLE
                                </button>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-5 sm:px-6 py-3 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl font-bold active:scale-95 transition-all text-sm sm:text-base"
                                >
                                    CLEAR
                                </button>
                                <button
                                    onClick={() => setIsHintModalOpen(true)}
                                    disabled={cooldownRemaining > 0 || round?.status !== 'round_active'}
                                    className="px-5 sm:px-6 py-3 border-2 border-purple-200 text-purple-600 hover:bg-purple-50 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                                >
                                    HINT (+20s)
                                </button>
                                <button
                                    onClick={submit}
                                    disabled={selectedIds.length !== 4 || cooldownRemaining > 0}
                                    className={`px-8 sm:px-10 py-3 rounded-2xl font-black shadow-lg transition-all text-sm sm:text-base ${
                                        selectedIds.length === 4 && cooldownRemaining === 0
                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                            : 'bg-slate-200 text-slate-400 shadow-none'
                                    }`}
                                >
                                    {cooldownRemaining > 0 ? `WAIT ${Math.ceil(cooldownRemaining / 1000)}s` : 'SUBMIT'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="w-full md:w-[340px] p-8 md:p-10 bg-white/20">
                    <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.3em] mb-4">Leaderboard</p>
                    <div className="flex flex-col gap-2">
                        {sortedLeaderboard.map((p, i) => (
                            <div
                                key={p.userId}
                                className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 ${
                                    p.userId === user?.id
                                        ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                                        : p.isEliminated
                                            ? 'border-gray-100 bg-white opacity-50'
                                            : 'border-gray-100 bg-white'
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className="font-black text-gray-800 text-sm tracking-tight">
                                        #{i + 1} {p.username}
                                    </span>
                                    {p.isEliminated && (
                                        <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Eliminated</span>
                                    )}
                                </div>
                                <span className="font-black text-emerald-600 text-sm">{p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL SYSTEMU PODPOWIEDZI (MULTIPLAYER) */}
            {isHintModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-pop-in">
                        <button onClick={() => setIsHintModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-bold transition-colors">✕</button>
                        <h2 className="text-2xl font-black mb-2 text-slate-800">Choose Hint</h2>
                        <p className="text-xs font-bold text-red-500 mb-6 uppercase tracking-widest">Warning: Adds 20s Penalty</p>

                        <div className="flex flex-col gap-4">
                            <button onClick={() => handleHintRequest('words')} className="w-full py-4 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-xl transition-colors border border-purple-200 shadow-sm active:scale-95">
                                Show 2 Matching Words
                            </button>
                            <button onClick={() => handleHintRequest('category')} className="w-full py-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl transition-colors border border-blue-200 shadow-sm active:scale-95">
                                Show Category Name
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}