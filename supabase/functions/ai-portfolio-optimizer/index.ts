
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

    const { portfolioId } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify user auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Generating AI portfolio optimization for:', portfolioId)

    // Get portfolio data
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select(`
        *,
        properties (
          id, monthly_rent, status, address, 
          rent_payments (amount, payment_date, days_late),
          maintenance_requests (id, status, created_at, cost)
        )
      `)
      .eq('id', portfolioId)
      .single()

    if (portfolioError) {
      throw portfolioError
    }

    // AI Analysis (simplified mock implementation)
    const properties = portfolio.properties || []
    const totalRevenue = properties.reduce((sum: number, prop: any) => {
      return sum + (Number(prop.monthly_rent) || 0)
    }, 0)

    const vacantCount = properties.filter((p: any) => p.status === 'available').length
    const occupancyRate = ((properties.length - vacantCount) / properties.length) * 100

    // Generate optimization suggestions
    const suggestions = [
      {
        category: 'Revenue Optimization',
        priority: 'high',
        suggestion: 'Consider increasing rent for 3 properties that are 15% below market rate',
        potential_impact: '$450/month',
        confidence: 0.87,
        properties_affected: 3,
      },
      {
        category: 'Maintenance Efficiency',
        priority: 'medium',
        suggestion: 'Bundle maintenance requests for properties within 2-mile radius',
        potential_impact: '$200 savings',
        confidence: 0.73,
        properties_affected: 5,
      },
      {
        category: 'Vacancy Reduction',
        priority: 'high',
        suggestion: 'Implement targeted marketing for vacant properties',
        potential_impact: '$2,100/month',
        confidence: 0.82,
        properties_affected: vacantCount,
      },
    ]

    if (occupancyRate < 90) {
      suggestions.push({
        category: 'Occupancy Improvement',
        priority: 'high',
        suggestion: 'Review pricing strategy and unit amenities for vacant properties',
        potential_impact: `$${Math.round(totalRevenue * 0.1)}/month`,
        confidence: 0.78,
        properties_affected: vacantCount,
      })
    }

    const totalPotentialSavings = suggestions.reduce((sum, s) => {
      const impact = s.potential_impact.replace(/[^0-9]/g, '')
      return sum + (parseInt(impact) || 0)
    }, 0)

    const optimizationData = {
      suggestions,
      confidence: 0.81,
      potential_savings: totalPotentialSavings,
      implementation_priority: suggestions
        .filter(s => s.priority === 'high')
        .map(s => s.suggestion),
      portfolio_metrics: {
        total_properties: properties.length,
        occupancy_rate: occupancyRate,
        average_rent: totalRevenue / properties.length,
        maintenance_efficiency: 0.78, // Mock score
      },
    }

    // Log optimization request
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ai_optimization_generated',
        resource_id: portfolioId,
        user_id: user.id,
        details: { suggestions_count: suggestions.length, potential_savings: totalPotentialSavings },
        timestamp: new Date().toISOString(),
      })

    console.log('AI portfolio optimization completed')

    return new Response(
      JSON.stringify(optimizationData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in AI portfolio optimizer:', error)
    
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
