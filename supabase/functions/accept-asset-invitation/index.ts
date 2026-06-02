import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  invitationToken?: string;
  invitation_token?: string; // Support both formats
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Parse request body and handle both camelCase and snake_case
    const body: AcceptInvitationRequest = await req.json();
    const invitationToken = body.invitationToken || body.invitation_token;

    if (!invitationToken) {
      return new Response(JSON.stringify({ error: "Missing invitation token" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log("Accepting invitation with token:", invitationToken.substring(0, 10) + "...");

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('portfolio_asset_invitations')
      .select(`
        *,
        portfolio_assets!inner(
          id,
          asset_name,
          portfolio_id
        )
      `)
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      console.error("Invitation not found or expired:", inviteError);
      return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log("Found invitation:", invitation.id, "for asset:", invitation.asset_id);

    // Update invitation as accepted
    const { error: updateError } = await supabase
      .from('portfolio_asset_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invited_user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('invitation_token', invitationToken);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return new Response(JSON.stringify({ error: "Failed to accept invitation" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log("Invitation accepted, creating membership");

    // Check if membership already exists (idempotency)
    const { data: existingMembership } = await supabase
      .from('portfolio_asset_memberships')
      .select('id')
      .eq('asset_id', invitation.asset_id)
      .eq('user_id', user.id)
      .single();

    if (!existingMembership) {
      // Create asset membership for the user
      const { error: membershipError } = await supabase
        .from('portfolio_asset_memberships')
        .insert({
          asset_id: invitation.asset_id,
          user_id: user.id,
          role: invitation.role || 'tenant', // Default to tenant if role is null
          created_by: invitation.inviter_id,
        });

      if (membershipError) {
        console.error("Error creating membership:", membershipError);
        // Continue even if membership creation fails - the invitation is still accepted
      } else {
        console.log("Membership created successfully");
      }
    } else {
      console.log("Membership already exists, skipping creation");
    }

    // Create recurring charges if specified in metadata
    const metadata = invitation.metadata || {};
    if (metadata.monthly_amount && metadata.monthly_amount > 0) {
      console.log("Creating recurring charge for monthly amount:", metadata.monthly_amount);
      
      const { error: chargeError } = await supabase
        .from('asset_recurring_charges')
        .insert({
          asset_id: invitation.asset_id,
          invite_id: invitation.id,
          payer_user_id: user.id,
          charge_type: 'rent',
          amount: metadata.monthly_amount,
          currency_code: metadata.currency_code || 'USD',
          cadence: 'monthly',
          due_day: 1, // First of each month
          start_date: metadata.start_date || new Date().toISOString().split('T')[0],
          end_date: metadata.end_date || null,
          notes: metadata.notes || 'Monthly rent payment',
          created_by: invitation.inviter_id,
        });

      if (chargeError) {
        console.error("Error creating recurring charge:", chargeError);
        // Continue even if charge creation fails
      } else {
        console.log("Recurring charge created successfully");
      }
    }

    // Send notification to inviter
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: invitation.inviter_id,
        title: 'Asset Invitation Accepted',
        description: `Your invitation to ${invitation.portfolio_assets.asset_name} has been accepted`,
        type: 'success',
        link: `/dashboard?portfolioId=${invitation.portfolio_assets.portfolio_id}&tab=assets&assetId=${invitation.asset_id}`,
        category: 'invitation',
        metadata: {
          asset_id: invitation.asset_id,
          asset_name: invitation.portfolio_assets.asset_name,
          accepted_by: user.id,
          invitation_id: invitation.id
        }
      });

    if (notificationError) {
      console.error("Error creating notification for inviter:", notificationError);
    } else {
      console.log("Notification sent to inviter");
    }

    console.log("Asset invitation accepted successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation accepted successfully",
      assetId: invitation.asset_id,
      assetName: invitation.portfolio_assets.asset_name,
      portfolioId: invitation.portfolio_assets.portfolio_id,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in accept-asset-invitation:", error);
    return new Response(JSON.stringify({ 
      error: (error instanceof Error ? error.message : String(error)) || "Internal server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);