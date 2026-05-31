import { getDictionary } from '@/dictionaries';
import CreateRoomClient from './CreateRoomClient';

export default async function CreateRoomPage({ params }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    return <CreateRoomClient dict={dict} />;
}