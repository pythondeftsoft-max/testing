
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardPointsRequest {
  portfolioId: string;
  eventType: string;
  pointsAwarded: number;
  propertyId?: string;
  tenantId?: string;
  notes?: string;
  metadata?: Record<string, any>;
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

    const { portfolioId, eventType, pointsAwarded, propertyId, tenantId, notes, metadata }: AwardPointsRequest = await req.json();

    console.log('Awarding portfolio points:', { portfolioId, eventType, pointsAwarded });

    // Award points to the portfolio
    const { data: portfolioPoints, error: awardError } = await supabase.rpc('award_portfolio_points', {
      p_portfolio_id: portfolioId,
      p_source_event_type: eventType,
      p_points_awarded: pointsAwarded,
      p_property_id: propertyId || null,
      p_tenant_id: tenantId || null,
      p_notes: notes || `Points awarded for ${eventType.replace(/_/g, ' ')}`,
    });

    if (awardError) {
      console.error('Error awarding portfolio points:', awardError);
      throw awardError;
    }

    console.log('Portfolio points awarded successfully:', portfolioPoints);

    // Automatically distribute points to team members
    if (portfolioPoints) {
      const { data: distributionResult, error: distributionError } = await supabase.rpc('distribute_portfolio_points', {
        p_portfolio_points_id: portfolioPoints,
      });

      if (distributionError) {
        console.error('Error distributing points:', distributionError);
        // Don't throw here as the main award was successful
      } else {
        console.log('Points distributed to team members:', distributionResult);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        portfolioPointsId: portfolioPoints,
        pointsAwarded,
        message: `Successfully awarded ${pointsAwarded} points for ${eventType}` 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in award-portfolio-points function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to award points' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
