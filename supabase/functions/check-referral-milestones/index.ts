
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-REFERRAL-MILESTONES] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logStep("Starting referral milestone check");

    // Get all referrals that have passed 60 days but aren't qualified yet
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: eligibleReferrals, error: referralError } = await supabase
      .from('referrals')
      .select(`
        id,
        referrer_id,
        referred_user_id,
        first_payment_at,
        status
      `)
      .eq('status', 'first_payment')
      .lte('first_payment_at', sixtyDaysAgo);

    if (referralError) {
      throw new Error(`Failed to fetch eligible referrals: ${referralError.message}`);
    }

    logStep(`Found ${eligibleReferrals?.length || 0} eligible referrals for 60-day qualification`);

    let qualifiedCount = 0;
    let milestonesAwarded = 0;

    // Process each eligible referral
    for (const referral of eligibleReferrals || []) {
      try {
        // Check if tenant is still housed (has active rent payments in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: recentPayments } = await supabase
          .from('rent_payments')
          .select('id')
          .eq('tenant_id', referral.referred_user_id)
          .gte('payment_date', thirtyDaysAgo)
          .limit(1);

        if (recentPayments && recentPayments.length > 0) {
          // Tenant is still housed, qualify the referral
          const { error: updateError } = await supabase
            .from('referrals')
            .update({
              status: 'qualified',
              sixty_day_milestone_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', referral.id);

          if (updateError) {
            logStep(`Failed to update referral ${referral.id}`, { error: updateError.message });
            continue;
          }

          // Award 10,000 points to referrer
          const { error: pointsError } = await supabase.rpc('award_points', {
            p_user_id: referral.referrer_id,
            p_event_type: 'referral_completion',
            p_points_change: 10000,
            p_notes: 'Referral completed successfully - tenant housed for 60+ days',
            p_related_entity_id: referral.id,
            p_related_entity_type: 'referral'
          });

          if (pointsError) {
            logStep(`Failed to award points for referral ${referral.id}`, { error: pointsError.message });
          } else {
            qualifiedCount++;
            logStep(`Qualified referral and awarded points`, { 
              referralId: referral.id, 
              referrerId: referral.referrer_id 
            });

            // Create notification for referrer
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: referral.referrer_id,
                type: 'referral_reward',
                title: '🎉 Referral Reward Available!',
                description: 'Your referral reward is now available! The tenant you referred has been successfully housed for 60 days.',
                category: 'Referral',
                link: '/tenant/referrals',
                priority: 'high',
                read: false
              });

            if (notificationError) {
              logStep(`Failed to create notification for referral ${referral.id}`, { 
                error: notificationError.message 
              });
            } else {
              logStep(`Created referral reward notification`, { 
                referrerId: referral.referrer_id 
              });
            }
          }

          // Check for milestone bonus (every 5 successful referrals)
          const { data: totalQualified } = await supabase
            .from('referrals')
            .select('id')
            .eq('referrer_id', referral.referrer_id)
            .eq('status', 'qualified');

          const totalCount = totalQualified?.length || 0;
          
          if (totalCount > 0 && totalCount % 5 === 0) {
            // Check if milestone bonus already awarded
            const { data: existingBonus } = await supabase
              .from('points_history')
              .select('id')
              .eq('user_id', referral.referrer_id)
              .eq('event_type', 'referral_milestone')
              .eq('notes', `5 successful referrals milestone bonus (${totalCount} total)`)
              .limit(1);

            if (!existingBonus || existingBonus.length === 0) {
              const { error: bonusError } = await supabase.rpc('award_points', {
                p_user_id: referral.referrer_id,
                p_event_type: 'referral_milestone',
                p_points_change: 25000,
                p_notes: `5 successful referrals milestone bonus (${totalCount} total)`
              });

              if (!bonusError) {
                milestonesAwarded++;
                logStep(`Awarded milestone bonus`, { 
                  referrerId: referral.referrer_id, 
                  totalReferrals: totalCount 
                });
              }
            }
          }
        } else {
          logStep(`Tenant no longer housed, not qualifying referral`, { 
            referralId: referral.id, 
            tenantId: referral.referred_user_id 
          });
        }
      } catch (error) {
        logStep(`Error processing referral ${referral.id}`, { error: (error instanceof Error ? error.message : String(error)) });
      }
    }

    const result = {
      success: true,
      message: `Processed ${eligibleReferrals?.length || 0} referrals`,
      qualified: qualifiedCount,
      milestonesAwarded
    };

    logStep("Referral milestone check completed", result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR in referral milestone check", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: errorMessage 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
