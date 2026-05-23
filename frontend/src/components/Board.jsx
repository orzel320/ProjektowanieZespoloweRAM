'use client';

import { useState, useEffect } from 'react';

export default function GameGrid({
                                     gameId,
                                     words = [],
                                     categories = {},
                                     isLoading = false,
                                     onGameComplete,
                                     onNextPuzzle,
                                     onLobbyClick,
                                     onInitGame,
                                 }) {
    const [displayWords, setDisplayWords] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [solvedGroups, setSolvedGroups] = useState([]);
    const [mistakesRemaining, setMistakesRemaining] = useState(4);
    const [guessHistory, setGuessHistory] = useState([]);
    const [lostGameRevealedCategories, setLostGameRevealedCategories] = useState([]);

    const [seconds, setSeconds] = useState(0);
    const [attempts, setAttempts] = useState(0);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [status, setStatus] = useState('idle');

    const [oneAway, setOneAway] = useState(false);

    useEffect(() => {
        if (typeof onInitGame === 'function') {
            onInitGame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (words && words.length > 0) {
            setDisplayWords([...words].sort(() => Math.random() - 0.5));
        }
    }, [words]);

    useEffect(() => {
        let interval = null;
        if (status !== 'game_over' && status !== 'won' && status !== 'revealing') {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Animation to reveal correct answers upon losing
    useEffect(() => {
        if (status === 'revealing' && lostGameRevealedCategories.length > 0) {
            // Keep only categories that are not yet in solvedGroups
            const unsolved = lostGameRevealedCategories.filter(
                rcat => !solvedGroups.some(sg => sg.name === rcat.name)
            );

            if (unsolved.length === 0) {
                setStatus('game_over');
                return;
            }

            unsolved.forEach((cat, index) => {
                setTimeout(() => {
                    setSolvedGroups(prev => [...prev, {
                        id: Date.now() + index,
                        name: cat.name,
                        color: "bg-slate-300", // Gray color for unsolved
                        wordsText: cat.words.join(', ')
                    }]);

                    setDisplayWords(prev => prev.filter(w => !cat.words.includes(w.text)));

                    if (index === unsolved.length - 1) {
                        setTimeout(() => setStatus('game_over'), 800);
                    }
                }, (index + 1) * 800);
            });
        }
    }, [status, lostGameRevealedCategories]);

    const toggleSelection = (id) => {
        if (status !== 'idle' || mistakesRemaining === 0) return;

        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else if (selectedIds.length < 4) {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSubmit = async () => {
        if (selectedIds.length !== 4 || status !== 'idle' || !gameId) return;

        setAttempts(prev => prev + 1);

        const selectedWords = displayWords.filter(w => selectedIds.includes(w.id));
        const guessWordsText = selectedWords.map(w => w.text);

        setStatus('jumping');

        try {
            const response = await fetch(`http://localhost:3001/game/${gameId}/guess`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ words: guessWordsText })
            });

            if (!response.ok) throw new Error("Failed to verify words");

            const data = await response.json();
            console.log("Server response:", data);

            if (data.correct) {
                const guessedCategory = data.revealedCategories.find(cat => {
                    const normalizedCatWords = cat.words.map(w => w.trim().toUpperCase());
                    const normalizedGuess = guessWordsText.map(w => w.trim().toUpperCase());
                    return normalizedCatWords.some(w => normalizedGuess.includes(w));
                });

                const categoryName = guessedCategory ? guessedCategory.name : "FOUND CATEGORY";

                const colorMap = ["bg-yellow-400", "bg-emerald-400", "bg-blue-400", "bg-purple-400"];
                const groupColor = colorMap[solvedGroups.length] || "bg-emerald-400";

                const attemptColors = Array(4).fill(groupColor);
                setGuessHistory(prev => [...prev, attemptColors]);

                setTimeout(() => setStatus('merging'), 800);

                setTimeout(() => {
                    const newGroup = {
                        id: Date.now(),
                        name: categoryName,
                        color: groupColor,
                        wordsText: guessWordsText.join(', ')
                    };

                    setSolvedGroups(prev => [...prev, newGroup]);
                    setDisplayWords(prev => prev.filter(w => !guessWordsText.includes(w.text)));
                    setSelectedIds([]);

                    if (data.status === 'won') {
                        setStatus('won');
                        if (onGameComplete) onGameComplete({ status: 'won', time: seconds, attempts: attempts + 1 });
                    } else {
                        setStatus('idle');
                    }
                }, 1300);

            } else {
                setStatus('error');
                setMistakesRemaining(data.maxMistakes - data.mistakes);
                setGuessHistory(prev => [...prev, Array(4).fill('bg-slate-300')]);

                setOneAway(data.isOneAway);
                //setOneAway(true); //only for test purposes
                setTimeout(() => {setOneAway(false);}, 3000);

                setTimeout(() => {
                    setSelectedIds([]);
                    if (data.status === 'lost') {
                        setLostGameRevealedCategories(data.revealedCategories);
                        setStatus('revealing');
                        if (onGameComplete) onGameComplete({ status: 'lost', time: seconds, attempts: attempts + 1 });
                    } else {
                        setStatus('idle');
                    }
                }, 1000);
            }
        } catch (error) {
            console.error("Error during connection with a server:", error);
            setStatus('idle');
        }
    };

    const handleNextPuzzle = () => {
        if (onNextPuzzle) onNextPuzzle();
        setSolvedGroups([]);
        setMistakesRemaining(4);
        setSelectedIds([]);
        setGuessHistory([]);
        setSeconds(0);
        setAttempts(0);
        setStatus('idle');
    };

    const handleLogout = async () => {
        try {
            await fetch("http://localhost:3001/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
                <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center relative">
                    <button onClick={onLobbyClick} className="px-3 py-2 font-bold text-slate-600 z-30 hover:text-slate-900 transition-colors">← LOBBY</button>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h1 className="text-xl font-black">CONNECTIONS<span className="text-emerald-500">++</span></h1>
                    </div>
                    <div className="z-30 flex items-center gap-4">
                        <span className="font-mono font-bold text-slate-400 hidden sm:block">{formatTime(seconds)}</span>
                        <button onClick={() => setIsInfoModalOpen(true)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl font-bold text-slate-600">?</button>
                        <button onClick={handleLogout} className="px-3 py-2 font-bold text-slate-600 z-30 hover:text-slate-900 transition-colors">LOGOUT</button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4">
                {status !== 'game_over' && status !== 'won' && status !== 'revealing' && (
                    <div className="flex flex-col items-center mb-6 h-16">
                        <h2 className="text-xl font-extrabold uppercase mb-4 text-slate-700">Create groups of four!</h2>
                        <div className="flex gap-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < mistakesRemaining ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                    </div>
                )}

                {oneAway && (
                    <div className="flex flex-col items-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200 animate-pop-in mt-8 text-center">
                        <h2
                            className={`text-3xl font-black uppercase mb-2 ${
                                status === 'won' ? 'text-emerald-500' : 'text-slate-600'
                            }`}
                        >
                            One Away!
                        </h2>
                    </div>
                )}



                <div className="space-y-3 mb-4">
                    {solvedGroups.map(group => (
                        <div key={group.id} className={`${group.color} rounded-2xl p-6 text-center shadow-md animate-pop-in transition-all`}>
                            <h3 className="font-black uppercase text-slate-900 tracking-widest">{group.name}</h3>
                            <p className="font-bold uppercase text-slate-800 text-sm opacity-80">{group.wordsText}</p>
                        </div>
                    ))}
                </div>

                {status === 'game_over' || status === 'won' ? (
                    <div className="flex flex-col items-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200 animate-pop-in mt-8 text-center">
                        <h2 className={`text-3xl font-black uppercase mb-2 ${status === 'won' ? 'text-emerald-500' : 'text-slate-600'}`}>
                            {status === 'won' ? 'Perfect!' : 'Next Time!'}
                        </h2>

                        <div className="flex gap-6 my-4 text-slate-500 font-bold uppercase tracking-wider text-xs">
                            <div className="flex flex-col">
                                <span className="text-slate-300">Time</span>
                                <span className="text-lg text-slate-800">{formatTime(seconds)}</span>
                            </div>
                            <div className="w-px h-10 bg-slate-100" />
                            <div className="flex flex-col">
                                <span className="text-slate-300">Attempts</span>
                                <span className="text-lg text-slate-800">{attempts}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 mb-8">
                            {guessHistory.map((row, i) => (
                                <div key={i} className="flex gap-1.5 justify-center">
                                    {row.map((color, j) => (
                                        <div key={j} className={`w-10 h-10 rounded-lg ${color} shadow-sm`}></div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button onClick={onLobbyClick} className="px-8 py-3 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl font-bold active:scale-95 transition-all">
                                BACK TO LOBBY
                            </button>
                            <button onClick={handleNextPuzzle} className="px-8 py-3 rounded-2xl font-black shadow-lg transition-all bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95">
                                NEXT PUZZLE
                            </button>
                        </div>
                    </div>
                ) : (
                    displayWords.length > 0 && (
                        <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-10">
                            {displayWords.map((word) => {
                                const isSelected = selectedIds.includes(word.id);
                                const selectIdx = selectedIds.indexOf(word.id);

                                let animClass = '';
                                if (isSelected && status === 'jumping') animClass = 'animate-jump';
                                if (isSelected && status === 'merging') animClass = 'animate-merge';
                                if (isSelected && status === 'error') animClass = 'animate-shake';
                                if (status === 'revealing') animClass = 'opacity-50 transition-opacity duration-500';

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
                    )
                )}

                {status !== 'game_over' && status !== 'won' && status !== 'revealing' && (
                    <div className="flex justify-center gap-4 mt-8 h-12">
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
                )}
            </main>

            {isInfoModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-pop-in">
                        <button onClick={() => setIsInfoModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-bold transition-colors">✕</button>
                        <h2 className="text-2xl font-black mb-6 text-slate-800">How to Play</h2>
                        <ul className="space-y-4 text-slate-600 font-medium list-disc pl-5">
                            <li>Find groups of four items that share something in common.</li>
                            <li>Select four items and tap <span className="font-bold text-slate-800">SUBMIT</span> to check if your guess is correct.</li>
                            <li>Find all groups without making 4 mistakes!</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}