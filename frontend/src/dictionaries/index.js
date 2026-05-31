import 'server-only';

const dictionaries = {
  en: () => import('./en.json').then((module) => module.default),
  pl: () => import('./pl.json').then((module) => module.default),
};

export const getDictionary = async (locale) => {
  return dictionaries[locale]?.() ?? dictionaries.en();
};