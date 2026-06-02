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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching exchange rates from ExchangeRate-API...');

    // Fetch latest exchange rates from ExchangeRate-API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error(`ExchangeRate-API returned status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received exchange rates:', data);

    const supportedCurrencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'];
    const ratesData = [];

    // Prepare exchange rate records for all supported currency pairs
    for (const fromCurrency of ['USD', ...supportedCurrencies]) {
      for (const toCurrency of ['USD', ...supportedCurrencies]) {
        if (fromCurrency === toCurrency) continue;

        let rate: number;
        
        if (fromCurrency === 'USD') {
          // Direct rate from USD to target currency
          rate = data.rates[toCurrency];
        } else if (toCurrency === 'USD') {
          // Inverse rate from currency to USD
          rate = 1 / data.rates[fromCurrency];
        } else {
          // Cross rate: convert via USD
          rate = data.rates[toCurrency] / data.rates[fromCurrency];
        }

        if (rate) {
          ratesData.push({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: rate,
            source: 'exchangerate-api',
            valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          });
        }
      }
    }

    console.log(`Prepared ${ratesData.length} exchange rate records`);

    // Insert all exchange rates into the database
    const { error: insertError } = await supabase
      .from('exchange_rates')
      .insert(ratesData);

    if (insertError) {
      console.error('Error inserting exchange rates:', insertError);
      throw insertError;
    }

    console.log('Successfully updated exchange rates');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exchange rates updated successfully',
        ratesCount: ratesData.length,
        lastUpdate: data.date,
        baseCurrency: data.base,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-exchange-rates function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
