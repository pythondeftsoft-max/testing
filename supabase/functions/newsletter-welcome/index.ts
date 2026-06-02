
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
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

    // Create Supabase client to fetch template
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', 'newsletter_welcome')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Error fetching email template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Replace template variables (if any)
    const variables = {
      email: email
    };

    const emailHtml = replaceTemplateVariables(template.html_template, variables);
    const emailSubject = replaceTemplateVariables(template.subject_template, variables);

    // Send welcome email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OpenKey <noreply@openkeyhousing.com>',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Resend API error: ${emailResponse.status}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Welcome email sent successfully:', emailResult);

    // Record in email queue
    try {
      await supabase.from('email_queue').insert({
        to_email: email,
        subject: emailSubject,
        body: emailHtml,
        link: 'https://openkey.com',
        status: 'sent',
        sent_at: new Date().toISOString(),
        email_type: 'marketing',
        audience: 'newsletter',
        template_slug: 'newsletter_welcome',
        category: 'newsletter',
        metadata: {
          resend_email_id: emailResult.id,
        },
      });
    } catch (queueError) {
      console.error('Error recording email in queue:', queueError);
      // Don't fail the request if queue logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email sent successfully',
        emailId: emailResult.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in newsletter-welcome function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send welcome email',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});