import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

Deno.serve(async (req) => {
  // CORS headers for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { propertyApplicationId, tenantId, landlordId } = await req.json();

    if (!propertyApplicationId || !tenantId || !landlordId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const requestId = crypto.randomUUID();
    const now = new Date();

    const messages = [
      {
        property_application_id: propertyApplicationId,
        sender_id: tenantId,
        message_text: '🔧 New Maintenance Request: Kitchen Faucet Leaking - The kitchen faucet has been dripping constantly. Water is pooling under the sink.',
        extension: 'maintenance',
        event: 'maintenance_request_created',
        payload: {
          priority: 'high',
          category: 'plumbing',
          status: 'pending',
          request_id: requestId
        },
        created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        property_application_id: propertyApplicationId,
        sender_id: landlordId,
        message_text: '📋 Maintenance Status Updated: Your request has been reviewed and is now in progress. We\'re working on scheduling a plumber.',
        extension: 'maintenance',
        event: 'maintenance_status_changed',
        payload: {
          old_status: 'pending',
          new_status: 'in_progress',
          request_id: requestId
        },
        created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        property_application_id: propertyApplicationId,
        sender_id: landlordId,
        message_text: '👷 Vendor Assigned: ABC Plumbing Services has been assigned to your request. They will contact you within 24 hours.',
        extension: 'maintenance',
        event: 'maintenance_vendor_assigned',
        payload: {
          vendor_name: 'ABC Plumbing Services',
          vendor_phone: '555-0123',
          request_id: requestId
        },
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        property_application_id: propertyApplicationId,
        sender_id: landlordId,
        message_text: '📅 Appointment Scheduled: Service appointment scheduled for October 28, 2025 at 10:00 AM. Please ensure someone is available.',
        extension: 'maintenance',
        event: 'maintenance_appointment_scheduled',
        payload: {
          scheduled_date: '2025-10-28T10:00:00Z',
          vendor_name: 'ABC Plumbing Services',
          request_id: requestId
        },
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        property_application_id: propertyApplicationId,
        sender_id: landlordId,
        message_text: '✅ Maintenance Completed: The kitchen faucet has been repaired and tested. Everything is working properly now.',
        extension: 'maintenance',
        event: 'maintenance_completed',
        payload: {
          status: 'completed',
          completion_notes: 'Replaced faucet cartridge and tested for leaks',
          request_id: requestId
        },
        created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
      }
    ];

    const { data, error } = await supabaseClient
      .from('messages')
      .insert(messages)
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, messages: data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
