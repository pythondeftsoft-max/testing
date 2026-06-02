
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessEventRequest {
  eventType: 'rent_payment' | 'lease_signing' | 'maintenance_completion' | 'lease_renewal' | 'property_inspection';
  portfolioId: string;
  propertyId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

// Cache for config values (5 minute TTL)
let configCache: Record<string, any> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback values if database fetch fails
const FALLBACK_POINTS_CONFIG = {
  rent_payment: 50,
  lease_signing: 100,
  maintenance_completion: 25,
  lease_renewal: 60,
  property_inspection: 30,
} as const;

// Fetch points configuration from database
async function getPointsConfig(supabase: any) {
  const now = Date.now();
  
  // Return cached values if still valid
  if (configCache && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL)) {
    return configCache;
  }

  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .like('config_key', 'pm_%');

    if (error) throw error;

    // Build config object from database values
    const config: Record<string, any> = {};
    data?.forEach((item: any) => {
      const key = item.config_key;
      let value = item.config_value;
      
      // Parse numeric values
      if (!isNaN(value)) {
        value = parseFloat(value);
      } else if (value === 'true' || value === 'false') {
        value = value === 'true';
      }
      
      config[key] = value;
    });

    // Update cache
    configCache = config;
    cacheTimestamp = now;
    
    console.log('Loaded points config from database:', config);
    return config;
  } catch (error) {
    console.error('Error fetching points config, using fallbacks:', error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    
    // Handle health check
    if (body.healthCheck) {
      return new Response(
        JSON.stringify({ success: true, message: 'Health check passed' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { eventType, portfolioId, propertyId, tenantId, metadata }: ProcessEventRequest = body;

    // Validate required fields
    if (!eventType || !portfolioId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: eventType and portfolioId are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch configuration from database
    const config = await getPointsConfig(supabase);
    
    // Map event type to config key
    const configKeyMap: Record<string, string> = {
      rent_payment: 'pm_points_rent_payment',
      lease_signing: 'pm_points_lease_signing',
      maintenance_completion: 'pm_points_maintenance_completion',
      lease_renewal: 'pm_points_lease_renewal',
      property_inspection: 'pm_points_property_inspection',
    };

    const configKey = configKeyMap[eventType];
    if (!configKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid eventType: ${eventType}. Must be one of: ${Object.keys(configKeyMap).join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Processing portfolio event:', { eventType, portfolioId, propertyId });

    // Get base points from config or fallback
    const basePoints = config?.[configKey] || FALLBACK_POINTS_CONFIG[eventType] || 50;
    let finalPoints = basePoints;
    let notes = `Points awarded for ${eventType.replace(/_/g, ' ')}`;

    // Apply multipliers based on event-specific logic
    if (eventType === 'rent_payment') {
      const rentMode = config?.pm_rent_points_mode || 'fixed';
      
      if (rentMode === 'dollar_based' && metadata?.rentAmount) {
        // Dollar-based calculation
        const pointsPerDollar = config?.pm_points_per_rent_dollar || 0.1;
        const minPoints = config?.pm_rent_points_min || 10;
        const maxPoints = config?.pm_rent_points_max || 500;
        
        let calculatedPoints = Math.floor(metadata.rentAmount * pointsPerDollar);
        calculatedPoints = Math.max(minPoints, Math.min(maxPoints, calculatedPoints));
        finalPoints = calculatedPoints;
        notes = `$${metadata.rentAmount} rent collected`;
        
        // Apply early payment bonus
        if (metadata.isEarly) {
          const earlyMultiplier = config?.pm_bonus_early_payment_multiplier || 1.2;
          finalPoints = Math.floor(finalPoints * earlyMultiplier);
          notes += ' (early payment bonus)';
        }
      } else {
        // Fixed points mode
        finalPoints = basePoints;
        if (metadata?.isEarly) {
          const earlyMultiplier = config?.pm_bonus_early_payment_multiplier || 1.2;
          finalPoints = Math.floor(basePoints * earlyMultiplier);
          notes += ' (early payment bonus)';
        }
      }
    }

    if (eventType === 'lease_renewal' && metadata?.monthsRetained) {
      const maxMultiplier = config?.pm_bonus_retention_max_multiplier || 2.0;
      const multiplier = Math.min(metadata.monthsRetained / 12, maxMultiplier);
      finalPoints = Math.floor(basePoints * multiplier);
      notes += ` (${metadata.monthsRetained} months retained)`;
    }

    if (eventType === 'maintenance_completion' && metadata?.quality === 'high') {
      const qualityMultiplier = config?.pm_bonus_quality_maintenance || 1.5;
      finalPoints = Math.floor(basePoints * qualityMultiplier);
      notes += ' (quality bonus)';
    }

    // Apply max points limit
    const maxPoints = config?.pm_max_points_per_event || 10000;
    finalPoints = Math.min(finalPoints, maxPoints);

    // Award the points
    const awardResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/award-portfolio-points`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          portfolioId,
          eventType,
          pointsAwarded: finalPoints,
          propertyId,
          tenantId,
          notes,
          metadata,
        }),
      }
    );

    const awardResult = await awardResponse.json();

    if (!awardResult.success) {
      throw new Error(awardResult.error || 'Failed to award points');
    }

    console.log('Event processed successfully:', awardResult);

    return new Response(
      JSON.stringify({
        success: true,
        eventType,
        pointsAwarded: finalPoints,
        portfolioPointsId: awardResult.portfolioPointsId,
        message: `Successfully processed ${eventType} event and awarded ${finalPoints} points`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in process-portfolio-events function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to process event',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
