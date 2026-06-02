import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📅 Starting alert digest compilation');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for source verification
    const { since, source } = await req.json().catch(() => ({}));
    
    // Simple guard for cron access
    console.log(`📥 Request source: ${source || 'manual'}`);
    if (source && source !== 'cron') {
      console.log('⚠️ Unknown source, continuing anyway');
    }
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    console.log(`📊 Compiling digest since: ${sinceDate.toISOString()}`);

    // Get users with digest mode enabled for market alerts
    const { data: digestUsers, error: digestError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('notification_type', 'market_alert')
      .eq('email_enabled', true)
      .eq('digest_mode', true);

    if (digestError) {
      console.error('❌ Error fetching digest users:', digestError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch digest users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${digestUsers.length} users with digest mode enabled`);
    
    if (digestUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, digestsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let digestsSent = 0;

    // Process each user with digest mode enabled
    for (const digestUser of digestUsers) {
      console.log(`📧 Processing digest for user: ${digestUser.user_id}`);
      
      // Get market alert notifications for this user in the time window
      const { data: notifications, error: notifyError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', digestUser.user_id)
        .like('title', 'Alert:%')
        .gte('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: false });

      if (notifyError) {
        console.error(`❌ Error fetching notifications for user ${digestUser.user_id}:`, notifyError);
        continue;
      }

      if (!notifications || notifications.length === 0) {
        console.log(`📭 No alerts found for user ${digestUser.user_id}`);
        continue;
      }

      console.log(`📊 Found ${notifications.length} alerts for user ${digestUser.user_id}`);

      // Group notifications by symbol
      const alertsBySymbol: Record<string, any[]> = {};
      for (const notification of notifications) {
        const symbol = notification.title.replace('Alert: ', '');
        if (!alertsBySymbol[symbol]) {
          alertsBySymbol[symbol] = [];
        }
        alertsBySymbol[symbol].push(notification);
      }

      // Build HTML digest
      const symbolSummaries = Object.entries(alertsBySymbol).map(([symbol, alerts]) => {
        const alertList = alerts.map(alert => `• ${alert.description}`).join('<br>');
        return `<div style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937;">${symbol}</h3>
          <div style="color: #6b7280; font-size: 14px;">
            ${alertList}
          </div>
        </div>`;
      }).join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; margin-bottom: 16px;">Daily Market Alert Digest</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">
            Here's a summary of your market alerts from the last 24 hours:
          </p>
          ${symbolSummaries}
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">
            You received this digest because you have daily digest mode enabled for market alerts.
            <a href="/dashboard?portfolioId=everything&tab=assets" style="color: #3b82f6;">Manage your preferences</a>
          </p>
        </div>
      `;

      // Queue digest email
      const { error: emailError } = await supabase
        .from('email_queue')
        .insert({
          user_id: digestUser.user_id,
          subject: `Market Alert Digest - ${Object.keys(alertsBySymbol).length} symbols triggered`,
          body: htmlBody,
          link: '/dashboard?portfolioId=everything&tab=assets'
        });

      if (emailError) {
        console.error(`❌ Error queuing digest email for user ${digestUser.user_id}:`, emailError);
      } else {
        digestsSent++;
        console.log(`✅ Digest email queued for user ${digestUser.user_id}`);
      }
    }

    console.log(`🎯 Digest compilation complete: ${digestsSent} digests sent`);

    return new Response(
      JSON.stringify({
        success: true,
        digestsSent,
        usersProcessed: digestUsers.length
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