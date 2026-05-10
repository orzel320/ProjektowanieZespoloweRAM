'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
                    topic: 'General',
                    difficulty: 'Hard',
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