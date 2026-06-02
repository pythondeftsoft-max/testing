import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketDataRequest {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity';
  externalId?: string;
}

interface BatchRequest {
  requests: MarketDataRequest[];
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requests }: BatchRequest = await req.json();
    
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      throw new Error('Invalid requests array');
    }

    if (requests.length > 50) {
      throw new Error('Too many requests. Maximum 50 symbols allowed');
    }

    console.log(`Processing batch market data for ${requests.length} symbols`);

    const results: Record<string, MarketDataPoint> = {};
    const errors: Record<string, string> = {};

    // Process requests in parallel with Promise.allSettled
    const promises = requests.map(async (request) => {
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-market-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            symbol: request.symbol,
            assetType: request.assetType,
            externalId: request.externalId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          results[request.symbol] = data.data;
        } else {
          errors[request.symbol] = data.error || 'Unknown error';
        }
      } catch (error) {
        console.error(`Error fetching data for ${request.symbol}:`, error);
        errors[request.symbol] = (error instanceof Error ? error.message : String(error)) || 'Failed to fetch data';
      }
    });

    await Promise.allSettled(promises);

    const successCount = Object.keys(results).length;
    const errorCount = Object.keys(errors).length;

    console.log(`Batch completed: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        errors: errorCount > 0 ? errors : undefined,
        summary: {
          total: requests.length,
          successful: successCount,
          failed: errorCount,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Batch market data error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)) || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});