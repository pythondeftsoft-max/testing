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

  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    console.log('🔄 Starting AI insights refresh job', { requestId, timestamp: new Date().toISOString() })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get system configuration
    const { data: config } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'features')
      .single()

    const systemConfig = config?.config_value || { ai_controls: { global_enabled: true } }
    const aiEnabled = systemConfig.ai_controls?.global_enabled && 
                     systemConfig.ai_controls?.insights_engine?.enabled !== false

    if (!aiEnabled) {
      console.log('⏭️ AI insights disabled, skipping refresh', { requestId })
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'AI insights disabled',
        skipped: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Purge expired cache entries
    const { data: purgedEntries, error: purgeError } = await supabaseClient
      .rpc('purge_expired_ai_cache')

    if (purgeError) {
      console.error('❌ Failed to purge expired cache:', purgeError)
    } else {
      console.log(`🗑️ Purged ${purgedEntries} expired cache entries`, { requestId })
    }

    // 3. Get active landlords with properties for refresh
    const { data: activeLandlords, error: landlordsError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name
      `)
      .eq('user_type', 'landlord')
      .eq('status', 'active')

    if (landlordsError) {
      throw new Error(`Failed to fetch active landlords: ${landlordsError.message}`)
    }

    let refreshCount = 0
    let errorCount = 0
    const refreshResults = []

    // 4. Process each landlord
    for (const landlord of activeLandlords || []) {
      try {
        // Check if landlord has properties
        const { count: propertyCount } = await supabaseClient
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', landlord.id)
          .is('deleted_at', null)

        if (!propertyCount || propertyCount === 0) {
          console.log(`⏭️ Skipping landlord ${landlord.id} - no properties`, { requestId })
          continue
        }

        // Check if cache is still valid (avoid refreshing too frequently)
        const cacheKey = `insights_${landlord.id}_all_comprehensive`
        const { data: existingCache } = await supabaseClient
          .from('ai_insights_cache')
          .select('expires_at, generated_at')
          .eq('cache_key', cacheKey)
          .gte('expires_at', new Date().toISOString())
          .maybeSingle()

        if (existingCache) {
          const generatedAt = new Date(existingCache.generated_at)
          const hoursSinceGenerated = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60)
          
          // Skip if generated less than 12 hours ago
          if (hoursSinceGenerated < 12) {
            console.log(`⏭️ Skipping landlord ${landlord.id} - cache still fresh (${hoursSinceGenerated.toFixed(1)}h old)`, { requestId })
            continue
          }
        }

        // Refresh insights by calling the main insights engine
        const { data: refreshResult, error: refreshError } = await supabaseClient.functions.invoke(
          'ai-insights-engine',
          {
            body: {
              landlordId: landlord.id,
              portfolioId: 'everything',
              analysisType: 'comprehensive'
            }
          }
        )

        if (refreshError) {
          console.error(`❌ Failed to refresh insights for landlord ${landlord.id}:`, refreshError)
          errorCount++
          refreshResults.push({
            landlordId: landlord.id,
            success: false,
            error: refreshError.message
          })
        } else {
          console.log(`✅ Refreshed insights for landlord ${landlord.id}`, { requestId })
          refreshCount++
          refreshResults.push({
            landlordId: landlord.id,
            success: true,
            cached: refreshResult?.cached || false
          })
        }

        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Error processing landlord ${landlord.id}:`, error)
        errorCount++
        refreshResults.push({
          landlordId: landlord.id,
          success: false,
          error: (error instanceof Error ? error.message : String(error))
        })
      }
    }

    // 5. Log completion stats
    const totalDuration = Date.now() - startTime
    console.log('✅ AI insights refresh completed', {
      requestId,
      totalLandlords: activeLandlords?.length || 0,
      refreshCount,
      errorCount,
      purgedEntries,
      durationMs: totalDuration
    })

    // 6. Log the background job execution
    await supabaseClient
      .from('ai_function_invocations')
      .insert({
        request_id: requestId,
        function_name: 'ai-insights-refresh',
        landlord_id: null,
        portfolio_id: null,
        success: errorCount === 0,
        duration_ms: totalDuration,
        cache_hit: false,
        error_message: errorCount > 0 ? `${errorCount} landlord refresh failures` : null,
        request_context: {
          job_type: 'background_refresh',
          processed_landlords: activeLandlords?.length || 0,
          successful_refreshes: refreshCount,
          failed_refreshes: errorCount,
          purged_cache_entries: purgedEntries
        }
      })

    return new Response(JSON.stringify({
      success: true,
      processed: activeLandlords?.length || 0,
      refreshed: refreshCount,
      errors: errorCount,
      purged: purgedEntries,
      duration_ms: totalDuration,
      request_id: requestId,
      results: refreshResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMsg = (error instanceof Error ? error.message : String(error)) || 'Unknown error'
    const totalDuration = Date.now() - startTime
    
    console.error('❌ Error in AI insights refresh job:', {
      requestId,
      error: errorMsg,
      duration: totalDuration
    })

    return new Response(JSON.stringify({
      success: false,
      error: 'Background refresh failed',
      details: errorMsg,
      request_id: requestId,
      duration_ms: totalDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})