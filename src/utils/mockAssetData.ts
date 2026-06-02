// Mock data for asset widgets
export const mockPortfolioData = {
  totalValue: 1247583,
  totalGainLoss: 147583,
  totalGainLossPercent: 13.4,
  diversificationScore: 72,
  assetCount: 14,
  change24h: 2.3,
  change24hValue: 28642,
  
  bestPerformer: {
    symbol: 'BTC',
    name: 'Bitcoin',
    change: 45.2,
    value: 156789
  },
  
  worstPerformer: {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    change: -12.3,
    value: 42150
  },
  
  performanceTimeline: [
    { month: 'Jan', value: 980000 },
    { month: 'Feb', value: 1020000 },
    { month: 'Mar', value: 995000 },
    { month: 'Apr', value: 1050000 },
    { month: 'May', value: 1085000 },
    { month: 'Jun', value: 1120000 },
    { month: 'Jul', value: 1095000 },
    { month: 'Aug', value: 1140000 },
    { month: 'Sep', value: 1180000 },
    { month: 'Oct', value: 1215000 },
    { month: 'Nov', value: 1238000 },
    { month: 'Dec', value: 1247583 }
  ],
  
  assetPriceTrends: [
    { month: 'Jan', BTC: 42000, ETH: 2200, AAPL: 175, TSLA: 220 },
    { month: 'Feb', BTC: 48000, ETH: 2500, AAPL: 180, TSLA: 210 },
    { month: 'Mar', BTC: 45000, ETH: 2300, AAPL: 178, TSLA: 200 },
    { month: 'Apr', BTC: 52000, ETH: 2700, AAPL: 182, TSLA: 195 },
    { month: 'May', BTC: 58000, ETH: 3100, AAPL: 185, TSLA: 198 },
    { month: 'Jun', BTC: 61000, ETH: 3300, AAPL: 188, TSLA: 202 }
  ],
  
  assetClassDistribution: [
    { name: 'Stocks', value: 520000, percentage: 41.7 },
    { name: 'Cryptocurrency', value: 425000, percentage: 34.1 },
    { name: 'Bonds', value: 200000, percentage: 16.0 },
    { name: 'Real Estate', value: 102583, percentage: 8.2 }
  ],
  
  sectorAllocation: [
    { name: 'Technology', value: 498000, percentage: 39.9 },
    { name: 'Finance', value: 312000, percentage: 25.0 },
    { name: 'Healthcare', value: 249000, percentage: 20.0 },
    { name: 'Energy', value: 188583, percentage: 15.1 }
  ],
  
  geographicDistribution: [
    { name: 'North America', value: 748550, percentage: 60.0 },
    { name: 'Europe', value: 311896, percentage: 25.0 },
    { name: 'Asia', value: 187137, percentage: 15.0 }
  ],
  
  historicalPerformance: [
    { period: '1M', return: 3.2 },
    { period: '3M', return: 8.5 },
    { period: '6M', return: 15.8 },
    { period: '1Y', return: 27.3 },
    { period: 'YTD', return: 13.4 }
  ],
  
  correlationMatrix: [
    { asset: 'BTC', BTC: 1.00, ETH: 0.85, AAPL: 0.32, TSLA: 0.45, MSFT: 0.28 },
    { asset: 'ETH', BTC: 0.85, ETH: 1.00, AAPL: 0.30, TSLA: 0.42, MSFT: 0.25 },
    { asset: 'AAPL', BTC: 0.32, ETH: 0.30, AAPL: 1.00, TSLA: 0.65, MSFT: 0.78 },
    { asset: 'TSLA', BTC: 0.45, ETH: 0.42, AAPL: 0.65, TSLA: 1.00, MSFT: 0.58 },
    { asset: 'MSFT', BTC: 0.28, ETH: 0.25, AAPL: 0.78, TSLA: 0.58, MSFT: 1.00 }
  ],
  
  riskReturnData: [
    { asset: 'BTC', risk: 45, return: 85, value: 156789 },
    { asset: 'ETH', risk: 42, return: 72, value: 125000 },
    { asset: 'AAPL', risk: 18, return: 28, value: 98500 },
    { asset: 'TSLA', risk: 35, return: -12, value: 42150 },
    { asset: 'MSFT', risk: 16, return: 32, value: 125000 },
    { asset: 'GOOGL', risk: 19, return: 25, value: 89500 }
  ],
  
  volatilityMetrics: [
    { asset: 'BTC', volatility: 45.2, beta: 1.8, stdDev: 12.5 },
    { asset: 'ETH', volatility: 42.8, beta: 1.7, stdDev: 11.8 },
    { asset: 'AAPL', volatility: 18.5, beta: 1.1, stdDev: 5.2 },
    { asset: 'TSLA', volatility: 35.4, beta: 1.5, stdDev: 9.8 },
    { asset: 'MSFT', volatility: 16.2, beta: 0.9, stdDev: 4.5 },
    { asset: 'GOOGL', volatility: 19.3, beta: 1.0, stdDev: 5.8 }
  ],
  
  drawdownData: [
    { month: 'Jan', drawdown: 0 },
    { month: 'Feb', drawdown: -2.5 },
    { month: 'Mar', drawdown: -5.8 },
    { month: 'Apr', drawdown: -3.2 },
    { month: 'May', drawdown: -1.5 },
    { month: 'Jun', drawdown: 0 },
    { month: 'Jul', drawdown: -4.2 },
    { month: 'Aug', drawdown: -2.1 },
    { month: 'Sep', drawdown: 0 },
    { month: 'Oct', drawdown: -1.8 },
    { month: 'Nov', drawdown: 0 },
    { month: 'Dec', drawdown: 0 }
  ],
  
  sharpeRatios: [
    { asset: 'BTC', sharpe: 1.85, return: 85.2, risk: 45.2 },
    { asset: 'ETH', sharpe: 1.68, return: 72.1, risk: 42.8 },
    { asset: 'AAPL', sharpe: 1.51, return: 28.0, risk: 18.5 },
    { asset: 'MSFT', sharpe: 1.97, return: 32.0, risk: 16.2 },
    { asset: 'GOOGL', sharpe: 1.29, return: 25.0, risk: 19.3 },
    { asset: 'TSLA', sharpe: -0.34, return: -12.3, risk: 35.4 }
  ],
  
  rebalancingSuggestions: [
    { action: 'Reduce', asset: 'BTC', current: 12.6, target: 10.0, difference: -2.6 },
    { action: 'Increase', asset: 'Bonds', current: 16.0, target: 20.0, difference: 4.0 },
    { action: 'Reduce', asset: 'TSLA', current: 3.4, target: 2.0, difference: -1.4 },
    { action: 'Increase', asset: 'MSFT', current: 10.0, target: 12.0, difference: 2.0 }
  ],
  
  performanceAttribution: [
    { factor: 'Asset Selection', contribution: 8.2, percentage: 61.2 },
    { factor: 'Market Timing', contribution: 3.5, percentage: 26.1 },
    { factor: 'Sector Allocation', contribution: 1.7, percentage: 12.7 }
  ],
  
  marketSentiment: {
    score: 68,
    label: 'Greed',
    change: 5,
    description: 'Market showing signs of optimism'
  },
  
  volumeData: [
    { date: 'Mon', volume: 125000 },
    { date: 'Tue', volume: 145000 },
    { date: 'Wed', volume: 132000 },
    { date: 'Thu', volume: 158000 },
    { date: 'Fri', volume: 142000 }
  ],
  
  priceAlerts: [
    { asset: 'BTC', type: 'Above', target: 60000, current: 61234, status: 'triggered' },
    { asset: 'ETH', type: 'Below', target: 3000, current: 3287, status: 'pending' },
    { asset: 'AAPL', type: 'Above', target: 190, current: 188.50, status: 'pending' },
    { asset: 'TSLA', type: 'Below', target: 200, current: 193.20, status: 'triggered' }
  ],
  
  marketNews: [
    {
      title: 'Bitcoin reaches new all-time high',
      source: 'CoinDesk',
      time: '2 hours ago',
      sentiment: 'positive'
    },
    {
      title: 'Fed signals potential rate cuts in 2024',
      source: 'Reuters',
      time: '4 hours ago',
      sentiment: 'positive'
    },
    {
      title: 'Tech stocks show mixed performance',
      source: 'Bloomberg',
      time: '6 hours ago',
      sentiment: 'neutral'
    },
    {
      title: 'Tesla faces production challenges',
      source: 'WSJ',
      time: '8 hours ago',
      sentiment: 'negative'
    }
  ],
  
  economicCalendar: [
    { date: 'Dec 15', event: 'Fed Interest Rate Decision', impact: 'High' },
    { date: 'Dec 18', event: 'GDP Report', impact: 'Medium' },
    { date: 'Dec 20', event: 'Unemployment Claims', impact: 'Low' },
    { date: 'Dec 22', event: 'Consumer Confidence', impact: 'Medium' }
  ],
  
  peerComparison: [
    { metric: 'Return YTD', you: 13.4, peers: 10.2, difference: 3.2 },
    { metric: 'Volatility', you: 25.3, peers: 22.8, difference: 2.5 },
    { metric: 'Sharpe Ratio', you: 1.52, peers: 1.38, difference: 0.14 },
    { metric: 'Max Drawdown', you: -5.8, peers: -7.2, difference: 1.4 }
  ],
  
  benchmarkComparison: [
    { month: 'Jan', portfolio: 0, sp500: 0, bitcoin: 0 },
    { month: 'Feb', portfolio: 4.1, sp500: 2.5, bitcoin: 14.3 },
    { month: 'Mar', portfolio: 1.5, sp500: 3.8, bitcoin: -6.3 },
    { month: 'Apr', portfolio: 7.1, sp500: 4.2, bitcoin: 15.6 },
    { month: 'May', portfolio: 10.7, sp500: 5.5, bitcoin: 38.1 },
    { month: 'Jun', portfolio: 14.3, sp500: 6.8, bitcoin: 45.2 }
  ]
};
