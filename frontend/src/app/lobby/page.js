'use client';

import {Button} from 'react-native-web'
import { useRouter } from 'next/navigation';


export default function Page() {
    const router = useRouter()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">
                {/* Header section */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
                    <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center relative">
            <Button className="px-3 py-2 font-bold text-slate-600 z-30 hover:text-slate-900 transition-colors"
                onPress={() => router.push('/')}
                title="Play"
                accessibilityLabel=""
            />
                    </div>
                    </header>
            </div>
        </main>
    );
}