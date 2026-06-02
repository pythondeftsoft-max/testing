
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Initialize Resend client (renamed to avoid conflict)
const resendClient = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

interface AssetInvitationRequest {
  asset_id: string;
  invited_email: string;
  role: 'manager' | 'editor' | 'viewer' | 'billing_only';
  invitee_type: 'viewer' | 'investor' | 'vendor' | 'property_manager' | 'landlord' | 'tenant';
  metadata?: {
    invitee_name?: string;
    monthly_amount?: number;
    currency_code?: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
  };
}

const ROLE_LABELS = {
  manager: 'Manager',
  editor: 'Editor', 
  viewer: 'Viewer',
  billing_only: 'Billing Only',
};

const ROLE_DESCRIPTIONS = {
  manager: 'Full access to the asset (can manage everything)',
  editor: 'Can modify asset data, manage relationships, upload documents',
  viewer: 'Read-only access to all asset data',
  billing_only: 'Limited access to financial data and billing information',
};

// Asset types that are investment/owner-operated style
const INVESTMENT_ASSET_TYPES = [
  'marina', 'yacht', 'prison', 'hotel', 'motel', 'restaurant', 
  'medical_facility', 'golf_course', 'parking_structure'
];

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  console.log(`=== ASSET INVITATION REQUEST START [${requestId}] ===`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No Authorization header provided`);
      return new Response(
        JSON.stringify({ error: "Authorization required", requestId }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${requestId}] Authentication failed:`, authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", requestId }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[${requestId}] Authenticated user: ${user.id}`);

    const requestBody: AssetInvitationRequest = await req.json();
    console.log(`[${requestId}] Request body:`, {
      asset_id: requestBody.asset_id,
      invited_email: requestBody.invited_email,
      role: requestBody.role,
      invitee_type: requestBody.invitee_type,
      metadata: requestBody.metadata ? Object.keys(requestBody.metadata) : 'none'
    });

    // Validation
    const validRoles = ['manager', 'editor', 'viewer', 'billing_only'];
    const validInviteeTypes = ['viewer', 'investor', 'vendor', 'property_manager', 'landlord', 'tenant'];

    if (!validRoles.includes(requestBody.role)) {
      console.error(`[${requestId}] Invalid role: ${requestBody.role}`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          requestId 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!validInviteeTypes.includes(requestBody.invitee_type)) {
      console.error(`[${requestId}] Invalid invitee_type: ${requestBody.invitee_type}`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid invitee type. Must be one of: ${validInviteeTypes.join(', ')}`,
          requestId 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get asset details to validate the invitation context
    const { data: assetData, error: assetError } = await supabase
      .from('portfolio_assets')
      .select('id, asset_name, asset_category_id, metadata, portfolio_id')
      .eq('id', requestBody.asset_id)
      .single();

    if (assetError || !assetData) {
      console.error(`[${requestId}] Asset not found:`, assetError);
      return new Response(
        JSON.stringify({ error: "Asset not found", requestId }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Compute subtype from metadata
    const computedSubtype = (assetData.metadata?.commercial_subtype || 
                            assetData.metadata?.selectedSubcategory || '').toLowerCase();

    console.log(`[${requestId}] Asset details:`, {
      name: assetData.asset_name,
      category_id: assetData.asset_category_id,
      computed_subtype: computedSubtype,
      portfolio_id: assetData.portfolio_id,
      metadata_keys: assetData.metadata ? Object.keys(assetData.metadata) : 'none'
    });

    // Check if user has permission to invite to this asset
    const { data: userRole } = await supabase.rpc('get_user_portfolio_role', {
      p_portfolio_id: assetData.portfolio_id,
      p_user_id: user.id
    });

    if (!userRole || !['admin_partner', 'editor'].includes(userRole)) {
      console.error(`[${requestId}] User lacks permission. Role: ${userRole}`);
      return new Response(
        JSON.stringify({ 
          error: "Insufficient permissions to invite users to this asset",
          requestId 
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate tenant invites for investment-style assets
    if (requestBody.invitee_type === 'tenant') {
      const isInvestmentStyle = INVESTMENT_ASSET_TYPES.includes(computedSubtype);
      
      if (isInvestmentStyle) {
        console.error(`[${requestId}] Tenant invite not allowed for investment asset: ${computedSubtype}`);
        return new Response(
          JSON.stringify({ 
            error: "Tenant invites are not supported for investment-style assets. Use collaborator roles instead.",
            requestId,
            suggestion: "Try using 'viewer' or 'investor' as the invitee type."
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check if invited email belongs to an existing user
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(u => u.email === requestBody.invited_email);

    console.log(`[${requestId}] Existing user check:`, {
      invited_email: requestBody.invited_email,
      existing_user_id: existingAuthUser?.id || 'none'
    });

    // Create asset invitation record
    const invitationData = {
      asset_id: requestBody.asset_id,
      invited_email: requestBody.invited_email,
      invited_user_id: existingAuthUser?.id || null,
      inviter_id: user.id,
      role: requestBody.role,
      invitee_type: requestBody.invitee_type,
      status: 'pending',
      metadata: requestBody.metadata || {},
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    console.log(`[${requestId}] Creating invitation with data:`, {
      ...invitationData,
      metadata: invitationData.metadata ? Object.keys(invitationData.metadata) : 'none'
    });

    const { data: invitation, error: invitationError } = await supabase
      .from('portfolio_asset_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (invitationError) {
      console.error(`[${requestId}] Error creating invitation:`, invitationError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create invitation", 
          details: invitationError.message,
          requestId 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[${requestId}] Created invitation: ${invitation.id}`);

    // Create in-app notification if user exists
    if (existingAuthUser?.id) {
      console.log(`[${requestId}] Creating in-app notification for existing user: ${existingAuthUser.id}`);
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: existingAuthUser.id,
          type: 'asset_invite',
          title: `Asset Collaboration Invitation`,
          description: `You've been invited to collaborate on "${assetData.asset_name}" as ${ROLE_LABELS[requestBody.role]}`,
          metadata: {
            invitation_id: invitation.id,
            asset_id: requestBody.asset_id,
            asset_name: assetData.asset_name,
            inviter_name: user.user_metadata?.full_name || user.email,
            role: requestBody.role,
            role_label: ROLE_LABELS[requestBody.role]
          },
          link: `/accept-invitation?token=${invitation.invitation_token}&type=asset`
        });

      if (notificationError) {
        console.error(`[${requestId}] Error creating notification:`, notificationError);
      } else {
        console.log(`[${requestId}] Successfully created in-app notification`);
      }
    }

    // Send email invitation
    let emailResult = null;
    if (Deno.env.get("RESEND_API_KEY")) {
      try {
        const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || 'https://openkeyhousing.com';
        const invitationUrl = `${appUrl}/accept-invitation?token=${invitation.invitation_token}&type=asset`;
        
        const invitesFromEmail = Deno.env.get("INVITES_FROM_EMAIL") || "OpenKey Housing <support@openkeyhousing.com>";
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Asset Collaboration Invitation</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🏢 Asset Collaboration Invitation</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Join the asset management team</p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 18px; margin-bottom: 20px;">Hello,</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  You've been invited to collaborate on the asset: 
                  <strong>"${assetData.asset_name}"</strong>
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <h3 style="color: #495057; margin: 0 0 15px 0;">🎯 Your Role: ${ROLE_LABELS[requestBody.role]}</h3>
                  <p style="margin: 0; color: #495057; font-size: 14px;">
                    ${ROLE_DESCRIPTIONS[requestBody.role]}
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationUrl}" 
                     style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                            color: white; 
                            text-decoration: none; 
                            padding: 15px 30px; 
                            border-radius: 8px; 
                            font-weight: 600; 
                            font-size: 16px; 
                            display: inline-block;
                            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);">
                    Accept Invitation & Join Asset
                  </a>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #1976d2;">
                    <strong>💡 Next Steps:</strong> Click the button above to create your OpenKey account or sign in to access the asset management tools.
                  </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <p style="font-size: 14px; color: #666; text-align: center;">
                  Questions? Reply to this email or contact our support team.<br>
                  This invitation was sent for the "${assetData.asset_name}" asset.
                </p>
              </div>
            </body>
          </html>
        `;

        emailResult = await resendClient.emails.send({
          from: invitesFromEmail,
          to: [requestBody.invited_email],
          subject: `You're invited to collaborate on "${assetData.asset_name}"`,
          html: emailHtml,
        });

        console.log(`[${requestId}] Email sent successfully:`, emailResult.data?.id);
      } catch (emailError) {
        console.error(`[${requestId}] Email sending failed:`, emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.warn(`[${requestId}] RESEND_API_KEY not configured, skipping email`);
    }

    console.log(`=== ASSET INVITATION REQUEST END [${requestId}] ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Asset invitation sent successfully",
        invitation_id: invitation.id,
        email_sent: !!emailResult?.data?.id,
        has_in_app_notification: !!existingAuthUser?.id,
        requestId
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Error in send-asset-invitation:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send asset invitation", 
        details: (error instanceof Error ? error.message : String(error)),
        requestId
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
