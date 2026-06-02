import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { 
      action, 
      tenantId, 
      propertyId, 
      messageContent, 
      communicationType,
      portfolioId 
    } = await req.json()

    console.log('AI Tenant Communication request:', { action, tenantId, propertyId, communicationType })

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Get tenant and property context
    const { data: tenantData } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', tenantId)
      .single()

    const { data: propertyData } = await supabaseClient
      .from('properties')
      .select('address, monthly_rent, lease_start_date, lease_end_date')
      .eq('id', propertyId)
      .single()

    let result = {}

    switch (action) {
      case 'generate_response':
        result = await generateResponseSuggestion(messageContent, tenantData, propertyData, geminiApiKey)
        break
        
      case 'generate_lease_renewal':
        result = await generateLeaseRenewal(tenantData, propertyData, geminiApiKey)
        break
        
      case 'generate_rent_reminder':
        result = await generateRentReminder(tenantData, propertyData, geminiApiKey)
        break
        
      case 'generate_maintenance_update':
        result = await generateMaintenanceUpdate(messageContent, tenantData, propertyData, geminiApiKey)
        break
        
      default:
        throw new Error('Invalid action specified')
    }

    // Log the communication generation
    const { error: logError } = await supabaseClient
      .from('ai_communication_log')
      .insert({
        tenant_id: tenantId,
        property_id: propertyId,
        communication_type: communicationType,
        action: action,
        ai_generated_content: result,
        portfolio_id: portfolioId
      })

    if (logError) {
      console.error('Failed to log communication:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        result,
        generated_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in AI tenant communication:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate communication',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function generateResponseSuggestion(messageContent: string, tenant: any, property: any, apiKey: string) {
  const prompt = `
  Generate a professional response to this tenant message:

  Tenant: ${tenant.first_name} ${tenant.last_name}
  Property: ${property.address}
  
  Tenant Message: "${messageContent}"

  Create a helpful, professional response that:
  1. Acknowledges their concern
  2. Provides clear next steps
  3. Maintains a friendly but professional tone
  4. Includes relevant property management policies if applicable

  Return a JSON object with:
  {
    "suggested_response": "the response text",
    "tone": "professional|friendly|formal",
    "urgency": "low|medium|high",
    "follow_up_needed": boolean,
    "estimated_response_time": "timeframe"
  }
  `

  return await callGeminiAPI(prompt, apiKey)
}

async function generateLeaseRenewal(tenant: any, property: any, apiKey: string) {
  const leaseEndDate = new Date(property.lease_end_date)
  const monthsUntilExpiry = Math.ceil((leaseEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))

  const prompt = `
  Generate a lease renewal notice for:

  Tenant: ${tenant.first_name} ${tenant.last_name}
  Property: ${property.address}
  Current Rent: $${property.monthly_rent}
  Lease Expires: ${property.lease_end_date}
  Months Until Expiry: ${monthsUntilExpiry}

  Create a professional lease renewal communication that:
  1. Notifies about upcoming lease expiration
  2. Expresses interest in renewal
  3. Mentions any rent adjustments (if market appropriate)
  4. Provides clear timeline for response
  5. Maintains positive tenant relationship

  Return a JSON object with:
  {
    "subject": "email subject line",
    "message": "full renewal message",
    "suggested_rent_increase": number,
    "renewal_deadline": "date",
    "key_points": ["array of key points to highlight"]
  }
  `

  return await callGeminiAPI(prompt, apiKey)
}

async function generateRentReminder(tenant: any, property: any, apiKey: string) {
  const prompt = `
  Generate a rent collection reminder for:

  Tenant: ${tenant.first_name} ${tenant.last_name}
  Property: ${property.address}
  Monthly Rent: $${property.monthly_rent}

  Create a polite but clear rent reminder that:
  1. Reminds about rent due date
  2. Provides payment methods
  3. Mentions any late fees if applicable
  4. Maintains professional relationship
  5. Offers assistance if needed

  Return a JSON object with:
  {
    "subject": "reminder subject line", 
    "message": "reminder message text",
    "tone": "gentle|firm|final_notice",
    "payment_methods": ["array of accepted payment methods"],
    "late_fee_info": "late fee information if applicable"
  }
  `

  return await callGeminiAPI(prompt, apiKey)
}

async function generateMaintenanceUpdate(issueDescription: string, tenant: any, property: any, apiKey: string) {
  const prompt = `
  Generate a maintenance update message for:

  Tenant: ${tenant.first_name} ${tenant.last_name}
  Property: ${property.address}
  Maintenance Issue: "${issueDescription}"

  Create a professional maintenance update that:
  1. Acknowledges the maintenance request
  2. Provides status update or timeline
  3. Sets appropriate expectations
  4. Shows responsiveness to tenant needs
  5. Includes next steps

  Return a JSON object with:
  {
    "subject": "update subject line",
    "message": "update message text", 
    "estimated_completion": "timeframe",
    "next_steps": ["array of next steps"],
    "emergency_contact": "emergency contact info if needed"
  }
  `

  return await callGeminiAPI(prompt, apiKey)
}

async function callGeminiAPI(prompt: string, apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 30,
        topP: 0.9,
        maxOutputTokens: 1024,
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await response.text()}`)
  }

  const data = await response.json()
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
    }
  }

  return {
    message: responseText || 'Unable to generate response',
    generated_content: responseText
  }
}