import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SymbolSearchResult {
  symbol: string;
  displayName: string;
  assetType: 'stock' | 'cryptocurrency' | 'etf';
  exchange?: string;
  externalId?: string;
  dataSource: string;
}

async function searchYahooFinance(query: string): Promise<SymbolSearchResult[]> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&enableCb=true&enableNavLinks=true&enableEnhancedTrivialQuery=true`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) throw new Error(`Yahoo Finance API error: ${response.status}`);

    const data = await response.json();
    
    return (data?.quotes || []).map((quote: any) => ({
      symbol: quote.symbol,
      displayName: quote.longname || quote.shortname || quote.symbol,
      assetType: quote.typeDisp === 'ETF' ? 'etf' : 'stock',
      exchange: quote.exchange,
      externalId: quote.symbol,
      dataSource: 'yahoo'
    })).slice(0, 10);
  } catch (error) {
    console.error('Yahoo Finance search error:', error);
    return [];
  }
}

async function searchCoinGecko(query: string): Promise<SymbolSearchResult[]> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

    const data = await response.json();
    
    return (data?.coins || []).map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      displayName: coin.name,
      assetType: 'cryptocurrency' as const,
      exchange: undefined,
      externalId: coin.id,
      dataSource: 'coingecko'
    })).slice(0, 10);
  } catch (error) {
    console.error('CoinGecko search error:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, assetTypes = ['stock', 'cryptocurrency', 'etf'] } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Query must be at least 2 characters long'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Searching for symbols: "${query}" with types: ${assetTypes.join(', ')}`);

    const searchPromises: Promise<SymbolSearchResult[]>[] = [];

    // Search stocks/ETFs via Yahoo Finance
    if (assetTypes.includes('stock') || assetTypes.includes('etf')) {
      searchPromises.push(searchYahooFinance(query));
    }

    // Search crypto via CoinGecko
    if (assetTypes.includes('cryptocurrency')) {
      searchPromises.push(searchCoinGecko(query));
    }

    const results = await Promise.all(searchPromises);
    const allResults = results.flat();

    // Filter by requested asset types and remove duplicates
    const filteredResults = allResults
      .filter(result => assetTypes.includes(result.assetType))
      .reduce((unique: SymbolSearchResult[], result) => {
        if (!unique.find(r => r.symbol === result.symbol && r.dataSource === result.dataSource)) {
          unique.push(result);
        }
        return unique;
      }, [])
      .slice(0, 20); // Limit to 20 results

    console.log(`Found ${filteredResults.length} symbols for query: "${query}"`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          query,
          results: filteredResults,
          totalFound: filteredResults.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Search symbols error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error during symbol search'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});