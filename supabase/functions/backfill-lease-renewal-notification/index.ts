import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackfillRequest {
  leaseRenewalId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { leaseRenewalId }: BackfillRequest = await req.json();

    console.log("Backfilling notification for lease renewal:", leaseRenewalId);

    // Fetch lease renewal details
    const { data: leaseRenewal, error: lrError } = await supabase
      .from("lease_renewals")
      .select(`
        *,
        properties (address, monthly_rent),
        profiles!lease_renewals_tenant_id_fkey (email, first_name)
      `)
      .eq("id", leaseRenewalId)
      .single();

    if (lrError || !leaseRenewal) {
      console.error("Error fetching lease renewal:", lrError);
      throw new Error("Lease renewal not found");
    }

    const tenantEmail = leaseRenewal.profiles?.email;
    const tenantFirstName = leaseRenewal.profiles?.first_name || "Tenant";
    const propertyAddress = leaseRenewal.properties?.address;
    const currentRent = leaseRenewal.properties?.monthly_rent || 0;
    const newRent = leaseRenewal.new_rent_amount || currentRent;

    console.log("Tenant info:", { tenantEmail, tenantFirstName, propertyAddress });

    // Create in-app notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: leaseRenewal.tenant_id,
        type: "lease_renewal",
        category: "Lease",
        title: "Lease Renewal Offer Received",
        description: `Your landlord has sent you a lease renewal offer for ${propertyAddress}. Please review and respond by the deadline.`,
        priority: "high",
        read: false,
        link: "/dashboard?tab=Rent Payments&subTab=lease-renewal",
        related_entity_id: leaseRenewalId,
        related_entity_type: "lease_renewal",
      })
      .select()
      .single();

    if (notifError) {
      console.error("Error creating notification:", notifError);
      throw notifError;
    }

    console.log("Notification created:", notification.id);

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("slug", "lease_renewal_offer_sent")
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Email template not found:", templateError);
      throw new Error("Email template 'lease_renewal_offer_sent' not found");
    }

    // Prepare template variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const appUrl = supabaseUrl.includes("supabase.co") 
      ? supabaseUrl.replace("https://", "https://").replace(".supabase.co", ".lovable.app")
      : "https://app.example.com";
    
    const contextVariables: Record<string, string> = {
      tenant_name: tenantFirstName || "Tenant",
      property_address: propertyAddress || "your property",
      current_rent: `$${currentRent.toFixed(2)}`,
      new_rent: `$${newRent.toFixed(2)}`,
      current_lease_end: new Date(leaseRenewal.current_lease_end).toLocaleDateString(),
      proposed_lease_end: leaseRenewal.proposed_lease_end
        ? new Date(leaseRenewal.proposed_lease_end).toLocaleDateString()
        : "To be determined",
      response_due_date: leaseRenewal.response_due_date
        ? new Date(leaseRenewal.response_due_date).toLocaleDateString()
        : "As soon as possible",
      view_link: `${appUrl}/dashboard?tab=Rent Payments&subTab=lease-renewal`,
      notes: leaseRenewal.notes || "No additional notes provided.",
    };

    // Replace template variables
    let emailSubject = template.subject || "";
    let emailHtml = template.html_content || "";

    Object.entries(contextVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (emailSubject) {
        emailSubject = emailSubject.replace(new RegExp(placeholder, "g"), value);
      }
      if (emailHtml) {
        emailHtml = emailHtml.replace(new RegExp(placeholder, "g"), value);
      }
    });

    // Send email
    const emailData = await resend.emails.send({
      from: "OpenKey <noreply@openkey.com>",
      to: [tenantEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent:", emailData);

    // Log email to queue
    await supabase.from("email_queue").insert({
      template_slug: "lease_renewal_offer_sent",
      recipient_email: tenantEmail,
      subject: emailSubject,
      html_content: emailHtml,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification.id,
        emailId: (emailData as any)?.id,
        message: "Notification and email sent successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in backfill function:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
