import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketDataPoint {
  symbol: string;
  currentPrice: number;
  priceChange24h?: number;
  priceChangePercentage24h?: number;
  marketCap?: number;
  volume24h?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  marketStatus: 'open' | 'closed' | 'unknown';
  lastUpdated: string;
  dataSource: string;
}

async function fetchYahooQuote(symbol: string, assetType?: string): Promise<MarketDataPoint | null> {
  try {
    // Support commodity futures (e.g., GC=F, SI=F, CL=F) and bond ETFs
    const formattedSymbol = symbol.toUpperCase();
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=5d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) throw new Error(`Yahoo Finance API error: ${response.status}`);

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (!meta) throw new Error('No data found');

    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose;
    const priceChange = currentPrice - previousClose;
    const priceChangePercentage = previousClose ? (priceChange / previousClose) * 100 : 0;

    // Detect asset type from symbol if not provided
    const isFuture = formattedSymbol.endsWith('=F');
    const detectedType = isFuture ? 'commodity' : assetType;

    return {
      symbol: formattedSymbol,
      currentPrice,
      priceChange24h: priceChange,
      priceChangePercentage24h: priceChangePercentage,
      marketCap: meta.marketCap,
      volume24h: meta.regularMarketVolume,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      previousClose,
      marketStatus: meta.marketState === 'REGULAR' ? 'open' : 'closed',
      lastUpdated: new Date().toISOString(),
      dataSource: isFuture ? 'yahoo-futures' : 'yahoo'
    };
  } catch (error) {
    console.error(`Yahoo Finance quote error for ${symbol}:`, error);
    return null;
  }
}

async function fetchCoinGeckoQuote(coinId: string, symbol: string): Promise<MarketDataPoint | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

    const data = await response.json();
    const coinData = data[coinId];
    
    if (!coinData) throw new Error('No data found');

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: coinData.usd,
      priceChange24h: coinData.usd_24h_change,
      priceChangePercentage24h: coinData.usd_24h_change,
      marketCap: coinData.usd_market_cap,
      volume24h: coinData.usd_24h_vol,
      dayHigh: undefined,
      dayLow: undefined,
      previousClose: coinData.usd - (coinData.usd_24h_change || 0),
      marketStatus: 'open' as const, // Crypto markets are always open
      lastUpdated: new Date().toISOString(),
      dataSource: 'coingecko'
    };
  } catch (error) {
    console.error(`CoinGecko quote error for ${coinId}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, assetType, externalId } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Symbol is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetching market data for ${symbol} (${assetType})`);

    let marketData: MarketDataPoint | null = null;

    if (assetType === 'cryptocurrency' && externalId) {
      marketData = await fetchCoinGeckoQuote(externalId, symbol);
    } else {
      // For stocks, ETFs, commodities (futures), and bonds, use Yahoo Finance
      marketData = await fetchYahooQuote(symbol, assetType);
    }

    if (!marketData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No market data found for symbol: ${symbol}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully fetched market data for ${symbol}: $${marketData.currentPrice}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: marketData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fetch market data error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error during market data fetch'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});