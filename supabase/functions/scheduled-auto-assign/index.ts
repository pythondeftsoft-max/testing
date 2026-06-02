import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log('🤖 Starting scheduled auto-assignment...')

  try {
    // Call the main auto-assign function
    const { data, error } = await supabase.functions.invoke('auto-assign-entities', {
      body: { 
        maxWorkloadPerWorker: 20,
        entityType: 'both'
      }
    })

    if (error) {
      console.error('❌ Auto-assignment error:', error)
    }

    // Log the results
    await supabase.from('auto_assignment_logs').insert({
      run_at: new Date().toISOString(),
      tenants_assigned: data?.tenantsAssigned || 0,
      properties_assigned: data?.propertiesAssigned || 0,
      tenants_skipped: data?.skippedTenants?.length || 0,
      properties_skipped: data?.skippedProperties?.length || 0,
      workers_used: data?.workersUsed || [],
      errors: data?.errors || [],
      triggered_by: 'cron'
    })

    console.log(`✅ Auto-assignment complete: ${data?.tenantsAssigned || 0} tenants, ${data?.propertiesAssigned || 0} properties assigned`)
    console.log(`⚠️ Skipped: ${data?.skippedTenants?.length || 0} tenants, ${data?.skippedProperties?.length || 0} properties (no workers in territory)`)

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('❌ Scheduled auto-assign error:', error)
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
