import { getDictionary } from '@/dictionaries';
import JoinRoomClient from './JoinRoomClient';

export default async function JoinRoomPage({ params }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    return <JoinRoomClient dict={dict} />;
}