
import React from 'react';
import { motion } from 'framer-motion';
import { Globe, MapPin, CreditCard, ArrowRight, CheckCircle } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { CountrySelector } from '@/components/ui/country-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserInternationalContext } from '@/hooks/useUserInternationalContext';
import { getSupportedCurrencies } from '@/lib/currencyUtils';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface InternationalSetupProps {
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

const InternationalSetup: React.FC<InternationalSetupProps> = ({
  onComplete,
  onSkip,
  className = ''
}) => {
  const { internationalContext, updatePreferences, isUpdating } = useUserInternationalContext();
  const [selectedCountry, setSelectedCountry] = React.useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = React.useState<SupportedCurrency>('USD');
  const [step, setStep] = React.useState<'welcome' | 'country' | 'currency' | 'complete'>('welcome');

  const supportedCurrencies = getSupportedCurrencies();

  // Auto-detect initial values from context
  React.useEffect(() => {
    if (internationalContext) {
      setSelectedCountry(internationalContext.countryCode);
      setSelectedCurrency(internationalContext.currency);
    }
  }, [internationalContext]);

  const handleNext = () => {
    switch (step) {
      case 'welcome':
        setStep('country');
        break;
      case 'country':
        setStep('currency');
        break;
      case 'currency':
        handleSave();
        break;
    }
  };

  const handleSave = () => {
    updatePreferences({
      preferred_country: selectedCountry,
      preferred_currency_code: selectedCurrency,
    });
    setStep('complete');
    setTimeout(onComplete, 2000);
  };

  const canProceed = () => {
    switch (step) {
      case 'welcome':
        return true;
      case 'country':
        return !!selectedCountry;
      case 'currency':
        return !!selectedCurrency;
      default:
        return false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`max-w-md mx-auto ${className}`}
    >
      <CardEnhanced variant="elevated">
        <CardEnhancedHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-openkey-blue/10">
              <Globe className="w-6 h-6 text-openkey-blue" />
            </div>
            <CardEnhancedTitle>International Setup</CardEnhancedTitle>
          </div>
        </CardEnhancedHeader>

        <CardEnhancedContent className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex justify-center space-x-2">
            {['welcome', 'country', 'currency', 'complete'].map((s, index) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step === s ? 'bg-openkey-blue' : 
                  ['welcome', 'country', 'currency', 'complete'].indexOf(step) > index ? 'bg-openkey-blue/50' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Welcome Step */}
          {step === 'welcome' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center space-y-4"
            >
              <Globe className="w-16 h-16 text-openkey-blue mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Welcome to OpenKey Global</h3>
                <p className="text-muted-foreground">
                  Let's set up your international preferences to provide you with the best localized experience.
                </p>
              </div>
              {internationalContext && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    We detected you might be from <strong>{internationalContext.countryCode}</strong> 
                    and prefer <strong>{internationalContext.currency}</strong>. 
                    Let's confirm this in the next steps.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Country Selection */}
          {step === 'country' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <MapPin className="w-12 h-12 text-openkey-blue mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Select Your Country</h3>
                <p className="text-muted-foreground">
                  This helps us format addresses and provide region-specific features.
                </p>
              </div>
              <CountrySelector
                value={selectedCountry}
                onValueChange={setSelectedCountry}
                placeholder="Select your country..."
              />
            </motion.div>
          )}

          {/* Currency Selection */}
          {step === 'currency' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <CreditCard className="w-12 h-12 text-openkey-blue mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Choose Your Currency</h3>
                <p className="text-muted-foreground">
                  All prices and financial data will be displayed in this currency.
                </p>
              </div>
              <Select value={selectedCurrency} onValueChange={(value: SupportedCurrency) => setSelectedCurrency(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency..." />
                </SelectTrigger>
                <SelectContent>
                  {supportedCurrencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1 rounded">
                          {currency.code}
                        </span>
                        <span>{currency.name}</span>
                        <span className="text-muted-foreground">({currency.symbol})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">All Set!</h3>
                <p className="text-muted-foreground">
                  Your international preferences have been saved. You can change these anytime in settings.
                </p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <p className="text-green-800">
                  Country: <strong>{selectedCountry}</strong><br />
                  Currency: <strong>{selectedCurrency}</strong>
                </p>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          {step !== 'complete' && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip for now
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!canProceed() || isUpdating}
                className="flex-1"
              >
                {step === 'currency' ? (
                  isUpdating ? 'Saving...' : 'Complete Setup'
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardEnhancedContent>
      </CardEnhanced>
    </motion.div>
  );
};

export default InternationalSetup;
