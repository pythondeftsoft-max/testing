// Setup Cron Jobs Edge Function
// Sets up automated scheduling for portfolio snapshots and wallet syncing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action } = await req.json()

    let result;
    switch (action) {
      case 'setup-portfolio-snapshots':
        result = await setupPortfolioSnapshots(supabase)
        break
      case 'setup-wallet-sync':
        result = await setupWalletSync(supabase)
        break
      case 'setup-all':
        const portfolioResult = await setupPortfolioSnapshots(supabase)
        const walletResult = await setupWalletSync(supabase)
        result = { portfolio: portfolioResult, wallet: walletResult }
        break
      default:
        throw new Error('Invalid action specified')
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Cron setup error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function setupPortfolioSnapshots(supabase: any) {
  console.log('Setting up portfolio snapshot cron job...')
  
  // For this demo, we'll return the configuration that should be set up
  // In production, these would use pg_cron extension
  
  return { 
    job: 'portfolio-snapshots-daily',
    schedule: '0 1 * * *',
    description: 'Daily portfolio value snapshots at 1 AM',
    status: 'configured',
    note: 'In production, set up via Supabase Dashboard -> Database -> Cron Jobs'
  }
}

async function setupWalletSync(supabase: any) {
  console.log('Setting up wallet sync cron job...')
  
  return {
    job: 'wallet-sync-hourly',
    schedule: '0 * * * *',
    description: 'Hourly wallet balance sync',
    status: 'configured',
    note: 'In production, set up via Supabase Dashboard -> Database -> Cron Jobs'
  }
}