import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePayoutRequest {
  landlord_id: string
  portfolio_id?: string
  property_id?: string
  amount: number
  recipient: {
    name: string
    email?: string
    phone?: string
    address: {
      line1: string
      line2?: string
      city: string
      state: string
      postal_code: string
      country: string
    }
  }
  recipient_type?: 'vendor' | 'owner' | 'company' | 'tenant'
  payout_method: 'check' | 'digital_check' | 'ach'
  memo?: string
  source_account_id?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      })
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const request: CreatePayoutRequest = await req.json()
    
    // Validate request
    if (!request.landlord_id || !request.amount || !request.recipient) {
      return new Response('Missing required fields', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    // Verify user has permission to create payout for this landlord
    if (user.id !== request.landlord_id) {
      // Check if user has portfolio permissions
      if (request.portfolio_id) {
        const { data: portfolioRole } = await supabase
          .from('portfolio_roles')
          .select('role_name')
          .eq('portfolio_id', request.portfolio_id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (!portfolioRole || !['admin_partner', 'editor'].includes(portfolioRole.role_name)) {
          return new Response('Forbidden', { 
            status: 403,
            headers: corsHeaders 
          })
        }
      } else {
        return new Response('Forbidden', { 
          status: 403,
          headers: corsHeaders 
        })
      }
    }

    // Get source account details - check property settings first if property_id provided
    let sourceAccount = null
    let sourceAccountId = request.source_account_id
    
    // If no source account specified but property_id provided, check property payment settings
    if (!sourceAccountId && request.property_id) {
      const { data: propertySettings } = await supabase
        .from('property_payment_settings')
        .select('payout_bank_account_id')
        .eq('property_id', request.property_id)
        .single()
      
      if (propertySettings?.payout_bank_account_id) {
        sourceAccountId = propertySettings.payout_bank_account_id
        console.log(`Using property default payout account: ${sourceAccountId}`)
      }
    }
    
    if (sourceAccountId) {
      const { data: account, error: accountError } = await supabase
        .from('user_bank_accounts')
        .select('id, account_name, institution_name, status, metadata')
        .eq('id', sourceAccountId)
        .eq('user_id', user.id)
        .single()

      if (accountError || !account) {
        console.error('Source account not found:', accountError)
        return new Response('Source account not found', { 
          status: 400,
          headers: corsHeaders 
        })
      }

      if (account.status !== 'linked' || !account.metadata?.checkbook_funding_source_id) {
        return new Response('Source account not linked to Checkbook', { 
          status: 400,
          headers: corsHeaders 
        })
      }

      sourceAccount = {
        checkbook_funding_source_id: account.metadata.checkbook_funding_source_id,
        label: account.account_name,
        bank_name: account.institution_name
      }
    }

    // Create payout record in database first
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        user_id: user.id,
        landlord_id: request.landlord_id,
        portfolio_id: request.portfolio_id,
        property_id: request.property_id,
        total_amount: request.amount,
        payout_method: request.payout_method,
        recipient_details: request.recipient,
        source_account_id: sourceAccount?.checkbook_funding_source_id,
        source_account_name: sourceAccount?.label,
        memo: request.memo,
        status: 'pending'
      })
      .select()
      .single()

    if (payoutError) {
      console.error('Error creating payout record:', payoutError)
      return new Response('Failed to create payout record', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // Create check via Checkbook API
    const checkbookResult = await createCheckbookCheck(request, sourceAccount)
    
    if (checkbookResult.success) {
      // Update payout with Checkbook ID
      await supabase
        .from('payouts')
        .update({
          checkbook_payout_id: checkbookResult.checkId,
          status: 'processing'
        })
        .eq('id', payout.id)

      // Create vendor payment record if this is a vendor payout
      if (request.recipient_type === 'vendor' && request.property_id) {
        await supabase.from('vendor_payment_records').insert({
          landlord_id: request.landlord_id,
          portfolio_id: request.portfolio_id,
          property_id: request.property_id,
          amount: request.amount,
          recipient_type: 'vendor',
          recipient_name: request.recipient.name,
          currency_code: 'USD',
          payment_method: request.payout_method,
          reference: checkbookResult.checkId,
          memo: request.memo,
          created_by: user.id
        })
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        entity_type: 'payouts',
        entity_id: payout.id,
        action: 'created',
        new_values: {
          amount: request.amount,
          payout_method: request.payout_method,
          recipient_type: request.recipient_type,
          checkbook_id: checkbookResult.checkId
        },
        notes: `Created ${request.payout_method} payout for $${request.amount} to ${request.recipient.name}`
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          payout_id: payout.id,
          checkbook_id: checkbookResult.checkId 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else {
      // Update payout status to failed
      await supabase
        .from('payouts')
        .update({
          status: 'failed',
          failure_reason: checkbookResult.error
        })
        .eq('id', payout.id)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: checkbookResult.error 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Payout creation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function createCheckbookCheck(
  request: CreatePayoutRequest, 
  sourceAccount?: { checkbook_funding_source_id: string; label: string; bank_name?: string } | null
) {
  try {
    const checkbookApiKey = Deno.env.get('CHECKBOOK_API_KEY')
    const checkbookBaseUrl = Deno.env.get('CHECKBOOK_API_BASE')
    
    if (!checkbookApiKey || !checkbookBaseUrl) {
      return { success: false, error: 'Checkbook API configuration missing' }
    }

    // Prepare check data based on payout method
    let endpoint = ''
    let checkData: any = {
      name: request.recipient.name,
      amount: request.amount,
      memo: request.memo || 'Rent payout'
    }

    // Add funding source if provided
    if (sourceAccount?.checkbook_funding_source_id) {
      checkData.funding_account_id = sourceAccount.checkbook_funding_source_id
      console.log(`Using funding source: ${sourceAccount.checkbook_funding_source_id} (${sourceAccount.label})`)
    }

    switch (request.payout_method) {
      case 'check':
        endpoint = '/v3/check/physical'
        checkData = {
          ...checkData,
          address: request.recipient.address
        }
        break
      case 'digital_check':
        endpoint = '/v3/check/digital'
        checkData = {
          ...checkData,
          email: request.recipient.email
        }
        break
      case 'ach':
        if (!sourceAccount?.checkbook_funding_source_id) {
          return { success: false, error: 'ACH payouts require a linked funding source account' }
        }
        endpoint = '/v3/ach/transfer'
        checkData = {
          ...checkData,
          funding_account_id: sourceAccount.checkbook_funding_source_id,
          recipient_account: request.recipient.address // This would need recipient banking details
        }
        break
      default:
        return { success: false, error: 'Invalid payout method' }
    }

    const response = await fetch(`${checkbookBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${checkbookApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkData)
    })

    const result = await response.json()

    if (response.ok && result.id) {
      return { success: true, checkId: result.id, data: result }
    } else {
      console.error('Checkbook API error:', result)
      return { 
        success: false, 
        error: result.message || 'Failed to create check with Checkbook' 
      }
    }

  } catch (error) {
    console.error('Checkbook API request failed:', error)
    return { success: false, error: 'Failed to communicate with Checkbook API' }
  }
}