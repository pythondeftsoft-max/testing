import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, plaid-verification',
};

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

const PLAID_BASE_URL = PLAID_ENV === 'production' 
  ? 'https://production.plaid.com'
  : PLAID_ENV === 'development'
  ? 'https://development.plaid.com'
  : 'https://sandbox.plaid.com';

function logStep(step: string, data?: any) {
  console.log(`[plaid-webhook] ${step}`, data ? JSON.stringify(data, null, 2) : '');
}

serve(async (req) => {
  logStep('Webhook received', { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();

    // Verify Plaid webhook signature
    const plaidVerification = req.headers.get('plaid-verification');
    if (PLAID_CLIENT_ID && PLAID_SECRET) {
      if (!plaidVerification) {
        logStep('Missing plaid-verification header - rejecting');
        return new Response(
          JSON.stringify({ success: false, error: 'Missing verification header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify with Plaid's verification endpoint
      try {
        const verifyResponse = await fetch(`${PLAID_BASE_URL}/webhook_verification_key/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            key_id: plaidVerification,
          }),
        });

        if (!verifyResponse.ok) {
          logStep('Plaid webhook verification failed', { status: verifyResponse.status });
          return new Response(
            JSON.stringify({ success: false, error: 'Webhook verification failed' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        logStep('Plaid webhook verification passed');
      } catch (verifyError: any) {
        logStep('Plaid verification error', { error: (verifyError instanceof Error ? verifyError.message : String(verifyError)) });
        return new Response(
          JSON.stringify({ success: false, error: 'Verification error' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const webhookBody = JSON.parse(body);
    logStep('Webhook payload', { 
      webhook_type: webhookBody.webhook_type,
      webhook_code: webhookBody.webhook_code,
      item_id: webhookBody.item_id 
    });

    const { webhook_type, webhook_code, item_id } = webhookBody;

    if (webhook_type === 'TRANSACTIONS') {
      switch (webhook_code) {
        case 'SYNC_UPDATES_AVAILABLE':
        case 'DEFAULT_UPDATE':
        case 'INITIAL_UPDATE':
        case 'HISTORICAL_UPDATE':
          logStep('Processing transaction update', { webhook_code, item_id });
          await handleTransactionUpdate(item_id, webhook_code, supabase);
          break;
        
        case 'TRANSACTIONS_REMOVED':
          logStep('Transactions removed notification received', { item_id });
          break;
        
        default:
          logStep('Unhandled transaction webhook code', { webhook_code });
      }
    } else if (webhook_type === 'ITEM') {
      switch (webhook_code) {
        case 'ERROR':
          logStep('Item error received', { item_id, error: webhookBody.error });
          await handleItemError(item_id, webhookBody.error, supabase);
          break;
        
        case 'PENDING_EXPIRATION':
          logStep('Item pending expiration', { item_id });
          break;
        
        default:
          logStep('Unhandled item webhook code', { webhook_code });
      }
    } else {
      logStep('Unhandled webhook type', { webhook_type });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('Webhook error', { error: (error instanceof Error ? error.message : String(error)), stack: error.stack });
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleTransactionUpdate(itemId: string, webhookCode: string, supabase: any, retryCount = 0) {
  logStep('Looking up accounts for item', { itemId, webhookCode, retryCount });

  const { data: accounts, error: accountsError } = await supabase
    .from('user_bank_accounts')
    .select('id, user_id, plaid_access_token, plaid_account_id, status')
    .eq('plaid_item_id', itemId)
    .is('removed_at', null);

  if (accountsError) {
    logStep('Error fetching accounts', accountsError);
    throw new Error('Failed to fetch accounts for item');
  }

  if (!accounts || accounts.length === 0) {
    if (retryCount < 3) {
      const delayMs = (retryCount + 1) * 2000;
      logStep('No accounts found, retrying after delay', { itemId, retryCount, delayMs });
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return handleTransactionUpdate(itemId, webhookCode, supabase, retryCount + 1);
    }
    logStep('No accounts found for item after retries', { itemId, retryCount });
    return;
  }

  const activeAccounts = accounts.filter((a: any) => a.status === 'active' || a.status === 'linked');
  if (activeAccounts.length === 0) {
    logStep('Found accounts but none are active/linked', { itemId });
    return;
  }

  logStep('Found accounts to sync', { count: activeAccounts.length, webhookCode });

  const accessToken = activeAccounts[0].plaid_access_token;
  if (!accessToken) {
    logStep('No access token found for accounts', { itemId });
    return;
  }

  // Determine if this is a full historical backfill
  const isHistorical = webhookCode === 'HISTORICAL_UPDATE';

  // Sync landlord incoming transactions + tenant outgoing transactions
  for (const account of activeAccounts) {
    try {
      await syncLandlordTransactionsForAccount(account.id, accessToken, account.plaid_account_id, supabase);
    } catch (error: any) {
      logStep('Error syncing landlord transactions (continuing)', { accountId: account.id, error: (error instanceof Error ? error.message : String(error)) });
    }

    try {
      await syncTenantTransactionsForAccount(account.id, accessToken, account.user_id, account.plaid_account_id, supabase, isHistorical);
    } catch (error: any) {
      logStep('Error syncing tenant transactions (continuing)', { accountId: account.id, error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  // Apply auto-tag rules for landlord side
  for (const account of activeAccounts) {
    try {
      await applyAutoTagRules(account.user_id, account.id, supabase);
    } catch (error: any) {
      logStep('Error applying auto-tag rules (non-critical)', { accountId: account.id, error: (error instanceof Error ? error.message : String(error)) });
    }
  }
}

async function syncLandlordTransactionsForAccount(
  accountId: string, 
  accessToken: string, 
  plaidAccountId: string,
  supabase: any
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();

  logStep('Fetching landlord transactions from Plaid', { accountId });

  const plaidResponse = await fetch(`${PLAID_BASE_URL}/transactions/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      access_token: accessToken,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      options: { account_ids: [plaidAccountId] },
    }),
  });

  if (!plaidResponse.ok) {
    const errorData = await plaidResponse.json();
    throw new Error(`Plaid API error: ${errorData.error_message || 'Unknown error'}`);
  }

  const plaidData = await plaidResponse.json();
  const incomingTransactions = plaidData.transactions.filter((t: any) => t.amount < 0);

  if (incomingTransactions.length === 0) return { transactions_stored: 0 };

  const transactionsToUpsert = incomingTransactions.map((t: any) => ({
    plaid_transaction_id: t.transaction_id,
    bank_account_id: accountId,
    transaction_date: t.date,
    amount: Math.abs(t.amount),
    description: t.name,
    merchant_name: t.merchant_name || null,
    pending: t.pending,
    category: t.category?.join(', ') || null,
    plaid_data: t,
  }));

  const { data: upsertedTransactions, error: upsertError } = await supabase
    .from('landlord_plaid_transactions')
    .upsert(transactionsToUpsert, { onConflict: 'plaid_transaction_id', ignoreDuplicates: false })
    .select('id');

  if (upsertError) throw upsertError;

  logStep(`Upserted ${upsertedTransactions?.length || 0} landlord transactions`);
  return { transactions_stored: upsertedTransactions?.length || 0 };
}

async function syncTenantTransactionsForAccount(
  accountId: string,
  accessToken: string,
  userId: string,
  plaidAccountId: string,
  supabase: any,
  fullBackfill = false,
) {
  const startDate = new Date();
  if (fullBackfill) {
    startDate.setMonth(startDate.getMonth() - 24);
    logStep('Full 24-month backfill for tenant transactions', { accountId, userId });
  } else {
    startDate.setDate(startDate.getDate() - 30);
  }
  const endDate = new Date();

  logStep('Fetching tenant outgoing transactions from Plaid', { accountId, userId, fullBackfill, startDate: startDate.toISOString().split('T')[0] });

  let offset = 0;
  const pageSize = 500;
  let totalUpserted = 0;
  let hasMore = true;

  while (hasMore) {
    const plaidResponse = await fetch(`${PLAID_BASE_URL}/transactions/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          account_ids: [plaidAccountId],
          count: pageSize,
          offset,
        },
      }),
    });

    if (!plaidResponse.ok) {
      const errorData = await plaidResponse.json();
      throw new Error(`Plaid API error: ${errorData.error_message || 'Unknown error'}`);
    }

    const plaidData = await plaidResponse.json();
    const transactions = plaidData.transactions || [];
    const totalAvailable = plaidData.total_transactions || 0;

    // Outgoing debits: amount > 0 in Plaid = money leaving the account
    const outgoing = transactions.filter((t: any) => t.amount > 0 && !t.pending);

    if (outgoing.length > 0) {
      const toUpsert = outgoing.map((t: any) => ({
        user_id: userId,
        bank_account_id: accountId,
        plaid_transaction_id: t.transaction_id,
        transaction_date: t.date,
        amount: t.amount,
        description: t.name,
        merchant_name: t.merchant_name || null,
        pending: t.pending,
        plaid_data: t,
      }));

      const { data: upserted, error: upsertError } = await supabase
        .from('tenant_plaid_transactions')
        .upsert(toUpsert, { onConflict: 'plaid_transaction_id', ignoreDuplicates: false })
        .select('id');

      if (upsertError) throw upsertError;
      totalUpserted += upserted?.length || 0;
    }

    offset += transactions.length;
    hasMore = fullBackfill && offset < totalAvailable;

    logStep('Tenant sync page', { fetched: transactions.length, outgoing: outgoing.length, totalAvailable, offset, hasMore });

    // For non-backfill (30 day), single page is enough
    if (!fullBackfill) break;
  }

  logStep(`Upserted ${totalUpserted} tenant transactions total`, { accountId, fullBackfill });
  return { transactions_stored: totalUpserted };
}

async function applyAutoTagRules(userId: string, bankAccountId: string, supabase: any) {
  logStep('Applying auto-tag rules', { userId, bankAccountId });

  const { data: rules, error: rulesError } = await supabase
    .from('payment_auto_tag_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (rulesError || !rules || rules.length === 0) return;

  const { data: untaggedTransactions, error: transactionsError } = await supabase
    .from('landlord_plaid_transactions')
    .select('id, amount, description, merchant_name, transaction_date')
    .eq('bank_account_id', bankAccountId)
    .is('tagged_at', null);

  if (transactionsError || !untaggedTransactions || untaggedTransactions.length === 0) return;

  let tagsCreated = 0;

  for (const transaction of untaggedTransactions) {
    for (const rule of rules) {
      const matches = checkRuleMatch(transaction, rule);
      
      if (matches) {
        try {
          const { error: tagError } = await supabase
            .from('payment_tags')
            .insert({
              transaction_id: transaction.id,
              property_id: rule.property_id,
              unit_id: rule.unit_id,
              tag_type: rule.tag_type,
              amount: rule.amount || transaction.amount,
              tagged_by: userId,
              auto_tagged: true,
              auto_tag_rule_id: rule.id,
              payment_period: getCurrentPaymentPeriod(),
            });

          if (!tagError) {
            await supabase
              .from('landlord_plaid_transactions')
              .update({ tagged_at: new Date().toISOString() })
              .eq('id', transaction.id);
            tagsCreated++;
          }
        } catch (error: any) {
          logStep('Error in auto-tagging', { error: (error instanceof Error ? error.message : String(error)) });
        }
        break;
      }
    }
  }

  logStep(`Auto-tagging complete`, { tagsCreated });
}

function checkRuleMatch(transaction: any, rule: any): boolean {
  const amountTolerance = rule.amount_tolerance || 1;
  const amountMatches = Math.abs(transaction.amount - rule.expected_amount) <= amountTolerance;
  if (!amountMatches) return false;

  if (rule.description_pattern) {
    const pattern = new RegExp(rule.description_pattern, 'i');
    const descriptionMatches = pattern.test(transaction.description || '') || 
                               pattern.test(transaction.merchant_name || '');
    if (!descriptionMatches) return false;
  }

  return true;
}

function getCurrentPaymentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function handleItemError(itemId: string, error: any, supabase: any) {
  logStep('Handling item error', { itemId, error });

  await supabase
    .from('user_bank_accounts')
    .update({ status: 'error' })
    .eq('plaid_item_id', itemId);
}
