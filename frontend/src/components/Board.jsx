'use client';

import { useState, useEffect } from 'react';

//MOCK CATEGORIES && MUST BE FROM BACKEND
const CATEGORIES_INFO = {
    1: { name: 'TROPICAL FRUITS', color: 'bg-yellow-400' },
    2: { name: 'LIVING ROOM FURNITURE', color: 'bg-blue-400' },
    3: { name: 'COMMON PETS', color: 'bg-emerald-400' },
    4: { name: 'PRIMARY COLORS', color: 'bg-purple-400' }
};

//MOCK WORDS && MUST BE FROM BACKEND
const initialWords = [
    { id: 1, text: 'APPLE', categoryId: 1 }, { id: 2, text: 'PINE', categoryId: 1 }, { id: 3, text: 'BANANA', categoryId: 1 }, { id: 4, text: 'KIWI', categoryId: 1 },
    { id: 5, text: 'TABLE', categoryId: 2 }, { id: 6, text: 'CHAIR', categoryId: 2 }, { id: 7, text: 'SOFA', categoryId: 2 }, { id: 8, text: 'ARM-CHAIR', categoryId: 2 },
    { id: 9, text: 'DOG', categoryId: 3 }, { id: 10, text: 'CAT', categoryId: 3 }, { id: 11, text: 'HAMSTER', categoryId: 3 }, { id: 12, text: 'PARROT', categoryId: 3 },
    { id: 13, text: 'RED', categoryId: 4 }, { id: 14, text: 'BLUE', categoryId: 4 }, { id: 15, text: 'GREEN', categoryId: 4 }, { id: 16, text: 'YELLOW', categoryId: 4 }
];

export default function GameGrid({ words = initialWords, onSubmit, isSubmitting, onLobbyClick, onInfoClick }) {
    const [displayWords, setDisplayWords] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [solvedGroups, setSolvedGroups] = useState([]);
    const [mistakesRemaining, setMistakesRemaining] = useState(4);

    // Animation flags
    const [status, setStatus] = useState('idle'); // 'idle', 'jumping', 'merging', 'error'

    useEffect(() => { setDisplayWords(words); }, [words]);

    const toggleSelection = (id) => {
        if (status !== 'idle' || mistakesRemaining === 0) return;
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else if (selectedIds.length < 4) {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSubmit = () => {
        if (selectedIds.length !== 4 || status !== 'idle') return;

        const selectedWords = displayWords.filter(w => selectedIds.includes(w.id));
        const catId = selectedWords[0].categoryId;
        const isCorrect = selectedWords.every(w => w.categoryId === catId);

        if (isCorrect) {
            setStatus('jumping');

            setTimeout(() => {
                setStatus('merging');
            }, 800);

            setTimeout(() => {
                const group = CATEGORIES_INFO[catId];
                setSolvedGroups(prev => [...prev, {
                    ...group,
                    id: catId,
                    wordsText: selectedWords.map(w => w.text).join(', ')
                }]);
                setDisplayWords(prev => prev.filter(w => w.categoryId !== catId));
                setSelectedIds([]);
                setStatus('idle');
                if (onSubmit) onSubmit(selectedIds);
            }, 1300);

        } else {
            setStatus('error');
            setMistakesRemaining(prev => Math.max(0, prev - 1));
            setTimeout(() => {
                setStatus('idle');
                setSelectedIds([]);
            }, 1000);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
                <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center relative">
                    <button onClick={onLobbyClick} className="px-3 py-2 font-bold text-slate-600 z-30 hover:text-slate-900 transition-colors">← LOBBY</button>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h1 className="text-xl font-black">CONNECTIONS<span className="text-emerald-500">++</span></h1>
                    </div>
                    <button onClick={onInfoClick} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl font-bold z-30">?</button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4">
                {/* Errors */}
                <div className="flex flex-col items-center mb-6">
                    <h2 className="text-xl font-extrabold uppercase mb-4 text-slate-700">Create groups of four!</h2>
                    <div className="flex gap-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < mistakesRemaining ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </div>

                {/* Ready groups */}
                <div className="space-y-3 mb-4">
                    {solvedGroups.map(group => (
                        <div key={group.id} className={`${group.color} rounded-2xl p-6 text-center shadow-md animate-pop-in`}>
                            <h3 className="font-black uppercase text-slate-900 tracking-widest">{group.name}</h3>
                            <p className="font-bold uppercase text-slate-800 text-sm opacity-80">{group.wordsText}</p>
                        </div>
                    ))}
                </div>

                {/* Word board */}
                <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-10">
                    {displayWords.map((word) => {
                        const isSelected = selectedIds.includes(word.id);
                        const selectIdx = selectedIds.indexOf(word.id);

                        let animClass = '';
                        if (isSelected && status === 'jumping') animClass = 'animate-jump';
                        if (isSelected && status === 'merging') animClass = 'animate-merge';
                        if (isSelected && status === 'error') animClass = 'animate-shake';

                        return (
                            <button
                                key={word.id}
                                onClick={() => toggleSelection(word.id)}
                                disabled={status !== 'idle'}
                                style={{ animationDelay: (isSelected && status === 'jumping') ? `${selectIdx * 100}ms` : '0ms' }}
                                className={`
                                    aspect-[4/3] rounded-2xl font-bold text-xs sm:text-base uppercase transition-all duration-300 flex items-center justify-center p-2 text-center
                                    ${isSelected
                                    ? 'bg-emerald-200 text-emerald-950 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] scale-95'
                                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-sm'
                                }
                                    ${animClass}
                                `}
                            >
                                {word.text}
                            </button>
                        );
                    })}
                </div>

                {/* BUTTONS */}
                <div className="flex justify-center gap-4">
                    <button onClick={() => setDisplayWords([...displayWords].sort(() => Math.random() - 0.5))} className="px-6 py-3 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl font-bold active:scale-95 transition-all">SHUFFLE</button>
                    <button onClick={() => setSelectedIds([])} className="px-6 py-3 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl font-bold active:scale-95 transition-all">CLEAR</button>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedIds.length !== 4 || status !== 'idle'}
                        className={`px-10 py-3 rounded-2xl font-black shadow-lg transition-all ${selectedIds.length === 4 ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-200 text-slate-400 shadow-none'}`}
                    >
                        SUBMIT
                    </button>
                </div>
            </main>
        </div>
    );
}