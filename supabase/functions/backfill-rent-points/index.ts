import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Invalid user');

    console.log('[backfill-rent-points] Starting for user', user.id);

    // Find self_reported_rent entries with proof that have no points_history record
    const { data: rentEntries, error: rentError } = await supabase
      .from('self_reported_rent')
      .select('id, month, year, proof_url, plaid_transaction_id')
      .eq('user_id', user.id)
      .not('proof_url', 'is', null);

    if (rentError) throw rentError;

    // Get existing points_history for this user's rent entries
    const { data: existingPoints, error: phError } = await supabase
      .from('points_history')
      .select('related_entity_id')
      .eq('user_id', user.id)
      .like('event_type', 'rent_proof_%');

    if (phError) throw phError;

    const awardedSet = new Set((existingPoints || []).map(p => p.related_entity_id));

    // Filter to entries missing points (file proof only - bank proofs should already be awarded)
    const missing = (rentEntries || []).filter(e => 
      !awardedSet.has(e.id) && e.proof_url && !e.plaid_transaction_id
    );

    console.log(`[backfill-rent-points] Found ${missing.length} entries missing points`);

    if (missing.length === 0) {
      return new Response(
        JSON.stringify({ backfilled: 0, total_points: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current balance
    const { data: balanceData } = await supabase
      .from('points_history')
      .select('points_balance_after')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    let currentBalance = Number(balanceData?.[0]?.points_balance_after ?? 0);
    let totalAwarded = 0;

    // Insert points for each missing entry
    for (const entry of missing) {
      currentBalance += 15;
      totalAwarded += 15;

      const { error: insertError } = await supabase
        .from('points_history')
        .insert({
          user_id: user.id,
          points_change: 15,
          points_balance_after: currentBalance,
          event_type: 'rent_proof_file',
          related_entity_id: entry.id,
          related_entity_type: 'self_reported_rent',
          notes: 'Retroactive: Rent payment file proof verified',
        });

      if (insertError) {
        console.error('[backfill-rent-points] Insert error for', entry.id, insertError);
      }
    }

    console.log(`[backfill-rent-points] Backfilled ${missing.length} entries, ${totalAwarded} total points`);

    return new Response(
      JSON.stringify({ backfilled: missing.length, total_points: totalAwarded }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[backfill-rent-points] Error:', (error instanceof Error ? error.message : String(error)));
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
