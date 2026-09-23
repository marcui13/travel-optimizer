import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Language, Translations } from '@i18n/types';
import { enTranslations, esTranslations } from '@i18n/translations';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Locale } from 'date-fns';
import { getMobileLanguage, setMobileLanguage, hydrateStorageAsync } from '../services/mobileStorage';

interface MobileI18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  dateLocale: Locale;
}

const MobileI18nContext = createContext<MobileI18nContextType | null>(null);

export const MobileI18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => getMobileLanguage());

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    setMobileLanguage(newLang);
  }, []);

  useEffect(() => {
    hydrateStorageAsync().then(() => {
      const persistedLang = getMobileLanguage();
      if (persistedLang !== lang) {
        setLangState(persistedLang);
      }
    });
  }, [lang]);

  const t = lang === 'es' ? esTranslations : enTranslations;
  const dateLocale = lang === 'es' ? es : enUS;

  return (
    <MobileI18nContext.Provider value={{ lang, setLang, t, dateLocale }}>
      {children}
    </MobileI18nContext.Provider>
  );
};

export function useMobileI18n(): MobileI18nContextType {
  const ctx = useContext(MobileI18nContext);
  if (!ctx) {
    throw new Error('useMobileI18n must be used within a MobileI18nProvider');
  }
  return ctx;
}
