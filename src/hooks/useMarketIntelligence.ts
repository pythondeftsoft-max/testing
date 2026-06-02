import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketData {
  id: string;
  property_id: string;
  market_region: string;
  median_rent: number;
  rent_growth_rate: number;
  vacancy_rate: number;
  cap_rate: number;
  price_per_sqft: number;
  market_score: number;
  last_updated: string;
  data_source: string;
}

export interface PropertyValuation {
  id: string;
  property_id: string;
  estimated_value: number;
  confidence_level: number;
  valuation_method: string;
  comparable_properties: any[];
  market_adjustments: any[];
  valuation_date: string;
  next_valuation_date: string;
}

export interface RentOptimization {
  id: string;
  property_id: string;
  current_rent: number;
  suggested_rent: number;
  market_rent: number;
  optimization_factor: number;
  reasoning: string[];
  implementation_date: string;
  created_at: string;
}

export interface InvestmentAnalysis {
  id: string;
  property_id: string;
  current_cap_rate: number;
  market_cap_rate: number;
  roi_projection: number;
  cash_on_cash_return: number;
  payback_period: number;
  investment_grade: 'A' | 'B' | 'C' | 'D';
  risk_factors: string[];
  opportunities: string[];
  created_at: string;
}

export const useMarketIntelligence = (portfolioId?: string) => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [valuations, setValuations] = useState<PropertyValuation[]>([]);
  const [rentOptimizations, setRentOptimizations] = useState<RentOptimization[]>([]);
  const [investmentAnalyses, setInvestmentAnalyses] = useState<InvestmentAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchMarketData = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for market intelligence
      const mockMarketData: MarketData[] = [
        {
          id: '1',
          property_id: 'prop-1',
          market_region: 'Downtown Area',
          median_rent: 2300,
          rent_growth_rate: 4.2,
          vacancy_rate: 3.5,
          cap_rate: 6.8,
          price_per_sqft: 195,
          market_score: 82,
          last_updated: new Date().toISOString(),
          data_source: 'Market Intelligence API'
        }
      ];
      
      setMarketData(mockMarketData);
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch market data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchValuations = async () => {
    try {
      // Mock data for property valuations
      const mockValuations: PropertyValuation[] = [
        {
          id: '1',
          property_id: 'prop-1',
          estimated_value: 425000,
          confidence_level: 0.87,
          valuation_method: 'Automated Valuation Model (AVM)',
          comparable_properties: [
            { address: '123 Similar St', sale_price: 410000, sale_date: '2024-01-15' }
          ],
          market_adjustments: [
            { factor: 'Location Premium', adjustment: 15000 }
          ],
          valuation_date: new Date().toISOString(),
          next_valuation_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setValuations(mockValuations);
    } catch (error) {
      console.error('Error fetching valuations:', error);
    }
  };

  const fetchRentOptimizations = async () => {
    try {
      // Mock data for rent optimizations
      const mockRentOptimizations: RentOptimization[] = [
        {
          id: '1',
          property_id: 'prop-1',
          current_rent: 2200,
          suggested_rent: 2350,
          market_rent: 2300,
          optimization_factor: 0.068,
          reasoning: [
            'Market rates support higher rent',
            'Low vacancy rate indicates strong demand'
          ],
          implementation_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      ];
      
      setRentOptimizations(mockRentOptimizations);
    } catch (error) {
      console.error('Error fetching rent optimizations:', error);
    }
  };

  const fetchInvestmentAnalyses = async () => {
    try {
      // Mock data for investment analyses
      const mockInvestmentAnalyses: InvestmentAnalysis[] = [
        {
          id: '1',
          property_id: 'prop-1',
          current_cap_rate: 7.2,
          market_cap_rate: 6.5,
          roi_projection: 8.5,
          cash_on_cash_return: 9.2,
          payback_period: 12.5,
          investment_grade: 'A',
          risk_factors: [
            'Market appreciation potential'
          ],
          opportunities: [
            'Rent increase potential',
            'Value-add improvements'
          ],
          created_at: new Date().toISOString()
        }
      ];
      
      setInvestmentAnalyses(mockInvestmentAnalyses);
    } catch (error) {
      console.error('Error fetching investment analyses:', error);
    }
  };

  const updateMarketData = async (propertyId: string) => {
    try {
      // This would typically call external APIs like Zillow, RentSpree, etc.
      // For now, we'll simulate market data updates
      
      const mockMarketData = {
        property_id: propertyId,
        market_region: 'Downtown Area',
        median_rent: 2100 + Math.random() * 400,
        rent_growth_rate: 2.5 + Math.random() * 5,
        vacancy_rate: 3.2 + Math.random() * 4,
        cap_rate: 5.8 + Math.random() * 2,
        price_per_sqft: 180 + Math.random() * 50,
        market_score: 75 + Math.random() * 20,
        data_source: 'Market Intelligence API',
        portfolio_id: portfolioId
      };

      // Mock implementation - just add to local state instead of using Supabase
      const newMarketData: MarketData = {
        id: Date.now().toString(),
        property_id: propertyId,
        market_region: 'Downtown Area',
        median_rent: 2100 + Math.random() * 400,
        rent_growth_rate: 2.5 + Math.random() * 5,
        vacancy_rate: 3.2 + Math.random() * 4,
        cap_rate: 5.8 + Math.random() * 2,
        price_per_sqft: 180 + Math.random() * 50,
        market_score: 75 + Math.random() * 20,
        data_source: 'Market Intelligence API',
        last_updated: new Date().toISOString()
      };
      
      setMarketData(prev => [newMarketData, ...prev]);

      toast({
        title: "Success",
        description: "Market data updated successfully.",
      });

      return newMarketData;
    } catch (error) {
      console.error('Error updating market data:', error);
      toast({
        title: "Error",
        description: "Failed to update market data.",
        variant: "destructive",
      });
    }
  };

  const generatePropertyValuation = async (propertyId: string) => {
    try {
      // This would typically use sophisticated valuation models
      // For now, we'll simulate a valuation
      
      const nextValuationDate = new Date();
      nextValuationDate.setMonth(nextValuationDate.getMonth() + 6);
      
      const mockValuation: PropertyValuation = {
        id: Date.now().toString(),
        property_id: propertyId,
        estimated_value: 350000 + Math.random() * 150000,
        confidence_level: 0.8 + Math.random() * 0.15,
        valuation_method: 'Automated Valuation Model (AVM)',
        comparable_properties: [
          { address: '123 Similar St', sale_price: 340000, sale_date: '2024-01-15' },
          { address: '456 Comp Ave', sale_price: 365000, sale_date: '2024-02-20' }
        ],
        market_adjustments: [
          { factor: 'Location Premium', adjustment: 5000 },
          { factor: 'Recent Renovations', adjustment: 15000 }
        ],
        valuation_date: new Date().toISOString(),
        next_valuation_date: nextValuationDate.toISOString()
      };

      setValuations(prev => [mockValuation, ...prev]);
      
      toast({
        title: "Success",
        description: "Property valuation generated successfully.",
      });

      return mockValuation;
    } catch (error) {
      console.error('Error generating valuation:', error);
      toast({
        title: "Error",
        description: "Failed to generate property valuation.",
        variant: "destructive",
      });
    }
  };

  const optimizeRent = async (propertyId: string) => {
    try {
      // Mock implementation - generate rent optimization
      const currentRent = 2200; // Mock current rent
      const marketRent = 2300; // Mock market rent
      const suggestedRent = Math.max(currentRent, marketRent * 0.95);
      
      const optimization: RentOptimization = {
        id: Date.now().toString(),
        property_id: propertyId,
        current_rent: currentRent,
        market_rent: marketRent,
        suggested_rent: suggestedRent,
        optimization_factor: (suggestedRent - currentRent) / currentRent,
        reasoning: [
          'Market rates support higher rent',
          'Low vacancy rate indicates strong demand'
        ],
        implementation_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };

      setRentOptimizations(prev => [optimization, ...prev]);
      
      toast({
        title: "Success",
        description: "Rent optimization analysis completed.",
      });

      return optimization;
    } catch (error) {
      console.error('Error optimizing rent:', error);
      toast({
        title: "Error",
        description: "Failed to optimize rent.",
        variant: "destructive",
      });
    }
  };

  const generateInvestmentAnalysis = async (propertyId: string) => {
    try {
      // Mock implementation - generate investment analysis
      const monthlyRent = 2200; // Mock monthly rent
      const purchasePrice = 350000; // Mock purchase price
      const annualRent = monthlyRent * 12;
      const currentCapRate = (annualRent / purchasePrice) * 100;
      
      const analysis: InvestmentAnalysis = {
        id: Date.now().toString(),
        property_id: propertyId,
        current_cap_rate: currentCapRate,
        market_cap_rate: 6.5,
        roi_projection: currentCapRate + Math.random() * 2,
        cash_on_cash_return: 8.5 + Math.random() * 4,
        payback_period: purchasePrice / annualRent,
        investment_grade: currentCapRate > 7 ? 'A' : currentCapRate > 5.5 ? 'B' : currentCapRate > 4 ? 'C' : 'D',
        risk_factors: [
          'Market appreciation potential'
        ],
        opportunities: [
          'Rent increase potential',
          'Value-add improvements'
        ],
        created_at: new Date().toISOString()
      };

      setInvestmentAnalyses(prev => [analysis, ...prev]);
      
      toast({
        title: "Success",
        description: "Investment analysis completed.",
      });

      return analysis;
    } catch (error) {
      console.error('Error generating investment analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate investment analysis.",
        variant: "destructive",
      });
    }
  };

  const fetchMarketDataForProperty = async (propertyId: string) => {
    const data = marketData.find(md => md.property_id === propertyId);
    return data || null;
  };

  useEffect(() => {
    fetchMarketData();
    fetchValuations();
    fetchRentOptimizations();
    fetchInvestmentAnalyses();
  }, [portfolioId]);

  return {
    marketData,
    valuations,
    rentOptimizations,
    investmentAnalyses,
    isLoading,
    updateMarketData,
    generatePropertyValuation,
    optimizeRent,
    generateInvestmentAnalysis,
    refetch: () => {
      fetchMarketData();
      fetchValuations();
      fetchRentOptimizations();
      fetchInvestmentAnalyses();
    }
  };
};