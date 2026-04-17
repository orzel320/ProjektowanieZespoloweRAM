'use client';

import { useState, useEffect } from 'react';

export default function GameGrid({
                                     words = [],
                                     categories = {},
                                     isLoading = false,
                                     onGameComplete,
                                     onNextPuzzle,
                                     onLobbyClick
                                 }) {
    // ==========================================
    // STATE DECLARATIONS
    // ==========================================

    // Core game state
    const [displayWords, setDisplayWords] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [solvedGroups, setSolvedGroups] = useState([]);
    const [mistakesRemaining, setMistakesRemaining] = useState(4);
    const [guessHistory, setGuessHistory] = useState([]); // Stores the color history of attempts

    // Statistics tracking
    const [seconds, setSeconds] = useState(0);
    const [attempts, setAttempts] = useState(0);

    // UI and animation states
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Game status flow: 'idle' -> 'jumping' -> 'merging' -> 'won' OR 'error'
    // End game flow: 'revealing' -> 'game_over'
    const [status, setStatus] = useState('idle');

    // ==========================================
    // EFFECTS
    // ==========================================

    // 1. Initialize words
    // Shuffles the words array whenever new words are passed via props
    useEffect(() => {
        if (words.length > 0) {
            setDisplayWords([...words].sort(() => Math.random() - 0.5));
        }
    }, [words]);

    // 2. Game Timer
    // Runs only when the game is active (not over, won, or revealing answers)
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

    // Helper function to format seconds into MM:SS
    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 3. Auto-reveal logic on game loss
    // Triggers when mistakes run out. Sequentially reveals remaining groups with a delay.
    useEffect(() => {
        if (mistakesRemaining === 0 && status === 'idle') {
            setStatus('revealing');

            // Notify the parent component/backend about the loss
            if (onGameComplete) onGameComplete({ status: 'lost', time: seconds, attempts });

            const remainingCatIds = [...new Set(displayWords.map(w => w.categoryId))];

            // Iterate through remaining categories and reveal them one by one
            remainingCatIds.forEach((catId, index) => {
                setTimeout(() => {
                    const groupWords = displayWords.filter(w => w.categoryId === catId);
                    const group = categories[catId];

                    setSolvedGroups(prev => [...prev, {
                        ...group,
                        id: catId,
                        wordsText: groupWords.map(w => w.text).join(', ')
                    }]);
                    setDisplayWords(prev => prev.filter(w => w.categoryId !== catId));

                    // Change status to game_over after the last group is revealed
                    if (index === remainingCatIds.length - 1) {
                        setStatus('game_over');
                    }
                }, (index + 1) * 800); // 800ms delay between each reveal
            });
        }
    }, [mistakesRemaining, status, displayWords, categories, onGameComplete, seconds, attempts]);


    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    // Toggles the selection state of a word card
    const toggleSelection = (id) => {
        // Prevent selection during animations or if game is over
        if (status !== 'idle' || mistakesRemaining === 0) return;

        if (selectedIds.includes(id)) {
            // Deselect
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else if (selectedIds.length < 4) {
            // Select (max 4 allowed)
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Processes the submitted group of 4 words
    const handleSubmit = () => {
        if (selectedIds.length !== 4 || status !== 'idle') return;

        setAttempts(prev => prev + 1);

        const selectedWords = displayWords.filter(w => selectedIds.includes(w.id));
        const catId = selectedWords[0].categoryId;

        // Check if all selected words belong to the same category
        const isCorrect = selectedWords.every(w => w.categoryId === catId);

        // Record the attempt colors for the history grid on the results screen
        const attemptColors = selectedWords.map(w => categories[w.categoryId].color);
        setGuessHistory(prev => [...prev, attemptColors]);

        if (isCorrect) {
            // Trigger success animations
            setStatus('jumping');
            setTimeout(() => setStatus('merging'), 800);

            setTimeout(() => {
                const group = categories[catId];
                setSolvedGroups(prev => [...prev, {
                    ...group,
                    id: catId,
                    wordsText: selectedWords.map(w => w.text).join(', ')
                }]);
                setDisplayWords(prev => prev.filter(w => w.categoryId !== catId));
                setSelectedIds([]);

                // Check win condition (3 solved means the 4th is automatically remaining)
                if (solvedGroups.length === 3) {
                    setStatus('won');
                    if (onGameComplete) onGameComplete({ status: 'won', time: seconds, attempts: attempts + 1 });
                } else {
                    setStatus('idle');
                }
            }, 1300); // Total animation duration before state updates
        } else {
            // Trigger error animation and reduce mistakes
            setStatus('error');
            setMistakesRemaining(prev => Math.max(0, prev - 1));

            setTimeout(() => {
                setStatus('idle');
                setSelectedIds([]); // Clear selection after a wrong guess
            }, 1000);
        }
    };

    // Prepares the board for the next round
    const handleNextPuzzle = () => {
        // Trigger parent callback to fetch new data from the backend
        if (onNextPuzzle) onNextPuzzle();

        // Fallback: Shuffle current words in case the backend hasn't provided new ones yet
        setDisplayWords([...words].sort(() => Math.random() - 0.5));

        // Reset all states
        setSolvedGroups([]);
        setMistakesRemaining(4);
        setSelectedIds([]);
        setGuessHistory([]);
        setSeconds(0);
        setAttempts(0);
        setStatus('idle');
    };

    // ==========================================
    // RENDER
    // ==========================================

    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">
            {/* Header section */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm mb-8">
                <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center relative">
                    <button onClick={onLobbyClick} className="px-3 py-2 font-bold text-slate-600 z-30 hover:text-slate-900 transition-colors">← LOBBY</button>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h1 className="text-xl font-black">CONNECTIONS<span className="text-emerald-500">++</span></h1>
                    </div>
                    <div className="z-30 flex items-center gap-4">
                        <span className="font-mono font-bold text-slate-400 hidden sm:block">{formatTime(seconds)}</span>
                        <button onClick={() => setIsInfoModalOpen(true)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 transition-colors rounded-xl font-bold text-slate-600">?</button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4">

                {/* Mistakes Indicator (Hidden on game over) */}
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

                {/* Solved Groups List */}
                <div className="space-y-3 mb-4">
                    {solvedGroups.map(group => (
                        <div key={group.id} className={`${group.color} rounded-2xl p-6 text-center shadow-md animate-pop-in transition-all`}>
                            <h3 className="font-black uppercase text-slate-900 tracking-widest">{group.name}</h3>
                            <p className="font-bold uppercase text-slate-800 text-sm opacity-80">{group.wordsText}</p>
                        </div>
                    ))}
                </div>

                {/* Conditional Rendering: Results Screen OR Game Board */}
                {status === 'game_over' || status === 'won' ? (
                    // --- RESULTS SCREEN ---
                    <div className="flex flex-col items-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200 animate-pop-in mt-8 text-center">
                        <h2 className={`text-3xl font-black uppercase mb-2 ${status === 'won' ? 'text-emerald-500' : 'text-slate-600'}`}>
                            {status === 'won' ? 'Perfect!' : 'Next Time!'}
                        </h2>

                        {/* Player Statistics */}
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

                        {/* Visual Guess History (Colored Grid) */}
                        <div className="flex flex-col gap-1.5 mb-8">
                            {guessHistory.map((row, i) => (
                                <div key={i} className="flex gap-1.5 justify-center">
                                    {row.map((color, j) => (
                                        <div key={j} className={`w-10 h-10 rounded-lg ${color} shadow-sm`}></div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Navigation Actions */}
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
                    // --- GAME BOARD (Word Grid) ---
                    displayWords.length > 0 && (
                        <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-10">
                            {displayWords.map((word) => {
                                const isSelected = selectedIds.includes(word.id);
                                const selectIdx = selectedIds.indexOf(word.id);

                                // Determine animation classes based on current status
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

                {/* Main Action Buttons (Hidden on game over) */}
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

            {/* Info / Rules Modal Window */}
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