'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

export default function JoinRoomPage({ dict }) {
    const [roomCode, setRoomCode] = useState('');
    const [user, setUser] = useState(null);
    const [recentRooms, setRecentRooms] = useState([]);
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    const socketRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) setUser(JSON.parse(savedUser));

        const savedHistory = localStorage.getItem('recentRooms');
        if (savedHistory) setRecentRooms(JSON.parse(savedHistory));

        socketRef.current = io('http://localhost:3001/lobby');

        socketRef.current.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            setError('Connection error 🔌');
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [dict.joinRoom.connectionError]);

    const handleJoin = (e) => {
        if (e) e.preventDefault();

        const code = roomCode.trim().toUpperCase();
        if (!code) return;

        setError('');
        setIsChecking(true);

        const timeout = setTimeout(() => {
            if (isChecking) {
                setIsChecking(false);
                setError(dict.joinRoom.timeoutError);
            }
        }, 5000);

        socketRef.current.emit('lobby:list_rooms', (rooms) => {
            clearTimeout(timeout);
            setIsChecking(false);

            const roomExists = Array.isArray(rooms) &&
                rooms.some(r => r.roomId.toUpperCase() === code);

            if (roomExists) {
                let history = [code, ...recentRooms.filter(item => item !== code)].slice(0, 5);
                setRecentRooms(history);
                localStorage.setItem('recentRooms', JSON.stringify(history));

                router.push(`/lobby/${code}`);
            } else {
                setError(dict.joinRoom.notFoundError);
                setTimeout(() => setError(''), 3000);
            }
        });
    };

    return (
        <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-green-200/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-emerald-200/20 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header */}
            <header className="w-full flex items-center justify-between px-8 py-5 bg-white/60 backdrop-blur-md border-b border-green-100/50 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-gray-400 hover:text-emerald-500 transition-colors font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <span>← {dict.joinRoom.backMenu}</span>
                    </Link>
                    <div className="text-xl font-bold tracking-tight">
                        <span className="text-gray-700">connections</span>
                        <span className="text-emerald-500">++</span>
                    </div>
                </div>
                <div className="text-[10px] font-black text-emerald-600 bg-white px-4 py-2 rounded-2xl shadow-sm border border-emerald-50 uppercase tracking-widest">
                    @{user?.name || dict.joinRoom.guest}
                </div>
            </header>

            {/* Notification Error */}
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${error ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
                <div className="bg-white border-2 border-red-400 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                    <span className="text-2xl">🙊</span>
                    <p className="font-black text-gray-800 uppercase tracking-widest text-xs">
                        {error}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 md:py-24 relative z-0 flex flex-col justify-center">

                <div className="mb-12">
                    <h2 className="text-5xl md:text-6xl font-black text-gray-800 mb-4 tracking-tight">
                        {dict.joinRoom.title}
                    </h2>
                    <p className="text-lg text-gray-500 font-medium leading-relaxed">
                        {dict.joinRoom.description}
                    </p>
                </div>

                <form onSubmit={handleJoin} className="flex flex-col gap-3 mb-10">
                    <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.3em] ml-2">{dict.joinRoom.inputLabel}</label>
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())} // Сразу в верхний регистр
                            placeholder={dict.joinRoom.placeholder}
                            maxLength={6}
                            className={`flex-1 h-20 bg-white border-2 rounded-3xl px-8 text-3xl font-black text-gray-800 tracking-[0.3em] uppercase focus:outline-none transition-all shadow-sm ${error ? 'border-red-200 bg-red-50/30' : 'border-gray-100 focus:border-emerald-400'}`}
                        />
                        <button
                            type="submit"
                            disabled={!roomCode.trim() || isChecking}
                            className="h-20 px-12 md:w-max w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xl uppercase tracking-[0.2em] rounded-3xl shadow-xl shadow-emerald-500/20 transform hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isChecking ? dict.joinRoom.btnChecking : dict.joinRoom.btnJoin}
                        </button>
                    </div>
                </form>

                <div className="w-full border-t-2 border-dashed border-gray-100 my-8"></div>

                {/* Recent Rooms */}
                <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">{dict.joinRoom.recentTitle}</span>
                    <div className="flex flex-wrap gap-3">
                        {recentRooms.map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => { setRoomCode(code); }}
                                className="px-6 py-4 bg-white border border-gray-100 hover:border-emerald-200 rounded-2xl text-gray-800 font-black tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-3"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                                <span className="text-sm">{code}</span>
                            </button>
                        ))}
                        {recentRooms.length === 0 && (
                            <p className="text-xs text-gray-400 font-medium italic ml-1">{dict.joinRoom.noHistory}</p>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}