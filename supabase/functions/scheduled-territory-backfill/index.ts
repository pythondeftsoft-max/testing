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

  console.log('🗺️ Starting scheduled territory backfill...')

  try {
    let propertiesUpdated = 0
    let unitsUpdated = 0
    let tenantsUpdated = 0
    const errors: string[] = []

    // Step 1: Find properties with state but no territory_id
    const { data: orphanedProperties, error: propError } = await supabase
      .from('properties')
      .select('id, state, country')
      .is('territory_id', null)
      .not('state', 'is', null)
      .not('country', 'is', null)

    if (propError) {
      console.error('❌ Error fetching orphaned properties:', propError)
      errors.push(`Property fetch error: ${propError.message}`)
    } else if (orphanedProperties && orphanedProperties.length > 0) {
      console.log(`📍 Found ${orphanedProperties.length} properties without territory_id`)

      // Step 2: For each property, try to find matching territory
      for (const property of orphanedProperties) {
        // Map country code to full name
        const countryName = property.country === 'US' ? 'United States' : property.country
        
        const { data: territory, error: territoryError } = await supabase
          .from('territories')
          .select('id')
          .eq('region_code', property.state)
          .eq('country', countryName)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (territoryError) {
          console.log(`⚠️ No territory found for property ${property.id} (${property.state}, ${property.country})`)
          continue
        }

        if (territory) {
          // Update property with territory_id
          const { error: updateError } = await supabase
            .from('properties')
            .update({ territory_id: territory.id })
            .eq('id', property.id)

          if (updateError) {
            console.error(`❌ Error updating property ${property.id}:`, updateError)
            errors.push(`Property ${property.id} update error: ${updateError.message}`)
          } else {
            console.log(`✅ Updated property ${property.id} with territory ${territory.id}`)
            propertiesUpdated++
          }
        }
      }
    } else {
      console.log('✨ No orphaned properties found')
    }

    // Step 3: Find units without territory_id but with property_id
    const { data: orphanedUnits, error: unitError } = await supabase
      .from('property_units')
      .select('id, property_id')
      .is('territory_id', null)
      .not('property_id', 'is', null)

    if (unitError) {
      console.error('❌ Error fetching orphaned units:', unitError)
      errors.push(`Unit fetch error: ${unitError.message}`)
    } else if (orphanedUnits && orphanedUnits.length > 0) {
      console.log(`🏠 Found ${orphanedUnits.length} units without territory_id`)

      // Step 4: For each unit, inherit territory from parent property
      for (const unit of orphanedUnits) {
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('territory_id')
          .eq('id', unit.property_id)
          .single()

        if (propertyError || !property?.territory_id) {
          console.log(`⚠️ Parent property ${unit.property_id} has no territory_id for unit ${unit.id}`)
          continue
        }

        // Update unit with inherited territory_id
        const { error: updateError } = await supabase
          .from('property_units')
          .update({ territory_id: property.territory_id })
          .eq('id', unit.id)

        if (updateError) {
          console.error(`❌ Error updating unit ${unit.id}:`, updateError)
          errors.push(`Unit ${unit.id} update error: ${updateError.message}`)
        } else {
          console.log(`✅ Updated unit ${unit.id} with territory ${property.territory_id}`)
          unitsUpdated++
        }
      }
    } else {
      console.log('✨ No orphaned units found')
    }

    // Step 5: Find tenants without territory_id
    const { data: orphanedTenants, error: tenantError } = await supabase
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
      .not('tenant_profiles.state', 'is', null)

    if (tenantError) {
      console.error('❌ Error fetching orphaned tenants:', tenantError)
      errors.push(`Tenant fetch error: ${tenantError.message}`)
    } else if (orphanedTenants && orphanedTenants.length > 0) {
      console.log(`👤 Found ${orphanedTenants.length} tenants without territory_id`)

      // Step 6: For each tenant, find matching territory
      for (const tenant of orphanedTenants) {
        const tenantProfile = tenant.tenant_profiles as any
        const state = tenantProfile?.state
        const countryCode = tenantProfile?.country_code || 'US'

        if (!state) {
          continue
        }

        // Map country code to full name
        const countryName = countryCode === 'US' ? 'United States' : countryCode

        const { data: territory, error: territoryError } = await supabase
          .from('territories')
          .select('id')
          .eq('region_code', state)
          .eq('country', countryName)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (territoryError) {
          console.log(`⚠️ No territory found for tenant ${tenant.id} (${state}, ${countryCode})`)
          continue
        }

        if (territory) {
          // Update tenant with territory_id
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ territory_id: territory.id })
            .eq('id', tenant.id)

          if (updateError) {
            console.error(`❌ Error updating tenant ${tenant.id}:`, updateError)
            errors.push(`Tenant ${tenant.id} update error: ${updateError.message}`)
          } else {
            console.log(`✅ Updated tenant ${tenant.id} with territory ${territory.id}`)
            tenantsUpdated++
          }
        }
      }
    } else {
      console.log('✨ No orphaned tenants found')
    }

    const result = {
      success: true,
      propertiesUpdated,
      unitsUpdated,
      tenantsUpdated,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    }

    console.log(`✅ Territory backfill complete: ${propertiesUpdated} properties, ${unitsUpdated} units, ${tenantsUpdated} tenants updated`)
    if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} errors encountered`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('❌ Scheduled territory backfill error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error instanceof Error ? error.message : String(error)) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
