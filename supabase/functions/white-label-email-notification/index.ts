import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailData {
  to: string;
  subject: string;
  template: 'approval' | 'rejection' | 'verification_required';
  data: {
    company_name: string;
    domain?: string;
    subdomain?: string;
    rejection_reason?: string;
    verification_token?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const emailData: EmailData = await req.json()
    console.log('Processing email notification:', emailData)

    // Generate branded email content based on template
    let htmlContent = ''
    let textContent = ''

    switch (emailData.template) {
      case 'approval':
        htmlContent = generateApprovalEmail(emailData.data)
        textContent = `Your white-label configuration for ${emailData.data.company_name} has been approved!`
        break
        
      case 'rejection':
        htmlContent = generateRejectionEmail(emailData.data)
        textContent = `Your white-label configuration for ${emailData.data.company_name} has been rejected.`
        break
        
      case 'verification_required':
        htmlContent = generateVerificationEmail(emailData.data)
        textContent = `Domain verification required for ${emailData.data.company_name}`
        break
        
      default:
        throw new Error('Invalid email template')
    }

    // Queue email for processing
    const { error } = await supabase
      .from('email_queue')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        subject: emailData.subject,
        body: htmlContent,
        status: 'pending'
      })

    if (error) {
      throw error
    }

    console.log('Email queued successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification queued successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Email notification error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to send email notification', 
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function generateApprovalEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Your white-label configuration has been approved</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Your ${data.company_name} branding is now live!</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Great news! Your white-label configuration has been reviewed and approved. 
          Your custom branding is now active and your users will see your personalized experience.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Configuration Details:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li><strong>Company:</strong> ${data.company_name}</li>
            ${data.domain ? `<li><strong>Custom Domain:</strong> ${data.domain}</li>` : ''}
            ${data.subdomain ? `<li><strong>Subdomain:</strong> ${data.subdomain}</li>` : ''}
          </ul>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Your users can now access your branded experience. If you have any questions or need assistance, 
          please don't hesitate to reach out to our support team.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #999; font-size: 14px;">
            This is an automated message from the OpenKey Housing team.
          </p>
        </div>
      </div>
    </div>
  `
}

function generateRejectionEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Configuration Update Required</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Your white-label configuration needs attention</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Action Required for ${data.company_name}</h2>
        
        <p style="color: #666; line-height: 1.6;">
          We've reviewed your white-label configuration and need some adjustments before we can approve it.
        </p>
        
        ${data.rejection_reason ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Review Notes:</h3>
            <p style="color: #856404; margin-bottom: 0;">${data.rejection_reason}</p>
          </div>
        ` : ''}
        
        <p style="color: #666; line-height: 1.6;">
          Please review the feedback above, make the necessary changes to your configuration, and resubmit for approval.
          Our team is here to help if you need any assistance.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #999; font-size: 14px;">
            This is an automated message from the OpenKey Housing team.
          </p>
        </div>
      </div>
    </div>
  `
}

function generateVerificationEmail(data: any): string {
  const domain = data.domain || data.subdomain
  const txtRecord = `_wl-verification.${domain}`
  const txtValue = `wl-verification=${data.verification_token}`
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #17a2b8; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Domain Verification Required</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">One more step to activate your white-label configuration</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Verify ownership of ${domain}</h2>
        
        <p style="color: #666; line-height: 1.6;">
          To complete your white-label configuration for ${data.company_name}, we need to verify that you own the domain <strong>${domain}</strong>.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h3 style="color: #333; margin-top: 0;">DNS Verification Instructions:</h3>
          <ol style="color: #666; line-height: 1.8;">
            <li>Log in to your domain registrar's DNS management panel</li>
            <li>Create a new TXT record with these details:
              <div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px; font-family: monospace;">
                <strong>Name:</strong> ${txtRecord}<br>
                <strong>Type:</strong> TXT<br>
                <strong>Value:</strong> ${txtValue}
              </div>
            </li>
            <li>Save the DNS record and wait for propagation (up to 24 hours)</li>
            <li>Return to your white-label settings to verify the domain</li>
          </ol>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Once verification is complete, your white-label configuration will be submitted for final approval.
          If you need help with DNS configuration, please contact our support team.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #999; font-size: 14px;">
            This is an automated message from the OpenKey Housing team.
          </p>
        </div>
      </div>
    </div>
  `
}