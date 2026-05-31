import { getDictionary } from '@/dictionaries';
import PlayRoomClient from './PlayRoomClient';

export default async function PlayRoomServerPage({ params }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    return <PlayRoomClient dict={dict} />;
}