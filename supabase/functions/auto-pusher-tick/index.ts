import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Read settings
    const { data: settings } = await supabase
      .from('auto_pusher_settings')
      .select('*')
      .eq('singleton', true)
      .maybeSingle();

    if (!settings || !settings.master_enabled) {
      return new Response(JSON.stringify({ skipped: 'master_disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Quiet hours (server time; tenant-local TZ refinement deferred)
    const now = new Date();
    const hour = now.getUTCHours();
    const inQuietHours =
      settings.quiet_hours_start < settings.quiet_hours_end
        ? hour >= settings.quiet_hours_start && hour < settings.quiet_hours_end
        : hour >= settings.quiet_hours_start || hour < settings.quiet_hours_end;
    if (inQuietHours) {
      return new Response(JSON.stringify({ skipped: 'quiet_hours' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Load territory allow-list
    const { data: territories } = await supabase
      .from('auto_pusher_territories')
      .select('*')
      .eq('enabled', true);

    if (!territories || territories.length === 0) {
      return new Response(JSON.stringify({ skipped: 'no_territories' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Pull recent unpushed hot matches
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: matches } = await supabase
      .from('computed_matches')
      .select('id, tenant_id, unit_id, score, tier, breakdown, computed_at')
      .gte('score', settings.score_floor)
      .gte('computed_at', since)
      .order('score', { ascending: false })
      .limit(200);

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ processed: 0, reason: 'no_matches' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Daily cap check
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count: pushesToday } = await supabase
      .from('property_pushes')
      .select('id', { count: 'exact', head: true })
      .eq('push_type', 'auto_pushed')
      .gte('created_at', todayStart.toISOString());

    const remainingCap = Math.max(0, settings.daily_cap_total - (pushesToday || 0));
    if (remainingCap === 0) {
      return new Response(JSON.stringify({ skipped: 'daily_cap_reached' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Process matches
    const stateAllow = new Set(territories.filter((t: any) => t.state).map((t: any) => t.state));
    const cityAllow = new Set(territories.filter((t: any) => t.city).map((t: any) => `${t.state}|${t.city}`));
    const phaAllow = new Set(territories.filter((t: any) => t.housing_authority_id).map((t: any) => t.housing_authority_id));

    let suggested = 0;
    let pushed = 0;
    let processed = 0;

    for (const m of matches) {
      if (processed >= remainingCap) break;

      // Look up unit + property territory
      const { data: unit } = await supabase
        .from('property_units')
        .select('id, on_market, properties!inner(state, city, housing_authority_id)')
        .eq('id', m.unit_id)
        .maybeSingle();

      if (!unit?.on_market) continue;
      const prop: any = (unit as any).properties;
      const inAllowList =
        (prop?.state && stateAllow.has(prop.state)) ||
        (prop?.state && prop?.city && cityAllow.has(`${prop.state}|${prop.city}`)) ||
        (prop?.housing_authority_id && phaAllow.has(prop.housing_authority_id));

      if (!inAllowList) continue;

      // Cooldown check
      const cooldownDate = new Date(Date.now() - settings.cooldown_days * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('property_pushes')
        .select('id')
        .eq('tenant_id', m.tenant_id)
        .eq('unit_id', m.unit_id)
        .gte('created_at', cooldownDate)
        .limit(1);
      if (recent && recent.length > 0) continue;

      // Per-tenant cap
      const { count: tenantPushesToday } = await supabase
        .from('property_pushes')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', m.tenant_id)
        .gte('created_at', todayStart.toISOString());
      if ((tenantPushesToday || 0) >= settings.daily_cap_per_tenant) continue;

      processed++;

      // Suggest mode → insert into queue
      if (settings.mode === 'suggest_only' || settings.dry_run) {
        await supabase
          .from('suggested_pushes')
          .insert({
            tenant_id: m.tenant_id,
            unit_id: m.unit_id,
            property_id: prop?.id || null,
            score: m.score,
            tier: m.tier,
            reasoning: { breakdown: m.breakdown, dry_run: settings.dry_run },
            source_match_id: m.id,
          })
          .then(() => { suggested++; })
          .catch(() => {});
        continue;
      }

      // Auto mode → fire push via property_pushes insert
      const allow = settings.mode === 'auto_hot_decent' ? m.score >= 60 : m.score >= 80;
      if (!allow) continue;

      const { data: push } = await supabase
        .from('property_pushes')
        .insert({
          tenant_id: m.tenant_id,
          property_id: prop?.id,
          unit_id: m.unit_id,
          push_type: 'auto_pushed',
          notes: `Auto-pushed by Matchmaker (score ${m.score})`,
          status: 'push_sent',
          pushed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (push) {
        pushed++;
        // Fire-and-forget Quo SMS via push-notify-tenant
        supabase.functions
          .invoke('push-notify-tenant', { body: { push_id: push.id } })
          .catch((e) => console.warn('[auto-pusher-tick] notify failed', e));
      }
    }

    return new Response(
      JSON.stringify({ processed, suggested, pushed, mode: settings.mode, dry_run: settings.dry_run }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[auto-pusher-tick] Error:', error);
    return new Response(JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
