'use client';

import {Button} from 'react-native-web'
import { useRouter } from 'next/navigation';


export default function Page() {
    const router = useRouter()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
                    <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center relative"><div className="absolute inset-0 flex items-center justify-center">
                            <h1 className="text-xl font-black">CONNECTIONS<span className="text-emerald-500">++</span></h1>
                    </div> </div>
                </header>
                <div className="max-w-3xl mx-auto px-4 h-16 flex justify-center items-center relative h-screen">

            <button className="px-3 py-2 text-6xl font-bold text-slate-600 z-30 hover:text-slate-900 transition-colors"
                onClick={() => router.push('/')}
            > PLAY </button>
                    </div>
            </div>
        </main>
    );
}