import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
const PLAID_SECRET = Deno.env.get("PLAID_SECRET");
const PLAID_ENV = Deno.env.get("PLAID_ENV") || "sandbox";

const PLAID_BASE_URL =
  PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : PLAID_ENV === "development"
    ? "https://development.plaid.com"
    : "https://sandbox.plaid.com";

function logStep(step: string, data?: any) {
  console.log(`[tenant-auto-tag-rent] ${step}`, data ? JSON.stringify(data) : "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create_rule") {
      return await handleCreateRule(supabaseAdmin, user.id, body);
    } else if (action === "apply_rules") {
      return await handleApplyRules(supabaseAdmin, body);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tenant-auto-tag-rent error:", err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : String(err)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCreateRule(
  supabase: any,
  userId: string,
  body: any,
) {
  const { transaction, monthly_rent, currency_code, address_text, tenant_rental_id } = body;

  const matchDescription = (transaction.name || transaction.merchant_name || "").trim();
  const matchMerchant = (transaction.merchant_name || "").trim() || null;

  if (!matchDescription) {
    return new Response(JSON.stringify({ error: "No transaction description to match" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Amount tolerance: ±10%
  const tolerance = monthly_rent * 0.1;
  const amountMin = monthly_rent - tolerance;
  const amountMax = monthly_rent + tolerance;

  // Insert the rule
  const { data: rule, error: ruleError } = await supabase
    .from("tenant_auto_tag_rules")
    .insert({
      user_id: userId,
      tenant_rental_id: tenant_rental_id || null,
      match_description: matchDescription,
      match_merchant_name: matchMerchant,
      amount_min: amountMin,
      amount_max: amountMax,
      is_active: true,
    })
    .select()
    .single();

  if (ruleError) {
    console.error("Rule insert error:", ruleError);
    return new Response(JSON.stringify({ error: ruleError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── NEW: Targeted 24-month live Plaid search ──
  // Fetch matching transactions directly from Plaid API to fill gaps in local cache
  let liveSearchResult = { upserted: 0, earliestDate: null as string | null, latestDate: null as string | null, totalPlaidTransactions: 0 };
  try {
    liveSearchResult = await fetchAndUpsertMatchingTransactions(
      supabase, userId, matchDescription, matchMerchant, amountMin, amountMax
    );
    logStep("Live Plaid search complete", liveSearchResult);
  } catch (err) {
    // Non-critical: if live search fails, we still backfill from whatever's cached
    logStep("Live Plaid search failed (non-critical)", { error: (err instanceof Error ? err.message : String(err)) });
  }

  // Backfill: scan tenant_plaid_transactions for matches (now includes live-fetched data)
  const { data: matches, error: matchError } = await supabase
    .from("tenant_plaid_transactions")
    .select("plaid_transaction_id, transaction_date, description, merchant_name, amount")
    .eq("user_id", userId)
    .eq("pending", false)
    .gte("amount", amountMin)
    .lte("amount", amountMax)
    .or(`description.ilike.%${matchDescription}%,merchant_name.ilike.%${matchDescription}%`);

  if (matchError) {
    console.error("Match query error:", matchError);
    // Rule was created, just skip backfill
    return new Response(JSON.stringify({ rule_id: rule.id, backfilled: 0, live_searched: liveSearchResult.upserted, data_available_from: liveSearchResult.earliestDate, data_available_to: liveSearchResult.latestDate, total_plaid_transactions: liveSearchResult.totalPlaidTransactions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get existing self_reported_rent to avoid duplicates by plaid_transaction_id AND month/year
  const { data: existing } = await supabase
    .from("self_reported_rent")
    .select("plaid_transaction_id, month, year")
    .eq("user_id", userId)
    .eq("address_text", address_text);

  const existingIds = new Set(
    (existing || []).filter((e: any) => e.plaid_transaction_id).map((e: any) => e.plaid_transaction_id)
  );
  const existingMonthKeys = new Set(
    (existing || []).map((e: any) => `${e.year}-${e.month}`)
  );

  const newEntries = (matches || [])
    .filter((m: any) => {
      if (existingIds.has(m.plaid_transaction_id)) return false;
      const d = new Date(m.transaction_date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (existingMonthKeys.has(key)) return false;
      existingMonthKeys.add(key); // prevent duplicates within batch
      return true;
    })
    .map((m: any) => {
      const d = new Date(m.transaction_date);
      return {
        user_id: userId,
        address_text: address_text,
        monthly_rent: m.amount, // Use actual transaction amount, not rental config
        currency_code: currency_code,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        payment_date: m.transaction_date,
        plaid_transaction_id: m.plaid_transaction_id,
        plaid_transaction_data: {
          transaction_id: m.plaid_transaction_id,
          date: m.transaction_date,
          name: m.description,
          merchant_name: m.merchant_name,
          amount: m.amount,
        },
        verification_status: "bank_verified",
        notes: "Auto-tagged by payment rule",
      };
    });

  let backfilled = 0;
  if (newEntries.length > 0) {
    const { error: insertError, data: inserted } = await supabase
      .from("self_reported_rent")
      .insert(newEntries)
      .select("id");

    if (insertError) {
      console.error("Backfill insert error:", insertError);
    } else {
      backfilled = inserted?.length || 0;
    }
  }

  return new Response(
    JSON.stringify({
      rule_id: rule.id,
      backfilled,
      matches_found: matches?.length || 0,
      live_searched: liveSearchResult.upserted,
      data_available_from: liveSearchResult.earliestDate,
      data_available_to: liveSearchResult.latestDate,
      total_plaid_transactions: liveSearchResult.totalPlaidTransactions,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Targeted 24-month live Plaid search:
 * Fetches transactions from all linked bank accounts via Plaid API,
 * filters for merchant/amount match, and upserts into tenant_plaid_transactions.
 */
async function fetchAndUpsertMatchingTransactions(
  supabase: any,
  userId: string,
  matchDescription: string,
  matchMerchant: string | null,
  amountMin: number,
  amountMax: number,
): Promise<{ upserted: number; earliestDate: string | null; latestDate: string | null; totalPlaidTransactions: number }> {
  // Look up user's bank accounts with access tokens (server-side only)
  const { data: bankAccounts, error: baError } = await supabase
    .from("user_bank_accounts")
    .select("id, plaid_access_token, plaid_account_id")
    .eq("user_id", userId)
    .in("status", ["active", "linked"])
    .is("removed_at", null);

  if (baError || !bankAccounts?.length) {
    logStep("No bank accounts found for live search", { userId, error: baError?.message });
    return { upserted: 0, earliestDate: null, latestDate: null, totalPlaidTransactions: 0 };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 24);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  let totalUpserted = 0;
  let earliestDate: string | null = null;
  let latestDate: string | null = null;
  let totalPlaidTransactions = 0;
  const matchLower = matchDescription.toLowerCase();
  const merchantLower = matchMerchant?.toLowerCase() || null;

  for (const account of bankAccounts) {
    if (!account.plaid_access_token) continue;

    try {
      let offset = 0;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        logStep("Fetching Plaid transactions page", {
          accountId: account.id,
          offset,
          startDate: startStr,
          endDate: endStr,
        });

        const plaidResponse = await fetch(`${PLAID_BASE_URL}/transactions/get`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: account.plaid_access_token,
            start_date: startStr,
            end_date: endStr,
            options: {
              account_ids: [account.plaid_account_id],
              count: pageSize,
              offset,
            },
          }),
        });

        if (!plaidResponse.ok) {
          const errorData = await plaidResponse.json();
          logStep("Plaid API error during live search", { error: errorData });
          break;
        }

        const plaidData = await plaidResponse.json();
        const transactions = plaidData.transactions || [];
        const totalAvailable = plaidData.total_transactions || 0;
        totalPlaidTransactions = Math.max(totalPlaidTransactions, totalAvailable);

        // Track date range of ALL transactions (not just matches)
        for (const t of transactions) {
          if (!earliestDate || t.date < earliestDate) earliestDate = t.date;
          if (!latestDate || t.date > latestDate) latestDate = t.date;
        }

        // Filter for matching outgoing debits (amount > 0 = money leaving account)
        const matching = transactions.filter((t: any) => {
          if (t.amount <= 0 || t.pending) return false;
          if (t.amount < amountMin || t.amount > amountMax) return false;

          const txName = (t.name || "").toLowerCase();
          const txMerchant = (t.merchant_name || "").toLowerCase();

          const descMatch = txName.includes(matchLower) || txMerchant.includes(matchLower);
          const merchantMatch = merchantLower
            ? txName.includes(merchantLower) || txMerchant.includes(merchantLower)
            : false;

          return descMatch || merchantMatch;
        });

        if (matching.length > 0) {
          const toUpsert = matching.map((t: any) => ({
            user_id: userId,
            bank_account_id: account.id,
            plaid_transaction_id: t.transaction_id,
            transaction_date: t.date,
            amount: t.amount,
            description: t.name,
            merchant_name: t.merchant_name || null,
            pending: t.pending,
            plaid_data: t,
          }));

          const { data: upserted, error: upsertError } = await supabase
            .from("tenant_plaid_transactions")
            .upsert(toUpsert, { onConflict: "plaid_transaction_id", ignoreDuplicates: false })
            .select("id");

          if (upsertError) {
            logStep("Upsert error during live search", { error: upsertError.message });
          } else {
            totalUpserted += upserted?.length || 0;
          }
        }

        offset += transactions.length;
        hasMore = offset < totalAvailable;

        logStep("Page processed", {
          fetched: transactions.length,
          matched: matching.length,
          totalAvailable,
          offset,
          hasMore,
        });
      }

      // ── Fallback: try transactions/sync if history is limited (<6 months) ──
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsStr = sixMonthsAgo.toISOString().split("T")[0];

      if (earliestDate && earliestDate > sixMonthsStr) {
        logStep("History limited, trying transactions/sync fallback", {
          earliestFromGet: earliestDate,
          sixMonthThreshold: sixMonthsStr,
        });

        try {
          let syncCursor: string | undefined;
          let syncHasMore = true;
          let syncPages = 0;
          const maxSyncPages = 20; // safety limit

          while (syncHasMore && syncPages < maxSyncPages) {
            const syncBody: any = {
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              access_token: account.plaid_access_token,
              options: { include_personal_finance_category: false },
            };
            if (syncCursor) syncBody.cursor = syncCursor;

            const syncResponse = await fetch(`${PLAID_BASE_URL}/transactions/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(syncBody),
            });

            if (!syncResponse.ok) {
              logStep("transactions/sync API error", { status: syncResponse.status });
              break;
            }

            const syncData = await syncResponse.json();
            const added = syncData.added || [];
            syncCursor = syncData.next_cursor;
            syncHasMore = syncData.has_more || false;
            syncPages++;

            // Track date range from sync results too
            for (const t of added) {
              if (!earliestDate || t.date < earliestDate) earliestDate = t.date;
              if (!latestDate || t.date > latestDate) latestDate = t.date;
            }

            // Filter for matches from the target account
            const syncMatching = added.filter((t: any) => {
              if (t.account_id !== account.plaid_account_id) return false;
              if (t.amount <= 0 || t.pending) return false;
              if (t.amount < amountMin || t.amount > amountMax) return false;

              const txName = (t.name || "").toLowerCase();
              const txMerchant = (t.merchant_name || "").toLowerCase();
              const descMatch = txName.includes(matchLower) || txMerchant.includes(matchLower);
              const mMatch = merchantLower
                ? txName.includes(merchantLower) || txMerchant.includes(merchantLower)
                : false;
              return descMatch || mMatch;
            });

            if (syncMatching.length > 0) {
              const toUpsert = syncMatching.map((t: any) => ({
                user_id: userId,
                bank_account_id: account.id,
                plaid_transaction_id: t.transaction_id,
                transaction_date: t.date,
                amount: t.amount,
                description: t.name,
                merchant_name: t.merchant_name || null,
                pending: t.pending,
                plaid_data: t,
              }));

              const { data: upserted, error: upsertError } = await supabase
                .from("tenant_plaid_transactions")
                .upsert(toUpsert, { onConflict: "plaid_transaction_id", ignoreDuplicates: false })
                .select("id");

              if (!upsertError) {
                totalUpserted += upserted?.length || 0;
              }
            }

            logStep("Sync page processed", { added: added.length, matched: syncMatching.length, hasMore: syncHasMore });
          }
        } catch (syncErr) {
          logStep("transactions/sync fallback failed (non-critical)", { error: (syncErr instanceof Error ? syncErr.message : String(syncErr)) });
        }
      }
    } catch (err) {
      logStep("Error fetching from account", { accountId: account.id, error: (err instanceof Error ? err.message : String(err)) });
    }
  }

  return { upserted: totalUpserted, earliestDate, latestDate, totalPlaidTransactions };
}

async function handleApplyRules(supabase: any, body: any) {
  const { user_id, transactions } = body;

  if (!user_id || !transactions?.length) {
    return new Response(JSON.stringify({ tagged: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get active rules for this user
  const { data: rules, error: rulesError } = await supabase
    .from("tenant_auto_tag_rules")
    .select("*")
    .eq("user_id", user_id)
    .eq("is_active", true);

  if (rulesError || !rules?.length) {
    return new Response(JSON.stringify({ tagged: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get existing plaid_transaction_ids
  const { data: existing } = await supabase
    .from("self_reported_rent")
    .select("plaid_transaction_id")
    .eq("user_id", user_id)
    .not("plaid_transaction_id", "is", null);

  const existingIds = new Set((existing || []).map((e: any) => e.plaid_transaction_id));

  const newEntries: any[] = [];

  for (const tx of transactions) {
    if (existingIds.has(tx.plaid_transaction_id)) continue;

    for (const rule of rules) {
      const descMatch =
        (tx.description || "").toLowerCase().includes(rule.match_description.toLowerCase()) ||
        (tx.merchant_name || "").toLowerCase().includes(rule.match_description.toLowerCase());
      const amountMatch = tx.amount >= rule.amount_min && tx.amount <= rule.amount_max;

      if (descMatch && amountMatch) {
        const d = new Date(tx.transaction_date);
        newEntries.push({
          user_id: user_id,
          address_text: rule.match_description, // Will be overridden if rental is linked
          monthly_rent: tx.amount,
          currency_code: "USD",
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          payment_date: tx.transaction_date,
          plaid_transaction_id: tx.plaid_transaction_id,
          plaid_transaction_data: tx,
          verification_status: "bank_verified",
          notes: "Auto-tagged by payment rule",
        });
        existingIds.add(tx.plaid_transaction_id); // prevent duplicates within batch
        break; // one rule match is enough
      }
    }
  }

  let tagged = 0;
  if (newEntries.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("self_reported_rent")
      .insert(newEntries)
      .select("id");

    if (insertError) {
      console.error("Apply rules insert error:", insertError);
    } else {
      tagged = inserted?.length || 0;
    }
  }

  return new Response(JSON.stringify({ tagged }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
