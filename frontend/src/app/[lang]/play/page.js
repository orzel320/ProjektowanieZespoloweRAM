import { getDictionary } from '@/dictionaries';
import PlayClient from './PlayClient';

export default async function PlayPage({ params }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    return <PlayClient dict={dict} lang={lang} />;
}