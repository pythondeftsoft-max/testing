
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Manage vendors function called:', req.method, req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set the JWT for the client
    const jwt = authHeader.replace('Bearer ', '')
    supabaseClient.auth.setAuth(jwt)

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated user:', user.id)

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (req.method === 'POST') {
      if (action === 'create') {
        return await createVendor(req, supabaseClient, user.id)
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid action for POST method' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'PUT') {
      if (action === 'update') {
        return await updateVendor(req, supabaseClient, user.id)
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid action for PUT method' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'DELETE') {
      if (action === 'deactivate') {
        return await deactivateVendor(req, supabaseClient, user.id)
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid action for DELETE method' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'GET') {
      if (action === 'details') {
        return await getVendorDetails(req, supabaseClient, user.id)
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid action for GET method' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function createVendor(req: Request, supabaseClient: any, userId: string) {
  try {
    const body = await req.json()
    console.log('Creating vendor with data:', body)

    const {
      account_id,
      portfolio_id,
      company_name,
      contact_name,
      phone,
      email,
      address,
      specialties,
      hourly_rate,
      notes,
      availability_schedule,
      emergency_contact,
      insurance_verified,
      license_number
    } = body

    // Validate required fields
    if (!company_name || !contact_name || !phone || !email || !specialties || !Array.isArray(specialties)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: company_name, contact_name, phone, email, specialties' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create vendor
    const { data: vendor, error: createError } = await supabaseClient
      .from('maintenance_vendors')
      .insert({
        account_id,
        portfolio_id,
        company_name,
        contact_name,
        phone,
        email,
        address,
        specialties,
        hourly_rate,
        notes,
        availability_schedule,
        emergency_contact: emergency_contact || false,
        insurance_verified: insurance_verified || false,
        license_number,
        created_by: userId
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating vendor:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create vendor', details: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Vendor created successfully:', vendor.id)
    return new Response(
      JSON.stringify({ 
        success: true, 
        vendor,
        message: 'Vendor created successfully' 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in createVendor:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function updateVendor(req: Request, supabaseClient: any, userId: string) {
  try {
    const body = await req.json()
    console.log('Updating vendor with data:', body)

    const { vendor_id, ...updateData } = body

    if (!vendor_id) {
      return new Response(
        JSON.stringify({ error: 'vendor_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if vendor exists and user has permission
    const { data: existingVendor, error: fetchError } = await supabaseClient
      .from('maintenance_vendors')
      .select('id, created_by')
      .eq('id', vendor_id)
      .single()

    if (fetchError || !existingVendor) {
      console.error('Vendor not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Vendor not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update vendor
    const { data: vendor, error: updateError } = await supabaseClient
      .from('maintenance_vendors')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendor_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating vendor:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update vendor', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Vendor updated successfully:', vendor.id)
    return new Response(
      JSON.stringify({ 
        success: true, 
        vendor,
        message: 'Vendor updated successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in updateVendor:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function deactivateVendor(req: Request, supabaseClient: any, userId: string) {
  try {
    const url = new URL(req.url)
    const vendor_id = url.searchParams.get('vendor_id')

    if (!vendor_id) {
      return new Response(
        JSON.stringify({ error: 'vendor_id parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Deactivating vendor:', vendor_id)

    // Check if vendor exists
    const { data: existingVendor, error: fetchError } = await supabaseClient
      .from('maintenance_vendors')
      .select('id, company_name')
      .eq('id', vendor_id)
      .single()

    if (fetchError || !existingVendor) {
      console.error('Vendor not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Vendor not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deactivate vendor (soft delete)
    const { error: deactivateError } = await supabaseClient
      .from('maintenance_vendors')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendor_id)

    if (deactivateError) {
      console.error('Error deactivating vendor:', deactivateError)
      return new Response(
        JSON.stringify({ error: 'Failed to deactivate vendor', details: deactivateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Vendor deactivated successfully:', vendor_id)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Vendor deactivated successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in deactivateVendor:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getVendorDetails(req: Request, supabaseClient: any, userId: string) {
  try {
    const url = new URL(req.url)
    const vendor_id = url.searchParams.get('vendor_id')

    if (!vendor_id) {
      return new Response(
        JSON.stringify({ error: 'vendor_id parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Getting vendor details for:', vendor_id)

    // Get vendor details
    const { data: vendor, error: fetchError } = await supabaseClient
      .from('maintenance_vendors')
      .select('*')
      .eq('id', vendor_id)
      .single()

    if (fetchError || !vendor) {
      console.error('Vendor not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Vendor not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Vendor details retrieved successfully:', vendor.id)
    return new Response(
      JSON.stringify({ 
        success: true, 
        vendor 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in getVendorDetails:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
