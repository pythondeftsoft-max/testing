import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketObservation {
  price: number;
  changePct24h?: number;
}

interface MarketAlert {
  id: string;
  symbol: string;
  asset_type: string;
  operator: 'price_above' | 'price_below' | 'change_pct_up' | 'change_pct_down';
  threshold: number;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  notes: string | null;
}

interface AlertEvaluation {
  alertId: string;
  symbol: string;
  operator: string;
  threshold: number;
  observed: MarketObservation;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Starting market alerts evaluation');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Authenticated user: ${user.id}`);

    // Parse request body
    const { observations } = await req.json().catch(() => ({}));
    console.log('📊 Observations provided:', observations ? Object.keys(observations).length : 0);

    // Get user's active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('market_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (alertsError) {
      console.error('❌ Error fetching alerts:', alertsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch alerts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${alerts.length} active alerts for user`);

    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, triggered: [], channelInfo: { emailedNow: 0, deferredToDigest: 0 } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get market data for alerts
    let marketData: Record<string, MarketObservation> = {};

    if (observations) {
      // Use provided observations
      marketData = observations;
      console.log('📈 Using provided market observations');
    } else {
      // Fetch market data using batch-market-data function
      const symbols = [...new Set(alerts.map(alert => alert.symbol))];
      console.log(`📡 Fetching market data for symbols: ${symbols.join(', ')}`);

      const { data: batchData, error: batchError } = await supabase.functions.invoke(
        'batch-market-data',
        {
          body: { symbols, forceRefresh: false }
        }
      );

      if (batchError || !batchData?.success) {
        console.error('❌ Error fetching market data:', batchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch market data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Transform batch data to observations format
      if (batchData.data) {
        for (const item of batchData.data) {
          if (item.symbol && item.current_price !== null) {
            marketData[item.symbol] = {
              price: item.current_price,
              changePct24h: item.price_change_percentage_24h || undefined
            };
          }
        }
      }
      console.log(`📊 Fetched market data for ${Object.keys(marketData).length} symbols`);
    }

    // Evaluate alerts
    const triggered: AlertEvaluation[] = [];
    const now = new Date();

    for (const alert of alerts as MarketAlert[]) {
      const observation = marketData[alert.symbol];
      if (!observation) {
        console.log(`⚠️ No market data for symbol: ${alert.symbol}`);
        continue;
      }

      // Check cooldown
      if (alert.last_triggered_at) {
        const lastTriggered = new Date(alert.last_triggered_at);
        const cooldownMs = alert.cooldown_minutes * 60 * 1000;
        const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();
        
        if (timeSinceLastTrigger < cooldownMs) {
          console.log(`⏰ Alert ${alert.id} still in cooldown (${Math.round(timeSinceLastTrigger / 60000)}min ago)`);
          continue;
        }
      }

      // Evaluate alert condition
      let isTriggered = false;
      const { operator, threshold } = alert;
      const { price, changePct24h } = observation;

      switch (operator) {
        case 'price_above':
          isTriggered = price >= threshold;
          break;
        case 'price_below':
          isTriggered = price <= threshold;
          break;
        case 'change_pct_up':
          isTriggered = changePct24h !== undefined && changePct24h >= threshold;
          break;
        case 'change_pct_down':
          isTriggered = changePct24h !== undefined && changePct24h <= -Math.abs(threshold);
          break;
      }

      if (isTriggered) {
        console.log(`🚨 Alert triggered: ${alert.symbol} ${operator} ${threshold}`);
        
        // Update last_triggered_at
        const { error: updateError } = await supabase
          .from('market_alerts')
          .update({ last_triggered_at: now.toISOString() })
          .eq('id', alert.id);

        if (updateError) {
          console.error(`❌ Error updating alert ${alert.id}:`, updateError);
          continue;
        }

        // Create notification
        const notificationTitle = `Alert: ${alert.symbol}`;
        let notificationDescription = '';
        let notificationType: 'warning' | 'success' = 'warning';

        switch (operator) {
          case 'price_above':
            notificationDescription = `${alert.symbol} price ($${price.toFixed(2)}) is above your threshold of $${threshold}`;
            notificationType = 'success';
            break;
          case 'price_below':
            notificationDescription = `${alert.symbol} price ($${price.toFixed(2)}) is below your threshold of $${threshold}`;
            notificationType = 'warning';
            break;
          case 'change_pct_up':
            notificationDescription = `${alert.symbol} is up ${changePct24h?.toFixed(2)}% (above your ${threshold}% threshold)`;
            notificationType = 'success';
            break;
          case 'change_pct_down':
            notificationDescription = `${alert.symbol} is down ${Math.abs(changePct24h || 0).toFixed(2)}% (below your ${Math.abs(threshold)}% threshold)`;
            notificationType = 'warning';
            break;
        }

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: notificationTitle,
            description: notificationDescription,
            type: notificationType,
            link: '/dashboard?portfolioId=everything&tab=assets',
            read: false
          });

        if (notificationError) {
          console.error(`❌ Error creating notification for alert ${alert.id}:`, notificationError);
        } else {
          console.log(`✅ Created notification for alert ${alert.id}`);
        }

        triggered.push({
          alertId: alert.id,
          symbol: alert.symbol,
          operator: alert.operator,
          threshold: alert.threshold,
          observed: observation
        });
      }
    }

    console.log(`🎯 Evaluation complete: ${triggered.length} alerts triggered`);

    // Handle email notifications if alerts were triggered
    let emailedNow = 0;
    let deferredToDigest = 0;

    if (triggered.length > 0) {
      console.log('📧 Checking notification preferences for email delivery');
      
      // Get user's notification preferences for market alerts
      const { data: preferences, error: prefError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('notification_type', 'market_alert')
        .single();

      if (prefError && prefError.code !== 'PGRST116') {
        console.error('❌ Error fetching notification preferences:', prefError);
      } else if (preferences?.email_enabled) {
        console.log(`📧 Email notifications enabled, digest_mode: ${preferences.digest_mode}`);
        
        if (!preferences.digest_mode) {
          // Send immediate email
          const alertSummary = triggered.map(t => `${t.symbol}: ${t.operator} ${t.threshold}`).join(', ');
          
          const { error: emailError } = await supabase
            .from('email_queue')
            .insert({
              user_id: user.id,
              subject: `Market Alert${triggered.length > 1 ? 's' : ''} Triggered`,
              body: `Your market alert${triggered.length > 1 ? 's have' : ' has'} been triggered: ${alertSummary}`,
              link: '/dashboard?portfolioId=everything&tab=assets'
            });

          if (emailError) {
            console.error('❌ Error queuing email:', emailError);
          } else {
            emailedNow = 1;
            console.log('✅ Email queued for immediate delivery');
          }
        } else {
          // Defer to daily digest
          deferredToDigest = triggered.length;
          console.log(`📅 ${triggered.length} alerts deferred to daily digest`);
        }
      } else {
        console.log('📧 Email notifications disabled for user');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        triggered,
        channelInfo: {
          emailedNow,
          deferredToDigest
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});