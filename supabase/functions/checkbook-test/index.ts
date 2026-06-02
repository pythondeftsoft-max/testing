import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const testResults: {
      timestamp: string;
      user_id: string;
      tests: Array<{ test: string; status: string; details: Record<string, unknown> }>;
    } = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      tests: []
    }

    // Test 1: Check environment variables
    const apiKey = Deno.env.get('CHECKBOOK_API_KEY')
    const apiBase = Deno.env.get('CHECKBOOK_API_BASE')
    const webhookSecret = Deno.env.get('CHECKBOOK_WEBHOOK_SECRET')

    testResults.tests.push({
      test: 'Environment Variables',
      status: apiKey && apiBase && webhookSecret ? 'PASS' : 'FAIL',
      details: {
        has_api_key: !!apiKey,
        has_api_base: !!apiBase,
        has_webhook_secret: !!webhookSecret,
        api_base_url: apiBase
      }
    })

    // Test 2: Checkbook API connectivity
    if (apiKey && apiBase) {
      try {
        const response = await fetch(`${apiBase}/v3/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        const userData = await response.json()
        
        testResults.tests.push({
          test: 'Checkbook API Connectivity',
          status: response.ok ? 'PASS' : 'FAIL',
          details: {
            status_code: response.status,
            response_ok: response.ok,
            user_data: response.ok ? userData : null,
            error: !response.ok ? userData : null
          }
        })
      } catch (error) {
        testResults.tests.push({
          test: 'Checkbook API Connectivity',
          status: 'FAIL',
          details: {
            error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error),
            type: 'Network Error'
          }
        })
      }
    } else {
      testResults.tests.push({
        test: 'Checkbook API Connectivity',
        status: 'SKIP',
        details: { reason: 'Missing API credentials' }
      })
    }

    // Test 3: Database connectivity
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('count')
        .limit(1)

      testResults.tests.push({
        test: 'Database Connectivity',
        status: error ? 'FAIL' : 'PASS',
        details: {
          error: error?.message,
          can_query: !error
        }
      })
    } catch (error) {
      testResults.tests.push({
        test: 'Database Connectivity',
        status: 'FAIL',
        details: {
          error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)
        }
      })
    }

    // Test 4: Webhook endpoint availability
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/checkbook-webhook`
    testResults.tests.push({
      test: 'Webhook Endpoint',
      status: 'INFO',
      details: {
        webhook_url: webhookUrl,
        note: 'Configure this URL in your Checkbook dashboard'
      }
    })

    // Log the test activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      entity_type: 'system',
      entity_id: 'checkbook-test',
      action: 'test_run',
      new_values: testResults,
      notes: 'Checkbook integration test run'
    })

    return new Response(
      JSON.stringify(testResults, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Test error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})