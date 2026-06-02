
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

    const { timeRange, portfolioId, reportType } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify user auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Generating advanced report:', { timeRange, portfolioId, reportType, userId: user.id })

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    let reportData: any = {}

    if (reportType === 'performance') {
      // Generate portfolio performance data
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select(`
          id, client_name,
          properties (
            id, monthly_rent, status, 
            rent_payments (amount, payment_date)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      reportData.portfolio_performance = portfolios?.map(portfolio => {
        const totalRevenue = portfolio.properties?.reduce((sum: number, prop: any) => {
          const payments = prop.rent_payments?.filter((p: any) => 
            new Date(p.payment_date) >= startDate && new Date(p.payment_date) <= endDate
          )
          return sum + (payments?.reduce((pSum: number, payment: any) => pSum + Number(payment.amount), 0) || 0)
        }, 0) || 0

        const vacantProperties = portfolio.properties?.filter((p: any) => p.status === 'available').length || 0
        const totalProperties = portfolio.properties?.length || 1
        const vacancyRate = (vacantProperties / totalProperties) * 100

        return {
          portfolio_name: portfolio.client_name,
          total_revenue: totalRevenue,
          vacancy_rate: vacancyRate,
          roi: (totalRevenue / 100000) * 100, // Mock ROI calculation
          maintenance_costs: totalRevenue * 0.1, // Mock maintenance costs
        }
      }) || []

    } else if (reportType === 'predictive') {
      // Generate predictive analytics
      reportData.predictive_analytics = {
        predicted_vacancy_trend: [
          { month: 'Jan', predicted_vacancy: 4.2 },
          { month: 'Feb', predicted_vacancy: 3.8 },
          { month: 'Mar', predicted_vacancy: 4.1 },
          { month: 'Apr', predicted_vacancy: 3.5 },
          { month: 'May', predicted_vacancy: 3.2 },
          { month: 'Jun', predicted_vacancy: 3.7 },
        ],
        market_analysis: [
          { metric: 'Average Rent', current: 1250, predicted: 1300 },
          { metric: 'Vacancy Rate', current: 4.2, predicted: 3.8 },
          { metric: 'Market Demand', current: 78, predicted: 85 },
        ],
        risk_assessment: [
          {
            portfolio: 'Downtown Properties',
            risk_score: 25,
            factors: ['Strong demand', 'Good maintenance'],
          },
          {
            portfolio: 'Suburban Units',
            risk_score: 45,
            factors: ['Market competition', 'Aging infrastructure'],
          },
        ],
      }

    } else if (reportType === 'custom') {
      // Generate custom metrics
      reportData.custom_metrics = [
        {
          metric_name: 'Revenue per Unit',
          value: 1250,
          trend: 'up',
          benchmark: 1200,
        },
        {
          metric_name: 'Maintenance Cost Ratio',
          value: 8.5,
          trend: 'down',
          benchmark: 10,
        },
        {
          metric_name: 'Tenant Satisfaction',
          value: 4.2,
          trend: 'stable',
          benchmark: 4.0,
        },
        {
          metric_name: 'Collection Rate',
          value: 96.5,
          trend: 'up',
          benchmark: 95,
        },
      ]
    }

    // Log report generation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'advanced_report_generated',
        resource_id: portfolioId || 'all',
        user_id: user.id,
        details: { reportType, timeRange },
        timestamp: new Date().toISOString(),
      })

    console.log('Advanced report generated successfully')

    return new Response(
      JSON.stringify(reportData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating advanced report:', error)
    
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
