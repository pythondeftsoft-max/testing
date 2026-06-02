import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  try {
    const { symbol, assetType, range, interval } = await req.json();

    if (!symbol) {
      console.error('Missing required parameter: symbol');
      return new Response(
        JSON.stringify({ success: false, error: 'Symbol is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();
    console.log(`Fetching price history for ${upperSymbol} (${assetType}) - ${range} ${interval}`);

    // Step 1: Check cache first using the RPC
    const minDateTime = getMinDateTimeForRange(range);
    console.log(`Checking cache for data since: ${minDateTime.toISOString()}`);
    
    const { data: cachedData, error: cacheError } = await supabase.rpc('get_cached_price_history', {
      p_symbol: upperSymbol,
      p_interval: interval,
      p_min_date_time: minDateTime.toISOString(),
      p_limit: 5000
    });

    if (cacheError) {
      console.warn('Cache lookup error:', cacheError);
    }

    // Normalize cached data
    const cacheArray = Array.isArray(cachedData) ? cachedData : [];
    const isCachedDataSufficient = cacheArray.length > 0 && isDataFreshEnough(cacheArray, range);

    if (isCachedDataSufficient) {
      console.log(`Using cached data: ${cacheArray.length} points for ${upperSymbol}`);
      
      const priceHistory = cacheArray.map((point: any) => ({
        timestamp: point.timestamp,
        open: point.open || 0,
        high: point.high || 0,
        low: point.low || 0,
        close: point.close || 0,
        volume: Number(point.volume) || 0
      }));

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            symbol: upperSymbol,
            range,
            interval,
            priceHistory,
            dataSource: 'cache',
            lastUpdated: new Date().toISOString()
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch fresh data from external providers
    console.log(`Cache insufficient, fetching fresh data for ${upperSymbol}`);
    let priceData: any[] = [];
    let dataSource = 'unknown';

    if (assetType === 'crypto') {
      // Try CoinGecko first, then CoinPaprika
      try {
        priceData = await fetchCryptoPriceHistory(upperSymbol, range, 'coingecko');
        dataSource = 'coingecko';
      } catch (error) {
        console.warn(`CoinGecko failed for ${upperSymbol}:`, error);
        try {
          priceData = await fetchCryptoPriceHistory(upperSymbol, range, 'coinpaprika');
          dataSource = 'coinpaprika';
        } catch (error2) {
          console.error(`CoinPaprika also failed for ${upperSymbol}:`, error2);
          throw new Error('All crypto providers failed');
        }
      }
    } else {
      // Try Yahoo Finance first, then Stooq
      try {
        priceData = await fetchYahooPriceHistory(upperSymbol, range, interval);
        dataSource = 'yahoo';
      } catch (error) {
        console.warn(`Yahoo Finance failed for ${upperSymbol}:`, error);
        try {
          priceData = await fetchStooqPriceHistory(upperSymbol, range, interval);
          dataSource = 'stooq';
        } catch (error2) {
          console.error(`Stooq also failed for ${upperSymbol}:`, error2);
          throw new Error('All stock providers failed');
        }
      }
    }

    if (!priceData || priceData.length === 0) {
      throw new Error('No price data found');
    }

    console.log(`Fetched ${priceData.length} data points from ${dataSource} for ${upperSymbol}`);

    // Step 3: Cache the fresh data using RPC
    try {
      const { error: upsertError } = await supabase.rpc('upsert_asset_price_history_batch', {
        p_symbol: upperSymbol,
        p_interval: interval,
        p_price_data: priceData
      });

      if (upsertError) {
        console.error('Failed to cache price data:', upsertError);
      } else {
        console.log(`Successfully cached ${priceData.length} points for ${upperSymbol}`);
      }
    } catch (cacheError) {
      console.error('Cache upsert error:', cacheError);
    }

    // Step 4: Return the fresh data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          symbol: upperSymbol,
          range,
          interval,
          priceHistory: priceData,
          dataSource,
          lastUpdated: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-price-history:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Internal server error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper functions
function getMinDateTimeForRange(range: string): Date {
  const now = new Date();
  const rangeToDays: Record<string, number> = {
    '1D': 1,
    '5D': 5,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    '2Y': 730,
    '5Y': 1825,
    'YTD': Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
    'MAX': 3650
  };
  
  const days = rangeToDays[range] || 30;
  return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
}

function isDataFreshEnough(cachedData: any[], range: string): boolean {
  if (!cachedData || cachedData.length === 0) return false;
  
  const latestPoint = new Date(cachedData[cachedData.length - 1].timestamp);
  const now = new Date();
  const hoursSinceLatest = (now.getTime() - latestPoint.getTime()) / (1000 * 60 * 60);
  
  // Consider data fresh if it's less than 6 hours old for most ranges
  const freshnessThreshold = range === '1D' ? 1 : 6;
  return hoursSinceLatest < freshnessThreshold;
}

// External provider functions
async function fetchCryptoPriceHistory(symbol: string, range: string, provider: string = 'coingecko'): Promise<any[]> {
  if (provider === 'coingecko') {
    return await fetchCoinGeckoData(symbol, range);
  } else {
    return await fetchCoinPaprikaData(symbol, range);
  }
}

async function fetchCoinGeckoData(symbol: string, days: string): Promise<any[]> {
  // Convert range to days
  const daysMap: Record<string, number | string> = {
    '1D': 1, '5D': 5, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '5Y': 1825, 'YTD': 365, 'MAX': 'max'
  };
  const daysParam = daysMap[days] || 30;

  // Map common symbols to CoinGecko IDs
  const symbolMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'SOL': 'solana',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'AAVE': 'aave'
  };

  const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${daysParam}`;
  
  console.log(`Fetching from CoinGecko: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid CoinGecko response format');
  }

  return data.map((item: number[]) => ({
    timestamp: new Date(item[0]).toISOString(),
    open: item[1],
    high: item[2],
    low: item[3],
    close: item[4],
    volume: 0 // CoinGecko OHLC doesn't include volume in this endpoint
  }));
}

async function fetchCoinPaprikaData(symbol: string, days: string): Promise<any[]> {
  // Convert range to days for CoinPaprika
  const daysMap: Record<string, number> = {
    '1D': 1, '5D': 5, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '5Y': 1825, 'YTD': 365, 'MAX': 1825
  };
  const daysParam = daysMap[days] || 30;

  // Get coin ID from symbol
  const searchUrl = `https://api.coinpaprika.com/v1/search?q=${symbol}&c=currencies&limit=1`;
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    throw new Error(`CoinPaprika search error: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  if (!searchData.currencies || searchData.currencies.length === 0) {
    throw new Error(`Symbol ${symbol} not found in CoinPaprika`);
  }

  const coinId = searchData.currencies[0].id;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (daysParam * 24 * 60 * 60 * 1000));
  
  const url = `https://api.coinpaprika.com/v1/coins/${coinId}/ohlcv/historical?start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`;
  
  console.log(`Fetching from CoinPaprika: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinPaprika API error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid CoinPaprika response format');
  }

  return data.map((item: any) => ({
    timestamp: item.time_open,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume
  }));
}

async function fetchYahooPriceHistory(symbol: string, range: string, interval: string): Promise<any[]> {
  // Convert our range to Yahoo Finance format
  const rangeMap: Record<string, string> = {
    '1D': '1d', '5D': '5d', '1M': '1mo', '3M': '3mo', 
    '6M': '6mo', '1Y': '1y', '2Y': '2y', '5Y': '5y', 
    'YTD': 'ytd', 'MAX': 'max'
  };
  
  const yahooRange = rangeMap[range] || '1mo';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${yahooRange}&interval=${interval}`;
  
  console.log(`Fetching from Yahoo Finance: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error('No data found in Yahoo Finance response');
  }

  const timestamps = result.timestamp;
  const ohlcv = result.indicators?.quote?.[0];
  if (!timestamps || !ohlcv) {
    throw new Error('Invalid Yahoo Finance data structure');
  }

  return timestamps.map((timestamp: number, index: number) => ({
    timestamp: new Date(timestamp * 1000).toISOString(),
    open: ohlcv.open[index] || 0,
    high: ohlcv.high[index] || 0,
    low: ohlcv.low[index] || 0,
    close: ohlcv.close[index] || 0,
    volume: ohlcv.volume[index] || 0
  })).filter(point => point.close > 0); // Filter out invalid data points
}

async function fetchStooqPriceHistory(symbol: string, range: string, interval: string): Promise<any[]> {
  // Stooq uses different symbol format and intervals
  const stooqSymbol = symbol.toLowerCase();
  
  // Calculate date range for Stooq
  const endDate = new Date();
  const startDate = getMinDateTimeForRange(range);
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  };

  // Stooq interval mapping
  const intervalMap: Record<string, string> = {
    '1d': 'd', '1wk': 'w', '1mo': 'm'
  };
  const stooqInterval = intervalMap[interval] || 'd';
  
  const url = `https://stooq.com/q/d/l/?s=${stooqSymbol}&d1=${formatDate(startDate)}&d2=${formatDate(endDate)}&i=${stooqInterval}`;
  
  console.log(`Fetching from Stooq: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Stooq API error: ${response.status}`);
  }

  const csvData = await response.text();
  const lines = csvData.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('No data in Stooq response');
  }

  // Skip header line
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const [date, time, open, high, low, close, volume] = line.split(',');
    return {
      timestamp: new Date(`${date} ${time || '00:00:00'}`).toISOString(),
      open: parseFloat(open) || 0,
      high: parseFloat(high) || 0,
      low: parseFloat(low) || 0,
      close: parseFloat(close) || 0,
      volume: parseFloat(volume) || 0
    };
  }).filter(point => point.close > 0);
}