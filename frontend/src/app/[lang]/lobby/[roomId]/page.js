import { getDictionary } from '@/dictionaries';
import LobbyClient from './LobbyClient';

export default async function LobbyPage({ params }) {
    // Pobieramy oba parametry z URL: język i ID pokoju
    const { lang, roomId } = await params;
    const dict = await getDictionary(lang);

    return <LobbyClient dict={dict} initialRoomId={roomId} />;
}