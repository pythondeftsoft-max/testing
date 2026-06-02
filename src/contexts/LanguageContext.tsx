import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { DEFAULT_LANGUAGE, getLanguageByCode, type SupportedLanguage } from '@/lib/languageConfig';

// Import all translation files
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import pt from '@/locales/pt.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';
import it from '@/locales/it.json';
import vi from '@/locales/vi.json';
import zh from '@/locales/zh.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import hi from '@/locales/hi.json';
import ru from '@/locales/ru.json';
import ar from '@/locales/ar.json';

const LANGUAGE_STORAGE_KEY = 'preferred_language';

type TranslationDict = Record<string, any>;

const translations: Record<string, TranslationDict> = {
  en, es, pt, fr, de, it, vi, zh, ja, ko, hi, ru, ar
};

interface LanguageContextType {
  language: string;
  languageInfo: SupportedLanguage | undefined;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use centralized auth - no duplicate subscription!
  const { user } = useAuth();
  
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });

  // Fetch user's language preference from database when user changes
  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('id', user.id)
            .single();
          
          if (!error && data?.preferred_language) {
            setLanguageState(data.preferred_language);
            localStorage.setItem(LANGUAGE_STORAGE_KEY, data.preferred_language);
          }
        } catch (err) {
          console.error('Error fetching language preference:', err);
        }
      }
    };

    fetchUserLanguage();
  }, [user?.id]);

  // Set language with persistence
  const setLanguage = useCallback(async (code: string) => {
    setLanguageState(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);

    // Save to database if logged in
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ preferred_language: code })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error saving language preference:', err);
      }
    }
  }, [user?.id]);

  // Translation function with nested key support
  const t = useCallback((key: string, fallback?: string): string => {
    const keys = key.split('.');
    const currentTranslations = translations[language] || translations[DEFAULT_LANGUAGE];
    const fallbackTranslations = translations[DEFAULT_LANGUAGE];

    // Try to get from current language
    let value: any = currentTranslations;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    // If not found, try fallback language (English)
    if (value === undefined && language !== DEFAULT_LANGUAGE) {
      value = fallbackTranslations;
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
    }

    // Return the value, fallback, or the key itself
    if (typeof value === 'string') return value;
    return fallback || key;
  }, [language]);

  const languageInfo = getLanguageByCode(language);
  const isRTL = languageInfo?.rtl || false;

  return (
    <LanguageContext.Provider value={{ language, languageInfo, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
