import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const FUNCTION_VERSION = '2025-11-25-v3';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

const plaidBaseUrl = PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : PLAID_ENV === 'development'
  ? 'https://development.plaid.com'
  : 'https://sandbox.plaid.com';

serve(async (req) => {
  console.log(`[${FUNCTION_VERSION}] fetch-admin-transactions - Request received`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract JWT from Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with SERVICE_ROLE_KEY
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT by passing token directly to getUser()
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      console.error(`[${FUNCTION_VERSION}] Auth error:`, userError);
      console.error(`[${FUNCTION_VERSION}] Token present:`, !!token);
      console.error(`[${FUNCTION_VERSION}] Token length:`, token?.length || 0);
      throw new Error(`Unauthorized: ${userError.message}`);
    }
    if (!user) {
      console.error(`[${FUNCTION_VERSION}] No user found in token`);
      throw new Error('Unauthorized: No user found');
    }

    console.log(`[${FUNCTION_VERSION}] User authenticated:`, user.id);

    const { bank_account_id, start_date, end_date } = await req.json();

    if (!bank_account_id) {
      throw new Error('bank_account_id is required');
    }

    // Get bank account with Plaid access token
    const { data: bankAccount, error: accountError } = await supabaseClient
      .from('user_bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !bankAccount) {
      throw new Error('Bank account not found');
    }

    if (!bankAccount.plaid_access_token) {
      console.error(`[${FUNCTION_VERSION}] No Plaid token for account:`, {
        accountId: bank_account_id,
        institution: bankAccount.institution_name,
        mask: bankAccount.mask,
        status: bankAccount.status
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'This bank account needs to be reconnected through Plaid to sync transactions.',
          details: 'Please disconnect and reconnect this account using the "Connect Bank Account" button.',
          requires_reconnection: true,
          account_info: {
            institution: bankAccount.institution_name,
            mask: bankAccount.mask
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Default to last 30 days if not specified
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultEndDate = new Date();

    const requestBody = {
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      access_token: bankAccount.plaid_access_token,
      start_date: start_date || defaultStartDate.toISOString().split('T')[0],
      end_date: end_date || defaultEndDate.toISOString().split('T')[0],
    };

    console.log('Fetching Plaid transactions...', { 
      start_date: requestBody.start_date, 
      end_date: requestBody.end_date 
    });

    const plaidResponse = await fetch(`${plaidBaseUrl}/transactions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!plaidResponse.ok) {
      const errorData = await plaidResponse.json();
      console.error('Plaid API error:', errorData);
      throw new Error(`Plaid API error: ${errorData.error_message || 'Unknown error'}`);
    }

    const plaidData = await plaidResponse.json();
    console.log(`Fetched ${plaidData.transactions.length} transactions from Plaid`);

    // Filter for incoming transactions (credits/deposits)
    const incomingTransactions = plaidData.transactions.filter((t: any) => t.amount < 0);
    console.log(`Found ${incomingTransactions.length} incoming transactions`);

    // Store transactions in database
    const transactionsToInsert = incomingTransactions.map((t: any) => ({
      plaid_transaction_id: t.transaction_id,
      bank_account_id: bank_account_id,
      transaction_date: t.date,
      amount: Math.abs(t.amount), // Store as positive value
      description: t.name,
      merchant_name: t.merchant_name || null,
      pending: t.pending,
      category: t.category?.join(', ') || null,
      plaid_data: t,
    }));

    // Insert or update transactions (use upsert)
    const { data: insertedTransactions, error: insertError } = await supabaseClient
      .from('plaid_admin_transactions')
      .upsert(transactionsToInsert, {
        onConflict: 'plaid_transaction_id',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error('Error inserting transactions:', insertError);
      throw insertError;
    }

    console.log(`Stored ${insertedTransactions?.length || 0} transactions in database`);

    // Return unmatched transactions
    const { data: unmatchedTransactions } = await supabaseClient
      .from('plaid_admin_transactions')
      .select('*')
      .eq('bank_account_id', bank_account_id)
      .is('linked_fee_id', null)
      .order('transaction_date', { ascending: false });

    return new Response(
      JSON.stringify({
        success: true,
        transactions_fetched: plaidData.transactions.length,
        transactions_stored: insertedTransactions?.length || 0,
        unmatched_transactions: unmatchedTransactions || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in fetch-admin-transactions:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
