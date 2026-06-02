import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  console.log(`[plaid-payment-methods] ${step}`, data ? JSON.stringify(data, null, 2) : '');
}

serve(async (req) => {
  logStep('Request received', { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    
    if (!user) {
      throw new Error('Invalid user');
    }

    logStep('User authenticated', { userId: user.id });

    const { action, ...payload } = await req.json();
    logStep('Action requested', { action, payload });

    switch (action) {
      case 'create_link_token':
        return await createLinkToken(user.id);
      
      case 'exchange_public_token':
        return await exchangePublicToken(user.id, payload.public_token, supabase, payload.metadata);
      
      case 'get_accounts':
        return await getBankAccounts(user.id, supabase);
      
      case 'disconnect_account':
        return await disconnectAccount(user.id, payload.account_id, supabase);
      
      case 'set_default':
        return await setDefaultAccount(user.id, payload.account_id, payload.type, supabase);
      
      case 'get_tenant_transactions':
        return await getTenantTransactions(user.id, supabase);
      
      case 'sync_tenant_transactions':
        return await syncTenantTransactionsAction(user.id, supabase);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    logStep('Error occurred', { error: (error instanceof Error ? error.message : String(error)) });
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function createLinkToken(userId: string) {
  logStep('Creating link token', { userId });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const webhookUrl = `${supabaseUrl}/functions/v1/plaid-webhook`;
  logStep('Using webhook URL', { webhookUrl });

  const response = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      user: {
        client_user_id: userId,
      },
      client_name: 'Payment Methods',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
      webhook: webhookUrl,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    logStep('Link token creation failed', data);
    throw new Error(data.error_message || 'Failed to create link token');
  }

  logStep('Link token created successfully with webhook configured');
  return new Response(
    JSON.stringify({ link_token: data.link_token }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function exchangePublicToken(userId: string, publicToken: string, supabase: any, metadata?: any) {
  logStep('Exchanging public token', { userId });

  const exchangeResponse = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      public_token: publicToken,
    }),
  });

  const exchangeData = await exchangeResponse.json();
  
  if (!exchangeResponse.ok) {
    logStep('Token exchange failed', exchangeData);
    throw new Error(exchangeData.error_message || 'Failed to exchange token');
  }

  const { access_token, item_id } = exchangeData;
  logStep('Token exchanged successfully', { item_id });

  const accountsResponse = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      access_token: access_token,
    }),
  });

  const accountsData = await accountsResponse.json();
  
  if (!accountsResponse.ok) {
    logStep('Accounts fetch failed', accountsData);
    throw new Error(accountsData.error_message || 'Failed to get accounts');
  }

  logStep('Accounts fetched', { accountCount: accountsData.accounts.length });

  const accountsToStore = [];
  
  for (const account of accountsData.accounts) {
    const checkbookSyncResult = await syncAccountToCheckbook(
      userId, 
      access_token, 
      account.account_id, 
      account
    );
    
    accountsToStore.push({
      user_id: userId,
      plaid_item_id: item_id,
      plaid_account_id: account.account_id,
      plaid_access_token: access_token,
      institution_name: metadata?.institution?.name || accountsData.item?.institution_id || 'Unknown',
      account_name: account.name,
      mask: account.mask,
      account_type: account.type,
      account_subtype: account.subtype,
      status: 'linked',
      metadata: {
        balances: account.balances,
        official_name: account.official_name,
        institution: metadata?.institution,
        checkbook_funding_source_id: checkbookSyncResult.funding_source_id,
        checkbook_sync_status: checkbookSyncResult.success ? 'synced' : 'failed',
        checkbook_sync_error: checkbookSyncResult.error,
      },
    });
  }

  const { data: insertedAccounts, error } = await supabase
    .from('user_bank_accounts')
    .insert(accountsToStore)
    .select();

  if (error) {
    logStep('Database insert failed', error);
    throw new Error('Failed to store account information');
  }

  logStep('Accounts stored successfully', { 
    count: insertedAccounts.length,
    checkbookSynced: accountsToStore.filter((acc: any) => acc.metadata.checkbook_sync_status === 'synced').length
  });

  // Delay to give Plaid time to prepare transaction data
  logStep('Waiting 3 seconds before initial transaction sync');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const transactionSyncResults: Record<string, any> = {};
  
  for (const account of insertedAccounts) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logStep('Auto-syncing transactions to landlord_plaid_transactions', { 
          accountId: account.id, 
          userId,
          attempt: attempt + 1,
        });
        const syncResult = await syncTransactionsForAccount(account.id, access_token, supabase, userId);
        transactionSyncResults[account.id] = syncResult;
        lastError = null;
        break;
      } catch (syncError: any) {
        lastError = syncError;
        const isProductNotReady = (syncError instanceof Error ? syncError.message : String(syncError))?.includes('PRODUCT_NOT_READY');
        
        if (isProductNotReady && attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt + 1) * 1000;
          logStep('PRODUCT_NOT_READY, retrying after delay', { accountId: account.id, attempt: attempt + 1, delayMs });
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else if (!isProductNotReady) {
          break;
        }
      }
    }
    
    if (lastError) {
      logStep('Transaction sync failed after retries (non-critical)', { accountId: account.id, error: lastError.message });
      transactionSyncResults[account.id] = { 
        success: false, 
        error: lastError.message,
        retryable: lastError.message?.includes('PRODUCT_NOT_READY')
      };
    }

    // Also sync tenant (outgoing) transactions for the same account
    try {
      logStep('Syncing tenant outgoing transactions', { accountId: account.id });
      await syncTenantTransactionsForAccount(account.id, access_token, userId, supabase);
    } catch (tenantSyncError: any) {
      logStep('Tenant transaction sync failed (non-critical)', { accountId: account.id, error: (tenantSyncError instanceof Error ? tenantSyncError.message : String(tenantSyncError)) });
    }
  }

  const totalTransactionsSynced = Object.values(transactionSyncResults).reduce(
    (sum: number, result: any) => sum + (result.transactions_stored || 0), 
    0
  );

  logStep('Transaction sync complete', { totalTransactionsSynced });

  return new Response(
    JSON.stringify({ 
      success: true, 
      accounts: insertedAccounts,
      message: `Successfully linked ${insertedAccounts.length} account(s) and synced ${totalTransactionsSynced} transactions`,
      transactions_synced: transactionSyncResults,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Sync outgoing (debit) transactions for a tenant into tenant_plaid_transactions (24-month window)
async function syncTenantTransactionsForAccount(
  accountId: string,
  accessToken: string,
  userId: string,
  supabase: any
) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 24);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  logStep('Fetching 24-month tenant transactions from Plaid', { accountId, startDateStr, endDateStr });

  // Paginate through all transactions
  let offset = 0;
  const count = 500;
  let allTransactions: any[] = [];

  while (true) {
    const plaidResponse = await fetch(`${PLAID_BASE_URL}/transactions/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: accessToken,
        start_date: startDateStr,
        end_date: endDateStr,
        options: { count, offset },
      }),
    });

    if (!plaidResponse.ok) {
      const errorData = await plaidResponse.json();
      throw new Error(`Plaid API error: ${errorData.error_message || 'Unknown error'}`);
    }

    const plaidData = await plaidResponse.json();
    allTransactions = allTransactions.concat(plaidData.transactions || []);

    if (allTransactions.length >= plaidData.total_transactions) {
      break;
    }
    offset += count;
  }

  // Filter outgoing debits (amount > 0 in Plaid = money leaving account)
  const outgoing = allTransactions.filter((t: any) => t.amount > 0 && !t.pending);

  logStep(`Found ${outgoing.length} outgoing transactions over 24 months`, { accountId });

  if (outgoing.length === 0) {
    return { transactions_stored: 0 };
  }

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

  if (upsertError) {
    logStep('Error upserting tenant transactions', upsertError);
    throw upsertError;
  }

  logStep(`Upserted ${upserted?.length || 0} tenant transactions`, { accountId });
  return { transactions_stored: upserted?.length || 0 };
}

// Action handler: sync all tenant transactions for the authenticated user's linked accounts
async function syncTenantTransactionsAction(userId: string, supabase: any) {
  logStep('sync_tenant_transactions action', { userId });

  const { data: accounts, error: accountsError } = await supabase
    .from('user_bank_accounts')
    .select('id, plaid_access_token')
    .eq('user_id', userId)
    .in('status', ['active', 'linked'])
    .is('removed_at', null);

  if (accountsError) throw new Error('Failed to fetch bank accounts');
  if (!accounts || accounts.length === 0) {
    return new Response(JSON.stringify({ success: true, transactions_stored: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let totalStored = 0;
  for (const account of accounts) {
    if (!account.plaid_access_token) continue;
    try {
      const result = await syncTenantTransactionsForAccount(account.id, account.plaid_access_token, userId, supabase);
      totalStored += result.transactions_stored || 0;
    } catch (err: any) {
      logStep('Error syncing account (continuing)', { accountId: account.id, error: (err instanceof Error ? err.message : String(err)) });
    }
  }

  return new Response(
    JSON.stringify({ success: true, transactions_stored: totalStored }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Read tenant transactions from local DB (fast, no live Plaid call)
async function getTenantTransactions(userId: string, supabase: any) {
  logStep('Fetching tenant transactions from local DB', { userId });

  const { data, error } = await supabase
    .from('tenant_plaid_transactions')
    .select('plaid_transaction_id, transaction_date, description, merchant_name, amount, bank_account_id')
    .eq('user_id', userId)
    .eq('pending', false)
    .order('transaction_date', { ascending: false })
    .limit(500);

  if (error) throw new Error('Failed to fetch tenant transactions');

  // Get account names for display
  const bankAccountIds = [...new Set((data || []).map((t: any) => t.bank_account_id))];
  let accountMap: Record<string, string> = {};

  if (bankAccountIds.length > 0) {
    const { data: accounts } = await supabase
      .from('user_bank_accounts')
      .select('id, account_name, institution_name')
      .in('id', bankAccountIds);
    
    if (accounts) {
      for (const acc of accounts) {
        accountMap[acc.id] = acc.account_name || acc.institution_name || 'Bank';
      }
    }
  }

  const transactions = (data || []).map((t: any) => ({
    transaction_id: t.plaid_transaction_id,
    date: t.transaction_date,
    name: t.description,
    merchant_name: t.merchant_name || null,
    amount: t.amount,
    account_name: accountMap[t.bank_account_id] || 'Bank',
  }));

  logStep('Tenant transactions from DB', { count: transactions.length });

  return new Response(
    JSON.stringify({ transactions }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncAccountToCheckbook(userId: string, accessToken: string, accountId: string, accountData: any) {
  try {
    const checkbookApiKey = Deno.env.get('CHECKBOOK_API_KEY');
    const checkbookBaseUrl = Deno.env.get('CHECKBOOK_API_BASE');
    
    if (!checkbookApiKey || !checkbookBaseUrl) {
      logStep('Checkbook API configuration missing');
      return { success: false, error: 'Checkbook API not configured' };
    }

    const processorResponse = await fetch(`${PLAID_BASE_URL}/processor/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: accessToken,
        account_id: accountId,
        processor: 'checkbook',
      }),
    });

    const processorData = await processorResponse.json();
    
    if (!processorResponse.ok) {
      logStep('Processor token creation failed', processorData);
      return { success: false, error: processorData.error_message || 'Failed to create processor token' };
    }

    const fundingSourceResponse = await fetch(`${checkbookBaseUrl}/v3/account/funding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${checkbookApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        processor_token: processorData.processor_token,
        name: `${accountData.name} ••••${accountData.mask}`,
      }),
    });

    const fundingSourceData = await fundingSourceResponse.json();

    if (fundingSourceResponse.ok && fundingSourceData.id) {
      logStep('Checkbook funding source created', { accountId, fundingSourceId: fundingSourceData.id });
      return { success: true, funding_source_id: fundingSourceData.id };
    } else {
      logStep('Checkbook funding source creation failed', fundingSourceData);
      return { success: false, error: fundingSourceData.message || 'Failed to create Checkbook funding source' };
    }

  } catch (error: any) {
    logStep('Checkbook sync error', { error: (error instanceof Error ? error.message : String(error)) });
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

async function getBankAccounts(userId: string, supabase: any) {
  logStep('Fetching bank accounts', { userId });

  const { data: accounts, error } = await supabase
    .from('user_bank_accounts')
    .select(`
      id, user_id, plaid_item_id, plaid_account_id, institution_name,
      account_name, mask, account_type, account_subtype, status,
      is_default_for_payments, is_default_for_payouts,
      last_synced_at, removed_at, metadata, created_at, updated_at
    `)
    .eq('user_id', userId)
    .is('removed_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    logStep('Failed to fetch accounts', error);
    throw new Error('Failed to fetch bank accounts');
  }

  return new Response(
    JSON.stringify({ accounts }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function disconnectAccount(userId: string, accountId: string, supabase: any) {
  logStep('Disconnecting account', { userId, accountId });

  const { data: account } = await supabase
    .from('user_bank_accounts')
    .select('metadata')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (account?.metadata?.checkbook_funding_source_id) {
    try {
      await disconnectFromCheckbook(account.metadata.checkbook_funding_source_id);
    } catch (error: any) {
      logStep('Failed to disconnect from Checkbook', { error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  const { error } = await supabase
    .from('user_bank_accounts')
    .update({ status: 'disconnected', removed_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) throw new Error('Failed to disconnect account');

  return new Response(
    JSON.stringify({ success: true, message: 'Account disconnected successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function disconnectFromCheckbook(fundingSourceId: string) {
  const checkbookApiKey = Deno.env.get('CHECKBOOK_API_KEY');
  const checkbookBaseUrl = Deno.env.get('CHECKBOOK_API_BASE');
  
  if (!checkbookApiKey || !checkbookBaseUrl) throw new Error('Checkbook API not configured');

  const response = await fetch(`${checkbookBaseUrl}/v3/account/funding/${fundingSourceId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${checkbookApiKey}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to disconnect from Checkbook');
  }
}

