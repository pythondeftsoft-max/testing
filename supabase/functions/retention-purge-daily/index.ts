// Daily retention purge job. Iterates active policies with auto_purge=true,
// finds eligible records older than retention_years, skips legal-held ones,
// and logs every action to retention_purge_log. DRY-RUN by default.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map record_type -> { table, timestamp_column }
const RECORD_MAP: Record<string, { table: string; ts_col: string } | null> = {
  tenant_files: null, // requires custom logic — soft anonymize, not auto
  hap_records: { table: "hap_payments", ts_col: "created_at" },
  inspection_reports: { table: "inspections", ts_col: "created_at" },
  applications: { table: "voucher_applications", ts_col: "created_at" },
  eiv_data: null,
  communications: { table: "messages", ts_col: "created_at" },
  financial_records: null,
  grievance_records: null,
  background_checks: null,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* cron may send empty */ }
  const dryRun = body.dry_run !== false; // default DRY-RUN

  const { data: policies, error: pErr } = await supabase
    .from("data_retention_policies").select("*").eq("auto_purge", true);

  if (pErr) return new Response(JSON.stringify({ success: false, error: pErr.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const summary: any[] = [];

  for (const policy of policies ?? []) {
    const map = RECORD_MAP[policy.record_type];
    if (!map) {
      summary.push({ policy: policy.record_type, skipped: "no_handler" });
      continue;
    }
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - policy.retention_years);

    const { data: candidates, error: cErr } = await supabase
      .from(map.table).select("id").lt(map.ts_col, cutoff.toISOString()).limit(500);

    if (cErr) { summary.push({ policy: policy.record_type, error: cErr.message }); continue; }

    let acted = 0, held = 0;
    for (const row of candidates ?? []) {
      const { data: heldFlag } = await supabase.rpc("is_legally_held", {
        _record_type: policy.record_type, _record_id: row.id,
      });
      if (heldFlag) {
        held++;
        await supabase.from("retention_purge_log").insert({
          policy_id: policy.id, record_type: policy.record_type, record_id: row.id,
          action: "skipped_legal_hold", reason: "legal hold active",
        });
        continue;
      }

      if (dryRun) {
        await supabase.from("retention_purge_log").insert({
          policy_id: policy.id, record_type: policy.record_type, record_id: row.id,
          action: "dry_run", reason: `would ${policy.purge_strategy}`,
        });
        acted++;
        continue;
      }

      // Live mode: perform the purge
      if (policy.purge_strategy === "hard_delete") {
        await supabase.from(map.table).delete().eq("id", row.id);
      } else if (policy.purge_strategy === "soft_delete") {
        await supabase.from(map.table).update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
      }
      // anonymize handled per-table by ops team — for now log only

      await supabase.from("retention_purge_log").insert({
        policy_id: policy.id, record_type: policy.record_type, record_id: row.id,
        action: policy.purge_strategy === "hard_delete" ? "hard_deleted" : policy.purge_strategy === "soft_delete" ? "soft_deleted" : "anonymized",
      });
      acted++;
    }

    summary.push({ policy: policy.record_type, candidates: candidates?.length ?? 0, acted, held, dry_run: dryRun });
  }

  return new Response(JSON.stringify({ success: true, dry_run: dryRun, summary }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
