import { format, subMonths, startOfMonth } from 'date-fns';

// Mock data scenarios for different portfolio types and performance levels
export type MockScenarioType = 
  | 'high-performing' | 'average' | 'struggling' | 'growing' 
  | 'seasonal' | 'large-portfolio' | 'small-portfolio' | 'mixed-portfolio';

export type MockDataSection = 'income' | 'expenses' | 'investment' | 'leasing' | 'tenant-performance' | 'maintenance' | 'vendor-operations' | 'risk-management' | 'tenant-lifecycle' | 'lease-rent-optimization' | 'properties' | 'predictive-analytics' | 'assets';

// Generate realistic mock cash flow data for Income & Cash Flow Management
export const generateMockCashFlowData = (scenario: MockScenarioType = 'average') => {
  const baseConfig = {
    'high-performing': {
      baseOperating: 85000,
      varianceRange: 0.15,
      growthTrend: 0.03,
      grossRentMultiplier: 1.2,
      expenseRatio: 0.35
    },
    'average': {
      baseOperating: 45000,
      varianceRange: 0.25,
      growthTrend: 0.01,
      grossRentMultiplier: 1.0,
      expenseRatio: 0.45
    },
    'struggling': {
      baseOperating: 15000,
      varianceRange: 0.4,
      growthTrend: -0.02,
      grossRentMultiplier: 0.8,
      expenseRatio: 0.65
    },
    'growing': {
      baseOperating: 32000,
      varianceRange: 0.2,
      growthTrend: 0.05,
      grossRentMultiplier: 1.1,
      expenseRatio: 0.5
    },
    'seasonal': {
      baseOperating: 55000,
      varianceRange: 0.35,
      growthTrend: 0.01,
      grossRentMultiplier: 1.0,
      expenseRatio: 0.4
    },
    'large-portfolio': {
      baseOperating: 150000,
      varianceRange: 0.12,
      growthTrend: 0.025,
      grossRentMultiplier: 1.15,
      expenseRatio: 0.38
    },
    'small-portfolio': {
      baseOperating: 12000,
      varianceRange: 0.3,
      growthTrend: 0.015,
      grossRentMultiplier: 0.9,
      expenseRatio: 0.55
    },
    'mixed-portfolio': {
      baseOperating: 68000,
      varianceRange: 0.22,
      growthTrend: 0.02,
      grossRentMultiplier: 1.05,
      expenseRatio: 0.42
    }
  }[scenario];

  const { baseOperating, varianceRange, growthTrend, grossRentMultiplier, expenseRatio } = baseConfig;

  return Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(startOfMonth(new Date()), 11 - i);
    const seasonalFactor = scenario === 'seasonal' ? 
      1 + 0.15 * Math.sin((i * Math.PI) / 6) : 1;
    
    const trendFactor = Math.pow(1 + growthTrend, i);
    const variance = (Math.random() - 0.5) * varianceRange;
    const operatingCashFlow = Math.round(baseOperating * trendFactor * seasonalFactor * (1 + variance));
    
    const grossRent = Math.round(operatingCashFlow / (1 - expenseRatio) * grossRentMultiplier);
    const totalExpenses = grossRent - operatingCashFlow;

    return {
      date: format(month, 'yyyy-MM-dd'),
      operating_cash_flow: operatingCashFlow,
      investing_cash_flow: Math.round(-operatingCashFlow * (0.1 + Math.random() * 0.1)),
      financing_cash_flow: Math.round(-operatingCashFlow * (0.05 + Math.random() * 0.05)),
      gross_rent: grossRent,
      maintenance_expenses: Math.round(totalExpenses * 0.35),
      insurance_expenses: Math.round(totalExpenses * 0.15),
      tax_expenses: Math.round(totalExpenses * 0.25),
      management_fees: Math.round(totalExpenses * 0.15),
      other_expenses: Math.round(totalExpenses * 0.1)
    };
  });
};

