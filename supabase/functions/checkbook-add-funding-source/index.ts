import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface AddFundingSourceRequest {
  label: string
  bank_name?: string
  account_holder_name: string
  account_type: 'checking' | 'savings'
  routing_number: string
  account_number: string
  portfolio_id?: string
  is_default?: boolean
}

interface CheckbookFundingSourceResponse {
  id: string
  status: string
  name?: string
  routing_number?: string
  account_number?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let request: AddFundingSourceRequest;
    try {
      request = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    const { label, account_holder_name, account_type, routing_number, account_number } = request;
    if (!label || !account_holder_name || !account_type || !routing_number || !account_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate account type
    if (!['checking', 'savings'].includes(account_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid account type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate routing number (basic 9-digit check)
    if (!/^\d{9}$/.test(routing_number)) {
      return new Response(
        JSON.stringify({ error: 'Invalid routing number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate account number (4-17 digits)
    if (!/^\d{4,17}$/.test(account_number)) {
      return new Response(
        JSON.stringify({ error: 'Invalid account number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating funding source for user ${user.id}, label: ${label}`);

    // If setting as default, unset other defaults first
    if (request.is_default) {
      const { error: updateError } = await supabase
        .from('payment_accounts')
        .update({ is_default: false })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error unsetting defaults:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update existing defaults' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create funding source with Checkbook
    const checkbookResult = await createCheckbookFundingSource({
      account_holder_name,
      account_type,
      routing_number,
      account_number,
      bank_name: request.bank_name
    });

    if (!checkbookResult.success) {
      console.error('Checkbook API error:', checkbookResult.error);
      return new Response(
        JSON.stringify({ error: checkbookResult.error || 'Failed to create funding source' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment account record with masked details
    const account_last4 = account_number.slice(-4);
    const routing_last4 = routing_number.slice(-4);

    const { data: paymentAccount, error: insertError } = await supabase
      .from('payment_accounts')
      .insert([{
        user_id: user.id,
        portfolio_id: request.portfolio_id,
        label,
        bank_name: request.bank_name,
        account_holder_name,
        account_type,
        account_last4,
        routing_last4,
        checkbook_funding_source_id: checkbookResult.checkbook_id,
        link_status: 'linked',
        is_default: request.is_default || false
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment account:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save payment account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created payment account ${paymentAccount.id}`);

    // Return sanitized account data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: paymentAccount.id,
          label: paymentAccount.label,
          bank_name: paymentAccount.bank_name,
          account_holder_name: paymentAccount.account_holder_name,
          account_type: paymentAccount.account_type,
          account_last4: paymentAccount.account_last4,
          routing_last4: paymentAccount.routing_last4,
          link_status: paymentAccount.link_status,
          is_default: paymentAccount.is_default
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createCheckbookFundingSource(data: {
  account_holder_name: string
  account_type: string
  routing_number: string
  account_number: string
  bank_name?: string
}): Promise<{ success: boolean; checkbook_id?: string; error?: string }> {
  const checkbookToken = Deno.env.get('CHECKBOOK_API_KEY');
  const checkbookUrl = Deno.env.get('CHECKBOOK_API_BASE') || 'https://sandbox.checkbook.io/v3';
  
  if (!checkbookToken) {
    console.error('Missing Checkbook API key');
    return { success: false, error: 'Service configuration error' };
  }

  try {
    const fundingSourceData = {
      name: `${data.bank_name || 'Bank'} - ${data.account_type}`,
      holder_name: data.account_holder_name,
      account_number: data.account_number,
      routing_number: data.routing_number,
      account_type: data.account_type === 'checking' ? 'CHECKING' : 'SAVINGS'
    };

    console.log(`Calling Checkbook API: ${checkbookUrl}/account/funding-account`);
    
    const response = await fetch(`${checkbookUrl}/account/funding-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${checkbookToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(fundingSourceData)
    });

    const responseText = await response.text();
    console.log('Checkbook API response status:', response.status);
    console.log('Checkbook API response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Failed to create funding source';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      return { success: false, error: errorMessage };
    }

    const result: CheckbookFundingSourceResponse = JSON.parse(responseText);
    
    if (!result.id) {
      return { success: false, error: 'Invalid response from Checkbook API' };
    }

    return { success: true, checkbook_id: result.id };

  } catch (error) {
    console.error('Checkbook API call failed:', error);
    return { success: false, error: 'Network error communicating with Checkbook' };
  }
}