async function syncTransactionsForAccount(accountId: string, accessToken: string, supabase: any, landlordId: string) {
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  const defaultEndDate = new Date();

  const requestBody = {
    client_id: PLAID_CLIENT_ID,
    secret: PLAID_SECRET,
    access_token: accessToken,
    start_date: defaultStartDate.toISOString().split('T')[0],
    end_date: defaultEndDate.toISOString().split('T')[0],
  };

  logStep('Fetching Plaid transactions for account', { accountId, landlordId });

  const plaidResponse = await fetch(`${PLAID_BASE_URL}/transactions/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!plaidResponse.ok) {
    const errorData = await plaidResponse.json();
    throw new Error(`Plaid API error: ${errorData.error_message || 'Unknown error'}`);
  }

  const plaidData = await plaidResponse.json();
  const incomingTransactions = plaidData.transactions.filter((t: any) => t.amount > 0);

  if (incomingTransactions.length === 0) {
    return { success: true, transactions_fetched: 0, transactions_stored: 0 };
  }

  const transactionsToInsert = incomingTransactions.map((t: any) => ({
    landlord_id: landlordId,
    plaid_transaction_id: t.transaction_id,
    bank_account_id: accountId,
    transaction_date: t.date,
    amount: t.amount,
    description: t.name,
    merchant_name: t.merchant_name || null,
    pending: t.pending,
    category: t.category?.join(', ') || null,
    plaid_data: t,
    is_tagged: false,
  }));

  const { data: insertedTransactions, error: insertError } = await supabase
    .from('landlord_plaid_transactions')
    .upsert(transactionsToInsert, { onConflict: 'landlord_id,plaid_transaction_id', ignoreDuplicates: false })
    .select();

  if (insertError) throw insertError;

  return {
    success: true,
    transactions_fetched: plaidData.transactions.length,
    transactions_stored: insertedTransactions?.length || 0,
  };
}

async function setDefaultAccount(userId: string, accountId: string, type: 'payments' | 'payouts', supabase: any) {
  logStep('Setting default account', { userId, accountId, type });

  const defaultField = type === 'payments' ? 'is_default_for_payments' : 'is_default_for_payouts';
  
  await supabase
    .from('user_bank_accounts')
    .update({ [defaultField]: false })
    .eq('user_id', userId);

  const { error } = await supabase
    .from('user_bank_accounts')
    .update({ [defaultField]: true })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) throw new Error('Failed to set default account');

  return new Response(
    JSON.stringify({ success: true, message: 'Default account updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
