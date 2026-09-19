import React, { createContext, useContext, useState } from 'react';
import { Language, Translations } from './types';
import { enTranslations, esTranslations } from './translations';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Locale } from 'date-fns';

const STORAGE_KEY_LANG = 'travel_optimizer_lang';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  dateLocale: Locale;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LANG);
      if (stored === 'en' || stored === 'es') return stored;
      // Detect browser language
      if (typeof navigator !== 'undefined' && navigator.language?.startsWith('es')) {
        return 'es';
      }
    } catch {
      // ignore
    }
    return 'es'; // Default to Spanish for immediate convenience
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, newLang);
    } catch {
      // ignore
    }
  };

  const t = lang === 'es' ? esTranslations : enTranslations;
  const dateLocale = lang === 'es' ? es : enUS;

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dateLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
