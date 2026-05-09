'use client';

import {useState} from 'react'
import { useRouter } from 'next/navigation';
import GameGrid from '../../../components/Board';

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
    const [isLoading, setIsLoading] = useState(true);

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    // Triggered when the player successfully finishes or completely loses the game
    const handleGameComplete = (stats) => {
        // 'stats' object contains: { status: 'won' | 'lost', time: 123, attempts: 5 }
        console.log('Game completed! Ready to send stats to server:', stats);

        // TODO: Future API Implementation
        // await fetch('/api/save-score', { method: 'POST', body: JSON.stringify(stats) });
    };

    // Triggered when the 'NEXT PUZZLE' button is clicked on the results screen
    const handleNextPuzzle = async () => {
        console.log('Requesting new puzzle data from the backend...');

        // TODO: Future API Implementation
        // 1. Set isLoading state to true
        // 2. Fetch new words and categories from backend
        // 3. Update the state with new data
        // 4. Set isLoading state back to false

        try {
            const response = await fetch("http://localhost:3001/game/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic : 'General',
                    difficulty : 'Hard',
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate game");
            }

            const data = await response.json();
            setGameId(data.gameId);
        } catch (error) {
            console.error(error);
        }

        try {
            const response = await fetch(`http://localhost:3001/game/${gameID}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic : 'General',
                    difficulty : 'Hard',
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate game");
            }

            const data = await response.json();
            setCategories(data.revealedCategories.categories);
            setWords(data.revealedCategories.words);
        } catch (error) {
            console.error(error);
        }
    };

    // Triggered when the user clicks the 'LOBBY' button (header or results screen)
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
                words={words}
                categories={categories}
                isLoading={false} // Update this with actual loading state once API is connected
                onGameComplete={handleGameComplete}
                onNextPuzzle={handleNextPuzzle}
                onLobbyClick={handleLobbyClick}
                onInitGame={handleNextPuzzle}
            />
        </main>
    );
}