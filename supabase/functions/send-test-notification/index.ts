import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestNotificationRequest {
  notificationType: string;
  userType: 'tenant' | 'landlord';
  notificationData: {
    title: string;
    description: string;
    type: 'success' | 'info' | 'warning' | 'error';
    priority?: string;
  };
  link: string;
  category: string;
}

const DEMO_USERS = {
  tenant: '03e26106-4179-4b55-bd38-66c5414e8ba2', // tenant@openkey.com
  landlord: 'ccb8536c-80d1-4834-9614-169b9a7caede', // landlord@openkey.com
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      notificationType,
      userType,
      notificationData,
      link,
      category,
    }: TestNotificationRequest = await req.json();

    console.log('Sending test notification:', {
      type: notificationType,
      userType,
      demoUserId: DEMO_USERS[userType]
    });

    // Get demo user ID
    const demoUserId = DEMO_USERS[userType];
    if (!demoUserId) {
      throw new Error(`Invalid user type: ${userType}`);
    }

    // Create notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: demoUserId,
        type: notificationType,
        title: notificationData.title,
        description: notificationData.description,
        category: category,
        priority: notificationData.priority || 'medium',
        link: link,
        read: false,
        metadata: {
          is_test: true,
          sent_from: 'admin_notification_center',
          sent_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (notifError) {
      console.error('Error creating notification:', notifError);
      throw notifError;
    }

    console.log('Test notification created:', notification.id);

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification.id,
        sentTo: userType === 'tenant' ? 'tenant@openkey.com' : 'landlord@openkey.com',
        message: `Test notification sent successfully! The demo ${userType} can now see it in their notifications.`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-test-notification:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
