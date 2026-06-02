import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SupportedCurrency } from '@/lib/currencyUtils';

interface CurrencyToggleProps {
  value: SupportedCurrency;
  onChange: (currency: SupportedCurrency) => void;
  className?: string;
  compact?: boolean;
}

const currencies: SupportedCurrency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'];

const currencySymbols: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  MXN: '$',
};

export const CurrencyToggle: React.FC<CurrencyToggleProps> = ({
  value,
  onChange,
  className,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (currency: SupportedCurrency) => {
    onChange(currency);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {compact ? (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg border border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200"
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-sm font-medium">{currencySymbols[value]}</span>
        </motion.button>
      ) : (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="currency-toggle-trigger"
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="currency-symbol">{currencySymbols[value]}</span>
          <span className="currency-code">{value}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </motion.div>
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              "absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden",
              compact ? "min-w-[100px]" : "currency-dropdown max-h-64 overflow-y-auto"
            )}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {currencies
              .filter((c) => c !== value)
              .map((currency) => (
                <motion.button
                  key={currency}
                  onClick={() => handleSelect(currency)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-openkey-blue/10 hover:text-openkey-blue transition-colors",
                    compact ? "justify-center" : "currency-dropdown-item"
                  )}
                  type="button"
                  whileHover={{ x: compact ? 0 : 2 }}
                >
                  <span className="font-medium">{currencySymbols[currency]}</span>
                  <span>{currency}</span>
                </motion.button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CurrencyToggle;
