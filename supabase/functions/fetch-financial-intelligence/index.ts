import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assets, portfolioId } = await req.json();
    
    const alphaVantageKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
    
    if (!alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const insights: any[] = [];
    
    // Analyze financial market trends for crypto assets
    for (const asset of assets.filter((a: any) => a.metadata?.asset_type === 'crypto')) {
      try {
        const symbol = asset.metadata?.symbol || asset.asset_name;
        
        // Fetch crypto market data from Alpha Vantage
        const cryptoResponse = await fetch(
          `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${alphaVantageKey}`
        );
        
        if (cryptoResponse.ok) {
          const cryptoData = await cryptoResponse.json();
          
          if (cryptoData['Time Series (Digital Currency Daily)']) {
            const timeSeries = cryptoData['Time Series (Digital Currency Daily)'];
            const dates = Object.keys(timeSeries).slice(0, 7); // Last 7 days
            
            let weeklyChange = 0;
            if (dates.length >= 2) {
              const latestPrice = parseFloat(timeSeries[dates[0]]['4a. close (USD)']);
              const weekAgoPrice = parseFloat(timeSeries[dates[6]]['4a. close (USD)']);
              weeklyChange = ((latestPrice - weekAgoPrice) / weekAgoPrice) * 100;
            }
            
            // Generate insights based on market trend
            if (weeklyChange > 15) {
              insights.push({
                id: `crypto-profit-${asset.id}`,
                title: `Crypto Profit-Taking Opportunity: ${symbol}`,
                description: `${symbol} has gained ${weeklyChange.toFixed(1)}% this week. Market momentum indicators suggest considering partial profit-taking at current levels.`,
                impact: (asset.current_value || 0) * 0.15,
                healthScoreImpact: 2,
                confidence: 75,
                category: 'opportunity',
                priority: 'medium',
                timeframe: 'Next 1-2 weeks',
                healthCategory: 'market_timing',
                dataSource: 'Alpha Vantage Crypto Analysis',
                actionable: true,
                assetType: 'crypto'
              });
            } else if (weeklyChange < -20) {
              insights.push({
                id: `crypto-dca-${asset.id}`,
                title: `Dollar-Cost Averaging Opportunity: ${symbol}`,
                description: `${symbol} is down ${Math.abs(weeklyChange).toFixed(1)}% this week. Consider gradual accumulation during this market correction.`,
                impact: (asset.current_value || 0) * 0.25,
                healthScoreImpact: 3,
                confidence: 70,
                category: 'opportunity',
                priority: 'high',
                timeframe: 'Next 2-4 weeks',
                healthCategory: 'market_timing',
                dataSource: 'Alpha Vantage Market Analysis',
                actionable: true,
                assetType: 'crypto'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error analyzing crypto ${asset.asset_name}:`, error);
      }
    }

    // Analyze stock market trends
    for (const asset of assets.filter((a: any) => a.metadata?.asset_type === 'stock')) {
      try {
        const symbol = asset.metadata?.symbol || asset.asset_name;
        
        // Fetch stock data from Alpha Vantage
        const stockResponse = await fetch(
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${alphaVantageKey}`
        );
        
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          
          if (stockData['Time Series (Daily)']) {
            const timeSeries = stockData['Time Series (Daily)'];
            const dates = Object.keys(timeSeries).slice(0, 30); // Last 30 days
            
            let monthlyChange = 0;
            if (dates.length >= 20) {
              const latestPrice = parseFloat(timeSeries[dates[0]]['4. close']);
              const monthAgoPrice = parseFloat(timeSeries[dates[19]]['4. close']);
              monthlyChange = ((latestPrice - monthAgoPrice) / monthAgoPrice) * 100;
            }
            
            // Check for dividend opportunities
            if (monthlyChange > 10) {
              insights.push({
                id: `stock-rebalance-${asset.id}`,
                title: `Stock Rebalancing Opportunity: ${symbol}`,
                description: `${symbol} has outperformed by ${monthlyChange.toFixed(1)}% this month. Consider rebalancing to maintain target allocation and lock in gains.`,
                impact: (asset.current_value || 0) * 0.12,
                healthScoreImpact: 2,
                confidence: 80,
                category: 'opportunity',
                priority: 'medium',
                timeframe: 'Next 3-6 weeks',
                healthCategory: 'diversification',
                dataSource: 'Alpha Vantage Stock Analysis',
                actionable: true,
                assetType: 'stock'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error analyzing stock ${asset.asset_name}:`, error);
      }
    }

    // Generate sector rotation insights
    const stockAssets = assets.filter((a: any) => a.metadata?.asset_type === 'stock');
    if (stockAssets.length > 0) {
      // Fetch sector performance data
      try {
        const sectorResponse = await fetch(
          `https://www.alphavantage.co/query?function=SECTOR&apikey=${alphaVantageKey}`
        );
        
        if (sectorResponse.ok) {
          const sectorData = await sectorResponse.json();
          
          if (sectorData['Rank A: Real-Time Performance']) {
            const sectors = sectorData['Rank A: Real-Time Performance'];
            const topSector = Object.keys(sectors)[0];
            const topSectorGain = parseFloat(sectors[topSector].replace('%', ''));
            
            if (topSectorGain > 2) {
              insights.push({
                id: 'sector-rotation-opportunity',
                title: `Sector Rotation Opportunity: ${topSector}`,
                description: `${topSector} is leading market performance today with ${topSectorGain.toFixed(1)}% gains. Consider increasing allocation to capitalize on momentum.`,
                impact: 25000,
                healthScoreImpact: 3,
                confidence: 70,
                category: 'opportunity',
                priority: 'medium',
                timeframe: 'Next 2-4 weeks',
                healthCategory: 'market_timing',
                dataSource: 'Alpha Vantage Sector Analysis',
                actionable: true,
                assetType: 'stock'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error analyzing sector performance:', error);
      }
    }

    // Generate economic indicator insights
    try {
      // Fetch key economic indicators
      const fedFundsResponse = await fetch(
        `https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&interval=monthly&apikey=${alphaVantageKey}`
      );
      
      if (fedFundsResponse.ok) {
        const fedData = await fedFundsResponse.json();
        
        if (fedData.data && fedData.data.length > 1) {
          const currentRate = parseFloat(fedData.data[0].value);
          const previousRate = parseFloat(fedData.data[1].value);
          
          if (currentRate > previousRate) {
            insights.push({
              id: 'interest-rate-impact',
              title: 'Rising Interest Rates: Portfolio Adjustment',
              description: `Federal funds rate increased to ${currentRate.toFixed(2)}%. Consider reducing duration risk in bond positions and increasing allocation to floating rate assets.`,
              impact: -15000,
              healthScoreImpact: -2,
              confidence: 85,
              category: 'risk',
              priority: 'medium',
              timeframe: 'Next 1-3 months',
              healthCategory: 'market_timing',
              dataSource: 'Federal Reserve Economic Data',
              actionable: true,
              assetType: 'mixed'
            });
          } else if (currentRate < previousRate) {
            insights.push({
              id: 'rate-cut-opportunity',
              title: 'Falling Rates: Growth Asset Opportunity',
              description: `Federal funds rate decreased to ${currentRate.toFixed(2)}%. Lower rates support higher valuations for growth assets and real estate.`,
              impact: 35000,
              healthScoreImpact: 4,
              confidence: 80,
              category: 'opportunity',
              priority: 'high',
              timeframe: 'Next 2-6 months',
              healthCategory: 'market_timing',
              dataSource: 'Federal Reserve Economic Data',
              actionable: true,
              assetType: 'mixed'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing economic indicators:', error);
    }

    return new Response(JSON.stringify({ 
      insights,
      success: true,
      dataSource: 'Alpha Vantage Financial Intelligence'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-financial-intelligence function:', error);
    return new Response(JSON.stringify({ 
      error: (error instanceof Error ? error.message : String(error)),
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});