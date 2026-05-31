import { getDictionary } from '@/dictionaries';
import MainMenuClient from './MainMenuClient';

export default async function Page({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <MainMenuClient dict={dict} />; 
}