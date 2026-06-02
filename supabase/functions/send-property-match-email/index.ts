import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { tenantId, templateSlug, propertyContext, isAdminPush } = await req.json();

    // Get tenant and template, then queue the email
    const { data: tenant } = await supabaseClient
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", tenantId)
      .single();

    const { data: template } = await supabaseClient
      .from("email_templates")
      .select("*")
      .eq("slug", templateSlug)
      .single();

    if (!tenant || !template) {
      throw new Error("Tenant or template not found");
    }

    const metadata = {
      tenant_name: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'User',
      is_admin_push: isAdminPush || false,
      admin_push_message: isAdminPush 
        ? 'This invitation was sent by an OpenKey admin — you can apply even if you\'ve reached your weekly limit.'
        : '',
      ...propertyContext
    };

    const subject = template.subject_template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return metadata[key as keyof typeof metadata] || match;
    });
    
    // Add admin push indicator to subject if applicable
    const finalSubject = isAdminPush ? `[Admin Invite] ${subject}` : subject;

    const { data: queuedEmail } = await supabaseClient
      .from("email_queue")
      .insert({
        user_id: tenantId,
        to_email: tenant.email,
        subject: finalSubject,
        body: "Generated from template",
        status: "pending",
        audience: "tenant",
        template_slug: templateSlug,
        category: "property_match",
        metadata
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, emailId: queuedEmail?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});