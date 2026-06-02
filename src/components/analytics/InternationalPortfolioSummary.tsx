
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Home, DollarSign, Globe, ArrowUpDown } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Badge } from '@/components/ui/badge';
import { useUserInternationalContext } from '@/hooks/useUserInternationalContext';
import { convertBetweenContexts } from '@/lib/internationalUtils';
import ModernMetricCard from './ModernMetricCard';

interface InternationalPortfolioSummaryProps {
  portfolioData: {
    totalValue: number;
    monthlyIncome: number;
    propertyCount: number;
    averageValue: number;
    currency?: string;
    countryCode?: string;
  };
  className?: string;
}

const InternationalPortfolioSummary: React.FC<InternationalPortfolioSummaryProps> = ({
  portfolioData,
  className = ''
}) => {
  const { internationalContext, isLoading } = useUserInternationalContext();
  const [convertedData, setConvertedData] = React.useState<any>(null);
  const [isConverting, setIsConverting] = React.useState(false);

  // Convert portfolio data to user's preferred currency
  React.useEffect(() => {
    const convertData = async () => {
      if (!internationalContext || isLoading) return;

      const portfolioCurrency = portfolioData.currency || 'USD';
      const portfolioCountry = portfolioData.countryCode || 'US';

      // If already in user's preferred currency, no conversion needed
      if (portfolioCurrency === internationalContext.currency) {
        setConvertedData({
          ...portfolioData,
          conversionRate: 1,
          originalCurrency: portfolioCurrency,
        });
        return;
      }

      setIsConverting(true);

      try {
        // Convert total value
        const totalValueConversion = await convertBetweenContexts(
          portfolioData.totalValue,
          {
            countryCode: portfolioCountry,
            currency: portfolioCurrency as any,
            locale: `en-${portfolioCountry}`,
            addressFormat: { format: [], required: [] }
          },
          internationalContext
        );

        // Convert monthly income
        const monthlyIncomeConversion = await convertBetweenContexts(
          portfolioData.monthlyIncome,
          {
            countryCode: portfolioCountry,
            currency: portfolioCurrency as any,
            locale: `en-${portfolioCountry}`,
            addressFormat: { format: [], required: [] }
          },
          internationalContext
        );

        if (totalValueConversion && monthlyIncomeConversion) {
          setConvertedData({
            totalValue: totalValueConversion.convertedAmount,
            monthlyIncome: monthlyIncomeConversion.convertedAmount,
            propertyCount: portfolioData.propertyCount,
            averageValue: totalValueConversion.convertedAmount / Math.max(portfolioData.propertyCount, 1),
            conversionRate: totalValueConversion.exchangeRate,
            originalCurrency: portfolioCurrency,
            convertedCurrency: internationalContext.currency,
          });
        }
      } catch (error) {
        console.warn('Error converting portfolio data:', error);
        // Fallback to original data
        setConvertedData({
          ...portfolioData,
          conversionRate: 1,
          originalCurrency: portfolioCurrency,
        });
      } finally {
        setIsConverting(false);
      }
    };

    convertData();
  }, [portfolioData, internationalContext, isLoading]);

  if (isLoading || !convertedData) {
    return (
      <CardEnhanced className={className}>
        <CardEnhancedContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const displayData = convertedData;
  const showConversion = displayData.conversionRate !== 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <CardEnhanced>
        <CardEnhancedHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-openkey-blue/10">
                <Globe className="w-5 h-5 text-openkey-blue" />
              </div>
              <CardEnhancedTitle>International Portfolio Summary</CardEnhancedTitle>
            </div>
            
            {showConversion && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  {displayData.originalCurrency} → {internationalContext?.currency}
                </Badge>
                {isConverting && (
                  <div className="w-4 h-4 border-2 border-openkey-blue border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}
          </div>
        </CardEnhancedHeader>

        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Portfolio Value */}
            <ModernMetricCard
              title="Total Portfolio Value"
              value={displayData.totalValue}
              icon={DollarSign}
              formatValue="currency"
              currency={internationalContext?.currency}
              countryCode={internationalContext?.countryCode}
              subtitle={showConversion ? `Rate: ${displayData.conversionRate.toFixed(4)}` : undefined}
              variant="gradient"
            />

            {/* Monthly Income */}
            <ModernMetricCard
              title="Monthly Income"
              value={displayData.monthlyIncome}
              icon={TrendingUp}
              formatValue="currency"
              currency={internationalContext?.currency}
              countryCode={internationalContext?.countryCode}
              iconColor="text-green-600"
            />

            {/* Property Count */}
            <ModernMetricCard
              title="Properties"
              value={displayData.propertyCount}
              icon={Home}
              formatValue="number"
              iconColor="text-openkey-blue"
            />

            {/* Average Property Value */}
            <ModernMetricCard
              title="Average Property Value"
              value={displayData.averageValue}
              icon={DollarSign}
              formatValue="currency"
              currency={internationalContext?.currency}
              countryCode={internationalContext?.countryCode}
              iconColor="text-openkey-gold"
            />
          </div>

          {/* Conversion Note */}
          {showConversion && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Globe className="w-4 h-4 inline mr-1" />
                Values converted from {displayData.originalCurrency} to {internationalContext?.currency} 
                at rate {displayData.conversionRate.toFixed(4)}. Exchange rates are updated regularly.
              </p>
            </div>
          )}
        </CardEnhancedContent>
      </CardEnhanced>
    </motion.div>
  );
};

export default InternationalPortfolioSummary;
