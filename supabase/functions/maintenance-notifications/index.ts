
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()
    console.log('Maintenance notification action:', action, data)

    switch (action) {
      case 'notify_vendor_assignment':
        return await notifyVendorAssignment(supabase, data)
      case 'notify_appointment_scheduled':
        return await notifyAppointmentScheduled(supabase, data)
      case 'notify_request_completed':
        return await notifyRequestCompleted(supabase, data)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }
  } catch (error) {
    console.error('Error in maintenance-notifications:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function notifyVendorAssignment(supabase: any, data: any) {
  const { maintenance_request_id, vendor_id, assigned_by } = data

  // Get maintenance request details
  const { data: request, error: requestError } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      properties (
        address,
        owner_id,
        profiles (first_name, last_name)
      )
    `)
    .eq('id', maintenance_request_id)
    .single()

  if (requestError) {
    throw new Error(`Failed to fetch maintenance request: ${requestError.message}`)
  }

  // Get vendor details
  const { data: vendor, error: vendorError } = await supabase
    .from('maintenance_vendors')
    .select('*')
    .eq('id', vendor_id)
    .single()

  if (vendorError) {
    throw new Error(`Failed to fetch vendor: ${vendorError.message}`)
  }

  // Create notification for property owner
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: request.properties.owner_id,
      title: 'Maintenance Vendor Assigned',
      description: `${vendor.company_name} has been assigned to maintenance request at ${request.properties.address}`,
      type: 'info',
      metadata: {
        maintenance_request_id,
        vendor_id,
        assigned_by
      }
    })

  if (notificationError) {
    throw new Error(`Failed to create notification: ${notificationError.message}`)
  }

  // Create message for tenant
  const { data: application } = await supabase
    .from('property_applications')
    .select('id')
    .eq('tenant_id', request.tenant_id)
    .eq('property_id', request.property_id)
    .single()

  if (application) {
    await supabase.from('messages').insert({
      property_application_id: application.id,
      sender_id: request.properties.owner_id,
      message_text: `👷 **Vendor Assigned**: ${vendor.company_name}\n\nA vendor has been assigned to your maintenance request.\n\n**Company**: ${vendor.company_name}\n**Specialties**: ${vendor.specialties?.join(', ') || 'General Maintenance'}`,
      topic: 'maintenance_update',
      event: 'maintenance_vendor_assigned',
      created_by_tenant: false,
      payload: { 
        maintenance_request_id,
        vendor_id,
        vendor_name: vendor.company_name
      },
      extension: 'maintenance',
    })
  }

  // Log the assignment
  console.log(`Vendor ${vendor.company_name} assigned to request ${maintenance_request_id}`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Vendor assignment notification sent',
      vendor: vendor.company_name,
      request_id: maintenance_request_id
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function notifyAppointmentScheduled(supabase: any, data: any) {
  const { appointment_id, maintenance_request_id, vendor_id } = data

  // Get appointment details
  const { data: appointment, error: appointmentError } = await supabase
    .from('maintenance_appointments')
    .select(`
      *,
      maintenance_requests (
        id,
        properties (
          address,
          owner_id,
          profiles (first_name, last_name)
        )
      )
    `)
    .eq('id', appointment_id)
    .single()

  if (appointmentError) {
    throw new Error(`Failed to fetch appointment: ${appointmentError.message}`)
  }

  // Get vendor details
  const { data: vendor, error: vendorError } = await supabase
    .from('maintenance_vendors')
    .select('*')
    .eq('id', vendor_id)
    .single()

  if (vendorError) {
    throw new Error(`Failed to fetch vendor: ${vendorError.message}`)
  }

  // Create notification for property owner
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: appointment.maintenance_requests.properties.owner_id,
      title: 'Maintenance Appointment Scheduled',
      description: `Appointment scheduled with ${vendor.company_name} for ${new Date(appointment.scheduled_date).toLocaleDateString()}`,
      type: 'info',
      metadata: {
        appointment_id,
        maintenance_request_id,
        vendor_id,
        scheduled_date: appointment.scheduled_date
      }
    })

  if (notificationError) {
    throw new Error(`Failed to create notification: ${notificationError.message}`)
  }

  // Get tenant_id and property_id from the maintenance request
  const { data: maintenanceRequest } = await supabase
    .from('maintenance_requests')
    .select('tenant_id, property_id')
    .eq('id', maintenance_request_id)
    .single()

  // Create message for tenant
  if (maintenanceRequest) {
    const { data: application } = await supabase
      .from('property_applications')
      .select('id')
      .eq('tenant_id', maintenanceRequest.tenant_id)
      .eq('property_id', maintenanceRequest.property_id)
      .single()

    if (application) {
      await supabase.from('messages').insert({
        property_application_id: application.id,
        sender_id: appointment.maintenance_requests.properties.owner_id,
        message_text: `📅 **Appointment Scheduled**: ${vendor.company_name}\n\n**Date**: ${new Date(appointment.scheduled_date).toLocaleDateString()}\n**Time**: ${new Date(appointment.scheduled_date).toLocaleTimeString()}\n\n${appointment.notes || 'Please be available at the scheduled time.'}`,
        topic: 'maintenance_update',
        event: 'maintenance_appointment_scheduled',
        created_by_tenant: false,
        payload: { 
          appointment_id,
          maintenance_request_id,
          vendor_id,
          vendor_name: vendor.company_name,
          scheduled_date: appointment.scheduled_date
        },
        extension: 'maintenance',
      })
    }
  }

  console.log(`Appointment ${appointment_id} scheduled with vendor ${vendor.company_name}`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Appointment notification sent',
      appointment_id,
      vendor: vendor.company_name,
      scheduled_date: appointment.scheduled_date
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function notifyRequestCompleted(supabase: any, data: any) {
  const { maintenance_request_id, vendor_id, completion_notes } = data

  // Get request details
  const { data: request, error: requestError } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      properties (
        address,
        owner_id,
        profiles (first_name, last_name)
      )
    `)
    .eq('id', maintenance_request_id)
    .single()

  if (requestError) {
    throw new Error(`Failed to fetch maintenance request: ${requestError.message}`)
  }

  // Get vendor details if provided
  let vendor = null
  if (vendor_id) {
    const { data: vendorData, error: vendorError } = await supabase
      .from('maintenance_vendors')
      .select('*')
      .eq('id', vendor_id)
      .single()

    if (!vendorError) {
      vendor = vendorData
    }
  }

  // Create notification for property owner
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: request.properties.owner_id,
      title: 'Maintenance Request Completed',
      description: `Maintenance request at ${request.properties.address} has been completed${vendor ? ` by ${vendor.company_name}` : ''}`,
      type: 'success',
      metadata: {
        maintenance_request_id,
        vendor_id,
        completion_notes
      }
    })

  if (notificationError) {
    throw new Error(`Failed to create notification: ${notificationError.message}`)
  }

  // Create message for tenant
  const { data: application } = await supabase
    .from('property_applications')
    .select('id')
    .eq('tenant_id', request.tenant_id)
    .eq('property_id', request.property_id)
    .single()

  if (application) {
    await supabase.from('messages').insert({
      property_application_id: application.id,
      sender_id: request.properties.owner_id,
      message_text: `✅ **Request Completed**${vendor ? ` by ${vendor.company_name}` : ''}\n\nYour maintenance request has been completed.\n\n${completion_notes ? `**Notes**: ${completion_notes}` : 'Thank you for your patience.'}`,
      topic: 'maintenance_update',
      event: 'maintenance_completed',
      created_by_tenant: false,
      payload: { 
        maintenance_request_id,
        vendor_id,
        vendor_name: vendor?.company_name,
        completion_notes
      },
      extension: 'maintenance',
    })
  }

  console.log(`Maintenance request ${maintenance_request_id} completed${vendor ? ` by ${vendor.company_name}` : ''}`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Completion notification sent',
      request_id: maintenance_request_id,
      vendor: vendor?.company_name || 'Unknown'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