// Generate realistic mock profit & loss data for Expenses & Profitability
export const generateMockProfitLossData = (scenario: MockScenarioType = 'average') => {
  const baseConfig = {
    'high-performing': {
      baseRevenue: 120000,
      profitMargin: 0.65,
      varianceRange: 0.1
    },
    'average': {
      baseRevenue: 75000,
      profitMargin: 0.55,
      varianceRange: 0.2
    },
    'struggling': {
      baseRevenue: 45000,
      profitMargin: 0.35,
      varianceRange: 0.35
    },
    'growing': {
      baseRevenue: 65000,
      profitMargin: 0.5,
      varianceRange: 0.15
    },
    'seasonal': {
      baseRevenue: 85000,
      profitMargin: 0.6,
      varianceRange: 0.25
    },
    'large-portfolio': {
      baseRevenue: 200000,
      profitMargin: 0.62,
      varianceRange: 0.08
    },
    'small-portfolio': {
      baseRevenue: 25000,
      profitMargin: 0.45,
      varianceRange: 0.3
    },
    'mixed-portfolio': {
      baseRevenue: 95000,
      profitMargin: 0.58,
      varianceRange: 0.18
    }
  }[scenario];

  const { baseRevenue, profitMargin, varianceRange } = baseConfig;

  return Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(startOfMonth(new Date()), 11 - i);
    const seasonalFactor = scenario === 'seasonal' ? 
      1 + 0.2 * Math.sin((i * Math.PI) / 6) : 1;
    
    const variance = (Math.random() - 0.5) * varianceRange;
    const totalRevenue = Math.round(baseRevenue * seasonalFactor * (1 + variance));
    const totalExpenses = Math.round(totalRevenue * (1 - profitMargin));

    return {
      date: format(month, 'yyyy-MM-dd'),
      total_revenue: totalRevenue,
      total_expenses: -totalExpenses,
      maintenance_expenses: Math.round(-totalExpenses * 0.4),
      management_fees: Math.round(-totalExpenses * 0.2),
      insurance_expenses: Math.round(-totalExpenses * 0.15),
      tax_expenses: Math.round(-totalExpenses * 0.15),
      other_expenses: Math.round(-totalExpenses * 0.1)
    };
  });
};

// Generate realistic mock properties data
export const generateMockPropertiesData = (scenario: MockScenarioType = 'average') => {
  const propertyCount = {
    'high-performing': 25,
    'average': 12,
    'struggling': 8,
    'growing': 15,
    'seasonal': 10,
    'large-portfolio': 45,
    'small-portfolio': 4,
    'mixed-portfolio': 18
  }[scenario];

  const baseAddresses = [
    '123 Oak Street', '456 Elm Avenue', '789 Pine Road', '321 Maple Drive',
    '654 Cedar Lane', '987 Birch Court', '147 Willow Way', '258 Ash Boulevard',
    '369 Cherry Street', '741 Spruce Avenue', '852 Poplar Road', '963 Hickory Lane',
    '159 Sycamore Drive', '357 Magnolia Court', '468 Dogwood Way', '579 Redwood Avenue'
  ];

  return Array.from({ length: propertyCount }, (_, i) => ({
    id: `prop-${scenario}-${i + 1}`,
    street_address: `${baseAddresses[i % baseAddresses.length]}, Unit ${i + 1}`
  }));
};

