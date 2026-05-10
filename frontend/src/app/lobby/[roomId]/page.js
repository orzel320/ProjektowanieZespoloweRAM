'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

export default function LobbyPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const initialRoomId = params?.roomId;
    const isCreating = searchParams.get('create') === '1';

    const [user, setUser] = useState(null);
    const [room, setRoom] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const socketRef = useRef(null);
    const roomRef = useRef(null);
    const gameStartedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const updateRoom = (r) => {
            roomRef.current = r;
            setRoom(r);
        };

        const connect = (u) => {
            const socket = io('http://localhost:3001/lobby');
            socketRef.current = socket;

            socket.on('lobby:room_created', (r) => {
                updateRoom(r);
                if (typeof window !== 'undefined') {
                    const nextUrl = `/lobby/${r.roomId}?mode=${r.config.mode}`;
                    window.history.replaceState(null, '', nextUrl);
                }
            });

            socket.on('lobby:room_updated', updateRoom);

            socket.on('lobby:room_deleted', () => {
                if (!gameStartedRef.current) router.push('/');
            });

            socket.on('lobby:game_started', ({ roomId, sessionId }) => {
                gameStartedRef.current = true;
                const r = roomRef.current;
                const expected = r?.players?.length ?? 2;
                const isHost = !!r?.players?.find((p) => p.userId === u.id)?.isHost;
                router.push(`/play/${roomId}?sessionId=${sessionId}&expected=${expected}&host=${isHost ? 1 : 0}`);
            });

            socket.on('lobby:error', ({ message }) => setError(message));

            socket.on('connect', () => {
                if (isCreating) {
                    socket.emit('lobby:create_room', {
                        userId: u.id,
                        username: u.username,
                        maxPlayers: Number(searchParams.get('maxPlayers')) || 8,
                        mode: searchParams.get('mode') === '1v1' ? '1v1' : 'BR',
                        roundDurationMs: Number(searchParams.get('roundDurationMs')) || 60000,
                        difficulty: searchParams.get('difficulty') || 'Medium',
                    });
                } else {
                    socket.emit('lobby:join_room', {
                        roomId: initialRoomId,
                        userId: u.id,
                        username: u.username,
                    });
                }
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
    }, []);

    const players = room?.players ?? [];
    const maxPlayers = room?.maxPlayers ?? (searchParams.get('mode') === '1v1' ? 2 : 20);
    const mode = room?.config?.mode ?? (searchParams.get('mode') === '1v1' ? '1v1' : 'BR');
    const roundTimeSec = room?.config?.roundDurationMs ? Math.round(room.config.roundDurationMs / 1000) : null;
    const myPlayer = players.find((p) => p.userId === user?.id);
    const isHost = myPlayer?.isHost ?? false;
    const displayRoomId = room?.roomId ?? (isCreating ? '...' : initialRoomId);
    const canStart = isHost && players.length >= 2;

    const handleCopyCode = () => {
        if (!room?.roomId) return;
        navigator.clipboard.writeText(room.roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartGame = () => {
        if (!canStart) return;
        socketRef.current?.emit('lobby:start_game', { roomId: room.roomId });
    };

    const handleLeave = () => {
        router.push('/');
    };

    return (
        <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
            <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/20 rounded-full blur-[110px] pointer-events-none"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-green-200/20 rounded-full blur-[110px] pointer-events-none"></div>

            <header className="w-full flex items-center justify-between px-8 py-5 bg-white/50 backdrop-blur-xl border-b border-emerald-100/50 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <button onClick={handleLeave} className="text-gray-400 hover:text-emerald-500 transition-colors font-bold tracking-widest text-[11px] uppercase">
                        ← Menu
                    </button>
                    <div className="text-xl font-bold tracking-tight">
                        <span className="text-gray-800 font-black">connections<span className="text-emerald-500 font-black">++</span></span>
                    </div>
                </div>
                <div className="text-[10px] font-black text-emerald-600 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-emerald-50 uppercase tracking-[0.2em]">
                    @{user?.username || 'guest'}
                </div>
            </header>

            <div className="flex-1 w-full max-w-[1300px] mx-auto flex flex-col md:flex-row">

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

                    {error && (
                        <div className="mb-6 p-4 border-2 border-red-100 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center">
                            {error}
                        </div>
                    )}

                    {mode === 'BR' && (
                        <div className="w-full h-2 bg-gray-100 rounded-full mb-10 overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-700 ease-out"
                                style={{ width: `${(players.length / maxPlayers) * 100}%` }}
                            ></div>
                        </div>
                    )}

                    <div className={`grid gap-4 ${mode === 'BR' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-md'}`}>
                        {players.map((p) => {
                            const isMe = p.userId === user?.id;
                            return (
                                <div key={p.userId} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                                    isMe ? 'bg-white border-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-md'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-sm ${
                                            isMe ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'
                                        }`}>
                                            {p.username[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-base tracking-tight">{p.username}</span>
                                            {p.isHost && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Host</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-16 flex gap-12 border-t border-emerald-50 pt-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em] mb-2">Game Mode</p>
                            <p className="text-base font-black text-gray-700">{mode === 'BR' ? 'Battle Royale' : '1 vs 1 Duel'}</p>
                        </div>
                        {roundTimeSec !== null && (
                            <div>
                                <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em] mb-2">Round Time</p>
                                <p className="text-base font-black text-gray-700">{roundTimeSec} seconds</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-[400px] p-8 md:p-12 flex flex-col justify-start bg-white/20">
                    <div className="mb-14">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Invite Link</p>
                        <div className="bg-white border-2 border-emerald-50 rounded-3xl p-8 shadow-sm flex flex-col items-center gap-6 group hover:border-emerald-200 transition-all">
                            <span className="text-4xl font-black text-gray-800 tracking-[0.25em] text-center">{displayRoomId}</span>
                            <button
                                onClick={handleCopyCode}
                                disabled={!room?.roomId}
                                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-sm ${
                                    copied ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-gray-900 text-white hover:bg-black disabled:opacity-40'
                                }`}
                            >
                                {copied ? 'Copied to clipboard' : 'Copy Code'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleStartGame}
                            disabled={!canStart}
                            className={`w-full py-6 font-black text-2xl uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all transform active:scale-95 active:translate-y-0 ${
                                canStart
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-emerald-500/25 hover:-translate-y-1'
                                    : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                            }`}
                        >
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
                        {isHost
                            ? 'The game will start for all players once you press the green button.'
                            : 'Waiting for the host to start the game.'}
                    </p>
                </div>
            </div>
        </main>
    );
}
