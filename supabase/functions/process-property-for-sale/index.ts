import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyForSaleRequest {
  property_id: string;
  marketing_price: number;
  reason_for_sale?: string;
  timeline_for_sale?: string;
  property_condition?: string;
  selling_points?: string;
  additional_details?: string;
  contact_preferences?: {
    email: boolean;
    phone: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: PropertyForSaleRequest = await req.json();
    const { property_id: propertyId, marketing_price } = requestData;

    // Validate required fields
    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'Property ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced marketing price validation
    const numericPrice = Number(marketing_price);
    if (marketing_price === undefined || marketing_price === null || marketing_price === '' || isNaN(numericPrice) || numericPrice <= 0) {
      console.error('Invalid marketing price:', { marketing_price, numericPrice, type: typeof marketing_price });
      return new Response(
        JSON.stringify({ error: 'Valid marketing price is required and must be greater than 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the property
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('id, owner_id, address, city, state, monthly_rent')
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .single();

    if (propertyError || !property) {
      console.error('Property verification error:', propertyError);
      return new Response(
        JSON.stringify({ error: 'Property not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile information
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing sale record for this property (any status)
    const { data: existingSale, error: fetchError } = await supabaseClient
      .from('properties_for_sale')
      .select('id, status')
      .eq('property_id', propertyId)
      .eq('owner_id', user.id)
      .maybeSingle();

    console.log('Existing sale record check:', { existingSale, fetchError });

    let saleRecord: any;

    if (existingSale) {
      // Update existing record and set status to pending
      const { data: updatedSale, error: updateError } = await supabaseClient
        .from('properties_for_sale')
        .update({
          marketing_price: requestData.marketing_price,
          reason_for_sale: requestData.reason_for_sale,
          timeline_for_sale: requestData.timeline_for_sale,
          property_condition: requestData.property_condition,
          selling_points: requestData.selling_points,
          additional_details: requestData.additional_details,
          contact_preferences: requestData.contact_preferences,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSale.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update property for sale record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      saleRecord = updatedSale;
      console.log('Property for sale record updated:', { property_id: propertyId, owner_id: user.id, sale_record_id: saleRecord.id });
    } else {
      // Insert new property for sale record
      const { data: newSale, error: insertError } = await supabaseClient
        .from('properties_for_sale')
        .insert({
          property_id: propertyId,
          owner_id: user.id,
          marketing_price: requestData.marketing_price,
          reason_for_sale: requestData.reason_for_sale,
          timeline_for_sale: requestData.timeline_for_sale,
          property_condition: requestData.property_condition,
          selling_points: requestData.selling_points,
          additional_details: requestData.additional_details,
          contact_preferences: requestData.contact_preferences,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        
        // Handle specific database constraint violations
        if (insertError.code === '23505') {
          console.error('Duplicate key constraint violation - this should not happen due to existing record check');
          return new Response(
            JSON.stringify({ error: 'A sale record already exists for this property. Please refresh and try again.' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to create property for sale record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      saleRecord = newSale;
      console.log('Property for sale submission successful:', { property_id: propertyId, owner_id: user.id, marketing_price: requestData.marketing_price, sale_record_id: saleRecord.id });
    }

    // Create admin notification (only for new submissions, not updates)
    if (!existingSale) {
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'New Property For Sale - Wholesale Opportunity',
          description: `${profile.first_name} ${profile.last_name} has marked a property for sale at ${property.address}, ${property.city}, ${property.state}. Marketing price: $${marketing_price.toLocaleString()}. Current rent: $${property.monthly_rent?.toLocaleString() || 'N/A'}.`,
          type: 'info',
          link: `/admin/properties-for-sale/${saleRecord.id}`,
          metadata: {
            type: 'property_for_sale',
            property_id: property.id,
            sale_record_id: saleRecord.id,
            owner_info: {
              name: `${profile.first_name} ${profile.last_name}`,
              email: profile.email,
              phone: profile.phone
            },
            property_info: {
              address: property.address,
              city: property.city,
              state: property.state,
              monthly_rent: property.monthly_rent
            },
            sale_info: {
              marketing_price,
              reason_for_sale: requestData.reason_for_sale,
              timeline_for_sale: requestData.timeline_for_sale,
              property_condition: requestData.property_condition
            }
          }
        });

      if (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sale_record_id: saleRecord.id,
        message: existingSale ? 'Property for sale details updated successfully' : 'Property submitted for sale successfully. Our team will review and contact you soon.'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in process-property-for-sale function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);