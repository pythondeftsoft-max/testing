import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, data?: any) {
  console.log(`[log-rent-payment-points] ${step}`, data ? JSON.stringify(data, null, 2) : '');
}

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

    const { rent_entry_id, month, year, has_file_proof, has_bank_proof } = await req.json();

    if (!rent_entry_id || !month || !year) {
      throw new Error('Missing required fields: rent_entry_id, month, year');
    }

    logStep('Processing points award', { userId: user.id, rent_entry_id, month, year, has_file_proof, has_bank_proof });

    // Idempotency: check if points already awarded for this entry
    const { data: existingHistory } = await supabase
      .from('points_history')
      .select('id')
      .eq('related_entity_id', rent_entry_id)
      .like('event_type', 'rent_proof_%')
      .limit(1);

    if (existingHistory && existingHistory.length > 0) {
      logStep('Points already awarded for this entry, skipping', { rent_entry_id });
      return new Response(
        JSON.stringify({ points_awarded: 0, tier: 'already_awarded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine tier
    let points_awarded = 0;
    let event_type = '';
    let tier = 'none';

    if (has_bank_proof) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-indexed
      const currentYear = now.getFullYear();
      const isCurrentMonth = Number(month) === currentMonth && Number(year) === currentYear;

      if (isCurrentMonth) {
        points_awarded = 50;
        event_type = 'rent_proof_bank_current';
        tier = 'bank_current';
      } else {
        points_awarded = 25;
        event_type = 'rent_proof_bank_backdated';
        tier = 'bank_backdated';
      }
    } else if (has_file_proof) {
      points_awarded = 15;
      event_type = 'rent_proof_file';
      tier = 'file';
    } else {
      logStep('No proof provided, no points awarded');
      return new Response(
        JSON.stringify({ points_awarded: 0, tier: 'none' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Awarding points', { points_awarded, event_type, tier });

    // Get user's current points balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('points_history')
      .select('points_balance_after')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (balanceError) {
      logStep('Error fetching balance', balanceError);
      throw new Error(`Failed to fetch balance: ${balanceError.message}`);
    }

    const currentBalance = balanceData?.[0]?.points_balance_after ?? 0;
    const newBalance = Number(currentBalance) + points_awarded;

    // Directly insert into points_history (bypasses admin audit table)
    const { error: insertError } = await supabase
      .from('points_history')
      .insert({
        user_id: user.id,
        points_change: points_awarded,
        points_balance_after: newBalance,
        event_type,
        related_entity_id: rent_entry_id,
        related_entity_type: 'self_reported_rent',
        notes: `Rent payment proof verified: ${event_type}`,
      });

    if (insertError) {
      logStep('Error inserting points_history', insertError);
      throw new Error(`Failed to award points: ${insertError.message}`);
    }

    logStep('Points awarded successfully', { points_awarded, tier, userId: user.id });

    return new Response(
      JSON.stringify({ points_awarded, tier }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('Error', { error: (error instanceof Error ? error.message : String(error)) });
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
