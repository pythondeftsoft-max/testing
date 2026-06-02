import { PortfolioHealthInsight } from '@/hooks/useRealTimeInsightGenerator';
import { supabase } from '@/integrations/supabase/client';
import { 
  analyzeMarketGrowthOpportunities,
  analyzeRentOptimizationOpportunities,
  analyzePropertyValueEnhancement,
  analyzeNeighborhoodAppreciation,
  analyzeOperationalEfficiencies,
  analyzePositiveGrowthInsights,
  analyzeIncomeOptimizationInsights,
  analyzeMarketTimingInsights
} from './EnhancedInsightMethods';

interface AnalysisData {
  properties: any[];
  assets: any[];
  rentPayments: any[];
  portfolioId?: string;
}

export class PortfolioHealthInsightEngine {
  async generateInsights(data: AnalysisData): Promise<PortfolioHealthInsight[]> {
    const allInsights: PortfolioHealthInsight[] = [];
    
    // Generate enhanced property-specific insights with external data
    allInsights.push(...this.generatePropertyOpportunities(data));
    allInsights.push(...this.generatePropertyRisks(data));
    allInsights.push(...await this.generateEnhancedPropertyIntelligence(data));
    
    // Generate enhanced asset-specific insights with market intelligence
    allInsights.push(...this.generateAssetOpportunities(data));
    allInsights.push(...this.generateAssetRisks(data));
    allInsights.push(...await this.generateEnhancedAssetIntelligence(data));
    
    // Generate comprehensive portfolio insights
    allInsights.push(...this.generateDiversificationInsights(data));
    allInsights.push(...this.generateTaxOptimizationInsights(data));
    allInsights.push(...this.generatePositiveGrowthInsights(data));
    allInsights.push(...this.generateIncomeOptimizationInsights(data));
    allInsights.push(...this.generateMarketTimingInsights(data));
    
    // Separate opportunities and risks
    const opportunities = allInsights.filter(insight => insight.category === 'opportunity');
    const risks = allInsights.filter(insight => insight.category === 'risk');
    
    // Sort by financial impact and priority within each category
    opportunities.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityWeight[b.priority] - priorityWeight[a.priority]) * 10000;
      return priorityDiff + (Math.abs(b.impact) - Math.abs(a.impact));
    });
    
    risks.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      // First sort by priority
      const priorityDiff = (priorityWeight[b.priority] - priorityWeight[a.priority]) * 100;
      // Then by health score impact (more negative = more important)
      const healthDiff = (a.healthScoreImpact - b.healthScoreImpact) * 10;
      // Then by confidence (higher confidence = more important)
      const confidenceDiff = (b.confidence - a.confidence);
      
      return priorityDiff + healthDiff + confidenceDiff;
    });
    
    // Return balanced mix with focus on opportunities
    const finalInsights = [
      ...opportunities.slice(0, 12), // More opportunities
      ...risks.slice(0, 8)           // Fewer risks, focus on actionable ones
    ];
    
    return finalInsights;
  }

  // Enhanced property analysis methods using imported functions
  private analyzeMarketGrowthOpportunities = analyzeMarketGrowthOpportunities;
  private analyzeRentOptimizationOpportunities = analyzeRentOptimizationOpportunities;
  private analyzePropertyValueEnhancement = analyzePropertyValueEnhancement;
  private analyzeNeighborhoodAppreciation = analyzeNeighborhoodAppreciation;
  private analyzeOperationalEfficiencies = analyzeOperationalEfficiencies;

  // Enhanced portfolio analysis methods
  private analyzePositiveGrowthInsights = analyzePositiveGrowthInsights;
  private analyzeIncomeOptimizationInsights = analyzeIncomeOptimizationInsights;
  private analyzeMarketTimingInsights = analyzeMarketTimingInsights;

  // External data integration methods
  private async generateEnhancedPropertyIntelligence(data: AnalysisData): Promise<PortfolioHealthInsight[]> {
    try {
      const response = await supabase.functions.invoke('fetch-property-intelligence', {
        body: { 
          properties: data.properties,
          portfolioId: data.portfolioId 
        }
      });

      if (response.data?.success && response.data?.insights) {
        return response.data.insights;
      }
    } catch (error) {
      console.error('Error fetching property intelligence:', error);
    }
    return [];
  }

  private async generateEnhancedAssetIntelligence(data: AnalysisData): Promise<PortfolioHealthInsight[]> {
    try {
      const response = await supabase.functions.invoke('fetch-financial-intelligence', {
        body: { 
          assets: data.assets,
          portfolioId: data.portfolioId 
        }
      });

      if (response.data?.success && response.data?.insights) {
        return response.data.insights;
      }
    } catch (error) {
      console.error('Error fetching financial intelligence:', error);
    }
    return [];
  }

  private generatePropertyOpportunities(data: AnalysisData): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    
    // Focus on positive, growth-oriented opportunities
    opportunities.push(...this.analyzeMarketGrowthOpportunities(data.properties));
    opportunities.push(...this.analyzeRentOptimizationOpportunities(data.properties));
    opportunities.push(...this.analyzePropertyValueEnhancement(data.properties));
    opportunities.push(...this.analyzeNeighborhoodAppreciation(data.properties));
    opportunities.push(...this.analyzeOperationalEfficiencies(data.properties));
    
    return opportunities;
  }

  // Enhanced portfolio analysis methods
  private generatePositiveGrowthInsights(data: AnalysisData): PortfolioHealthInsight[] {
    return this.analyzePositiveGrowthInsights(data.assets);
  }

  private generateIncomeOptimizationInsights(data: AnalysisData): PortfolioHealthInsight[] {
    return this.analyzeIncomeOptimizationInsights(data.assets);
  }

  private generateMarketTimingInsights(data: AnalysisData): PortfolioHealthInsight[] {
    return this.analyzeMarketTimingInsights(data.assets);
  }

  private generatePropertyRisks(data: AnalysisData): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Add REAL operational risks first (highest priority)
    risks.push(...this.analyzeLeaseExpirationRisks(data.properties));
    risks.push(...this.analyzeVacancyDurationRisks(data.properties));
    risks.push(...this.analyzeMaintenanceOverdueRisks(data.properties));
    risks.push(...this.analyzeLatePaymentRisks(data));
    
    // Then add strategic market risks (lower priority)
    risks.push(...this.analyzeMarketTimingRisks(data.properties));
    risks.push(...this.analyzeNeighborhoodTrendRisks(data.properties));
    risks.push(...this.analyzeGeographicConcentrationRisks(data.properties));
    
    return risks;
  }

  private generateAssetOpportunities(data: AnalysisData): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    
    opportunities.push(...this.analyzeAssetRebalancingOpportunities(data.assets));
    opportunities.push(...this.analyzeMarketTimingOpportunities(data.assets));
    opportunities.push(...this.analyzeIncomeOptimizationOpportunities(data.assets));
    opportunities.push(...this.analyzeProfitTakingOpportunities(data.assets));
    
    return opportunities;
  }

  private generateAssetRisks(data: AnalysisData): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    risks.push(...this.analyzeConcentrationRisks(data.assets));
    risks.push(...this.analyzeVolatilityRisks(data.assets));
    risks.push(...this.analyzeLiquidityRisks(data.assets));
    risks.push(...this.analyzeMarketExposureRisks(data.assets));
    
    return risks;
  }

  private generateDiversificationInsights(data: AnalysisData): PortfolioHealthInsight[] {
    const insights: PortfolioHealthInsight[] = [];
    
    // Analyze asset allocation across categories
    const assetsByCategory = this.groupAssetsByCategory(data.assets);
    const totalValue = data.assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
    
    Object.entries(assetsByCategory).forEach(([category, categoryAssets]) => {
      const categoryValue = categoryAssets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
      const allocation = (categoryValue / totalValue) * 100;
      
      // Alert on over-concentration (>40% in single category except real estate)
      if (allocation > 40 && category !== 'real_estate') {
        insights.push({
          id: `concentration-risk-${category}`,
          title: `Over-concentration in ${category.replace('_', ' ')}`,
          description: `${allocation.toFixed(1)}% of portfolio in ${category.replace('_', ' ')} assets. Consider diversifying to reduce risk.`,
          impact: -Math.round(categoryValue * 0.1), // Potential 10% loss estimate
          healthScoreImpact: -3,
          confidence: 75,
          category: 'risk',
          priority: 'medium',
          timeframe: 'Next 3-6 months',
          healthCategory: 'diversification',
          dataSource: 'Portfolio allocation analysis',
          actionable: true,
          assetType: 'mixed'
        });
      }
      
      // Suggest diversification opportunities
      if (allocation < 5 && totalValue > 50000) {
        insights.push({
          id: `diversification-opportunity-${category}`,
          title: `Diversification opportunity in ${category.replace('_', ' ')}`,
          description: `Only ${allocation.toFixed(1)}% allocated to ${category.replace('_', ' ')}. Consider 10-15% allocation for better diversification.`,
          impact: Math.round(totalValue * 0.05), // 5% growth potential
          healthScoreImpact: 2,
          confidence: 70,
          category: 'opportunity',
          priority: 'low',
          timeframe: 'Next 6-12 months',
          healthCategory: 'diversification',
          dataSource: 'Diversification analysis',
          actionable: true,
          assetType: 'mixed'
        });
      }
    });
    
    return insights;
  }

  private generateTaxOptimizationInsights(data: AnalysisData): PortfolioHealthInsight[] {
    const insights: PortfolioHealthInsight[] = [];
    
    // Analyze assets for tax-loss harvesting opportunities
    const decliningAssets = data.assets.filter(asset => {
      const marketData = asset.asset_market_data?.[0];
      return marketData?.price_change_percentage_24h && marketData.price_change_percentage_24h < -10;
    });
    
    if (decliningAssets.length > 0) {
      const totalLossValue = decliningAssets.reduce((sum, asset) => {
        const currentValue = asset.current_value || 0;
        const costBasis = asset.acquisition_cost || currentValue;
        return sum + Math.max(0, costBasis - currentValue);
      }, 0);
      
      if (totalLossValue > 1000) {
        insights.push({
          id: 'tax-loss-harvesting',
          title: `Tax-loss harvesting opportunity`,
          description: `${decliningAssets.length} underperforming assets with $${totalLossValue.toLocaleString()} potential losses. Harvest losses for tax benefits.`,
          impact: Math.round(totalLossValue * 0.25), // ~25% tax savings
          healthScoreImpact: 2,
          confidence: 80,
          category: 'opportunity',
          priority: 'medium',
          timeframe: 'Before year-end',
          healthCategory: 'tax_optimization',
          dataSource: 'Tax optimization analysis',
          actionable: true,
          assetType: 'mixed'
        });
      }
    }
    
    return insights;
  }

  // Property-specific analysis methods (inherited from original engine)
  private analyzeVacantPropertyOpportunities(properties: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    const vacantProperties = properties.filter(prop => 
      prop.status === 'available' || prop.status === 'vacant'
    );

    vacantProperties.slice(0, 5).forEach((property, index) => {
      const address = property.address || 'Property Address';
      const zipCode = property.zip_code || '00000';
      const monthlyRent = property.monthly_rent || 1800;
      
      opportunities.push({
        id: `vacant-property-${property.id}`,
        title: `Fill vacancy at ${address}`,
        description: `Property at ${address}, ${zipCode} vacant - $${monthlyRent.toLocaleString()}/month potential revenue.`,
        impact: monthlyRent * 12,
        healthScoreImpact: 5,
        confidence: 95,
        category: 'opportunity',
        priority: 'high',
        timeframe: 'Next 30-60 days',
        healthCategory: 'occupancy',
        dataSource: `Property vacancy analysis`,
        actionable: true,
        assetType: 'property',
        geographicArea: zipCode
      });
    });

    return opportunities;
  }

  private analyzeBelowMarketRentProperties(properties: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    const occupiedProperties = properties.filter(prop => prop.status === 'occupied');
    
    occupiedProperties.slice(0, 5).forEach((property) => {
      const address = property.address || 'Property Address';
      const zipCode = property.zip_code || '00000';
      const currentRent = property.monthly_rent || 1800;
      const estimatedMarketRent = this.estimateMarketRent(property);
      const rentGap = estimatedMarketRent - currentRent;
      
      if (rentGap > 100) {
        opportunities.push({
          id: `rent-increase-${property.id}`,
          title: `Market rent adjustment at ${address}`,
          description: `Property at ${address}, ${zipCode} - $${rentGap}/month below market rate.`,
          impact: rentGap * 12,
          healthScoreImpact: 3,
          confidence: 80,
          category: 'opportunity',
          priority: 'medium',
          timeframe: 'At lease renewal',
          healthCategory: 'financial',
          dataSource: `Market analysis for ${zipCode}`,
          actionable: true,
          assetType: 'property',
          geographicArea: zipCode
        });
      }
    });

    return opportunities;
  }

  // Asset-specific analysis methods (new functionality)
  private analyzeAssetRebalancingOpportunities(assets: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    
    // Find assets that have grown significantly above target allocation
    const stockAssets = assets.filter(asset => 
      asset.metadata?.asset_type === 'stock' || asset.asset_category?.name === 'stocks'
    );
    
    stockAssets.slice(0, 3).forEach(asset => {
      const marketData = asset.asset_market_data?.[0];
      if (marketData?.price_change_percentage_24h && marketData.price_change_percentage_24h > 20) {
        const symbol = asset.metadata?.symbol || asset.asset_name;
        const currentValue = asset.current_value || 0;
        const profitAmount = currentValue * 0.15; // Estimate 15% profit taking
        
        opportunities.push({
          id: `rebalance-${asset.id}`,
          title: `Rebalance ${symbol} position`,
          description: `${symbol} up ${marketData.price_change_percentage_24h.toFixed(1)}% - consider taking profits and rebalancing portfolio.`,
          impact: profitAmount,
          healthScoreImpact: 2,
          confidence: 75,
          category: 'opportunity',
          priority: 'medium',
          timeframe: 'Next 1-4 weeks',
          healthCategory: 'market_timing',
          dataSource: 'Market performance analysis',
          actionable: true,
          assetType: 'stock'
        });
      }
    });
    
    return opportunities;
  }

  private analyzeMarketTimingOpportunities(assets: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    
    // Look for assets in strong uptrends that might benefit from DCA or profit-taking
    const cryptoAssets = assets.filter(asset => 
      asset.metadata?.asset_type === 'crypto' || asset.asset_category?.name === 'cryptocurrency'
    );
    
    cryptoAssets.slice(0, 2).forEach(asset => {
      const marketData = asset.asset_market_data?.[0];
      const symbol = asset.metadata?.symbol || asset.asset_name;
      
      if (marketData?.price_change_percentage_24h && marketData.price_change_percentage_24h > 15) {
        opportunities.push({
          id: `profit-taking-${asset.id}`,
          title: `Profit-taking opportunity on ${symbol}`,
          description: `${symbol} gained ${marketData.price_change_percentage_24h.toFixed(1)}% - consider securing partial profits at current levels.`,
          impact: (asset.current_value || 0) * 0.1, // 10% profit estimate
          healthScoreImpact: 1,
          confidence: 65,
          category: 'opportunity',
          priority: 'low',
          timeframe: 'Next 1-2 weeks',
          healthCategory: 'market_timing',
          dataSource: 'Crypto market analysis',
          actionable: true,
          assetType: 'crypto'
        });
      }
    });
    
    return opportunities;
  }

  private analyzeIncomeOptimizationOpportunities(assets: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    
    // Find dividend-paying stocks or income-generating assets
    const incomeAssets = assets.filter(asset => asset.annual_income && asset.annual_income > 0);
    
    if (incomeAssets.length > 0) {
      const totalIncome = incomeAssets.reduce((sum, asset) => sum + (asset.annual_income || 0), 0);
      const totalValue = incomeAssets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
      const currentYield = (totalIncome / totalValue) * 100;
      
      if (currentYield < 4) { // If portfolio yield is below 4%
        opportunities.push({
          id: 'income-optimization',
          title: 'Optimize portfolio income generation',
          description: `Current portfolio yield is ${currentYield.toFixed(1)}%. Consider higher-yield dividend stocks or REITs to reach 5-6% target.`,
          impact: totalValue * 0.02, // 2% additional yield potential
          healthScoreImpact: 3,
          confidence: 75,
          category: 'opportunity',
          priority: 'medium',
          timeframe: 'Next 3-6 months',
          healthCategory: 'financial',
          dataSource: 'Income yield analysis',
          actionable: true,
          assetType: 'mixed'
        });
      }
    }
    
    return opportunities;
  }

  private analyzeProfitTakingOpportunities(assets: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];
    
    // Find assets with significant unrealized gains
    assets.forEach(asset => {
      const currentValue = asset.current_value || 0;
      const costBasis = asset.acquisition_cost || currentValue;
      const unrealizedGain = currentValue - costBasis;
      const gainPercentage = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;
      
      if (gainPercentage > 50 && unrealizedGain > 5000) {
        const symbol = asset.metadata?.symbol || asset.asset_name;
        
        opportunities.push({
          id: `take-profits-${asset.id}`,
          title: `Consider profit-taking on ${symbol}`,
          description: `${symbol} showing ${gainPercentage.toFixed(1)}% unrealized gains ($${unrealizedGain.toLocaleString()}). Consider securing partial profits.`,
          impact: unrealizedGain * 0.3, // 30% profit taking
          healthScoreImpact: 2,
          confidence: 70,
          category: 'opportunity',
          priority: 'medium',
          timeframe: 'Next 2-8 weeks',
          healthCategory: 'market_timing',
          dataSource: 'Profit/loss analysis',
          actionable: true,
          assetType: asset.metadata?.asset_type || 'mixed'
        });
      }
    });
    
    return opportunities.slice(0, 3); // Limit to top 3
  }

  // Risk analysis methods
  private analyzeConcentrationRisks(assets: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Check for single asset concentration risk
    const totalValue = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
    
    assets.forEach(asset => {
      const assetValue = asset.current_value || 0;
      const concentration = (assetValue / totalValue) * 100;
      
      if (concentration > 20) { // More than 20% in single asset
        const symbol = asset.metadata?.symbol || asset.asset_name;
        
        risks.push({
          id: `concentration-risk-${asset.id}`,
          title: `High concentration in ${symbol}`,
          description: `${symbol} represents ${concentration.toFixed(1)}% of portfolio ($${assetValue.toLocaleString()}). Consider reducing position size.`,
          impact: -assetValue * 0.15, // 15% potential loss
          healthScoreImpact: -3,
          confidence: 80,
          category: 'risk',
          priority: 'medium',
          timeframe: 'Next 1-3 months',
          healthCategory: 'diversification',
          dataSource: 'Concentration analysis',
          actionable: true,
          assetType: asset.metadata?.asset_type || 'mixed'
        });
      }
    });
    
    return risks.slice(0, 3);
  }

  private analyzeVolatilityRisks(assets: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Find highly volatile assets (crypto, high-beta stocks)
    const volatileAssets = assets.filter(asset => {
      const marketData = asset.asset_market_data?.[0];
      return marketData?.price_change_percentage_24h && Math.abs(marketData.price_change_percentage_24h) > 10;
    });
    
    volatileAssets.slice(0, 3).forEach(asset => {
      const marketData = asset.asset_market_data?.[0];
      const symbol = asset.metadata?.symbol || asset.asset_name;
      const change = marketData?.price_change_percentage_24h || 0;
      
      risks.push({
        id: `volatility-risk-${asset.id}`,
        title: `High volatility in ${symbol}`,
        description: `${symbol} showing ${Math.abs(change).toFixed(1)}% daily volatility. Consider position sizing or hedging strategies.`,
        impact: -(asset.current_value || 0) * 0.2, // 20% potential loss
        healthScoreImpact: -2,
        confidence: 75,
        category: 'risk',
        priority: 'medium',
        timeframe: 'Ongoing monitoring',
        healthCategory: 'market_timing',
        dataSource: 'Volatility analysis',
        actionable: true,
        assetType: asset.metadata?.asset_type || 'mixed'
      });
    });
    
    return risks;
  }

  private analyzeLiquidityRisks(assets: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Find illiquid assets (real estate, private equity, etc.)
    const illiquidAssets = assets.filter(asset => 
      asset.metadata?.asset_type === 'real_estate' || 
      asset.asset_category?.name?.includes('alternative') ||
      asset.metadata?.liquidity === 'low'
    );
    
    const totalValue = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
    const illiquidValue = illiquidAssets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
    const illiquidPercentage = (illiquidValue / totalValue) * 100;
    
    if (illiquidPercentage > 60) { // More than 60% in illiquid assets
      risks.push({
        id: 'liquidity-risk',
        title: 'Portfolio liquidity concerns',
        description: `${illiquidPercentage.toFixed(1)}% of portfolio in illiquid assets ($${illiquidValue.toLocaleString()}). Consider increasing liquid asset allocation.`,
        impact: -illiquidValue * 0.05, // 5% liquidity discount
        healthScoreImpact: -2,
        confidence: 85,
        category: 'risk',
        priority: 'low',
        timeframe: 'Next 6-12 months',
        healthCategory: 'diversification',
        dataSource: 'Liquidity analysis',
        actionable: true,
        assetType: 'mixed'
      });
    }
    
    return risks;
  }

  private analyzeMarketExposureRisks(assets: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Analyze exposure to specific market sectors or geographies
    const marketExposures: { [key: string]: number } = {};
    let totalValue = 0;
    
    assets.forEach(asset => {
      const value = asset.current_value || 0;
      totalValue += value;
      
      // Group by sector or geographic region if available
      const sector = asset.metadata?.sector || 'other';
      marketExposures[sector] = (marketExposures[sector] || 0) + value;
    });
    
    // Check for over-exposure to any single market/sector
    Object.entries(marketExposures).forEach(([sector, exposure]) => {
      const exposurePercentage = (exposure / totalValue) * 100;
      
      if (exposurePercentage > 30 && sector !== 'other') {
        risks.push({
          id: `market-exposure-${sector}`,
          title: `High ${sector} sector exposure`,
          description: `${exposurePercentage.toFixed(1)}% exposure to ${sector} sector ($${exposure.toLocaleString()}). Consider diversifying across sectors.`,
          impact: -exposure * 0.1, // 10% sector downturn risk
          healthScoreImpact: -2,
          confidence: 70,
          category: 'risk',
          priority: 'low',
          timeframe: 'Next 3-6 months',
          healthCategory: 'diversification',
          dataSource: 'Sector exposure analysis',
          actionable: true,
          assetType: 'mixed'
        });
      }
    });
    
    return risks.slice(0, 2);
  }

  // Comprehensive market intelligence risk analysis methods
  private analyzeMarketTimingRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Analyze properties in high-appreciation markets for timing risks
    const highValueProperties = properties.filter(prop => 
      (prop.monthly_rent || 0) > 3000 || (prop.market_value || prop.asset_value || 0) > 500000
    );
    
    if (highValueProperties.length > 0) {
      const totalValue = highValueProperties.reduce((sum, prop) => 
        sum + (prop.market_value || prop.asset_value || prop.monthly_rent * 200), 0
      );
      
      risks.push({
        id: 'market-timing-analysis',
        title: `Market cycle positioning assessment`,
        description: `${highValueProperties.length} premium properties worth $${(totalValue/1000000).toFixed(1)}M may benefit from strategic timing review. Consider market cycle positioning for optimal returns.`,
        impact: -Math.round(totalValue * 0.05), // Potential 5% opportunity cost
        healthScoreImpact: -2,
        confidence: 70,
        category: 'risk',
        priority: 'medium',
        timeframe: 'Next 6-12 months',
        healthCategory: 'market_timing',
        dataSource: 'Market cycle analysis',
        actionable: true,
        assetType: 'property'
      });
    }
    
    return risks;
  }

  private analyzeNeighborhoodTrendRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Group properties by geographic area
    const locationGroups = properties.reduce((groups: any, prop) => {
      const area = prop.city || prop.zip_code || 'Unknown Area';
      if (!groups[area]) groups[area] = [];
      groups[area].push(prop);
      return groups;
    }, {});
    
    Object.entries(locationGroups).forEach(([area, areaProperties]: [string, any[]]) => {
      if (areaProperties.length >= 2) {
        const totalAreaValue = areaProperties.reduce((sum, prop) => 
          sum + (prop.market_value || prop.asset_value || prop.monthly_rent * 200), 0
        );
        
        risks.push({
          id: `neighborhood-concentration-${area.replace(/\s+/g, '-')}`,
          title: `Geographic diversification opportunity in ${area}`,
          description: `${areaProperties.length} properties concentrated in ${area}. Consider expanding to emerging high-growth neighborhoods for enhanced portfolio resilience.`,
          impact: -Math.round(totalAreaValue * 0.03), // 3% diversification benefit
          healthScoreImpact: -1,
          confidence: 65,
          category: 'risk',
          priority: 'low',
          timeframe: 'Next 12-18 months',
          healthCategory: 'diversification',
          dataSource: 'Geographic analysis',
          actionable: true,
          assetType: 'property',
          geographicArea: area
        });
      }
    });
    
    return risks.slice(0, 3); // Limit to top 3 areas
  }

  private analyzeEconomicIndicatorRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Analyze portfolio exposure to economic cycles
    const totalPortfolioValue = properties.reduce((sum, prop) => 
      sum + (prop.market_value || prop.asset_value || prop.monthly_rent * 200), 0
    );
    
    if (totalPortfolioValue > 1000000) {
      risks.push({
        id: 'economic-cycle-positioning',
        title: `Economic cycle hedging opportunity`,
        description: `$${(totalPortfolioValue/1000000).toFixed(1)}M portfolio exposure suggests evaluating counter-cyclical assets or geographic diversification to enhance economic resilience.`,
        impact: -Math.round(totalPortfolioValue * 0.04), // 4% hedge value
        healthScoreImpact: -2,
        confidence: 75,
        category: 'risk',
        priority: 'medium',
        timeframe: 'Next 3-9 months',
        healthCategory: 'financial',
        dataSource: 'Economic cycle analysis',
        actionable: true,
        assetType: 'mixed'
      });
    }
    
    return risks;
  }

  private analyzeGeographicConcentrationRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    
    // Analyze state-level concentration
    const stateGroups = properties.reduce((groups: any, prop) => {
      const state = prop.state || 'Unknown State';
      if (!groups[state]) groups[state] = [];
      groups[state].push(prop);
      return groups;
    }, {});
    
    Object.entries(stateGroups).forEach(([state, stateProperties]: [string, any[]]) => {
      const statePercentage = (stateProperties.length / properties.length) * 100;
      
      if (statePercentage > 70 && properties.length > 3) {
        const totalStateValue = stateProperties.reduce((sum, prop) => 
          sum + (prop.market_value || prop.asset_value || prop.monthly_rent * 200), 0
        );
        
        risks.push({
          id: `state-concentration-${state.replace(/\s+/g, '-')}`,
          title: `Multi-state expansion opportunity`,
          description: `${statePercentage.toFixed(0)}% of portfolio in ${state}. Consider expanding to high-growth markets in other states for enhanced geographic diversification.`,
          impact: -Math.round(totalStateValue * 0.06), // 6% diversification benefit
          healthScoreImpact: -3,
          confidence: 80,
          category: 'risk',
          priority: 'high',
          timeframe: 'Next 6-18 months',
          healthCategory: 'diversification',
          dataSource: 'Geographic concentration analysis',
          actionable: true,
          assetType: 'property',
          geographicArea: state
        });
      }
    });
    
    return risks;
  }

  // Property risk analysis (inherited methods)
  private analyzeVacancyRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    const vacantProperties = properties.filter(prop => 
      prop.status === 'available' || prop.status === 'vacant'
    );

    vacantProperties.slice(0, 5).forEach((property) => {
      const address = property.address || 'Property Address';
      const zipCode = property.zip_code || '00000';
      const monthlyRent = property.monthly_rent || 1800;
      
      risks.push({
        id: `vacancy-risk-${property.id}`,
        title: `Vacant property at ${address}`,
        description: `Property at ${address}, ${zipCode} vacant - losing $${monthlyRent.toLocaleString()}/month revenue.`,
        impact: -monthlyRent * 12,
        healthScoreImpact: -5,
        confidence: 100,
        category: 'risk',
        priority: 'high',
        timeframe: 'Ongoing',
        healthCategory: 'occupancy',
        dataSource: `Vacancy tracking`,
        actionable: true,
        assetType: 'property',
        geographicArea: zipCode
      });
    });

    return risks;
  }

  // OPERATIONAL RISK ANALYSIS METHODS - Real, Actionable Problems
  private analyzeLeaseExpirationRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    const today = new Date();
    
    properties.forEach(property => {
      if (!property.lease_end_date) return;
      
      const leaseEndDate = new Date(property.lease_end_date);
      const daysUntilExpiration = Math.ceil((leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Critical: Lease ending in 10 days or less without renewal
      if (daysUntilExpiration <= 10 && daysUntilExpiration >= 0) {
        risks.push({
          id: `lease-expiring-critical-${property.id}`,
          title: `Lease ends in ${daysUntilExpiration} days - not renewed`,
          description: `Property at ${property.address} has lease expiring ${leaseEndDate.toLocaleDateString()} with no renewal on file. Immediate action required.`,
          impact: -(property.monthly_rent || 1800) * 12,
          healthScoreImpact: -6,
          confidence: 100,
          category: 'risk',
          priority: 'high',
          timeframe: 'Immediate',
          healthCategory: 'tenant_relations',
          dataSource: 'Lease expiration tracking',
          actionable: true,
          assetType: 'property',
          geographicArea: property.zip_code
        });
      }
      
      // Warning: Lease ending in 11-30 days
      else if (daysUntilExpiration > 10 && daysUntilExpiration <= 30) {
        risks.push({
          id: `lease-expiring-soon-${property.id}`,
          title: `Lease expires in ${daysUntilExpiration} days`,
          description: `Property at ${property.address} needs renewal decision within ${daysUntilExpiration} days.`,
          impact: -(property.monthly_rent || 1800) * 12,
          healthScoreImpact: -4,
          confidence: 95,
          category: 'risk',
          priority: 'high',
          timeframe: `Next ${daysUntilExpiration} days`,
          healthCategory: 'tenant_relations',
          dataSource: 'Lease expiration tracking',
          actionable: true,
          assetType: 'property',
          geographicArea: property.zip_code
        });
      }
      
      // Already expired leases
      else if (daysUntilExpiration < 0) {
        risks.push({
          id: `lease-expired-${property.id}`,
          title: `Lease expired ${Math.abs(daysUntilExpiration)} days ago`,
          description: `Property at ${property.address} has expired lease. Tenant may be on month-to-month or property could be at risk.`,
          impact: -(property.monthly_rent || 1800) * 6,
          healthScoreImpact: -7,
          confidence: 100,
          category: 'risk',
          priority: 'high',
          timeframe: 'Overdue',
          healthCategory: 'tenant_relations',
          dataSource: 'Lease expiration tracking',
          actionable: true,
          assetType: 'property',
          geographicArea: property.zip_code
        });
      }
    });
    
    return risks.filter(r => r); // Remove any undefined values
  }

  private analyzeVacancyDurationRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    const today = new Date();
    
    const vacantProperties = properties.filter(p => 
      p.status === 'available' || p.status === 'vacant'
    );
    
    vacantProperties.forEach(property => {
      const createdDate = new Date(property.created_at);
      const daysVacant = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysVacant > 60) {
        risks.push({
          id: `long-vacancy-${property.id}`,
          title: `Property vacant for ${daysVacant} days`,
          description: `${property.address} has been vacant for ${daysVacant} days, losing $${property.monthly_rent || 1800}/month in revenue.`,
          impact: -(property.monthly_rent || 1800) * Math.floor(daysVacant / 30),
          healthScoreImpact: -5,
          confidence: 100,
          category: 'risk',
          priority: 'high',
          timeframe: 'Ongoing',
          healthCategory: 'occupancy',
          dataSource: 'Vacancy tracking',
          actionable: true,
          assetType: 'property',
          geographicArea: property.zip_code
        });
      } else if (daysVacant > 30) {
        risks.push({
          id: `vacancy-${property.id}`,
          title: `Property vacant for ${daysVacant} days`,
          description: `${property.address} losing $${property.monthly_rent || 1800}/month. Consider price adjustment or marketing strategy.`,
          impact: -(property.monthly_rent || 1800) * Math.floor(daysVacant / 30),
          healthScoreImpact: -3,
          confidence: 100,
          category: 'risk',
          priority: 'medium',
          timeframe: 'Ongoing',
          healthCategory: 'occupancy',
          dataSource: 'Vacancy tracking',
          actionable: true,
          assetType: 'property',
          geographicArea: property.zip_code
        });
      }
    });
    
    return risks;
  }

  private analyzeMaintenanceOverdueRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    const today = new Date();
    
    properties.forEach(property => {
      if (!property.maintenance_requests) return;
      
      const overdueRequests = property.maintenance_requests.filter((req: any) => {
        if (req.status === 'completed' || req.status === 'cancelled') return false;
        
        const createdDate = new Date(req.created_at);
        const daysOpen = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return (req.priority === 'urgent' && daysOpen > 2) ||
               (req.priority === 'high' && daysOpen > 7) ||
               (req.priority === 'medium' && daysOpen > 14) ||
               (daysOpen > 30);
      });
      
      overdueRequests.forEach((req: any) => {
        const createdDate = new Date(req.created_at);
        const daysOverdue = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        risks.push({
          id: `maintenance-overdue-${req.id}`,
          title: `Maintenance request overdue by ${daysOverdue} days`,
          description: `${req.priority} priority ${req.category} request at ${property.address} - ${req.description?.substring(0, 100) || 'No description'}`,
          impact: -(req.estimated_cost || 500),
          healthScoreImpact: req.priority === 'urgent' ? -6 : -3,
          confidence: 95,
          category: 'risk',
          priority: req.priority === 'urgent' ? 'high' : 'medium',
          timeframe: 'Overdue',
          healthCategory: 'maintenance',
          dataSource: 'Maintenance tracking',
          actionable: true,
          assetType: 'property',
          geographicArea: property.zip_code
        });
      });
    });
    
    return risks.slice(0, 5); // Limit to top 5 most critical
  }

  private analyzeLatePaymentRisks(data: AnalysisData): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];
    const today = new Date();
    
    // Get payments that are overdue
    const latePayments = data.rentPayments.filter((payment: any) => {
      if (payment.status === 'completed') return false;
      
      const dueDate = new Date(payment.due_date);
      const daysLate = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysLate > 0;
    });
    
    // Group by property
    const lateByProperty: { [key: string]: any[] } = {};
    latePayments.forEach((payment: any) => {
      if (!lateByProperty[payment.property_id]) {
        lateByProperty[payment.property_id] = [];
      }
      lateByProperty[payment.property_id].push(payment);
    });
    
    Object.entries(lateByProperty).forEach(([propertyId, payments]) => {
      const property = data.properties.find(p => p.id === propertyId);
      if (!property) return;
      
      const latestPayment = payments[0];
      const dueDate = new Date(latestPayment.due_date);
      const daysLate = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalOwed = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      risks.push({
        id: `late-payment-${propertyId}`,
        title: `Tenant payment ${daysLate} days late`,
        description: `Property at ${property.address} has $${totalOwed.toLocaleString()} outstanding for ${payments.length} period(s). Payment was due ${dueDate.toLocaleDateString()}.`,
        impact: -totalOwed,
        healthScoreImpact: daysLate > 30 ? -6 : daysLate > 15 ? -4 : -2,
        confidence: 100,
        category: 'risk',
        priority: daysLate > 30 ? 'high' : 'medium',
        timeframe: 'Immediate',
        healthCategory: 'financial',
        dataSource: 'Payment tracking',
        actionable: true,
        assetType: 'property',
        geographicArea: property.zip_code
      });
    });
    
    return risks;
  }

  // Helper methods
  private groupAssetsByCategory(assets: any[]): { [key: string]: any[] } {
    const groups: { [key: string]: any[] } = {};
    
    assets.forEach(asset => {
      const category = asset.asset_category?.name || asset.metadata?.asset_type || 'other';
      const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
      
      if (!groups[normalizedCategory]) {
        groups[normalizedCategory] = [];
      }
      groups[normalizedCategory].push(asset);
    });
    
    return groups;
  }

  private estimateMarketRent(property: any): number {
    const baseBedrooms = property.bedrooms || 2;
    const baseRent = baseBedrooms * 800;
    
    const currentYear = new Date().getFullYear();
    const propertyAge = property.year_built ? currentYear - property.year_built : 20;
    const ageAdjustment = Math.max(0.8, 1 - (propertyAge * 0.005));
    
    return baseRent * ageAdjustment;
  }

  // Additional property analysis methods (keeping existing functionality)
  private analyzeMaintenanceEfficiencyOpportunities(properties: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];

    properties.slice(0, 5).forEach((property) => {
      const address = property.address || 'Property Address';
      const zipCode = property.zip_code || '00000';
      const maintenanceCost = property.maintenance_cost || 500;

      opportunities.push({
        id: `maintenance-efficiency-${property.id}`,
        title: `Reduce maintenance costs at ${address}`,
        description: `Property at ${address}, ${zipCode} - high maintenance costs of $${maintenanceCost.toLocaleString()}/month.`,
        impact: maintenanceCost * 0.2,
        healthScoreImpact: 2,
        confidence: 70,
        category: 'opportunity',
        priority: 'low',
        timeframe: 'Next 3-6 months',
        healthCategory: 'maintenance',
        dataSource: `Maintenance cost analysis for ${zipCode}`,
        actionable: true,
        assetType: 'property',
        geographicArea: zipCode
      });
    });

    return opportunities;
  }

  private analyzeGeographicOptimization(properties: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];

    // Group properties by zip code
    const propertiesByZip: { [key: string]: any[] } = {};
    properties.forEach(property => {
      const zipCode = property.zip_code || '00000';
      if (!propertiesByZip[zipCode]) {
        propertiesByZip[zipCode] = [];
      }
      propertiesByZip[zipCode].push(property);
    });

    // Find zip codes with high concentration of properties
    Object.entries(propertiesByZip).forEach(([zipCode, properties]) => {
      if (properties.length > 3) {
        const totalRent = properties.reduce((sum, property) => sum + (property.monthly_rent || 0), 0);

        opportunities.push({
          id: `geographic-optimization-${zipCode}`,
          title: `Optimize portfolio in ${zipCode}`,
          description: `High concentration of properties in ${zipCode} - $${totalRent.toLocaleString()}/month revenue.`,
          impact: totalRent * 0.05,
          healthScoreImpact: 3,
          confidence: 65,
          category: 'opportunity',
          priority: 'low',
          timeframe: 'Next 6-12 months',
          healthCategory: 'financial',
          dataSource: `Geographic analysis for ${zipCode}`,
          actionable: true,
          assetType: 'property',
          geographicArea: zipCode
        });
      }
    });

    return opportunities;
  }

  private analyzePaymentOptimization(properties: any[], rentPayments: any[]): PortfolioHealthInsight[] {
    const opportunities: PortfolioHealthInsight[] = [];

    properties.slice(0, 5).forEach((property) => {
      const address = property.address || 'Property Address';
      const zipCode = property.zip_code || '00000';
      const latePayments = rentPayments.filter(payment => payment.property_id === property.id && payment.is_late);

      if (latePayments.length > 3) {
        const totalLateFees = latePayments.reduce((sum, payment) => sum + (payment.late_fee || 0), 0);

        opportunities.push({
          id: `payment-optimization-${property.id}`,
          title: `Improve payment collection at ${address}`,
          description: `Property at ${address}, ${zipCode} - frequent late payments, $${totalLateFees.toLocaleString()} potential revenue.`,
          impact: totalLateFees * 0.1,
          healthScoreImpact: 2,
          confidence: 75,
          category: 'opportunity',
          priority: 'medium',
          timeframe: 'Next 1-3 months',
          healthCategory: 'financial',
          dataSource: `Payment analysis for ${zipCode}`,
          actionable: true,
          assetType: 'property',
          geographicArea: zipCode
        });
      }
    });

    return opportunities;
  }

  private analyzeMaintenanceRisks(properties: any[]): PortfolioHealthInsight[] {
    const risks: PortfolioHealthInsight[] = [];

    properties.slice(0, 5).forEach((property) => {
      const address = property.address || 'Property Address';
      const zipCode = property.zip_code || '00000';
      const maintenanceCost = property.maintenance_cost || 500;

      risks.push({
        id: `maintenance-risk-${property.id}`,
        title: `High maintenance costs at ${address}`,
        description: `Property at ${address}, ${zipCode} - high maintenance costs of $${maintenanceCost.toLocaleString()}/month.`,
        impact: -maintenanceCost * 0.1,
        healthScoreImpact: -3,
        confidence: 80,
        category: 'risk',
        priority: 'medium',
        timeframe: 'Ongoing',
        healthCategory: 'maintenance',
        dataSource: `Maintenance cost tracking`,
        actionable: true,
        assetType: 'property',
        geographicArea: zipCode
      });
    });

    return risks;
  }
}
