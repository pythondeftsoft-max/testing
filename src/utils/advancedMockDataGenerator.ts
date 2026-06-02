import { format, subMonths, addDays } from 'date-fns';

export interface MockDataConfig {
  value?: number;
  change?: number;
  status?: 'excellent' | 'good' | 'warning' | 'poor';
  subtitle?: string;
  icon?: string;
  chartData?: any[];
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'composed';
  panelData?: any[];
  insights?: string[];
  recommendations?: string[];
  alerts?: Array<{ message: string; severity: 'low' | 'medium' | 'high' }>;
}

const getRandomValue = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const generateTimeSeriesData = (months: number = 12, baseValue: number = 1000, volatility: number = 0.1) => {
  return Array.from({ length: months }, (_, i) => {
    const date = subMonths(new Date(), months - 1 - i);
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const trendFactor = 1 + (i * 0.02); // Small upward trend
    const value = Math.round(baseValue * randomFactor * trendFactor);
    
    return {
      x: format(date, 'MMM yy'),
      y: value,
      trend: Math.round(value * 0.9), // Trend line slightly below
      month: format(date, 'MMM'),
      date: date.toISOString(),
    };
  });
};

const generateCategorialData = (categories: string[], valueRange: [number, number] = [100, 1000]) => {
  return categories.map(name => ({
    name,
    value: getRandomValue(valueRange[0], valueRange[1]),
    percentage: getRandomFloat(5, 25),
  }));
};

