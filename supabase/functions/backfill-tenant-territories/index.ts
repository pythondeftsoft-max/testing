import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log('🔄 Starting territory backfill for tenants...')

  try {
    // Get all tenants without territory_id who have a state in tenant_profiles
    const { data: tenantsToUpdate, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        territory_id,
        tenant_profiles!inner(
          state,
          country_code
        )
      `)
      .is('territory_id', null)
      .eq('account_type', 'tenant')
      .not('tenant_profiles.state', 'is', null)

    if (fetchError) {
      console.error('❌ Error fetching tenants:', fetchError)
      throw fetchError
    }

    console.log(`📊 Found ${tenantsToUpdate?.length || 0} tenants to process`)

    if (!tenantsToUpdate || tenantsToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tenants need territory assignment',
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updated = 0
    let skipped = 0
    const errors: string[] = []

    // Process each tenant
    for (const tenant of tenantsToUpdate) {
      const tenantProfile = tenant.tenant_profiles as any
      const state = tenantProfile?.state
      const countryCode = tenantProfile?.country_code || 'US'

      if (!state) {
        skipped++
        continue
      }

      // Map country code to full name
      const countryName = countryCode === 'US' ? 'United States' : countryCode

      console.log(`🔍 Looking up territory for tenant ${tenant.id}: ${countryName} - ${state}`)

      // Find matching territory
      const { data: territory, error: territoryError } = await supabase
        .from('territories')
        .select('id, name')
        .eq('country', countryName)
        .eq('region_code', state)
        .maybeSingle()

      if (territoryError) {
        console.error(`❌ Error finding territory for ${tenant.id}:`, territoryError)
        errors.push(`${tenant.id}: ${territoryError.message}`)
        skipped++
        continue
      }

      if (!territory) {
        console.log(`⚠️ No territory found for ${countryCode} - ${state}`)
        skipped++
        continue
      }

      // Update profile with territory_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ territory_id: territory.id })
        .eq('id', tenant.id)

      if (updateError) {
        console.error(`❌ Error updating tenant ${tenant.id}:`, updateError)
        errors.push(`${tenant.id}: ${updateError.message}`)
        skipped++
      } else {
        console.log(`✅ Updated tenant ${tenant.id} with territory ${territory.name}`)
        updated++
      }
    }

    console.log(`✨ Backfill complete: ${updated} updated, ${skipped} skipped`)

    return new Response(
      JSON.stringify({ 
        success: true,
        updated,
        skipped,
        total: tenantsToUpdate.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    console.error('❌ Backfill error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
