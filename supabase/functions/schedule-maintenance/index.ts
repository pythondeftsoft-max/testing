
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleAppointmentRequest {
  maintenance_request_id: string;
  vendor_id?: string;
  scheduled_date: string;
  estimated_duration?: number;
  notes?: string;
  is_recurring?: boolean;
  recurring_pattern?: any;
}

interface UpdateAppointmentRequest {
  id: string;
  maintenance_request_id?: string;
  vendor_id?: string;
  scheduled_date?: string;
  estimated_duration?: number;
  actual_start_time?: string;
  actual_end_time?: string;
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  tenant_confirmed?: boolean;
  vendor_confirmed?: boolean;
  is_recurring?: boolean;
  recurring_pattern?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User authenticated:', user.id);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const appointmentId = url.searchParams.get('id');

    console.log('Action:', action, 'Appointment ID:', appointmentId);

    switch (action) {
      case 'schedule':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { 
              status: 405, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const scheduleData: ScheduleAppointmentRequest = await req.json();
        console.log('Schedule appointment data:', scheduleData);

        // Validate required fields
        if (!scheduleData.maintenance_request_id || !scheduleData.scheduled_date) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: maintenance_request_id and scheduled_date' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Check if user has permission to schedule for this maintenance request
        const { data: maintenanceRequest, error: requestError } = await supabase
          .from('maintenance_requests')
          .select('id, property_id, properties(owner_id, portfolio_id)')
          .eq('id', scheduleData.maintenance_request_id)
          .single();

        if (requestError || !maintenanceRequest) {
          console.error('Error fetching maintenance request:', requestError);
          return new Response(
            JSON.stringify({ error: 'Maintenance request not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Insert appointment
        const { data: appointment, error: insertError } = await supabase
          .from('maintenance_appointments')
          .insert({
            ...scheduleData,
            created_by: user.id,
            estimated_duration: scheduleData.estimated_duration || 120,
            is_recurring: scheduleData.is_recurring || false
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error scheduling appointment:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to schedule appointment', details: insertError.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Appointment scheduled successfully:', appointment.id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment,
            message: 'Appointment scheduled successfully' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'update':
        if (req.method !== 'PUT') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { 
              status: 405, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        if (!appointmentId) {
          return new Response(
            JSON.stringify({ error: 'Appointment ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const updateData: UpdateAppointmentRequest = await req.json();
        console.log('Update appointment data:', updateData);

        // Remove id from update data if present
        const { id: _, ...updateFields } = updateData;

        const { data: updatedAppointment, error: updateError } = await supabase
          .from('maintenance_appointments')
          .update(updateFields)
          .eq('id', appointmentId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating appointment:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update appointment', details: updateError.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Appointment updated successfully:', appointmentId);
        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment: updatedAppointment,
            message: 'Appointment updated successfully' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'cancel':
        if (req.method !== 'DELETE') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { 
              status: 405, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        if (!appointmentId) {
          return new Response(
            JSON.stringify({ error: 'Appointment ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const { data: cancelledAppointment, error: cancelError } = await supabase
          .from('maintenance_appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId)
          .select()
          .single();

        if (cancelError) {
          console.error('Error cancelling appointment:', cancelError);
          return new Response(
            JSON.stringify({ error: 'Failed to cancel appointment', details: cancelError.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Appointment cancelled successfully:', appointmentId);
        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment: cancelledAppointment,
            message: 'Appointment cancelled successfully' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'details':
        if (req.method !== 'GET') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { 
              status: 405, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        if (!appointmentId) {
          return new Response(
            JSON.stringify({ error: 'Appointment ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const { data: appointmentDetails, error: detailsError } = await supabase
          .from('maintenance_appointments')
          .select(`
            *,
            maintenance_requests (
              id,
              title,
              description,
              priority,
              status,
              properties (
                id,
                address,
                city,
                state,
                zip_code
              )
            ),
            maintenance_vendors (
              id,
              company_name,
              contact_name,
              phone,
              email
            )
          `)
          .eq('id', appointmentId)
          .single();

        if (detailsError || !appointmentDetails) {
          console.error('Error fetching appointment details:', detailsError);
          return new Response(
            JSON.stringify({ error: 'Appointment not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Appointment details retrieved:', appointmentId);
        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment: appointmentDetails 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'list':
        if (req.method !== 'GET') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { 
              status: 405, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const requestId = url.searchParams.get('request_id');
        const vendorId = url.searchParams.get('vendor_id');
        const status = url.searchParams.get('status');

        let query = supabase
          .from('maintenance_appointments')
          .select(`
            *,
            maintenance_requests (
              id,
              title,
              description,
              priority,
              status,
              properties (
                id,
                address,
                city,
                state,
                zip_code
              )
            ),
            maintenance_vendors (
              id,
              company_name,
              contact_name,
              phone,
              email
            )
          `)
          .order('scheduled_date', { ascending: true });

        if (requestId) {
          query = query.eq('maintenance_request_id', requestId);
        }
        if (vendorId) {
          query = query.eq('vendor_id', vendorId);
        }
        if (status) {
          query = query.eq('status', status);
        }

        const { data: appointments, error: listError } = await query;

        if (listError) {
          console.error('Error fetching appointments:', listError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch appointments', details: listError.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Appointments retrieved:', appointments?.length || 0);
        return new Response(
          JSON.stringify({ 
            success: true, 
            appointments: appointments || [] 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Supported actions: schedule, update, cancel, details, list' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error instanceof Error ? error.message : String(error)) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
