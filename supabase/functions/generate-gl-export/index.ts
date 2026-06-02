import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Format = "quickbooks_iif" | "sage_csv" | "generic_csv" | "generic_journal";

interface JournalLine {
  date: string;
  account: string;
  memo: string;
  debit: number;
  credit: number;
  reference: string;
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildGenericCsv(lines: JournalLine[]): string {
  const header = "Date,Reference,Account,Memo,Debit,Credit";
  const rows = lines.map(l =>
    [l.date, l.reference, l.account, l.memo, l.debit.toFixed(2), l.credit.toFixed(2)].map(csvEscape).join(",")
  );
  return [header, ...rows].join("\n");
}

function buildSageCsv(lines: JournalLine[]): string {
  // Sage 50/Intacct generic journal CSV
  const header = "Type,Date,Reference,Account No,Description,Debit,Credit";
  const rows = lines.map(l =>
    ["JE", l.date, l.reference, l.account, l.memo, l.debit.toFixed(2), l.credit.toFixed(2)].map(csvEscape).join(",")
  );
  return [header, ...rows].join("\n");
}

function buildQuickBooksIIF(lines: JournalLine[]): string {
  // QuickBooks Desktop IIF format — tab-delimited
  const header = [
    "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO",
    "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO",
    "!ENDTRNS",
  ].join("\n");

  // Group lines into balanced journal entries by reference
  const groups = new Map<string, JournalLine[]>();
  for (const l of lines) {
    if (!groups.has(l.reference)) groups.set(l.reference, []);
    groups.get(l.reference)!.push(l);
  }

  const out: string[] = [header];
  let trnsId = 1;
  for (const [ref, group] of groups) {
    if (group.length === 0) continue;
    const first = group[0];
    const total = group.reduce((sum, l) => sum + l.debit, 0);
    out.push(`TRNS\t${trnsId}\tGENERAL JOURNAL\t${first.date}\t${first.account}\t\t${(-total).toFixed(2)}\t${ref}\t${first.memo}`);
    for (const l of group) {
      const amt = l.debit > 0 ? l.debit : -l.credit;
      out.push(`SPL\t${trnsId}\tGENERAL JOURNAL\t${l.date}\t${l.account}\t\t${amt.toFixed(2)}\t${ref}\t${l.memo}`);
    }
    out.push("ENDTRNS");
    trnsId++;
  }
  return out.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { agency_id, format, period_start, period_end, source_types, export_name } = await req.json();

    if (!agency_id || !format || !period_start || !period_end) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sources: string[] = source_types && Array.isArray(source_types) && source_types.length > 0
      ? source_types : ["hap_batches"];

    const journalLines: JournalLine[] = [];
    let totalAmount = 0;

    // ---- HAP Batches ----
    if (sources.includes("hap_batches")) {
      const { data: batches } = await supabase
        .from("hap_batches")
        .select("id, batch_number, payment_date, total_amount, status")
        .eq("agency_id", agency_id)
        .gte("payment_date", period_start)
        .lte("payment_date", period_end);

      for (const b of batches || []) {
        const amt = parseFloat(b.total_amount || 0);
        if (amt === 0) continue;
        const ref = b.batch_number || `HAP-${b.id.slice(0, 8)}`;
        const date = b.payment_date;
        // Debit: HAP Expense; Credit: Cash/Clearing
        journalLines.push({
          date, reference: ref, account: "5100 - HAP Expense",
          memo: `HAP batch ${ref}`, debit: amt, credit: 0,
        });
        journalLines.push({
          date, reference: ref, account: "1010 - Cash - HAP Disbursements",
          memo: `HAP batch ${ref}`, debit: 0, credit: amt,
        });
        totalAmount += amt;
      }
    }

    // ---- Tenant Ledger entries ----
    if (sources.includes("tenant_ledger")) {
      const { data: ledger } = await supabase
        .from("agency_tenant_ledger")
        .select("id, tenant_id, transaction_date, transaction_type, amount, description")
        .eq("agency_id", agency_id)
        .gte("transaction_date", period_start)
        .lte("transaction_date", period_end);

      for (const e of ledger || []) {
        const amt = parseFloat(e.amount || 0);
        if (amt === 0) continue;
        const ref = `TL-${e.id.slice(0, 8)}`;
        const date = e.transaction_date;
        const isPayment = (e.transaction_type || "").toLowerCase().includes("payment");
        if (isPayment) {
          journalLines.push({
            date, reference: ref, account: "1020 - Cash - Tenant Receipts",
            memo: e.description || "Tenant payment", debit: amt, credit: 0,
          });
          journalLines.push({
            date, reference: ref, account: "1200 - Tenant A/R",
            memo: e.description || "Tenant payment", debit: 0, credit: amt,
          });
        } else {
          journalLines.push({
            date, reference: ref, account: "1200 - Tenant A/R",
            memo: e.description || "Tenant charge", debit: amt, credit: 0,
          });
          journalLines.push({
            date, reference: ref, account: "4100 - Tenant Rent Revenue",
            memo: e.description || "Tenant charge", debit: 0, credit: amt,
          });
        }
        totalAmount += amt;
      }
    }

    // Build file content
    let content = "";
    let extension = "csv";
    let contentType = "text/csv";

    switch (format as Format) {
      case "quickbooks_iif":
        content = buildQuickBooksIIF(journalLines);
        extension = "iif";
        contentType = "text/plain";
        break;
      case "sage_csv":
        content = buildSageCsv(journalLines);
        break;
      case "generic_journal":
        content = JSON.stringify({ period_start, period_end, lines: journalLines }, null, 2);
        extension = "json";
        contentType = "application/json";
        break;
      case "generic_csv":
      default:
        content = buildGenericCsv(journalLines);
        break;
    }

    // Upload
    const safeName = (export_name || `gl_export_${period_start}_${period_end}`)
      .replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
    const fileName = `${safeName}_${Date.now()}.${extension}`;
    const filePath = `${agency_id}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("agency-generated-docs")
      .upload(filePath, new TextEncoder().encode(content), {
        contentType,
        upsert: false,
      });

    if (uploadErr) {
      return new Response(JSON.stringify({ success: false, error: `Upload failed: ${uploadErr.message}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify
    const authHeader = req.headers.get("Authorization") || "";
    let generatedBy: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) generatedBy = user.id;
    }

    // Log
    const { data: exportRow } = await supabase.from("agency_gl_exports").insert({
      agency_id,
      export_name: export_name || `GL Export ${period_start} – ${period_end}`,
      format,
      period_start,
      period_end,
      source_types: sources,
      record_count: journalLines.length,
      total_amount: totalAmount,
      file_path: filePath,
      file_name: fileName,
      generated_by: generatedBy,
      status: journalLines.length > 0 ? "completed" : "completed",
    }).select().maybeSingle();

    const { data: urlData } = await supabase.storage
      .from("agency-generated-docs")
      .createSignedUrl(filePath, 600);

    return new Response(JSON.stringify({
      success: true,
      export_id: exportRow?.id,
      signedUrl: urlData?.signedUrl,
      fileName,
      filePath,
      record_count: journalLines.length,
      total_amount: totalAmount,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Unknown error";
    console.error("generate-gl-export error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
