'use client';

import { useRouter } from 'next/navigation';

export default function LobbyPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">

                <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
                    <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h1 className="text-xl font-black">CONNECTIONS<span className="text-emerald-500">++</span></h1>
                        </div>
                    </div>
                </header>

                <div className="max-w-3xl mx-auto px-4 flex justify-center items-center relative" style={{ minHeight: '60vh' }}>
                    <button
                        className="px-16 py-6 text-4xl sm:text-6xl rounded-3xl font-black bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all"
                        onClick={() => router.push('/play')}
                    >
                        PLAY
                    </button>
                </div>

            </div>
        </main>
    );
}