// Generate realistic mock investment & portfolio data
export const generateMockInvestmentData = (scenario: MockScenarioType = 'average') => {
  const baseConfig = {
    'high-performing': {
      capRate: 12.5,
      cashOnCash: 18.2,
      appreciationRate: 8.5,
      equityRatio: 45
    },
    'average': {
      capRate: 7.8,
      cashOnCash: 12.1,
      appreciationRate: 4.2,
      equityRatio: 35
    },
    'struggling': {
      capRate: 4.2,
      cashOnCash: 6.8,
      appreciationRate: 1.8,
      equityRatio: 25
    },
    'growing': {
      capRate: 9.1,
      cashOnCash: 14.5,
      appreciationRate: 6.8,
      equityRatio: 32
    },
    'seasonal': {
      capRate: 8.5,
      cashOnCash: 11.8,
      appreciationRate: 5.2,
      equityRatio: 38
    },
    'large-portfolio': {
      capRate: 10.2,
      cashOnCash: 15.8,
      appreciationRate: 7.1,
      equityRatio: 42
    },
    'small-portfolio': {
      capRate: 6.5,
      cashOnCash: 9.2,
      appreciationRate: 3.5,
      equityRatio: 28
    },
    'mixed-portfolio': {
      capRate: 8.9,
      cashOnCash: 13.2,
      appreciationRate: 5.8,
      equityRatio: 37
    }
  }[scenario];

  return {
    ...baseConfig,
    totalValue: Math.round(baseConfig.capRate * 50000), // Rough calculation
    totalEquity: Math.round(baseConfig.capRate * 50000 * (baseConfig.equityRatio / 100))
  };
};

// Get random scenario for variety
export const getRandomScenario = (): MockScenarioType => {
  const scenarios: MockScenarioType[] = [
    'high-performing', 'average', 'struggling', 'growing',
    'seasonal', 'large-portfolio', 'small-portfolio', 'mixed-portfolio'
  ];
  return scenarios[Math.floor(Math.random() * scenarios.length)];
};

// Get scenario by index (for consistent demos)
export const getScenarioByIndex = (index: number): MockScenarioType => {
  const scenarios: MockScenarioType[] = [
    'high-performing', 'average', 'struggling', 'growing',
    'seasonal', 'large-portfolio', 'small-portfolio', 'mixed-portfolio'
  ];
  return scenarios[index % scenarios.length];
};

// Mock scenario descriptions for UI
export const getScenarioDescription = (scenario: MockScenarioType): string => {
  const descriptions = {
    'high-performing': 'Premium portfolio with excellent cash flow and strong ROI',
    'average': 'Typical rental portfolio with steady moderate returns',
    'struggling': 'Underperforming properties with high expenses and low margins',
    'growing': 'Expanding portfolio with improving metrics and growth potential',
    'seasonal': 'Properties with seasonal rental patterns and variable income',
    'large-portfolio': 'Diversified large-scale operation with economies of scale',
    'small-portfolio': 'Boutique portfolio focused on select high-quality properties',
    'mixed-portfolio': 'Balanced mix of property types and performance levels'
  };
  return descriptions[scenario];
};

