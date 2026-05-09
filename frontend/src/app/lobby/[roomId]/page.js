'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

function LobbyContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [currentRoomId, setCurrentRoomId] = useState(params?.roomId);

    const mode = searchParams.get('mode') === '1v1' ? '1v1' : 'BR';
    const [user, setUser] = useState(null);
    const [players, setPlayers] = useState([]);
    const [roomConfig, setRoomConfig] = useState(null);
    const [copied, setCopied] = useState(false);
    const socketRef = useRef(null);

    const maxPlayers = mode === '1v1' ? 2 : (Number(searchParams.get('limit')) || 20);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            router.push('/');
            return;
        }
        const currentUser = JSON.parse(savedUser);
        setUser(currentUser);

        socketRef.current = io('http://localhost:3001/lobby', {
            transports: ['websocket'],
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to lobby socket');

            if (params?.roomId === 'create') {
                socket.emit('lobby:create_room', {
                    userId: currentUser.id || currentUser.name,
                    username: currentUser.name,
                    mode: searchParams.get('mode') === '1v1' ? '1v1' : 'BR',
                    maxPlayers: Number(searchParams.get('limit')) || 20,
                    roundDurationMs: (Number(searchParams.get('time')) || 60) * 1000,
                    difficulty: searchParams.get('diff') || 'Medium'
                });
            } else {
                socket.emit('lobby:join_room', {
                    roomId: params?.roomId,
                    userId: currentUser.id || currentUser.name,
                    username: currentUser.name
                });
            }
        });

        socket.on('lobby:room_created', (data) => {
            console.log('Room created by backend:', data);

            if (!data) return;

            const newRoomId = data.roomId;
            const newMode = data.config?.mode || mode;

            setCurrentRoomId(newRoomId);


            window.history.replaceState(null, '', `/lobby/${newRoomId}?mode=${newMode}`);

            if (data.players) {
                const initialPlayers = data.players.map(p => ({
                    id: p.userId,
                    username: p.username,
                    isHost: p.isHost,
                    isMe: p.userId === (currentUser.id || currentUser.name)
                }));
                setPlayers(initialPlayers);
            }

            if (data.config) {
                setRoomConfig(data.config);
            }
        });

        socket.on('lobby:room_updated', (data) => {
            console.log('Room updated:', data);

            if (!data) return;

            if (data.players) {
                const updatedPlayers = data.players.map(p => ({
                    id: p.userId,
                    username: p.username,
                    isHost: p.isHost,
                    isMe: p.userId === (currentUser.id || currentUser.name)
                }));
                setPlayers(updatedPlayers);
            }

            if (data.config) {
                setRoomConfig(data.config);
            }

            if (data.roomId) setCurrentRoomId(data.roomId);
        });

        socket.on('lobby:game_started', (data) => {
            router.push(`/play?sessionId=${data.sessionId}`);
        });

        socket.on('lobby:error', (err) => {
            alert(err.message);
            router.push('/join-room');
        });

        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleCopyCode = () => {
        if (currentRoomId === 'create') return;
        navigator.clipboard.writeText(currentRoomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartGame = () => {
        if (socketRef.current && currentRoomId !== 'create') {
            socketRef.current.emit('lobby:start_game', { roomId: currentRoomId });
        }
    };

    const handleLeave = () => {
        router.push('/');
    };

    if (!user) return null;

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
                <div className="text-[10px] font-black text-emerald-600 bg-white px-4 py-2 rounded-2xl shadow-sm border border-emerald-50 uppercase tracking-widest">
                    @{user.name}
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

                    <div className={`grid gap-4 ${mode === 'BR' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-md'}`}>
                        {players.map((p) => (
                            <div key={p.id} className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                                p.isMe ? 'bg-white border-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-white border-gray-100'
                            }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base ${
                                        p.isMe ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-400'
                                    }`}>
                                        {p.username[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base">{p.username}</span>
                                        {p.isHost && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Host</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 flex gap-12 border-t border-emerald-50 pt-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em] mb-2">Game Mode</p>
                            <p className="text-base font-black text-gray-700">{mode === 'BR' ? 'Battle Royale' : '1 vs 1 Duel'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em] mb-2">Round Time</p>
                            <p className="text-base font-black text-gray-700">{roomConfig?.roundDurationMs / 1000 || 60} seconds</p>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-[400px] p-8 md:p-12 flex flex-col justify-start bg-white/20">
                    <div className="mb-14">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Invite Link</p>
                        <div className="bg-white border-2 border-emerald-50 rounded-3xl p-8 shadow-sm flex flex-col items-center gap-6">

                            <span className="text-3xl font-black text-gray-800 tracking-[0.1em] text-center break-all">
                                {currentRoomId === 'create' ? 'Создание...' : currentRoomId}
                            </span>

                            <button
                                onClick={handleCopyCode}
                                disabled={currentRoomId === 'create'}
                                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    copied ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'
                                } disabled:opacity-50`}
                            >
                                {copied ? 'Copied!' : 'Copy Code'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {players.find(p => p.isMe)?.isHost && (
                            <button
                                onClick={handleStartGame}
                                disabled={currentRoomId === 'create'}
                                className="w-full py-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-2xl uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                Start Game
                            </button>
                        )}
                        <button
                            onClick={handleLeave}
                            className="w-full py-4 bg-white border-2 border-gray-100 text-gray-400 font-black uppercase tracking-[0.2em] rounded-xl hover:text-red-500"
                        >
                            Leave Room
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function LobbyPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#FAFCF8] text-emerald-500 font-bold tracking-widest uppercase">
                Room loading...
            </div>
        }>
            <LobbyContent />
        </Suspense>
    );
}