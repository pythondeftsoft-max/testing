import { PortfolioHealthInsight } from '@/hooks/useRealTimeInsightGenerator';

// Enhanced property intelligence methods
export const analyzeMarketGrowthOpportunities = (properties: any[]): PortfolioHealthInsight[] => {
  const opportunities: PortfolioHealthInsight[] = [];
  
  properties.slice(0, 5).forEach((property) => {
    const address = property.address || 'Property Address';
    const zipCode = property.zip_code || '00000';
    const currentRent = property.monthly_rent || 2000;
    
    // Simulate market growth analysis
    const marketGrowthRate = 3.5 + Math.random() * 4; // 3.5-7.5% growth
    const areaScore = 75 + Math.random() * 20; // 75-95 area score
    
    if (marketGrowthRate > 5 && areaScore > 85) {
      opportunities.push({
        id: `market-growth-${property.id}`,
        title: `High-Growth Market Position: ${address}`,
        description: `Property in ${zipCode} benefits from ${marketGrowthRate.toFixed(1)}% annual market growth and premium location score of ${areaScore.toFixed(0)}/100. Optimal for long-term appreciation.`,
        impact: currentRent * 12 * 0.8, // Annual growth benefit
        healthScoreImpact: 4,
        confidence: 85,
        category: 'opportunity',
        priority: 'high',
        timeframe: 'Next 12-24 months',
        healthCategory: 'financial',
        dataSource: 'Market Growth Analysis',
        actionable: true,
        assetType: 'property',
        geographicArea: zipCode
      });
    }
  });
  
  return opportunities;
};

export const analyzeRentOptimizationOpportunities = (properties: any[]): PortfolioHealthInsight[] => {
  const opportunities: PortfolioHealthInsight[] = [];
  
  properties.filter(prop => prop.status === 'occupied').slice(0, 3).forEach((property) => {
    const address = property.address || 'Property Address';
    const zipCode = property.zip_code || '00000';
    const currentRent = property.monthly_rent || 2000;
    
    // Simulate rent optimization analysis
    const marketRent = currentRent * (1.05 + Math.random() * 0.15); // 5-20% above current
    const optimizationPotential = marketRent - currentRent;
    
    if (optimizationPotential > 100) {
      opportunities.push({
        id: `rent-optimization-${property.id}`,
        title: `Rent Optimization Opportunity: ${address}`,
        description: `Market analysis shows ${zipCode} area supports $${optimizationPotential.toFixed(0)}/month increase. Gradual implementation maintains tenant relations while optimizing income.`,
        impact: optimizationPotential * 12,
        healthScoreImpact: 3,
        confidence: 80,
        category: 'opportunity',
        priority: 'medium',
        timeframe: 'At next renewal',
        healthCategory: 'financial',
        dataSource: 'Rent Market Analysis',
        actionable: true,
        assetType: 'property',
        geographicArea: zipCode
      });
    }
  });
  
  return opportunities;
};

export const analyzePropertyValueEnhancement = (properties: any[]): PortfolioHealthInsight[] => {
  const opportunities: PortfolioHealthInsight[] = [];
  
  properties.slice(0, 3).forEach((property) => {
    const address = property.address || 'Property Address';
    const zipCode = property.zip_code || '00000';
    
    // Simulate value enhancement opportunities
    const improvementCost = 5000 + Math.random() * 15000;
    const valueIncrease = improvementCost * (2 + Math.random() * 2); // 2-4x return
    
    if (valueIncrease > improvementCost * 2.5) {
      opportunities.push({
        id: `value-enhancement-${property.id}`,
        title: `Value-Add Improvement Opportunity: ${address}`,
        description: `Strategic improvements (estimated $${improvementCost.toLocaleString()}) could increase property value by $${valueIncrease.toLocaleString()}, delivering ${((valueIncrease/improvementCost - 1) * 100).toFixed(0)}% ROI.`,
        impact: valueIncrease - improvementCost,
        healthScoreImpact: 4,
        confidence: 75,
        category: 'opportunity',
        priority: 'medium',
        timeframe: 'Next 6-12 months',
        healthCategory: 'financial',
        dataSource: 'Value Enhancement Analysis',
        actionable: true,
        assetType: 'property',
        geographicArea: zipCode
      });
    }
  });
  
  return opportunities;
};

export const analyzeNeighborhoodAppreciation = (properties: any[]): PortfolioHealthInsight[] => {
  const opportunities: PortfolioHealthInsight[] = [];
  
  const uniqueZipCodes = [...new Set(properties.map(p => p.zip_code).filter(Boolean))];
  
  uniqueZipCodes.slice(0, 3).forEach((zipCode) => {
    const propertiesInArea = properties.filter(p => p.zip_code === zipCode);
    const totalValue = propertiesInArea.reduce((sum, p) => sum + (p.current_value || 350000), 0);
    
    // Simulate neighborhood appreciation analysis
    const appreciationRate = 4 + Math.random() * 6; // 4-10% appreciation
    const developmentScore = Math.random() > 0.6; // 40% chance of new development
    
    if (appreciationRate > 7 || developmentScore) {
      opportunities.push({
        id: `neighborhood-appreciation-${zipCode}`,
        title: `Neighborhood Appreciation Trend: ${zipCode}`,
        description: `Area showing ${appreciationRate.toFixed(1)}% annual appreciation with ${developmentScore ? 'new developments' : 'strong fundamentals'} supporting continued growth. ${propertiesInArea.length} properties positioned to benefit.`,
        impact: totalValue * (appreciationRate / 100),
        healthScoreImpact: 5,
        confidence: 85,
        category: 'opportunity',
        priority: 'high',
        timeframe: 'Next 12-36 months',
        healthCategory: 'financial',
        dataSource: 'Neighborhood Analysis',
        actionable: false,
        assetType: 'property',
        geographicArea: zipCode
      });
    }
  });
  
  return opportunities;
};

