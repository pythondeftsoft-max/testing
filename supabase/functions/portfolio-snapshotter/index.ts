// Portfolio Snapshotter Edge Function
// Captures periodic snapshots of portfolio value and metrics

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PropertyData {
  id: string;
  monthly_rent: number;
  property_value: number;
  annual_expenses: number;
  status: string;
}

interface AssetData {
  id: string;
  asset_name: string;
  current_value: number;
  annual_income: number;
  annual_expenses: number;
  metadata: Record<string, any>;
}

interface SnapshooterOptions {
  portfolioId?: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const options: SnapshooterOptions = body || {}

    let results;
    if (options.portfolioId) {
      results = await capturePortfolioSnapshot(supabase, options.portfolioId)
    } else if (options.userId) {
      results = await captureUserSnapshot(supabase, options.userId)
    } else {
      results = await captureAllSnapshots(supabase)
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Portfolio snapshotter error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function captureAllSnapshots(supabase: any) {
  console.log('Capturing all portfolio snapshots...')
  
  // Get all active portfolios
  const { data: portfolios, error: portfoliosError } = await supabase
    .from('portfolios')
    .select('id, manager_id')
    .eq('is_active', true)

  if (portfoliosError) throw portfoliosError

  // Get all users with individual tracking
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id')

  if (usersError) throw usersError

  const results = []

  // Capture portfolio snapshots
  for (const portfolio of portfolios || []) {
    try {
      const result = await capturePortfolioSnapshot(supabase, portfolio.id)
      results.push({ type: 'portfolio', portfolioId: portfolio.id, ...result })
    } catch (error) {
      console.error(`Failed to capture portfolio ${portfolio.id}:`, error)
      results.push({ type: 'portfolio', portfolioId: portfolio.id, error: (error instanceof Error ? error.message : String(error)) })
    }
  }

  // Capture individual user snapshots
  for (const user of users || []) {
    try {
      const result = await captureUserSnapshot(supabase, user.id)
      results.push({ type: 'user', userId: user.id, ...result })
    } catch (error) {
      console.error(`Failed to capture user ${user.id}:`, error)
      results.push({ type: 'user', userId: user.id, error: (error instanceof Error ? error.message : String(error)) })
    }
  }

  return results
}

async function capturePortfolioSnapshot(supabase: any, portfolioId: string) {
  console.log(`Capturing snapshot for portfolio: ${portfolioId}`)

  // Get portfolio details
  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', portfolioId)
    .single()

  if (portfolioError) throw portfolioError

  // Get properties for this portfolio
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id, monthly_rent, property_value, annual_expenses, status')
    .eq('portfolio_id', portfolioId)
    .eq('deleted_at', null)

  if (propertiesError) throw propertiesError

  // Get portfolio assets
  const { data: assets, error: assetsError } = await supabase
    .from('portfolio_assets')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('is_active', true)

  if (assetsError) throw assetsError

  // Calculate metrics
  const metrics = calculatePortfolioMetrics(properties || [], assets || [])

  // Upsert snapshot
  const { data: snapshot, error: snapshotError } = await supabase
    .from('portfolio_value_snapshots')
    .upsert({
      portfolio_id: portfolioId,
      user_id: portfolio.manager_id,
      snapshot_date: new Date().toISOString().split('T')[0],
      ...metrics
    }, {
      onConflict: 'portfolio_id,user_id,snapshot_date'
    })
    .select()
    .single()

  if (snapshotError) throw snapshotError

  return { snapshot, metrics }
}

async function captureUserSnapshot(supabase: any, userId: string) {
  console.log(`Capturing snapshot for user: ${userId}`)

  // Get user's properties across all portfolios
  const { data: userAssets, error: assetsError } = await supabase
    .rpc('get_user_assets', { user_id_param: userId })

  if (assetsError) throw assetsError

  // Format assets for calculation
  const formattedAssets = (userAssets || []).map((asset: any) => ({
    id: asset.id,
    asset_name: asset.asset_name,
    current_value: asset.current_value || asset.asset_value || 0,
    annual_income: asset.annual_income || 0,
    annual_expenses: asset.annual_expenses || 0,
    metadata: asset.metadata || {}
  }))

  // Calculate metrics for user's "everything" portfolio
  const metrics = calculatePortfolioMetrics([], formattedAssets)

  // Upsert snapshot for user's "everything" portfolio
  const { data: snapshot, error: snapshotError } = await supabase
    .from('portfolio_value_snapshots')
    .upsert({
      portfolio_id: null, // User's personal "everything" view
      user_id: userId,
      snapshot_date: new Date().toISOString().split('T')[0],
      ...metrics
    }, {
      onConflict: 'user_id,snapshot_date'
    })
    .select()
    .single()

  if (snapshotError) throw snapshotError

  return { snapshot, metrics }
}

function calculatePortfolioMetrics(properties: PropertyData[], assets: AssetData[]) {
  // Calculate real estate metrics
  const totalRealEstateValue = properties.reduce((sum, prop) => sum + (prop.property_value || 0), 0)
  const monthlyRentalIncome = properties.reduce((sum, prop) => 
    prop.status === 'occupied' ? sum + (prop.monthly_rent || 0) : sum, 0)
  const propertyExpenses = properties.reduce((sum, prop) => sum + (prop.annual_expenses || 0), 0)
  
  // Calculate asset metrics
  const totalAssetsValue = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0)
  const assetIncome = assets.reduce((sum, asset) => sum + (asset.annual_income || 0), 0)
  const assetExpenses = assets.reduce((sum, asset) => sum + (asset.annual_expenses || 0), 0)

  // Calculate occupancy rate
  const occupiedProperties = properties.filter(p => p.status === 'occupied').length
  const occupancyRate = properties.length > 0 ? (occupiedProperties / properties.length) * 100 : 0

  // Combined metrics
  const totalValue = totalRealEstateValue + totalAssetsValue
  const monthlyExpenses = (propertyExpenses + assetExpenses) / 12
  const netOperatingIncome = (monthlyRentalIncome + (assetIncome / 12)) - monthlyExpenses

  return {
    total_real_estate_value: totalRealEstateValue,
    total_assets_value: totalAssetsValue,
    total_liabilities: 0, // Will be enhanced with liability tracking
    net_worth: totalValue,
    property_count: properties.length,
    asset_count: assets.length,
    occupancy_rate: occupancyRate,
    monthly_rental_income: monthlyRentalIncome,
    monthly_expenses: monthlyExpenses,
    net_operating_income: netOperatingIncome,
    metadata: {
      properties_by_status: properties.reduce((acc, prop) => {
        acc[prop.status] = (acc[prop.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      assets_by_category: assets.reduce((acc, asset) => {
        const category = asset.metadata?.asset_type || 'other'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }
}