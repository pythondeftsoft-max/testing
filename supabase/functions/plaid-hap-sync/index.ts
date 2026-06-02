import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlaidSyncRequest {
  propertyId?: string;
  configId?: string;
  action: 'sync' | 'connect' | 'disconnect' | 'link_token';
  plaidData?: any;
}

interface PlaidLinkTokenRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Set auth for user context
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { propertyId, configId, action, plaidData }: PlaidSyncRequest = await req.json();

    switch (action) {
      case 'link_token':
        return await handleCreateLinkToken(supabase, user);
      case 'connect':
        return await handlePlaidConnect(supabase, user, configId, plaidData);
      case 'disconnect':
        return await handlePlaidDisconnect(supabase, user, configId);
      case 'sync':
        return await handlePlaidSync(supabase, user, propertyId, configId);
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in Plaid HAP sync:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleCreateLinkToken(supabase: any, user: any) {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  const env = Deno.env.get('PLAID_ENV') || 'sandbox';

  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured');
  }

  const plaidUrl = env === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';

  try {
    const response = await fetch(`${plaidUrl}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        client_name: 'OpenKey HAP Tracker',
        country_codes: ['US'],
        language: 'en',
        user: {
          client_user_id: user.id,
        },
        products: ['transactions'],
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings']
          }
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Plaid API error: ${data.error_message || 'Unknown error'}`);
    }

    return new Response(
      JSON.stringify({
        link_token: data.link_token,
        expiration: data.expiration
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating Plaid link token:', error);
    throw error;
  }
}

async function handlePlaidConnect(supabase: any, user: any, configId: string, plaidData: any) {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  const env = Deno.env.get('PLAID_ENV') || 'sandbox';

  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured');
  }

  // Verify the config belongs to the user
  const { data: config, error: configError } = await supabase
    .from('hap_payee_configs')
    .select(`
      id,
      property_id,
      properties!inner(owner_id)
    `)
    .eq('id', configId)
    .eq('properties.owner_id', user.id)
    .single();

  if (configError || !config) {
    throw new Error('HAP configuration not found or unauthorized');
  }

  const plaidUrl = env === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';

  try {
    // Exchange public token for access token
    const tokenResponse = await fetch(`${plaidUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        public_token: plaidData.public_token,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`Plaid token exchange error: ${tokenData.error_message || 'Unknown error'}`);
    }

    // Get account information
    const accountsResponse = await fetch(`${plaidUrl}/accounts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        access_token: tokenData.access_token,
      }),
    });

    const accountsData = await accountsResponse.json();
    
    if (!accountsResponse.ok) {
      throw new Error(`Plaid accounts error: ${accountsData.error_message || 'Unknown error'}`);
    }

    // Get the first checking/savings account
    const account = accountsData.accounts.find((acc: any) => 
      acc.subtype === 'checking' || acc.subtype === 'savings'
    ) || accountsData.accounts[0];

    if (!account) {
      throw new Error('No suitable account found');
    }

    // Get institution information
    const institutionResponse = await fetch(`${plaidUrl}/institutions/get_by_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        institution_id: accountsData.item.institution_id,
        country_codes: ['US'],
      }),
    });

    const institutionData = await institutionResponse.json();
    
    if (!institutionResponse.ok) {
      throw new Error(`Plaid institution error: ${institutionData.error_message || 'Unknown error'}`);
    }

    // Update the config with Plaid information
    const { error: updateError } = await supabase
      .from('hap_payee_configs')
      .update({
        plaid_access_token: tokenData.access_token,
        plaid_institution_id: accountsData.item.institution_id,
        plaid_institution_name: institutionData.institution.name,
        plaid_account_id: account.account_id,
        auto_tracking_enabled: true
      })
      .eq('id', configId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Plaid account connected successfully',
        institution: institutionData.institution.name,
        account: {
          name: account.name,
          mask: account.mask,
          type: account.subtype
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error connecting Plaid account:', error);
    throw error;
  }
}

async function handlePlaidDisconnect(supabase: any, user: any, configId: string) {
  // Verify the config belongs to the user
  const { data: config, error: configError } = await supabase
    .from('hap_payee_configs')
    .select(`
      id,
      property_id,
      properties!inner(owner_id)
    `)
    .eq('id', configId)
    .eq('properties.owner_id', user.id)
    .single();

  if (configError || !config) {
    throw new Error('HAP configuration not found or unauthorized');
  }

  // Remove Plaid information
  const { error: updateError } = await supabase
    .from('hap_payee_configs')
    .update({
      plaid_access_token: null,
      plaid_institution_id: null,
      plaid_institution_name: null,
      plaid_account_id: null,
      auto_tracking_enabled: false
    })
    .eq('id', configId);

  if (updateError) throw updateError;

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Plaid account disconnected successfully'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handlePlaidSync(supabase: any, user: any, propertyId?: string, configId?: string) {
  let configs;
  
  if (configId) {
    // Sync specific config
    const { data, error } = await supabase
      .from('hap_payee_configs')
      .select(`
        *,
        properties!inner(owner_id, address, monthly_rent)
      `)
      .eq('id', configId)
      .eq('properties.owner_id', user.id)
      .eq('auto_tracking_enabled', true)
      .neq('plaid_access_token', null);
    
    if (error) throw error;
    configs = data;
  } else if (propertyId) {
    // Sync all configs for a property
    const { data, error } = await supabase
      .from('hap_payee_configs')
      .select(`
        *,
        properties!inner(owner_id, address, monthly_rent)
      `)
      .eq('property_id', propertyId)
      .eq('properties.owner_id', user.id)
      .eq('auto_tracking_enabled', true)
      .neq('plaid_access_token', null);
    
    if (error) throw error;
    configs = data;
  } else {
    // Sync all configs for the user
    const { data, error } = await supabase
      .from('hap_payee_configs')
      .select(`
        *,
        properties!inner(owner_id, address, monthly_rent)
      `)
      .eq('properties.owner_id', user.id)
      .eq('auto_tracking_enabled', true)
      .neq('plaid_access_token', null);
    
    if (error) throw error;
    configs = data;
  }

  if (!configs || configs.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'No Plaid-enabled configurations found',
        synced: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let totalSynced = 0;
  const results = [];

  for (const config of configs) {
    try {
      const syncResult = await syncConfigTransactions(supabase, config);
      results.push(syncResult);
      totalSynced += syncResult.newPayments;
    } catch (error) {
      console.error(`Error syncing config ${config.id}:`, error);
      results.push({
        configId: config.id,
        propertyAddress: config.properties.address,
        error: (error instanceof Error ? error.message : String(error)),
        newPayments: 0
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Sync completed. Found ${totalSynced} new HAP payments.`,
      synced: totalSynced,
      results
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function syncConfigTransactions(supabase: any, config: any) {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  const env = Deno.env.get('PLAID_ENV') || 'sandbox';

  if (!clientId || !secret || !config.plaid_access_token) {
    throw new Error('Plaid credentials or access token not available');
  }

  const plaidUrl = env === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';

  // Get transactions from the last 30 days
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const transactionsResponse = await fetch(`${plaidUrl}/transactions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        access_token: config.plaid_access_token,
        start_date: startDate,
        end_date: endDate,
        account_ids: config.plaid_account_id ? [config.plaid_account_id] : undefined,
      }),
    });

    const transactionsData = await transactionsResponse.json();
    
    if (!transactionsResponse.ok) {
      throw new Error(`Plaid transactions error: ${transactionsData.error_message || 'Unknown error'}`);
    }

    // Filter for potential HAP deposits
    const hapKeywords = [
      'housing authority', 'hap payment', 'section 8', 'voucher', 
      'pha', 'public housing', 'rental assistance'
    ];
    
    const potentialHapTransactions = transactionsData.transactions
      .filter((txn: any) => {
        // Only look at positive amounts (deposits)
        if (txn.amount >= 0) return false;
        
        const description = txn.name?.toLowerCase() || '';
        const merchant = txn.merchant_name?.toLowerCase() || '';
        const account = txn.account_owner?.toLowerCase() || '';
        
        // Check if description contains HAP-related keywords
        const hasHapKeywords = hapKeywords.some(keyword => 
          description.includes(keyword) || merchant.includes(keyword) || account.includes(keyword)
        );
        
        // Check if amount is reasonable for HAP payment (20-95% of rent)
        const amount = Math.abs(txn.amount);
        const isReasonableAmount = amount >= (config.properties.monthly_rent * 0.2) && 
                                   amount <= (config.properties.monthly_rent * 0.95);
        
        return hasHapKeywords || isReasonableAmount;
      })
      .map((txn: any) => ({
        transaction_id: txn.transaction_id,
        amount: Math.abs(txn.amount),
        date: txn.date,
        description: txn.name || txn.merchant_name || 'Bank deposit',
        confidence: calculateHapConfidence(txn, config.properties.monthly_rent, hapKeywords)
      }));

    let newPayments = 0;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    for (const transaction of potentialHapTransactions) {
    // Check if we already have a payment for this transaction
    const { data: existingPayment } = await supabase
      .from('hap_payments')
      .select('id')
      .eq('plaid_transaction_id', transaction.transaction_id)
      .single();

    if (existingPayment) continue; // Already processed

    // Check if we have an expected payment for this month
    const { data: expectedPayment } = await supabase
      .from('hap_payments')
      .select('*')
      .eq('property_id', config.property_id)
      .eq('payment_status', 'expected')
      .gte('payment_period_start', `${currentMonth}-01`)
      .lt('payment_period_start', `${currentMonth}-32`)
      .single();

    if (expectedPayment && Math.abs(expectedPayment.expected_amount - transaction.amount) <= 10) {
      // Match found - update the existing expected payment
      const { data: updatedPayment, error: updateError } = await supabase
        .from('hap_payments')
        .update({
          payment_status: 'received',
          actual_amount: transaction.amount,
          payment_date: transaction.date,
          plaid_transaction_id: transaction.transaction_id,
          matched_via_plaid: true,
          plaid_match_confidence: transaction.confidence,
          verification_method: 'plaid_auto'
        })
        .eq('id', expectedPayment.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Post to rent ledger
      await postToRentLedger(supabase, updatedPayment);
      newPayments++;
    } else if (transaction.confidence > 0.8) {
      // Create new HAP payment record for unmatched high-confidence transaction
      const startDate = `${currentMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const { data: newPayment, error: insertError } = await supabase
        .from('hap_payments')
        .insert({
          property_id: config.property_id,
          hap_payee_config_id: config.id,
          payment_period_start: startDate,
          payment_period_end: endDate,
          expected_amount: transaction.amount,
          actual_amount: transaction.amount,
          payment_date: transaction.date,
          payment_status: 'received',
          payment_method: 'ach',
          plaid_transaction_id: transaction.transaction_id,
          matched_via_plaid: true,
          plaid_match_confidence: transaction.confidence,
          verification_method: 'plaid_auto',
          notes: `Auto-detected HAP payment: ${transaction.description}`
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Post to rent ledger
      await postToRentLedger(supabase, newPayment);
      newPayments++;
    }
  }

  return {
    configId: config.id,
    propertyAddress: config.properties.address,
    newPayments,
    success: true
  };
  } catch (error) {
    console.error('Error syncing transactions for config:', config.id, error);
    throw error;
  }
}

function calculateHapConfidence(transaction: any, monthlyRent: number, hapKeywords: string[]): number {
  let confidence = 0.0;
  const amount = Math.abs(transaction.amount);
  const description = transaction.name?.toLowerCase() || '';
  const merchant = transaction.merchant_name?.toLowerCase() || '';
  
  // Base confidence from keywords
  const hasStrongKeywords = hapKeywords.some(keyword => 
    description.includes(keyword) || merchant.includes(keyword)
  );
  
  if (hasStrongKeywords) {
    confidence += 0.8;
  } else {
    // Look for weaker indicators
    const weakKeywords = ['deposit', 'government', 'assistance', 'rent'];
    const hasWeakKeywords = weakKeywords.some(keyword => 
      description.includes(keyword) || merchant.includes(keyword)
    );
    if (hasWeakKeywords) confidence += 0.3;
  }
  
  // Amount matching (typical HAP is 70-90% of rent)
  const expectedHapMin = monthlyRent * 0.7;
  const expectedHapMax = monthlyRent * 0.9;
  
  if (amount >= expectedHapMin && amount <= expectedHapMax) {
    confidence += 0.4;
  } else if (amount >= monthlyRent * 0.5 && amount <= monthlyRent) {
    confidence += 0.2;
  }
  
  // Timing (HAP usually comes around the same time each month)
  const day = new Date(transaction.date).getDate();
  if (day >= 1 && day <= 5) { // Early in month
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
}

async function postToRentLedger(supabase: any, payment: any) {
  // Check if already posted
  if (payment.rent_ledger_posted) return;

  const ledgerEntry = {
    property_id: payment.property_id,
    tenant_id: payment.tenant_id,
    amount: payment.actual_amount || payment.expected_amount,
    payment_date: payment.payment_date,
    payment_type: 'rent',
    payment_source: 'pha_hap',
    description: `HAP Payment ${payment.matched_via_plaid ? '(Auto-tracked)' : ''} - ${payment.pha_voucher_number || 'No voucher number'}`,
    reference_number: payment.pha_voucher_number || payment.plaid_transaction_id,
    hap_payment_id: payment.id
  };

  const { data, error } = await supabase
    .from('rent_ledger')
    .insert(ledgerEntry)
    .select()
    .single();

  if (error) throw error;

  // Update payment with ledger entry reference
  await supabase
    .from('hap_payments')
    .update({ 
      rent_ledger_posted: true, 
      rent_ledger_entry_id: data.id 
    })
    .eq('id', payment.id);
}