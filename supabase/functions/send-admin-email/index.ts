import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "../_shared/resend.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get admin user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { templateSlug, recipientEmail, contextVariables } = await req.json();
    
    console.log('Admin send email request:', { templateSlug, recipientEmail, adminUserId: user.id });

    if (!templateSlug || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'templateSlug and recipientEmail are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', templateSlug)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!template.is_active) {
      return new Response(
        JSON.stringify({ error: 'Template is not active' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Replace template variables in subject and content
    let subject = template.subject_template || 'Email from OpenKey';
    let htmlContent = template.html_template || '';

    // Replace all variables with provided context
    if (contextVariables) {
      Object.entries(contextVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        htmlContent = htmlContent.replace(regex, String(value));
      });
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "OpenKey <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log('Email sent successfully:', emailResponse);

    // Log to email_queue for audit trail
    const { error: queueError } = await supabase
      .from('email_queue')
      .insert({
        user_id: user.id, // Admin who sent the email
        to_email: recipientEmail,
        template_slug: templateSlug,
        subject: subject,
        body: htmlContent,
        status: 'sent',
        sent_at: new Date().toISOString(),
        email_type: 'admin_send',
        audience: 'individual',
        category: 'admin_communication',
        metadata: {
          sent_by_admin: true,
          admin_user_id: user.id,
          context_variables: contextVariables,
          resend_id: emailResponse.id
        }
      });

    if (queueError) {
      console.error('Error logging to queue:', queueError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.id,
        message: 'Email sent successfully' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-admin-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to send email' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