// Generate realistic mock asset data for Assets & Holdings section
export const generateMockAssets = (scenario: MockScenarioType = 'average') => {
  const assetCount = {
    'high-performing': 15,
    'average': 10,
    'struggling': 6,
    'growing': 12,
    'seasonal': 8,
    'large-portfolio': 20,
    'small-portfolio': 5,
    'mixed-portfolio': 14
  }[scenario];

  const performanceMultiplier = {
    'high-performing': 1.3,
    'average': 1.05,
    'struggling': 0.85,
    'growing': 1.15,
    'seasonal': 1.0,
    'large-portfolio': 1.2,
    'small-portfolio': 1.1,
    'mixed-portfolio': 1.08
  }[scenario];

  const mockAssetTemplates = [
    // Stocks & Equities
    { name: 'Apple Inc.', symbol: 'AAPL', type: 'stock', category: 'stocks', baseValue: 45000, dividend: 2200 },
    { name: 'Microsoft Corp.', symbol: 'MSFT', type: 'stock', category: 'stocks', baseValue: 38000, dividend: 1800 },
    { name: 'Alphabet Inc.', symbol: 'GOOGL', type: 'stock', category: 'stocks', baseValue: 32000, dividend: 0 },
    { name: 'Tesla Inc.', symbol: 'TSLA', type: 'stock', category: 'stocks', baseValue: 28000, dividend: 0 },
    { name: 'Amazon.com Inc.', symbol: 'AMZN', type: 'stock', category: 'stocks', baseValue: 35000, dividend: 0 },
    { name: 'SPDR S&P 500 ETF', symbol: 'SPY', type: 'etf', category: 'stocks', baseValue: 65000, dividend: 3200 },
    { name: 'Invesco QQQ Trust', symbol: 'QQQ', type: 'etf', category: 'stocks', baseValue: 48000, dividend: 2400 },
    
    // Cryptocurrency
    { name: 'Bitcoin', symbol: 'BTC', type: 'crypto', category: 'crypto', baseValue: 52000, dividend: 0 },
    { name: 'Ethereum', symbol: 'ETH', type: 'crypto', category: 'crypto', baseValue: 28000, dividend: 0 },
    { name: 'Solana', symbol: 'SOL', type: 'crypto', category: 'crypto', baseValue: 12000, dividend: 0 },
    
    // Bonds & Fixed Income
    { name: 'US Treasury 10Y', symbol: 'T-10Y', type: 'bond', category: 'bonds', baseValue: 42000, dividend: 4200 },
    { name: 'Corporate Bond Fund', symbol: 'VCIT', type: 'bond', category: 'bonds', baseValue: 38000, dividend: 3800 },
    { name: 'Municipal Bonds', symbol: 'MUB', type: 'bond', category: 'bonds', baseValue: 32000, dividend: 2400 },
    
    // Real Estate
    { name: 'Vanguard Real Estate ETF', symbol: 'VNQ', type: 'reit', category: 'real_estate', baseValue: 58000, dividend: 5800 },
    { name: 'Realty Income Corp', symbol: 'O', type: 'reit', category: 'real_estate', baseValue: 45000, dividend: 4500 },
    { name: '123 Main St Property', symbol: 'RE-001', type: 'property', category: 'real_estate', baseValue: 350000, dividend: 24000 },
    
    // Commodities
    { name: 'Gold ETF', symbol: 'GLD', type: 'commodity', category: 'commodities', baseValue: 35000, dividend: 0 },
    { name: 'Silver ETF', symbol: 'SLV', type: 'commodity', category: 'commodities', baseValue: 18000, dividend: 0 },
    { name: 'Oil Futures', symbol: 'USO', type: 'commodity', category: 'commodities', baseValue: 22000, dividend: 0 },
    
    // Cash & Equivalents
    { name: 'High-Yield Savings', symbol: 'HYSA', type: 'cash', category: 'cash', baseValue: 85000, dividend: 3400 },
    { name: 'Money Market Fund', symbol: 'VMFXX', type: 'cash', category: 'cash', baseValue: 45000, dividend: 1800 },
    
    // Alternative Investments
    { name: 'Fine Art Collection', symbol: 'ART-001', type: 'art', category: 'alternatives', baseValue: 125000, dividend: 0 },
    { name: 'Wine Investment', symbol: 'WINE-001', type: 'collectible', category: 'alternatives', baseValue: 45000, dividend: 0 },
    
    // Private Equity & Business
    { name: 'Venture Capital Fund A', symbol: 'VC-001', type: 'private_equity', category: 'private_equity', baseValue: 200000, dividend: 15000 },
    { name: 'Tech Startup Equity', symbol: 'PE-002', type: 'private_equity', category: 'private_equity', baseValue: 75000, dividend: 0 },
    
    // Vehicles & Equipment
    { name: '2023 Tesla Model S', symbol: 'VEH-001', type: 'vehicle', category: 'vehicle', baseValue: 85000, dividend: 0 },
    { name: 'Construction Equipment', symbol: 'EQ-001', type: 'equipment', category: 'vehicle', baseValue: 125000, dividend: 12000 },
  ];

  const categoryInfo = {
    'stocks': { name: 'stocks', display: 'Stocks & Equities', color: 'blue' },
    'crypto': { name: 'crypto', display: 'Cryptocurrency', color: 'purple' },
    'bonds': { name: 'bonds', display: 'Bonds & Fixed Income', color: 'yellow' },
    'real_estate': { name: 'real_estate', display: 'Real Estate', color: 'red' },
    'commodities': { name: 'commodities', display: 'Commodities', color: 'orange' },
    'cash': { name: 'cash', display: 'Cash & Equivalents', color: 'gray' },
    'alternatives': { name: 'alternatives', display: 'Alternative Investments', color: 'indigo' },
    'private_equity': { name: 'private_equity', display: 'Private Equity & Business', color: 'violet' },
    'vehicle': { name: 'vehicle', display: 'Vehicles & Equipment', color: 'teal' }
  };

  // Select assets based on count
  const selectedTemplates = mockAssetTemplates.slice(0, assetCount);
  
  // Calculate total portfolio value for allocation percentages
  const totalPortfolioValue = selectedTemplates.reduce((sum, template) => {
    return sum + Math.round(template.baseValue * performanceMultiplier * (0.9 + Math.random() * 0.2));
  }, 0);
  
  return selectedTemplates.map((template, i) => {
    const acquisitionCost = Math.round(template.baseValue * (0.7 + Math.random() * 0.2));
    const currentValue = Math.round(template.baseValue * performanceMultiplier * (0.9 + Math.random() * 0.2));
    const annualIncome = Math.round(template.dividend * performanceMultiplier);
    const annualExpenses = Math.round(annualIncome * 0.1); // 10% expense ratio
    const acquisitionDate = subMonths(new Date(), Math.floor(Math.random() * 36 + 12)); // 1-4 years ago
    
    const category = categoryInfo[template.category as keyof typeof categoryInfo];
    
    // Calculate quantity based on asset type
    const quantity = template.type === 'stock' 
      ? Math.floor(Math.random() * 900 + 100) // 100-1000 shares for stocks
      : template.type === 'crypto'
      ? parseFloat((Math.random() * 99.9 + 0.1).toFixed(2)) // 0.1-100 coins for crypto
      : parseFloat((Math.random() * 500 + 50).toFixed(2)); // 50-550 units for others
    
    // Calculate current price per unit
    const currentPrice = currentValue / quantity;
    
    // Calculate allocation percentage
    const allocationPercent = (currentValue / totalPortfolioValue) * 100;
    
    // Calculate 24h price change in dollars
    const performance24hPercent = (Math.random() - 0.5) * 5; // -2.5% to +2.5%
    
    return {
      id: `asset-mock-${i + 1}`,
      portfolio_id: 'portfolio-mock-1',
      asset_category_id: `category-${template.category}`,
      asset_name: template.name,
      asset_description: `${template.type.toUpperCase()} - ${template.symbol}`,
      asset_value: currentValue,
      acquisition_date: format(acquisitionDate, 'yyyy-MM-dd'),
      acquisition_cost: acquisitionCost,
      current_value: currentValue,
      annual_income: annualIncome,
      annual_expenses: annualExpenses,
      metadata: {
        symbol: template.symbol,
        asset_type: template.type,
        sector: template.category,
        quantity,
        current_price: currentPrice,
        allocation_percent: allocationPercent,
        performance_24h: performance24hPercent,
        performance_7d: (Math.random() - 0.5) * 10, // -5% to +5%
        performance_30d: (Math.random() - 0.5) * 15, // -7.5% to +7.5%
        performance_90d: (Math.random() - 0.5) * 20, // -10% to +10%
        performance_ytd: ((currentValue - acquisitionCost) / acquisitionCost) * 100,
        performance_1y: (Math.random() - 0.5) * 25, // -12.5% to +12.5%
        performance_all: ((currentValue - acquisitionCost) / acquisitionCost) * 100, // Total return since acquisition
      },
      tags: [template.type, template.category, scenario],
      is_active: true,
      created_at: format(acquisitionDate, "yyyy-MM-dd'T'HH:mm:ss"),
      updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
      category_name: category.name,
      category_display_name: category.display,
      category_color_theme: category.color,
    };
  });
};