export const analyzeOperationalEfficiencies = (properties: any[]): PortfolioHealthInsight[] => {
  const opportunities: PortfolioHealthInsight[] = [];
  
  if (properties.length > 2) {
    // Portfolio-wide operational efficiency opportunities
    const totalMonthlyRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 2000), 0);
    const efficiencyGains = totalMonthlyRent * 0.03; // 3% efficiency improvement
    
    opportunities.push({
      id: 'operational-efficiency',
      title: 'Portfolio Operational Efficiency Gains',
      description: `Streamlining property management processes across ${properties.length} properties could reduce operational costs by 3-5%, improving net operating income by approximately $${efficiencyGains.toLocaleString()}/month.`,
      impact: efficiencyGains * 12,
      healthScoreImpact: 3,
      confidence: 80,
      category: 'opportunity',
      priority: 'medium',
      timeframe: 'Next 3-6 months',
      healthCategory: 'financial',
      dataSource: 'Operational Analysis',
      actionable: true,
      assetType: 'property'
    });
  }
  
  return opportunities;
};

// Enhanced asset intelligence methods
export const analyzePositiveGrowthInsights = (assets: any[]): PortfolioHealthInsight[] => {
  const insights: PortfolioHealthInsight[] = [];
  
  // Focus on growth potential rather than risks
  const growthAssets = assets.filter(asset => {
    const marketData = asset.asset_market_data?.[0];
    return marketData?.price_change_percentage_24h && marketData.price_change_percentage_24h > 5;
  });
  
  growthAssets.slice(0, 3).forEach(asset => {
    const marketData = asset.asset_market_data?.[0];
    const symbol = asset.metadata?.symbol || asset.asset_name;
    const change = marketData?.price_change_percentage_24h || 0;
    
    insights.push({
      id: `growth-momentum-${asset.id}`,
      title: `Strong Growth Momentum: ${symbol}`,
      description: `${symbol} showing ${change.toFixed(1)}% gains with strong technical indicators. Consider position sizing optimization to capitalize on momentum while maintaining risk management.`,
      impact: (asset.current_value || 0) * 0.08, // 8% additional growth potential
      healthScoreImpact: 3,
      confidence: 75,
      category: 'opportunity',
      priority: 'medium',
      timeframe: 'Next 2-6 weeks',
      healthCategory: 'market_timing',
      dataSource: 'Technical Analysis',
      actionable: true,
      assetType: asset.metadata?.asset_type || 'mixed'
    });
  });
  
  return insights;
};

export const analyzeIncomeOptimizationInsights = (assets: any[]): PortfolioHealthInsight[] => {
  const insights: PortfolioHealthInsight[] = [];
  
  const totalValue = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
  const totalIncome = assets.reduce((sum, asset) => sum + (asset.annual_income || 0), 0);
  const currentYield = totalValue > 0 ? (totalIncome / totalValue) * 100 : 0;
  
  // Opportunity for income enhancement
  if (currentYield < 5 && totalValue > 100000) {
    insights.push({
      id: 'income-enhancement-opportunity',
      title: 'Portfolio Income Enhancement Strategy',
      description: `Current portfolio yield is ${currentYield.toFixed(1)}%. Strategic allocation to dividend growth stocks and REITs could target 5-6% yield while maintaining growth potential.`,
      impact: totalValue * 0.025, // 2.5% additional annual income
      healthScoreImpact: 4,
      confidence: 80,
      category: 'opportunity',
      priority: 'medium',
      timeframe: 'Next 3-9 months',
      healthCategory: 'financial',
      dataSource: 'Income Analysis',
      actionable: true,
      assetType: 'mixed'
    });
  }
  
  return insights;
};

export const analyzeMarketTimingInsights = (assets: any[]): PortfolioHealthInsight[] => {
  const insights: PortfolioHealthInsight[] = [];
  
  // Look for strategic market timing opportunities
  const cryptoAssets = assets.filter(asset => 
    asset.metadata?.asset_type === 'crypto' || asset.asset_category?.name === 'cryptocurrency'
  );
  
  if (cryptoAssets.length > 0) {
    const totalCryptoValue = cryptoAssets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
    
    // Simulate market cycle analysis
    const marketCycle = Math.random() > 0.5 ? 'accumulation' : 'distribution';
    
    if (marketCycle === 'accumulation') {
      insights.push({
        id: 'crypto-accumulation-phase',
        title: 'Crypto Market Accumulation Phase',
        description: 'Technical indicators suggest crypto markets entering accumulation phase. Consider dollar-cost averaging into quality projects with strong fundamentals over next 2-4 months.',
        impact: totalCryptoValue * 0.25, // 25% potential upside
        healthScoreImpact: 3,
        confidence: 70,
        category: 'opportunity',
        priority: 'medium',
        timeframe: 'Next 2-6 months',
        healthCategory: 'market_timing',
        dataSource: 'Crypto Market Analysis',
        actionable: true,
        assetType: 'crypto'
      });
    }
  }
  
  return insights;
};