export const generateAdvancedMockData = (
  widgetType: string, 
  category: string, 
  regenerationCount: number = 0
): MockDataConfig => {
  // Use regenerationCount to create different scenarios
  const scenarioSeed = regenerationCount % 5;
  const performanceMultiplier = [0.7, 0.85, 1.0, 1.15, 1.3][scenarioSeed];

  // Income category widgets
  if (category === 'income') {
    switch (widgetType) {
      case 'rental-income-velocity':
        return {
          value: getRandomFloat(2.5, 8.5) * performanceMultiplier,
          change: getRandomFloat(-15, 25),
          status: performanceMultiplier > 1.1 ? 'excellent' : performanceMultiplier > 0.9 ? 'good' : 'warning',
          subtitle: 'Monthly growth rate',
          icon: 'TrendingUp'
        };

      case 'collection-rate':
        return {
          value: getRandomFloat(85, 98) * Math.min(performanceMultiplier, 1.05),
          change: getRandomFloat(-5, 8),
          status: performanceMultiplier > 1.05 ? 'excellent' : 'good',
          subtitle: 'On-time collections',
          icon: 'CheckCircle'
        };

      case 'gross-rent-multiplier':
        return {
          value: getRandomFloat(8, 15) / performanceMultiplier,
          change: getRandomFloat(-10, 15),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          subtitle: 'Property value / annual rent',
          icon: 'Building'
        };

      case 'income-per-unit':
        return {
          value: getRandomValue(800, 2200) * performanceMultiplier,
          change: getRandomFloat(-8, 20),
          status: performanceMultiplier > 1.1 ? 'excellent' : performanceMultiplier > 0.9 ? 'good' : 'warning',
          subtitle: 'Average per unit',
          icon: 'DollarSign'
        };

      case 'rental-income-trends':
        return {
          chartData: generateTimeSeriesData(12, 15000 * performanceMultiplier, 0.15),
          chartType: 'line'
        };

      case 'seasonal-income-patterns':
        return {
          chartData: Array.from({ length: 12 }, (_, i) => ({
            x: format(new Date(2024, i, 1), 'MMM'),
            y: Math.round(12000 * performanceMultiplier * (1 + Math.sin(i * Math.PI / 6) * 0.2)),
          })),
          chartType: 'area'
        };

      case 'income-source-breakdown':
        return {
          chartData: generateCategorialData(['Rent', 'Late Fees', 'Pet Fees', 'Parking', 'Other']),
          chartType: 'pie'
        };

      case 'rent-roll-timeline':
        return {
          chartData: generateTimeSeriesData(12, 95 * performanceMultiplier, 0.05),
          chartType: 'bar'
        };

      case 'cash-flow-forecasting':
        return {
          chartData: Array.from({ length: 12 }, (_, i) => ({
            x: format(addDays(new Date(), i * 30), 'MMM yy'),
            y: Math.round(8000 * performanceMultiplier * (1 + i * 0.03)),
            trend: Math.round(8000 * performanceMultiplier * (1 + i * 0.025)),
          })),
          chartType: 'composed'
        };

      case 'vacancy-impact-analysis':
        return {
          panelData: [
            { label: 'Current Vacancy', value: `${(5 / performanceMultiplier).toFixed(1)}%`, change: getRandomFloat(-20, 10) },
            { label: 'Revenue Impact', value: `$${Math.round(2500 / performanceMultiplier).toLocaleString()}`, change: getRandomFloat(-25, 5) },
            { label: 'Days to Fill', value: Math.round(25 / performanceMultiplier), change: getRandomFloat(-30, 15) },
            { label: 'Lost Income', value: `$${Math.round(1200 / performanceMultiplier).toLocaleString()}`, change: getRandomFloat(-40, -5) }
          ],
          insights: [
            'Q4 typically shows 15% higher vacancy rates',
            'Studio units fill 40% faster than 2-bedroom units',
            'Properties with amenities have 25% lower vacancy'
          ],
          recommendations: [
            'Consider seasonal rent adjustments for Q4',
            'Invest in property amenities to reduce vacancy',
            'Implement pre-leasing strategy 60 days before turnover'
          ]
        };

      case 'market-rent-analyzer':
        return {
          panelData: [
            { label: 'Market Rent', value: `$${Math.round(1850 * performanceMultiplier).toLocaleString()}`, change: 8 },
            { label: 'Your Rent', value: `$${Math.round(1650 * performanceMultiplier).toLocaleString()}`, change: 3 },
            { label: 'Opportunity', value: `$${Math.round(200 * performanceMultiplier).toLocaleString()}`, change: 25 },
            { label: 'Increase Potential', value: `${(12 * performanceMultiplier).toFixed(1)}%`, change: 15 }
          ],
          insights: [
            'Your rents are 10.8% below market average',
            'Comparable properties increased rents by 8% this year',
            'Local market supports $200/month increases'
          ],
          recommendations: [
            'Implement phased rent increases over 6 months',
            'Upgrade units to justify premium pricing',
            'Review rent increases at lease renewal'
          ],
          alerts: [
            { message: '3 units significantly below market rent', severity: 'high' },
          ]
        };

      case 'property-income-comparison':
        return {
          chartData: Array.from({ length: 8 }, (_, i) => ({
            name: `Property ${String.fromCharCode(65 + i)}`,
            rent: Math.round((1200 + i * 150) * performanceMultiplier),
            fees: Math.round((80 + i * 20) * performanceMultiplier),
            total: Math.round((1280 + i * 170) * performanceMultiplier),
          })),
          chartType: 'bar'
        };

      case 'market-vs-actual-rent':
        return {
          chartData: Array.from({ length: 6 }, (_, i) => ({
            name: `Property ${String.fromCharCode(65 + i)}`,
            actualRent: Math.round((1400 + i * 200) * performanceMultiplier),
            marketRent: Math.round((1600 + i * 250) * performanceMultiplier),
            variance: Math.round(((1600 + i * 250) - (1400 + i * 200)) * performanceMultiplier),
            color: (1600 + i * 250) > (1400 + i * 200) ? '#ef4444' : '#10b981'
          })),
          chartType: 'bar'
        };

      case 'rent-roll-summary':
        return {
          panelData: [
            { label: 'Total Units', value: '24', change: 0 },
            { label: 'Occupied Units', value: Math.round(22 * performanceMultiplier), change: 4 },
            { label: 'Collection Rate', value: `${(96 * Math.min(performanceMultiplier, 1.05)).toFixed(1)}%`, change: 3 },
            { label: 'Average Rent', value: `$${Math.round(1450 * performanceMultiplier).toLocaleString()}`, change: 8 },
            { label: 'Monthly Revenue', value: `$${Math.round(31900 * performanceMultiplier).toLocaleString()}`, change: 12 },
            { label: 'Late Payments', value: Math.round(2 / performanceMultiplier), change: -25 }
          ],
          insights: [
            'Collection rate improved 3% from last month',
            'Average rent increased $65 from renewals',
            'Studio units show highest demand (98% occupied)'
          ],
          recommendations: [
            'Implement online payment system to improve collection rate',
            'Consider rent increases on below-market units',
            'Focus marketing on 2-bedroom units with lower occupancy'
          ],
          alerts: [
            { message: '2 units have payment delays over 10 days', severity: 'medium' }
          ]
        };

      case 'income-optimization-suggestions':
        return {
          panelData: [
            { label: 'Current Revenue', value: `$${Math.round(42000 * performanceMultiplier).toLocaleString()}`, change: 8 },
            { label: 'Optimization Potential', value: `$${Math.round(5200 * performanceMultiplier).toLocaleString()}`, change: 24 },
            { label: 'Implementation Cost', value: `$${Math.round(1800 / performanceMultiplier).toLocaleString()}`, change: -12 },
            { label: 'ROI Timeline', value: '4.2 months', change: -18 }
          ],
          insights: [
            'Pet fee implementation could add $180/month per pet-owning tenant',
            'Parking fees below market rate by $25/space',
            'Laundry revenue optimization potential of $150/month',
            'Application fees 20% below market average'
          ],
          recommendations: [
            'Implement pet fee policy: $25/month + $200 deposit',
            'Increase parking fees to $45/month (market rate)',
            'Upgrade laundry facilities and adjust pricing',
            'Standardize application fees at $75 per applicant',
            'Add storage unit rentals for additional income',
            'Consider vending machine installation in common areas'
          ],
          alerts: [
            { message: 'Lease renewals coming up - perfect time for fee implementation', severity: 'medium' },
            { message: 'Market rent analysis suggests 8% increase potential', severity: 'low' }
          ]
        };

      default:
        return {
          value: getRandomValue(1000, 5000) * performanceMultiplier,
          change: getRandomFloat(-15, 25),
          status: 'good',
          icon: 'DollarSign'
        };
    }
  }

  // Expenses category widgets
  if (category === 'expenses') {
    switch (widgetType) {
      case 'expense-per-square-foot':
        return {
          value: getRandomFloat(8, 18) / performanceMultiplier,
          change: getRandomFloat(-12, 8),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          subtitle: 'Annual operating cost/sqft',
          icon: 'Building'
        };

      case 'maintenance-efficiency-score':
        return {
          value: getRandomFloat(70, 95) * Math.min(performanceMultiplier, 1.2),
          change: getRandomFloat(-5, 15),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          subtitle: 'Response time & cost efficiency',
          icon: 'Gauge'
        };

      case 'vendor-performance-score':
        return {
          value: getRandomFloat(75, 92) * Math.min(performanceMultiplier, 1.15),
          change: getRandomFloat(-8, 12),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          subtitle: 'Quality & reliability score',
          icon: 'Star'
        };

      case 'expense-variance-ratio':
        return {
          value: getRandomFloat(0.85, 1.25) / Math.min(performanceMultiplier, 1.1),
          change: getRandomFloat(-15, 10),
          status: performanceMultiplier > 1.05 ? 'warning' : 'good',
          subtitle: 'Actual vs budgeted',
          icon: 'Target'
        };

      case 'seasonal-expense-patterns':
        return {
          chartData: Array.from({ length: 12 }, (_, i) => ({
            x: format(new Date(2024, i, 1), 'MMM'),
            y: Math.round(8000 / performanceMultiplier * (1 + Math.cos(i * Math.PI / 6) * 0.3)),
          })),
          chartType: 'area'
        };

      case 'expense-category-trends':
        return {
          chartData: generateTimeSeriesData(12, 6000 / performanceMultiplier, 0.2),
          chartType: 'line'
        };

      case 'vendor-cost-analysis':
        return {
          chartData: generateCategorialData(['HVAC Services', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning', 'Other']),
          chartType: 'bar'
        };

      case 'expense-optimization-opportunities':
        return {
          panelData: [
            { label: 'Current Expenses', value: `$${Math.round(12000 / performanceMultiplier).toLocaleString()}`, change: -8 },
            { label: 'Optimization Target', value: `$${Math.round(10500 / performanceMultiplier).toLocaleString()}`, change: -20 },
            { label: 'Potential Savings', value: `$${Math.round(1500 / performanceMultiplier).toLocaleString()}`, change: 15 },
            { label: 'ROI Timeline', value: '6 months', change: 0 }
          ],
          insights: [
            'HVAC maintenance can reduce energy costs by 15%',
            'Bulk purchasing saves 12% on supplies',
            'Preventive maintenance reduces emergency costs by 30%'
          ],
          recommendations: [
            'Implement preventive maintenance schedules',
            'Negotiate annual contracts with preferred vendors',
            'Install smart thermostats to reduce utility costs',
            'Consider energy-efficient lighting upgrades'
          ],
          alerts: [
            { message: 'HVAC system due for maintenance in 2 properties', severity: 'medium' },
            { message: 'Vendor contract renewal needed', severity: 'low' }
          ]
        };

      default:
        return {
          value: getRandomValue(500, 2000) / performanceMultiplier,
          change: getRandomFloat(-20, 5),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          icon: 'DollarSign'
        };
    }
  }

  // Investment category widgets
  if (category === 'investment') {
    switch (widgetType) {
      case 'portfolio-irr':
        return {
          value: getRandomFloat(8, 18) * performanceMultiplier,
          change: getRandomFloat(-5, 15),
          status: performanceMultiplier > 1.1 ? 'excellent' : performanceMultiplier > 0.9 ? 'good' : 'warning',
          subtitle: 'Internal rate of return',
          icon: 'TrendingUp'
        };

      case 'debt-service-coverage':
        return {
          value: getRandomFloat(1.1, 2.5) * performanceMultiplier,
          change: getRandomFloat(-10, 20),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          subtitle: 'NOI / Debt payments',
          icon: 'Target'
        };

      case 'loan-to-value-ratio':
        return {
          value: getRandomFloat(65, 85) / Math.min(performanceMultiplier, 1.1),
          change: getRandomFloat(-8, 5),
          status: performanceMultiplier > 1.05 ? 'excellent' : 'good',
          subtitle: 'Outstanding loan / Property value',
          icon: 'Building'
        };

      case 'portfolio-diversification-score':
        return {
          value: getRandomFloat(60, 85) * Math.min(performanceMultiplier, 1.2),
          change: getRandomFloat(-5, 12),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          subtitle: 'Geographic & type diversification',
          icon: 'PieChart'
        };

      case 'acquisition-pipeline':
        return {
          chartData: Array.from({ length: 8 }, (_, i) => ({
            x: `Deal ${i + 1}`,
            y: getRandomValue(150000, 500000) * performanceMultiplier,
            status: ['Analyzing', 'Under Contract', 'Due Diligence', 'Closing'][Math.floor(Math.random() * 4)]
          })),
          chartType: 'bar'
        };

      case 'market-value-heatmap':
        return {
          chartData: Array.from({ length: 20 }, (_, i) => ({
            x: getRandomFloat(100, 300),
            y: getRandomFloat(50, 200) * performanceMultiplier,
            size: getRandomValue(1, 4),
            name: `Property ${i + 1}`
          })),
          chartType: 'scatter'
        };

      case 'investment-performance-matrix':
        return {
          chartData: [
            { subject: 'Cash Flow', A: 80 * performanceMultiplier, fullMark: 100 },
            { subject: 'Appreciation', A: 70 * performanceMultiplier, fullMark: 100 },
            { subject: 'ROI', A: 85 * performanceMultiplier, fullMark: 100 },
            { subject: 'Risk Level', A: 60 / performanceMultiplier, fullMark: 100 },
            { subject: 'Liquidity', A: 65 * performanceMultiplier, fullMark: 100 },
            { subject: 'Diversification', A: 75 * performanceMultiplier, fullMark: 100 },
          ],
          chartType: 'radar'
        };

      case 'deal-analyzer':
        return {
          panelData: [
            { label: 'Purchase Price', value: `$${Math.round(350000 * performanceMultiplier).toLocaleString()}`, change: 0 },
            { label: 'Expected NOI', value: `$${Math.round(28000 * performanceMultiplier).toLocaleString()}`, change: 15 },
            { label: 'Cap Rate', value: `${(8 * performanceMultiplier).toFixed(1)}%`, change: 8 },
            { label: 'Cash-on-Cash', value: `${(12 * performanceMultiplier).toFixed(1)}%`, change: 12 }
          ],
          insights: [
            'Property is 5% below market value',
            'Strong rental demand in this submarket',
            'Potential for 10% rent increases within 2 years'
          ],
          recommendations: [
            'Proceed with purchase - meets investment criteria',
            'Consider minor renovations to justify rent increases',
            'Factor in property management costs of 8%'
          ],
          alerts: [
            { message: 'Property inspection needed within 7 days', severity: 'high' },
          ]
        };

      case 'portfolio-optimization-engine':
        return {
          panelData: [
            { label: 'Current Portfolio Value', value: `$${Math.round(2400000 * performanceMultiplier).toLocaleString()}`, change: 12 },
            { label: 'Optimization Score', value: `${Math.round(78 * performanceMultiplier)}`, change: 8 },
            { label: 'Recommended Actions', value: '5', change: 0 },
            { label: 'Potential Value Add', value: `$${Math.round(180000 * performanceMultiplier).toLocaleString()}`, change: 25 }
          ],
          insights: [
            'Portfolio is well-diversified across 3 markets',
            'Cash flow is stable but growth potential exists',
            '2 properties are prime for value-add strategies'
          ],
          recommendations: [
            'Consider refinancing Property A to access equity',
            'Implement value-add renovations on 2 underperforming units',
            'Explore acquisition opportunities in emerging markets',
            'Rebalance portfolio to include more growth-oriented assets'
          ]
        };

      default:
        return {
          value: getRandomValue(50000, 500000) * performanceMultiplier,
          change: getRandomFloat(-10, 25),
          status: performanceMultiplier > 1.1 ? 'excellent' : 'good',
          icon: 'Building'
        };
    }
  }

  // Default fallback
  return {
    value: getRandomValue(100, 1000),
    change: getRandomFloat(-15, 15),
    status: 'good',
    icon: 'Activity'
  };
};