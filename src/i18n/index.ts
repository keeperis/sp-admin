import { en } from './en';
import { lt } from './lt';

export type Locale = 'lt' | 'en';

const translations = {
  lt,
  en,
};

export function t(locale: Locale, key: string): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

export function getTranslations(locale: Locale) {
  return translations[locale];
}
