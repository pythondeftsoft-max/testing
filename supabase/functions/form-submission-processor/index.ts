import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormSubmissionRequest {
  formId: string;
  submissionData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  referrer?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      formId, 
      submissionData, 
      ipAddress, 
      userAgent, 
      utmParams, 
      referrer 
    }: FormSubmissionRequest = await req.json();

    console.log('Processing form submission:', { formId, submissionData });

    // Get form configuration
    const { data: form, error: formError } = await supabase
      .from('white_label_forms')
      .select(`
        *,
        white_label_configs (
          id,
          company_name,
          contact_email,
          user_id
        )
      `)
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return new Response(
        JSON.stringify({ error: 'Form not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate submission data against form fields
    const validationResult = validateSubmissionData(submissionData, form.fields);
    if (!validationResult.isValid) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validationResult.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Store form submission
    const { data: submission, error: submissionError } = await supabase
      .from('white_label_form_submissions')
      .insert({
        form_id: formId,
        submission_data: submissionData,
        ip_address: ipAddress,
        user_agent: userAgent,
        utm_source: utmParams?.source,
        utm_medium: utmParams?.medium,
        utm_campaign: utmParams?.campaign,
        referrer: referrer,
        processed: false
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    // Process email notifications if enabled
    if (form.email_notifications) {
      await processEmailNotifications(supabase, form, submissionData, submission);
    }

    // Process integrations if configured
    if (form.integration_mappings && Object.keys(form.integration_mappings).length > 0) {
      await processIntegrations(supabase, form, submissionData, submission);
    }

    // Mark submission as processed
    await supabase
      .from('white_label_form_submissions')
      .update({ processed: true })
      .eq('id', submission.id);

    console.log('Form submission processed successfully:', submission.id);

    return new Response(
      JSON.stringify({
        success: true,
        submissionId: submission.id,
        message: form.success_message || 'Thank you for your submission!',
        redirectUrl: form.redirect_url
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in form-submission-processor function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function validateSubmissionData(submissionData: Record<string, any>, formFields: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fields = Array.isArray(formFields) ? formFields : [];

  for (const field of fields) {
    const value = submissionData[field.name];
    
    // Check required fields
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push(`${field.label || field.name} is required`);
      continue;
    }

    // Validate email fields
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${field.label || field.name} must be a valid email address`);
      }
    }

    // Validate phone fields
    if (field.type === 'phone' && value) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(value.replace(/\s/g, ''))) {
        errors.push(`${field.label || field.name} must be a valid phone number`);
      }
    }

    // Validate URL fields
    if (field.type === 'url' && value) {
      try {
        new URL(value);
      } catch {
        errors.push(`${field.label || field.name} must be a valid URL`);
      }
    }

    // Validate number fields
    if (field.type === 'number' && value !== undefined && value !== '') {
      if (isNaN(Number(value))) {
        errors.push(`${field.label || field.name} must be a valid number`);
      }
    }

    // Validate select/checkbox options
    if ((field.type === 'select' || field.type === 'checkbox') && field.options && value) {
      const validOptions = field.options.map((opt: any) => opt.value || opt);
      const values = Array.isArray(value) ? value : [value];
      
      for (const val of values) {
        if (!validOptions.includes(val)) {
          errors.push(`${field.label || field.name} contains invalid option: ${val}`);
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

async function processEmailNotifications(supabase: any, form: any, submissionData: Record<string, any>, submission: any) {
  try {
    const config = form.white_label_configs;
    const companyName = config.company_name || 'White Label Site';
    
    // Send notification to site owner
    await supabase
      .from('email_queue')
      .insert({
        user_id: config.user_id,
        subject: `New ${form.form_name} submission`,
        body: `
          <h2>New Form Submission</h2>
          <p>You have received a new submission for the form "${form.form_name}".</p>
          
          <h3>Submission Details:</h3>
          <table style="border-collapse: collapse; width: 100%;">
            ${Object.entries(submissionData).map(([key, value]) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${key}:</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${value}</td>
              </tr>
            `).join('')}
          </table>
          
          <p>Submitted at: ${new Date().toLocaleString()}</p>
        `,
        status: 'pending'
      });

    // Send confirmation email to submitter if email field exists
    const userEmail = submissionData.email || submissionData.Email || submissionData.email_address;
    if (userEmail) {
      await supabase
        .from('email_queue')
        .insert({
          user_id: config.user_id,
          subject: `Thank you for contacting ${companyName}`,
          body: `
            <h2>Thank you for your submission!</h2>
            <p>We have received your ${form.form_name.toLowerCase()} and will get back to you soon.</p>
            <p>Best regards,<br>${companyName}</p>
          `,
          status: 'pending'
        });
    }

    console.log('Email notifications queued successfully');
  } catch (error) {
    console.error('Failed to process email notifications:', error);
  }
}

async function processIntegrations(supabase: any, form: any, submissionData: Record<string, any>, submission: any) {
  try {
    const integrationMappings = form.integration_mappings || {};

    // Get active integrations for this config
    const { data: integrations, error } = await supabase
      .from('white_label_integrations')
      .select('*')
      .eq('config_id', form.config_id)
      .eq('is_active', true);

    if (error) throw error;

    for (const integration of integrations || []) {
      const mapping = integrationMappings[integration.id];
      if (!mapping) continue;

      // Transform data according to mapping
      const transformedData = transformDataForIntegration(submissionData, mapping);

      // Send data to integration webhook
      if (integration.webhook_url) {
        try {
          const response = await fetch(integration.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(integration.webhook_secret && {
                'Authorization': `Bearer ${integration.webhook_secret}`
              })
            },
            body: JSON.stringify({
              event: 'form_submission',
              form: form.form_name,
              data: transformedData,
              submission_id: submission.id,
              timestamp: new Date().toISOString()
            })
          });

          console.log(`Integration webhook ${integration.integration_name} response:`, response.status);
        } catch (webhookError) {
          console.error(`Failed to send to ${integration.integration_name}:`, webhookError);
        }
      }
    }

    console.log('Integrations processed successfully');
  } catch (error) {
    console.error('Failed to process integrations:', error);
  }
}

function transformDataForIntegration(submissionData: Record<string, any>, mapping: any): Record<string, any> {
  const transformed: Record<string, any> = {};
  
  for (const [sourceField, targetField] of Object.entries(mapping)) {
    if (submissionData[sourceField] !== undefined) {
      transformed[targetField as string] = submissionData[sourceField];
    }
  }
  
  return transformed;
}

serve(handler);