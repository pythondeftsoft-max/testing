import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('AI Predictive Maintenance function called');

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Parse request body
    const { portfolioId, propertyId, scheduledRun = false } = await req.json();
    console.log('Request params:', { portfolioId, propertyId, scheduledRun });

    // Input validation
    if (!portfolioId && !propertyId && !scheduledRun) {
      return new Response(
        JSON.stringify({ error: 'Either portfolioId, propertyId, or scheduledRun must be provided' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch maintenance history and property data
    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        properties:property_id (
          id,
          address,
          property_type,
          year_built,
          monthly_rent,
          owner_id,
          portfolio_id
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters based on request
    if (portfolioId) {
      query = query.eq('properties.portfolio_id', portfolioId);
    }
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: maintenanceData, error: maintenanceError } = await query;

    if (maintenanceError) {
      console.error('Error fetching maintenance data:', maintenanceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch maintenance data' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetched ${maintenanceData?.length || 0} maintenance records`);

    // Group maintenance data by property
    const propertiesMap = new Map();
    maintenanceData?.forEach(record => {
      if (!record.properties) return;
      
      const propertyId = record.properties.id;
      if (!propertiesMap.has(propertyId)) {
        propertiesMap.set(propertyId, {
          property: record.properties,
          maintenanceHistory: []
        });
      }
      propertiesMap.get(propertyId).maintenanceHistory.push(record);
    });

    const properties = Array.from(propertiesMap.values());
    console.log(`Processing ${properties.length} properties`);

    // Generate predictions for each property
    const predictions = [];
    
    for (const { property, maintenanceHistory } of properties) {
      try {
        let prediction;
        
        // Try AI prediction first if Gemini is configured
        if (GEMINI_API_KEY) {
          prediction = await generateGeminiPrediction(property, maintenanceHistory);
        }
        
        // Fallback to heuristic prediction if AI fails or not configured
        if (!prediction) {
          prediction = generateHeuristicPrediction(property, maintenanceHistory);
        }

        predictions.push({
          propertyId: property.id,
          propertyAddress: property.address,
          ...prediction
        });

      } catch (error) {
        console.error(`Error generating prediction for property ${property.id}:`, error);
        
        // Use fallback heuristic prediction
        const fallbackPrediction = generateHeuristicPrediction(property, maintenanceHistory);
        predictions.push({
          propertyId: property.id,
          propertyAddress: property.address,
          ...fallbackPrediction
        });
      }
    }

    // Cache the predictions in database
    if (predictions.length > 0) {
      const cacheKey = portfolioId ? `portfolio_${portfolioId}` : propertyId ? `property_${propertyId}` : 'scheduled_run';
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 168); // 1 week cache

      const { error: cacheError } = await supabase
        .from('ai_insights_cache')
        .upsert({
          cache_key: `predictive_maintenance_${cacheKey}`,
          landlord_id: portfolioId || propertyId || 'system',
          portfolio_id: portfolioId,
          insights_data: { predictions, generatedAt: new Date().toISOString() },
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'cache_key'
        });

      if (cacheError) {
        console.error('Error caching predictions:', cacheError);
      } else {
        console.log('Successfully cached predictions');
      }
    }

    console.log(`Generated ${predictions.length} predictive maintenance insights`);

    return new Response(
      JSON.stringify({ 
        success: true,
        predictions,
        propertiesAnalyzed: properties.length,
        aiPowered: !!GEMINI_API_KEY,
        cachedAt: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in AI predictive maintenance function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: (error instanceof Error ? error.message : String(error)) 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateGeminiPrediction(property: any, maintenanceHistory: any[]) {
  if (!GEMINI_API_KEY) return null;

  try {
    const prompt = `Analyze this property's maintenance history and predict future maintenance needs:

Property Details:
- Address: ${property.address}
- Type: ${property.property_type}
- Year Built: ${property.year_built || 'Unknown'}
- Monthly Rent: $${property.monthly_rent || 'Unknown'}

Recent Maintenance History (${maintenanceHistory.length} records):
${maintenanceHistory.slice(0, 10).map(record => 
  `- ${record.request_type}: ${record.description} (${record.status}, Priority: ${record.priority})`
).join('\n')}

Based on this data, predict the top 3 most likely maintenance issues in the next 6 months. Return ONLY a JSON object with this structure:
{
  "predictions": [
    {
      "issue": "specific maintenance issue",
      "probability": "percentage as number 0-100",
      "estimatedCost": "number without $ symbol",
      "timeline": "timeframe like 'Next 30 days'",
      "preventiveMeasures": "brief actionable advice"
    }
  ],
  "riskScore": "number 1-10",
  "confidence": "number 0-100"
}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error('No content in Gemini response');
      return null;
    }

    // Parse JSON from response
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    
    return {
      predictions: parsed.predictions || [],
      riskScore: parsed.riskScore || 5,
      confidence: parsed.confidence || 70,
      aiGenerated: true
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

function generateHeuristicPrediction(property: any, maintenanceHistory: any[]) {
  const currentYear = new Date().getFullYear();
  const propertyAge = property.year_built ? currentYear - property.year_built : 20;
  
  // Count issues by type in last 12 months
  const recentIssues = maintenanceHistory.filter(record => {
    const recordDate = new Date(record.created_at);
    const monthsAgo = (Date.now() - recordDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo <= 12;
  });

  const issueTypes = new Map();
  recentIssues.forEach(record => {
    const type = record.request_type || 'general';
    issueTypes.set(type, (issueTypes.get(type) || 0) + 1);
  });

  // Generate predictions based on property age and history
  const predictions = [];
  
  // Common age-based predictions
  if (propertyAge > 15) {
    predictions.push({
      issue: "HVAC System Maintenance",
      probability: Math.min(85, 40 + propertyAge),
      estimatedCost: 300 + (propertyAge * 10),
      timeline: "Next 90 days",
      preventiveMeasures: "Schedule regular HVAC inspections and filter changes"
    });
  }
  
  if (propertyAge > 10) {
    predictions.push({
      issue: "Plumbing Inspection Required", 
      probability: Math.min(75, 30 + propertyAge),
      estimatedCost: 200 + (propertyAge * 8),
      timeline: "Next 120 days",
      preventiveMeasures: "Check for leaks, inspect water pressure and drainage"
    });
  }

  // History-based predictions
  if (issueTypes.has('plumbing') && issueTypes.get('plumbing') >= 2) {
    predictions.push({
      issue: "Recurring Plumbing Issues",
      probability: 80,
      estimatedCost: 400,
      timeline: "Next 60 days", 
      preventiveMeasures: "Consider full plumbing system assessment"
    });
  }

  if (issueTypes.has('electrical') && issueTypes.get('electrical') >= 1) {
    predictions.push({
      issue: "Electrical System Check",
      probability: 65,
      estimatedCost: 250,
      timeline: "Next 90 days",
      preventiveMeasures: "Schedule electrical safety inspection"
    });
  }

  // Default prediction if no specific issues
  if (predictions.length === 0) {
    predictions.push({
      issue: "General Maintenance Check",
      probability: 60,
      estimatedCost: 150,
      timeline: "Next 180 days",
      preventiveMeasures: "Schedule routine property inspection"
    });
  }

  // Calculate risk score based on frequency and age
  const issueFrequency = recentIssues.length;
  const riskScore = Math.min(10, Math.max(1, Math.floor(
    (propertyAge / 5) + (issueFrequency / 2) + 1
  )));

  return {
    predictions: predictions.slice(0, 3),
    riskScore,
    confidence: 60,
    aiGenerated: false
  };
}