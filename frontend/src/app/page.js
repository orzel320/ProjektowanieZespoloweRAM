'use client';

import { useState } from 'react';
import GameGrid from '../components/Board';

//  categoryId for checking mistakes
const mockWords = [
    { id: 1, text: 'APPLE', categoryId: 1 }, { id: 2, text: 'PINE', categoryId: 1 }, { id: 3, text: 'BANANA', categoryId: 1 }, { id: 4, text: 'KIWI', categoryId: 1 },
    { id: 5, text: 'TABLE', categoryId: 2 }, { id: 6, text: 'CHAIR', categoryId: 2 }, { id: 7, text: 'SOFA', categoryId: 2 }, { id: 8, text: 'ARM-CHAIR', categoryId: 2 },
    { id: 9, text: 'DOG', categoryId: 3 }, { id: 10, text: 'CAT', categoryId: 3 }, { id: 11, text: 'HAMSTER', categoryId: 3 }, { id: 12, text: 'PARROT', categoryId: 3 },
    { id: 13, text: 'RED', categoryId: 4 }, { id: 14, text: 'BLUE', categoryId: 4 }, { id: 15, text: 'GREEN', categoryId: 4 }, { id: 16, text: 'YELLOW', categoryId: 4 }
];

export default function Home() {
    const [isChecking, setIsChecking] = useState(false);

    const handleCheckSubmission = async (selectedIds) => {
        setIsChecking(true);
        await new Promise(resolve => setTimeout(resolve, 300)); // небольшая пауза для реалистичности
        setIsChecking(false);
    };

    return (
        <main className="min-h-screen bg-slate-50">
            <GameGrid
                words={mockWords}
                onSubmit={handleCheckSubmission}
                isSubmitting={isChecking}
                onLobbyClick={() => console.log('Lobby clicked')}
                onInfoClick={() => console.log('Info clicked')}
            />
        </main>
    );
}