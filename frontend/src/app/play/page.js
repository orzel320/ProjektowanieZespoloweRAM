'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GameGrid from '../../components/Board';

// ==========================================
// MOCK DATA (To be replaced with API calls)
// ==========================================

// Mock categories dictionary
const mockCategories = {
    1: { name: 'TROPICAL FRUITS', color: 'bg-yellow-400' },
    2: { name: 'LIVING ROOM FURNITURE', color: 'bg-blue-400' },
    3: { name: 'COMMON PETS', color: 'bg-emerald-400' },
    4: { name: 'PRIMARY COLORS', color: 'bg-purple-400' }
};

// Mock puzzle words
const mockWords = [
    { id: 1, text: 'APPLE', categoryId: 1 }, { id: 2, text: 'PINE', categoryId: 1 }, { id: 3, text: 'BANANA', categoryId: 1 }, { id: 4, text: 'KIWI', categoryId: 1 },
    { id: 5, text: 'TABLE', categoryId: 2 }, { id: 6, text: 'CHAIR', categoryId: 2 }, { id: 7, text: 'SOFA', categoryId: 2 }, { id: 8, text: 'ARM-CHAIR', categoryId: 2 },
    { id: 9, text: 'DOG', categoryId: 3 }, { id: 10, text: 'CAT', categoryId: 3 }, { id: 11, text: 'HAMSTER', categoryId: 3 }, { id: 12, text: 'PARROT', categoryId: 3 },
    { id: 13, text: 'RED', categoryId: 4 }, { id: 14, text: 'BLUE', categoryId: 4 }, { id: 15, text: 'GREEN', categoryId: 4 }, { id: 16, text: 'YELLOW', categoryId: 4 }
];

export default function PlayPage() {
    const router = useRouter();

    const [gameId, setGameId] = useState('');
    const [words, setWords] = useState(mockWords);
    const [categories, setCategories] = useState(mockCategories);
    const [isLoading, setIsLoading] = useState(false);

    const [hasStarted, setHasStarted] = useState(false);
    const [topic, setTopic] = useState('General');
    const [difficulty, setDifficulty] = useState('Medium');

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    const handleGameComplete = (stats) => {
        console.log('Game completed! Ready to send stats to server:', stats);
        // await fetch('/api/save-score', { method: 'POST', body: JSON.stringify(stats) });
    };

    const handleNextPuzzle = async () => {
        console.log('Requesting new puzzle data from the backend...');
        setIsLoading(true);

        let newGameId;

        try {
            const response = await fetch("http://localhost:3001/game/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic: topic.trim() || 'General',
                    difficulty: difficulty,
                }),
            });

            if (!response.ok) {
                const errorDetails = await response.text();
                throw new Error(`Failed to generate game! Status: ${response.status}. Details: ${errorDetails}`);
            }

            const data = await response.json();
            newGameId = data.gameId;
            setGameId(newGameId);
        } catch (error) {
            console.error("Error generating game:", error);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`http://localhost:3001/game/${newGameId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch game data");
            }

            const data = await response.json();

            if (data.grid) {
                const formattedWords = data.grid.map((wordString, index) => ({
                    id: index,
                    text: wordString,
                    categoryId: null
                }));
                setWords(formattedWords);
            }
        } catch (error) {
            console.error("Error fetching game state:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLobbyClick = () => {
        console.log('Navigating back to the main lobby...');
        router.push('/');
    };

    // ==========================================
    // RENDER
    // ==========================================

    if (!hasStarted) {
        return (
            <main className="flex min-h-screen flex-col bg-[#FAFCF8] text-gray-900 font-sans relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[40%] bg-green-200/20 rounded-full blur-[100px] pointer-events-none"></div>

                <header className="w-full flex items-center justify-between px-8 py-5 bg-white/60 backdrop-blur-md border-b border-green-100/50 sticky top-0 z-10">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-gray-400 hover:text-emerald-500 transition-colors font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                            <span>← Menu</span>
                        </Link>
                        <div className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <span className="text-gray-700 font-black">connections<span className="text-emerald-500">++</span></span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-12 md:py-16 relative z-0 flex flex-col justify-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-12 tracking-tight text-center">Solo Mode Settings</h2>

                    <div className="flex flex-col gap-8 mb-12">
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em]">Category (Topic)</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Movies, History, General"
                                className="h-14 w-full bg-white border border-gray-100 rounded-xl px-5 text-lg font-bold text-gray-800 focus:outline-none focus:border-emerald-400 shadow-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.15em]">Difficulty</label>
                            <div className="flex gap-2 h-14">
                                {['Easy', 'Medium', 'Hard'].map((diff) => (
                                    <button
                                        key={diff}
                                        onClick={() => setDifficulty(diff)}
                                        className={`flex-1 rounded-xl font-bold text-md transition-all duration-200 border outline-none ${
                                            difficulty === diff
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/25 scale-[1.02]'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                        }`}
                                    >
                                        {diff}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setHasStarted(true)}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-center font-black text-lg uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transform hover:-translate-y-1 active:scale-95 transition-all duration-300"
                    >
                        Start Solo Game
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <GameGrid
                gameId={gameId}
                words={words}
                categories={categories}
                isLoading={isLoading}
                onGameComplete={handleGameComplete}
                onNextPuzzle={handleNextPuzzle}
                onLobbyClick={handleLobbyClick}
                onInitGame={handleNextPuzzle}
            />
        </main>
    );
}