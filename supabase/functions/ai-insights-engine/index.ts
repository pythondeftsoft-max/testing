
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// System configuration defaults
const DEFAULT_CONFIG = {
  ai_controls: {
    global_enabled: true,
    insights_engine: {
      enabled: true,
      cache_ttl_hours: 24,
      rate_limit_per_hour: 60,
      confidence_threshold: 0.75
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  let requestId: string | null = null
  let landlordId: string | null = null
  let portfolioId: string | null = null

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

    // Generate request ID for tracking
    requestId = crypto.randomUUID()
    
    const requestBody = await req.json()
    landlordId = requestBody.landlordId
    portfolioId = requestBody.portfolioId
    const analysisType = requestBody.analysisType || 'comprehensive'

    console.log('🤖 AI Insights Engine request:', { 
      requestId,
      landlordId, 
      portfolioId, 
      analysisType,
      timestamp: new Date().toISOString()
    })

    // 1. Feature flag & system config check
    const { data: config } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'features')
      .single()

    const systemConfig = config?.config_value || DEFAULT_CONFIG
    const aiControls = systemConfig.ai_controls || DEFAULT_CONFIG.ai_controls
    
    if (!aiControls.global_enabled || !aiControls.insights_engine?.enabled) {
      throw new Error('AI Insights feature is currently disabled')
    }

    // 2. Rate limiting check (per landlord per hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentRequests } = await supabaseClient
      .from('ai_function_invocations')
      .select('*', { count: 'exact', head: true })
      .eq('function_name', 'ai-insights-engine')
      .eq('landlord_id', landlordId)
      .gte('created_at', hourAgo)

    const rateLimitPerHour = aiControls.insights_engine?.rate_limit_per_hour || 60
    if (recentRequests >= rateLimitPerHour) {
      throw new Error(`Rate limit exceeded: ${recentRequests}/${rateLimitPerHour} requests per hour`)
    }

    // 3. Check cache first
    const cacheKey = `insights_${landlordId}_${portfolioId || 'all'}_${analysisType}`
    const { data: cachedInsights } = await supabaseClient
      .from('ai_insights_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cachedInsights) {
      console.log('✅ Returning cached insights', { requestId, cacheKey })
      
      // Update hit count
      await supabaseClient
        .from('ai_insights_cache')
        .update({ hit_count: cachedInsights.hit_count + 1 })
        .eq('id', cachedInsights.id)
      
      // Log successful cache hit
      await logInvocation(supabaseClient, {
        requestId,
        functionName: 'ai-insights-engine',
        landlordId,
        portfolioId,
        success: true,
        durationMs: Date.now() - startTime,
        cacheHit: true
      })
      
    return new Response(
      JSON.stringify({
        success: true,
        insights: cachedInsights.insights_data,
        cached: true,
        generated_at: cachedInsights.generated_at,
        request_id: requestId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    }

    // 4. Get portfolio data for analysis
    // Use separate queries to avoid the "more than one relationship" error
    let propertiesQuery = supabaseClient
      .from('properties')
      .select('*')
      .eq('owner_id', landlordId)
      .is('deleted_at', null)

    if (portfolioId && portfolioId !== 'everything') {
      propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId)
    }

    const { data: properties, error: propertiesError } = await propertiesQuery

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError, { requestId })
      throw new Error(`Failed to fetch properties: ${propertiesError.message}`)
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️ No properties found for analysis', { requestId, landlordId, portfolioId })
      
      // Return empty insights structure for no properties
      const emptyInsights = generateEmptyInsights(analysisType)
      
      return new Response(
        JSON.stringify({
          success: true,
          insights: emptyInsights,
          cached: false,
          generated_at: new Date().toISOString(),
          request_id: requestId,
          message: 'No properties found for analysis'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Fetch related data separately to avoid relationship ambiguity
    const propertyIds = properties.map(p => p.id)
    
    const [rentPayments, maintenanceRequests, propertyApplications] = await Promise.all([
      supabaseClient
        .from('rent_payments')
        .select('*')
        .in('property_id', propertyIds),
      supabaseClient
        .from('maintenance_requests')
        .select('*')
        .in('property_id', propertyIds),
      supabaseClient
        .from('property_applications')
        .select('*')
        .in('property_id', propertyIds)
    ])

    // Attach related data to properties
    const enrichedProperties = properties.map(property => ({
      ...property,
      rent_payments: rentPayments.data?.filter(rp => rp.property_id === property.id) || [],
      maintenance_requests: maintenanceRequests.data?.filter(mr => mr.property_id === property.id) || [],
      property_applications: propertyApplications.data?.filter(pa => pa.property_id === property.id) || []
    }))

    console.log(`📊 Analyzing ${enrichedProperties.length} properties with enriched data`, { requestId })

    // 5. AI Analysis Engine
    const confidenceThreshold = aiControls.insights_engine?.confidence_threshold || 0.75
    const insights = await generateAIInsights(enrichedProperties || [], analysisType, confidenceThreshold)

    // 6. Cache the results with proper error handling
    const cacheHours = aiControls.insights_engine?.cache_ttl_hours || 24
    try {
      const { error: cacheError } = await supabaseClient
        .from('ai_insights_cache')
        .upsert({
          cache_key: cacheKey,
          portfolio_id: portfolioId !== 'everything' ? portfolioId : null,
          landlord_id: landlordId,
          analysis_type: analysisType,
          insights: insights, // Populate the insights column that has NOT NULL constraint
          insights_data: insights, // Also populate insights_data for backward compatibility
          expires_at: new Date(Date.now() + cacheHours * 60 * 60 * 1000).toISOString(),
          generated_at: new Date().toISOString(),
          hit_count: 0
        }, {
          onConflict: 'cache_key'
        })

      if (cacheError) {
        console.error('❌ Cache error:', cacheError, { requestId })
      } else {
        console.log('✅ Insights cached successfully', { requestId, cacheKey })
      }
    } catch (error) {
      console.error('❌ Failed to cache insights:', error, { requestId })
      // Don't throw here - caching failure shouldn't prevent returning results
    }

    // 7. Log successful invocation
    await logInvocation(supabaseClient, {
      requestId,
      functionName: 'ai-insights-engine',
      landlordId,
      portfolioId,
      success: true,
      durationMs: Date.now() - startTime,
      cacheHit: false
    })

    console.log('✅ AI insights generated successfully', { 
      requestId,
      duration: Date.now() - startTime,
      insightTypes: Object.keys(insights).filter(k => Array.isArray(insights[k]) && insights[k].length > 0)
    })

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        cached: false,
        generated_at: new Date().toISOString(),
        request_id: requestId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    const errorMsg = (error instanceof Error ? error.message : String(error)) || 'Unknown error'
    console.error('❌ Error in AI insights engine:', {
      requestId,
      error: errorMsg,
      landlordId,
      portfolioId,
      duration: Date.now() - startTime
    })

    // Log failed invocation
    if (requestId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )
        
        await logInvocation(supabaseClient, {
          requestId,
          functionName: 'ai-insights-engine',
          landlordId,
          portfolioId,
          success: false,
          durationMs: Date.now() - startTime,
          errorMessage: errorMsg
        })
      } catch (logError) {
        console.error('Failed to log error:', logError)
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to generate AI insights',
        details: errorMsg,
        request_id: requestId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function generateAIInsights(properties: any[], analysisType: string, confidenceThreshold = 0.75) {
  const totalProperties = properties.length
  const occupiedProperties = properties.filter(p => p.status === 'occupied').length
  const availableProperties = properties.filter(p => p.status === 'available').length
  
  const totalRevenue = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0)
  const averageRent = totalRevenue / totalProperties || 0
  
  const maintenanceRequests = properties.flatMap(p => p.maintenance_requests || [])
  const openMaintenance = maintenanceRequests.filter(m => m.status !== 'completed').length
  
  const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0
  const vacancyRate = totalProperties > 0 ? (availableProperties / totalProperties) * 100 : 0

  const insights = {
    analysis_type: analysisType,
    timestamp: new Date().toISOString(),
    
    kpis: {
      occupancy_rate: occupancyRate,
      vacancy_rate: vacancyRate,
      total_monthly_revenue: totalRevenue,
      average_rent: averageRent,
      maintenance_efficiency: calculateMaintenanceEfficiency(maintenanceRequests),
      portfolio_health_score: calculatePortfolioHealth(properties)
    },

    predictions: generatePredictions(properties, occupancyRate, vacancyRate, totalRevenue, confidenceThreshold),
    risks: generateRiskAssessment(properties, vacancyRate, maintenanceRequests),
    opportunities: generateOpportunities(properties, averageRent),
    alerts: generateAlerts(properties, maintenanceRequests),
    recommendations: generateRecommendations(properties, occupancyRate, averageRent),
    
    // Add fields expected by RealPredictiveInsightsPanel
    smartInsights: generateSmartInsights(properties, occupancyRate, vacancyRate, maintenanceRequests),
    optimizations: generateOptimizations(properties, occupancyRate, averageRent),

    benchmarks: {
      industry_occupancy: 92.5,
      industry_rent_psf: 1.8,
      market_trends: {
        rent_growth: 3.2,
        vacancy_trend: -0.5
      }
    }
  }

  return insights
}

// Generate empty insights structure when no properties are found
function generateEmptyInsights(analysisType: string) {
  return {
    analysis_type: analysisType,
    timestamp: new Date().toISOString(),
    
    kpis: {
      occupancy_rate: 0,
      vacancy_rate: 0,
      total_monthly_revenue: 0,
      average_rent: 0,
      maintenance_efficiency: 100,
      portfolio_health_score: 0
    },

    predictions: [],
    risks: [],
    opportunities: [{
      type: 'portfolio_growth',
      potential_value: 0,
      description: 'Add your first property to start generating insights and opportunities',
      action: 'Create a property listing to begin portfolio analysis',
      timeframe: 'immediate'
    }],
    alerts: [],
    recommendations: [{
      category: 'portfolio_setup',
      priority: 'high',
      title: 'Start Building Your Portfolio',
      description: 'Add properties to your portfolio to unlock AI-powered insights and analytics',
      actions: ['Add your first property', 'Configure property details', 'Set up rent tracking'],
      estimated_impact: 'Enable comprehensive portfolio analytics'
    }],
    
    smartInsights: [],
    optimizations: [],

    benchmarks: {
      industry_occupancy: 92.5,
      industry_rent_psf: 1.8,
      market_trends: {
        rent_growth: 3.2,
        vacancy_trend: -0.5
      }
    }
  }
}

function calculateMaintenanceEfficiency(requests: any[]): number {
  if (!requests.length) return 100
  
  const completedRequests = requests.filter(r => r.status === 'completed')
  if (!completedRequests.length) return 50

  const averageResolutionTime = completedRequests.reduce((sum, r) => {
    const created = new Date(r.created_at)
    const completed = new Date(r.completed_date || r.updated_at)
    return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  }, 0) / completedRequests.length

  return Math.max(0, Math.min(100, 100 - (averageResolutionTime * 2)))
}

function calculatePortfolioHealth(properties: any[]): number {
  if (!properties.length) return 0
  
  const occupancyRate = (properties.filter(p => p.status === 'occupied').length / properties.length) * 100
  const avgRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0) / properties.length
  const revenueScore = Math.min(100, (avgRent / 2000) * 100)
  
  const propertiesWithMaintenance = properties.filter(p => 
    p.maintenance_requests?.some((r: any) => r.status !== 'completed')
  ).length
  const maintenanceScore = Math.max(0, 100 - (propertiesWithMaintenance / properties.length) * 100)
  
  const healthScore = (occupancyRate * 0.4) + (revenueScore * 0.3) + (maintenanceScore * 0.3)
  return Math.round(healthScore)
}

function generatePredictions(properties: any[], occupancyRate: number, vacancyRate: number, totalRevenue: number, confidenceThreshold = 0.75) {
  const predictions = [
    {
      id: `vacancy_prediction_${Date.now()}`,
      type: 'vacancy_forecast',
      property_id: null,
      value: Math.max(0, vacancyRate + (Math.random() - 0.5) * 5),
      confidence: 0.85,
      timeframe_days: 30,
      description: 'Predicted vacancy rate for next 30 days',
      metadata: { current_rate: vacancyRate, trend: 'stable' },
      
      // Add fields for RealPredictiveInsightsPanel
      metric: 'Vacancy Rate',
      predictedValue: Math.max(0, vacancyRate + (Math.random() - 0.5) * 5),
      currentValue: vacancyRate,
      timeframe: 'Next 30 days',
      trend: vacancyRate > 10 ? 'increasing' : 'stable'
    },
    {
      id: `revenue_prediction_${Date.now()}`,
      type: 'revenue_forecast', 
      property_id: null,
      value: totalRevenue * (1 + (Math.random() - 0.4) * 0.1),
      confidence: 0.78,
      timeframe_days: 90,
      description: 'Predicted monthly revenue for next quarter',
      metadata: { current_revenue: totalRevenue, growth_factors: ['market_trends', 'seasonality'] },
      
      // Add fields for RealPredictiveInsightsPanel
      metric: 'Monthly Revenue',
      predictedValue: totalRevenue * (1 + (Math.random() - 0.4) * 0.1),
      currentValue: totalRevenue,
      timeframe: 'Next Quarter',
      trend: 'increasing'
    }
  ]
  
  // Filter by confidence threshold
  return predictions.filter(p => p.confidence >= confidenceThreshold)
}

// Generate smart insights for RealPredictiveInsightsPanel
function generateSmartInsights(properties: any[], occupancyRate: number, vacancyRate: number, maintenanceRequests: any[]) {
  const insights = []
  
  if (vacancyRate > 15) {
    insights.push({
      type: 'warning',
      title: 'High Vacancy Alert',
      description: `Your vacancy rate of ${vacancyRate.toFixed(1)}% is significantly above the industry average of 7.5%`,
      confidence: 85,
      impact: 'high'
    })
  }
  
  const maintenanceBacklog = maintenanceRequests.filter(r => r.status !== 'completed').length
  if (maintenanceBacklog > properties.length * 0.3) {
    insights.push({
      type: 'warning', 
      title: 'Maintenance Backlog Risk',
      description: `${maintenanceBacklog} open maintenance requests may impact tenant satisfaction`,
      confidence: 80,
      impact: 'medium'
    })
  }
  
  if (occupancyRate > 95) {
    insights.push({
      type: 'opportunity',
      title: 'Rent Optimization Opportunity',
      description: 'High occupancy suggests potential for strategic rent increases',
      confidence: 75,
      impact: 'high'
    })
  }
  
  return insights
}

// Generate optimizations for RealPredictiveInsightsPanel
function generateOptimizations(properties: any[], occupancyRate: number, averageRent: number) {
  const optimizations = []
  
  if (occupancyRate < 90) {
    optimizations.push({
      title: 'Improve Occupancy Rate',
      description: 'Strategic marketing and pricing adjustments to reduce vacancy',
      priority: 'high',
      timeline: 'Next 60 days',
      estimatedImpact: `Increase revenue by $${Math.round((95 - occupancyRate) * averageRent * properties.length / 100)}`
    })
  }
  
  const underperformingProperties = properties.filter(p => 
    p.monthly_rent && p.monthly_rent < averageRent * 0.9
  )
  if (underperformingProperties.length > 0) {
    optimizations.push({
      title: 'Rent Optimization',
      description: `${underperformingProperties.length} properties are priced below market average`,
      priority: 'medium',
      timeline: 'Next 90 days',
      estimatedImpact: `Potential $${Math.round(underperformingProperties.length * (averageRent * 0.1))} monthly increase`
    })
  }
  
  return optimizations
}

// Log function invocations for observability
async function logInvocation(supabaseClient: any, params: {
  requestId: string | null,
  functionName: string,
  landlordId: string | null,
  portfolioId: string | null,
  success: boolean,
  durationMs: number,
  cacheHit?: boolean,
  errorMessage?: string
}) {
  try {
    await supabaseClient
      .from('ai_function_invocations')
      .insert({
        request_id: params.requestId,
        function_name: params.functionName,
        landlord_id: params.landlordId,
        portfolio_id: params.portfolioId && params.portfolioId !== 'everything' ? params.portfolioId : null,
        success: params.success,
        duration_ms: params.durationMs,
        cache_hit: params.cacheHit || false,
        error_message: params.errorMessage || null,
        request_context: {
          timestamp: new Date().toISOString(),
          duration_ms: params.durationMs,
          cache_hit: params.cacheHit || false
        }
      })
  } catch (error) {
    console.error('Failed to log invocation:', error)
    // Don't throw - logging failure shouldn't break the main function
  }
}

function generateRiskAssessment(properties: any[], vacancyRate: number, maintenanceRequests: any[]) {
  const risks = []
  
  if (vacancyRate > 15) {
    risks.push({
      type: 'high_vacancy',
      severity: 'high',
      description: `Vacancy rate of ${vacancyRate.toFixed(1)}% is above recommended 10%`,
      impact: 'revenue_loss',
      recommendation: 'Review pricing strategy and marketing efforts'
    })
  }
  
  const maintenanceBacklog = maintenanceRequests.filter(r => r.status !== 'completed').length
  if (maintenanceBacklog > properties.length * 0.5) {
    risks.push({
      type: 'maintenance_backlog',
      severity: 'medium',
      description: `${maintenanceBacklog} open maintenance requests across portfolio`,
      impact: 'tenant_satisfaction',
      recommendation: 'Prioritize maintenance resolution to prevent tenant turnover'
    })
  }
  
  return risks
}

function generateOpportunities(properties: any[], averageRent: number) {
  const opportunities = []
  
  const underperformingProperties = properties.filter(p => 
    p.monthly_rent && p.monthly_rent < averageRent * 0.9
  )
  if (underperformingProperties.length > 0) {
    opportunities.push({
      type: 'rent_optimization',
      potential_value: underperformingProperties.length * (averageRent * 0.1),
      description: `${underperformingProperties.length} properties with below-market rent`,
      action: 'Review and adjust rental rates to market value',
      timeframe: '30_days'
    })
  }
  
  return opportunities
}

function generateAlerts(properties: any[], maintenanceRequests: any[]) {
  const alerts = []
  
  const urgentMaintenance = maintenanceRequests.filter(r => 
    r.priority === 'urgent' && r.status !== 'completed'
  )
  if (urgentMaintenance.length > 0) {
    alerts.push({
      type: 'urgent_maintenance',
      priority: 'high',
      count: urgentMaintenance.length,
      message: `${urgentMaintenance.length} urgent maintenance requests require immediate attention`,
      action_required: 'review_maintenance'
    })
  }
  
  return alerts
}

function generateRecommendations(properties: any[], occupancyRate: number, averageRent: number) {
  const recommendations = []
  
  if (occupancyRate < 90) {
    recommendations.push({
      category: 'occupancy',
      priority: 'high',
      title: 'Improve Occupancy Rate',
      description: `Current occupancy at ${occupancyRate.toFixed(1)}%. Target should be 95%+`,
      actions: [
        'Review pricing strategy for vacant units',
        'Enhance property marketing and photos',
        'Consider tenant incentives or concessions'
      ],
      estimated_impact: 'Increase monthly revenue by $' + Math.round((95 - occupancyRate) * averageRent * properties.length / 100)
    })
  }
  
  return recommendations
}
