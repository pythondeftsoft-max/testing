import { useState, useEffect } from 'react';
import { type SupportedCurrency } from '@/lib/currencyUtils';

const CURRENCY_STORAGE_KEY = 'preferred-currency';
const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export const useCurrencyPreference = () => {
  const [currency, setCurrency] = useState<SupportedCurrency>(DEFAULT_CURRENCY);

  useEffect(() => {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'].includes(stored)) {
      setCurrency(stored as SupportedCurrency);
    }
  }, []);

  const updateCurrency = (newCurrency: SupportedCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
  };

  return {
    currency,
    updateCurrency
  };
};