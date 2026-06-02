
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { name, domain, plan } = await req.json()

    console.log('Creating enterprise tenant:', { name, domain, plan })

    // Create the tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from('enterprise_tenants')
      .insert({
        name,
        domain,
        plan,
        status: 'trial',
        user_count: 0,
        portfolio_count: 0,
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      throw tenantError
    }

    // Initialize tenant-specific configurations
    const { error: configError } = await supabase
      .from('tenant_configurations')
      .insert({
        tenant_id: tenant.id,
        settings: {
          branding: {
            primary_color: '#3b82f6',
            secondary_color: '#10b981',
            logo_url: null,
          },
          features: {
            api_access: plan !== 'starter',
            advanced_reporting: plan === 'enterprise',
            white_label: plan === 'enterprise',
            sso: plan === 'enterprise',
          },
          limits: {
            users: plan === 'starter' ? 5 : plan === 'professional' ? 25 : -1,
            portfolios: plan === 'starter' ? 3 : plan === 'professional' ? 15 : -1,
            api_calls_per_month: plan === 'starter' ? 1000 : plan === 'professional' ? 10000 : 100000,
          },
        },
      })

    if (configError) {
      console.error('Error creating tenant configuration:', configError)
      // Don't throw here, tenant creation succeeded
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        action: 'enterprise_tenant_created',
        resource_id: tenant.id,
        details: { name, domain, plan },
        timestamp: new Date().toISOString(),
      })

    console.log('Enterprise tenant created successfully:', tenant.id)

    return new Response(
      JSON.stringify({
        success: true,
        tenant: tenant,
        message: 'Enterprise tenant created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in create-enterprise-tenant function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
