
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Processing tenant invitation:', {
      tenantEmail: requestBody.tenantEmail,
      tenantName: requestBody.tenantName,
      tenantType: requestBody.tenantType,
      invitationToken: requestBody.invitationToken
    });

    const { 
      propertyId,
      tenantEmail, 
      tenantName, 
      propertyAddress, 
      landlordName,
      tenantType,
      monthlyRent,
      tenantPortion,
      phaPortion,
      leaseStartDate,
      leaseEndDate,
      invitationToken 
    } = requestBody;
    
    if (!tenantEmail || !tenantName || !propertyAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the acceptance link with the invitation token - updated to point to dedicated acceptance page
    const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || 'https://openkeyhousing.com';
    const acceptanceLink = `${appUrl}/tenant-invitation?token=${invitationToken}`;
    
    const invitesFromEmail = Deno.env.get("INVITES_FROM_EMAIL") || "OpenKey Housing <support@openkeyhousing.com>";
    
    // Generate correlation ID for debugging
    const correlationId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Processing invitation with correlation ID:', correlationId);

    // Prepare rent details for the email
    let rentDetails = '';
    if (tenantType === 'voucher' && tenantPortion && phaPortion) {
      rentDetails = `
        <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 10px;">Rent Details:</h4>
          <p style="margin: 5px 0; color: #333;"><strong>Total Monthly Rent:</strong> $${monthlyRent}</p>
          <p style="margin: 5px 0; color: #333;"><strong>Your Portion:</strong> $${tenantPortion}</p>
          <p style="margin: 5px 0; color: #333;"><strong>PHA Portion:</strong> $${phaPortion}</p>
        </div>
      `;
    } else if (monthlyRent) {
      rentDetails = `
        <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 10px;">Rent Details:</h4>
          <p style="margin: 5px 0; color: #333;"><strong>Monthly Rent:</strong> $${monthlyRent}</p>
        </div>
      `;
    }

    // Send invitation email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: invitesFromEmail,
        to: [tenantEmail],
        subject: `You're invited to connect with your property at ${propertyAddress}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #2563eb; font-size: 28px; margin-bottom: 20px; text-align: center;">
                🏠 You're Invited to OpenKey!
              </h1>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hello ${tenantName},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                ${landlordName || 'Your landlord'} has invited you to connect to your rental property on OpenKey. This will allow you to:
              </p>
              
              <ul style="color: #333; font-size: 16px; line-height: 1.8; margin-bottom: 20px; padding-left: 20px;">
                <li>Access your property information and lease details</li>
                <li>Submit maintenance requests directly to your landlord</li>
                <li>View rent payment history and schedules</li>
                ${tenantType === 'voucher' ? '<li>Manage your Section 8 voucher information</li>' : ''}
                <li>Communicate with your property manager</li>
              </ul>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Property Details:</h3>
                <p style="color: #333; margin: 5px 0;"><strong>Address:</strong> ${propertyAddress}</p>
                <p style="color: #333; margin: 5px 0;"><strong>Tenant Type:</strong> ${tenantType === 'voucher' ? 'Section 8 Voucher Holder' : 'Market Rate'}</p>
              </div>

              ${rentDetails}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptanceLink}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Accept Invitation & Pay Rent
                </a>
              </div>
              
              <p style="color: #333; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                <strong>Next Steps:</strong>
              </p>
              <ol style="color: #333; font-size: 14px; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
                <li>Click the button above to create your OpenKey account</li>
                <li>Complete your profile setup</li>
                ${tenantType === 'voucher' ? '<li>Upload your HAP contract and voucher information</li>' : ''}
                <li>Start managing your rental experience!</li>
              </ol>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
                You're receiving this invitation because ${landlordName || 'your landlord'} added you as a tenant for the property at ${propertyAddress}.<br>
                If you believe this was sent in error, please contact your landlord directly.
              </p>
              
              <div style="text-align: center; margin-top: 20px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  © 2024 OpenKey. All rights reserved.<br>
                  Connecting communities, unlocking opportunities.
                </p>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        errorData
      });
      throw new Error(`Resend API error: ${emailResponse.status} - ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Tenant invitation email sent successfully:', emailResult);

    // Create Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user as landlord
    const authHeader = req.headers.get('Authorization');
    let landlordId = null;
    
    if (authHeader) {
      try {
        const jwt = authHeader.replace('Bearer ', '');
        const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await supabaseClient.auth.getUser(jwt);
        landlordId = user?.id;
      } catch (error) {
        console.error('Error getting user from auth:', error);
      }
    }

    // Create tenant invitation record in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

    const { error: invitationError } = await supabase
      .from('tenant_invitations')
      .insert({
        property_id: propertyId,
        landlord_id: landlordId,
        tenant_name: tenantName,
        tenant_email: tenantEmail,
        tenant_type: tenantType,
        monthly_rent: monthlyRent,
        tenant_portion: tenantPortion,
        pha_portion: phaPortion,
        lease_start_date: leaseStartDate,
        lease_end_date: leaseEndDate,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      });

    if (invitationError) {
      console.error('Error creating tenant invitation:', invitationError);
    }

    // Send in-app notification to tenant (if they have an account)
    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', tenantEmail)
      .single();

    if (tenantProfile) {
      await supabase
        .from('notifications')
        .insert({
          user_id: tenantProfile.id,
          title: 'Property Invitation Received',
          description: `You've been invited to ${propertyAddress}. Check your email for details.`,
          type: 'invitation',
          link: `/invitation/${invitationToken}`,
          is_read: false,
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tenant invitation sent successfully',
        emailId: emailResult.id,
        correlationId,
        invitationToken
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-tenant-invitation function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send tenant invitation email',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
