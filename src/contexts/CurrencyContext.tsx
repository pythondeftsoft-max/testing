import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type SupportedCurrency, refreshExchangeRatesIfNeeded } from '@/lib/currencyUtils';
import { useAuth } from '@/providers/AuthProvider';

const CURRENCY_STORAGE_KEY = 'preferred-currency';
const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

interface CurrencyContextType {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => Promise<void>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored) {
        return stored as SupportedCurrency;
      }
    }
    return DEFAULT_CURRENCY;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's currency preference from database on auth change
  useEffect(() => {
    const fetchUserCurrency = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('preferred_currency_code')
          .eq('id', user.id)
          .single();

        if (!error && data?.preferred_currency_code) {
          setCurrencyState(data.preferred_currency_code as SupportedCurrency);
          localStorage.setItem(CURRENCY_STORAGE_KEY, data.preferred_currency_code);
        }
      } catch (err) {
        console.error('Error fetching user currency preference:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCurrency();
  }, [user?.id]);

  // Refresh exchange rates on app load
  useEffect(() => {
    refreshExchangeRatesIfNeeded().catch(console.error);
  }, []);

  // Set currency and sync to database
  const setCurrency = useCallback(async (newCurrency: SupportedCurrency) => {
    if (newCurrency === currency) return;

    // Update state immediately for responsive UI
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);

    // Sync to database if user is logged in
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_currency_code: newCurrency })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving currency preference:', error);
        }
      } catch (err) {
        console.error('Error updating currency:', err);
      }
    }
  }, [currency, user?.id]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    // Return default values if used outside provider (for gradual migration)
    return {
      currency: DEFAULT_CURRENCY,
      setCurrency: async () => {},
      isLoading: false,
    };
  }
  return context;
};
