
import React from 'react';
import { motion } from 'framer-motion';
import { Globe, CreditCard, MapPin, Save, Languages } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { CountrySelector } from '@/components/ui/country-selector';
import { LanguageSelector } from '@/components/ui/language-selector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserInternationalContext } from '@/hooks/useUserInternationalContext';
import { useAuth } from '@/hooks/useAuth';
import { getSupportedCurrencies } from '@/lib/currencyUtils';
import type { SupportedCurrency } from '@/lib/currencyUtils';

const InternationalPreferences: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    internationalContext, 
    userPreferences, 
    isLoading, 
    updatePreferences, 
    isUpdating 
  } = useUserInternationalContext();

  const [selectedCountry, setSelectedCountry] = React.useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = React.useState<SupportedCurrency>('USD');

  const supportedCurrencies = getSupportedCurrencies();

  // Initialize form values
  React.useEffect(() => {
    if (userPreferences) {
      setSelectedCountry(userPreferences.preferred_country || '');
      setSelectedCurrency(userPreferences.preferred_currency_code || 'USD');
    } else if (internationalContext) {
      setSelectedCountry(internationalContext.countryCode);
      setSelectedCurrency(internationalContext.currency);
    }
  }, [userPreferences, internationalContext]);

  const handleSave = () => {
    updatePreferences({
      preferred_country: selectedCountry,
      preferred_currency_code: selectedCurrency,
    });

    toast({
      title: 'Preferences Updated',
      description: 'Your international preferences have been saved successfully.',
    });
  };

  const hasChanges = 
    selectedCountry !== (userPreferences?.preferred_country || '') ||
    selectedCurrency !== (userPreferences?.preferred_currency_code || 'USD');

  if (isLoading) {
    return (
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CardEnhanced>
        <CardEnhancedHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-openkey-blue/10">
              <Globe className="w-5 h-5 text-openkey-blue" />
            </div>
            <CardEnhancedTitle>International Preferences</CardEnhancedTitle>
          </div>
        </CardEnhancedHeader>

        <CardEnhancedContent className="space-y-6">
          {/* Country Preference */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Preferred Country/Region
            </Label>
            <CountrySelector
              value={selectedCountry}
              onValueChange={setSelectedCountry}
              placeholder="Select your country..."
            />
            <p className="text-sm text-muted-foreground">
              This affects address formatting and regional defaults
            </p>
          </div>

          {/* Currency Preference */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Preferred Currency
            </Label>
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
            <p className="text-sm text-muted-foreground">
              Properties and analytics will display values in this currency
            </p>
          </div>

          {/* Language Preference */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Interface Language
            </Label>
            <LanguageSelector 
              className="w-full justify-start"
            />
            <p className="text-sm text-muted-foreground">
              The language used throughout the application interface
            </p>
          </div>

          {/* Current Context Display */}
          {internationalContext && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Current Context</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Country:</span>
                  <div className="font-medium">{internationalContext.countryCode}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Currency:</span>
                  <div className="font-medium">{internationalContext.currency}</div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardEnhancedContent>
      </CardEnhanced>
    </motion.div>
  );
};

export default InternationalPreferences;
