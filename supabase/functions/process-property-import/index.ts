
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { addresses, portfolio_id, session_id } = await req.json();
    const user_id = user.id;

    if (!addresses || !Array.isArray(addresses)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request: addresses array is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update import session if provided
    if (session_id) {
      await supabase
        .from('property_import_sessions')
        .update({ 
          status: 'processing',
          processed_count: 0,
          total_count: addresses.length 
        })
        .eq('id', session_id);
    }

    console.log(`Processing ${addresses.length} addresses for user ${user_id}`);

    const results = [];
    
    // Normalize function (matching the DB function)
    function normalizeText(input: string): string {
      if (!input) return '';
      return input.toLowerCase().replace(/[^a-zA-Z0-9]+/g, ' ').trim();
    }

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!addr.street_address || !addr.city || !addr.state || !addr.zipcode) {
          results.push({
            row_number: rowNumber,
            status: 'failed',
            original_data: addr,
            errors: ['Missing required fields: street_address, city, state, zipcode'],
          });
          continue;
        }

        const propertyType = addr.property_type || 'house';
        const isUnit = addr.unit_number && addr.unit_number.trim();

        // Check for single-family property duplicates
        if (propertyType === 'house') {
          const normalizedAddress = normalizeText(addr.street_address);
          
          const { data: existingProperties } = await supabase
            .from('properties')
            .select('id, address')
            .eq('owner_id', user_id)
            .eq('property_type', 'house')
            .is('deleted_at', null);

          const duplicateProperty = existingProperties?.find(p => 
            normalizeText(p.address || '') === normalizedAddress
          );

          if (duplicateProperty) {
            results.push({
              row_number: rowNumber,
              status: 'failed',
              original_data: addr,
              errors: [`Duplicate property detected: A single-family house with address "${duplicateProperty.address}" already exists in your portfolio. Duplicate properties are not allowed.`],
            });
            continue;
          }
        }

        // Create or find property
        let propertyId;
        
        if (isUnit) {
          // For units, try to find existing property first
          const { data: existingProperty } = await supabase
            .from('properties')
            .select('id')
            .eq('owner_id', user_id)
            .eq('address', addr.street_address)
            .eq('city', addr.city)
            .eq('state', addr.state)
            .eq('zipcode', addr.zipcode)
            .is('deleted_at', null)
            .single();

          if (existingProperty) {
            propertyId = existingProperty.id;

            // Check for unit duplicates within this property
            const normalizedUnit = normalizeText(addr.unit_number);
            
            const { data: existingUnits } = await supabase
              .from('property_units')
              .select('id, unit_number')
              .eq('property_id', propertyId);

            const duplicateUnit = existingUnits?.find(u => 
              normalizeText(u.unit_number || '') === normalizedUnit
            );

            if (duplicateUnit) {
              results.push({
                row_number: rowNumber,
                status: 'failed',
                original_data: addr,
                errors: [`Duplicate unit detected: Unit "${duplicateUnit.unit_number}" already exists in this property. Duplicate units are not allowed.`],
              });
              continue;
            }
          } else {
            // Create new property for the unit
            const { data: newProperty, error: propertyError } = await supabase
              .from('properties')
              .insert({
                owner_id: user_id,
                portfolio_id: portfolio_id || null,
                address: addr.street_address,
                city: addr.city,
                state: addr.state,
                zipcode: addr.zipcode,
                property_type: propertyType,
                status: 'available',
                on_market: true,
              })
              .select('id')
              .single();

            if (propertyError) throw propertyError;
            propertyId = newProperty.id;
          }

          // Create the unit
          const { error: unitError } = await supabase
            .from('property_units')
            .insert({
              property_id: propertyId,
              unit_number: addr.unit_number,
              unit_type: addr.unit_type || 'apartment',
              bedrooms: addr.bedrooms ? parseInt(String(addr.bedrooms)) : null,
              bathrooms: addr.bathrooms ? parseFloat(String(addr.bathrooms)) : null,
              square_feet: addr.square_feet ? parseInt(String(addr.square_feet)) : null,
              monthly_rent: addr.monthly_rent ? parseFloat(String(addr.monthly_rent)) : null,
              deposit_amount: addr.deposit_amount ? parseFloat(String(addr.deposit_amount)) : null,
              pet_friendly: addr.pet_friendly === 'true' || addr.pet_friendly === true,
              parking_spots: addr.parking_spots ? parseInt(String(addr.parking_spots)) : null,
              amenities: addr.unit_amenities || null,
              lease_terms: addr.lease_terms || null,
              availability_date: addr.availability_date || null,
              notes: addr.notes || null,
              status: 'available',
            });

          if (unitError) throw unitError;

        } else {
          // Create standalone property
          const { data: newProperty, error: propertyError } = await supabase
            .from('properties')
            .insert({
              owner_id: user_id,
              portfolio_id: portfolio_id || null,
              address: addr.street_address,
              city: addr.city,
              state: addr.state,
              zipcode: addr.zipcode,
              property_type: propertyType,
              bedrooms: addr.bedrooms ? parseInt(String(addr.bedrooms)) : null,
              bathrooms: addr.bathrooms ? parseFloat(String(addr.bathrooms)) : null,
              square_feet: addr.square_feet ? parseInt(String(addr.square_feet)) : null,
              monthly_rent: addr.monthly_rent ? parseFloat(String(addr.monthly_rent)) : null,
              status: 'available',
              on_market: true,
            })
            .select('id')
            .single();

          if (propertyError) throw propertyError;
          propertyId = newProperty.id;
        }

        results.push({
          row_number: rowNumber,
          status: 'success',
          original_data: addr,
          property_id: propertyId,
        });

        // Store result in database if session_id provided
        if (session_id) {
          await supabase
            .from('property_import_results')
            .insert({
              import_session_id: session_id,
              row_number: rowNumber,
              property_id: propertyId,
              status: 'success',
              original_data: addr,
              processed_data: { property_id: propertyId }
            });
        }

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error occurred';
        
        results.push({
          row_number: rowNumber,
          status: 'failed',
          original_data: addr,
          errors: [errorMessage],
        });

        // Handle duplicate constraint violations with friendly messages
        if (errorMessage.includes('idx_properties_no_duplicate_single_family')) {
          results[results.length - 1].errors = ['A single-family house with this address already exists in your portfolio. Duplicate properties are not allowed.'];
        } else if (errorMessage.includes('idx_property_units_no_duplicate_units')) {
          results[results.length - 1].errors = ['A unit with this number already exists in this property. Duplicate units are not allowed.'];
        }

        // Store failed result in database if session_id provided
        if (session_id) {
          await supabase
            .from('property_import_results')
            .insert({
              import_session_id: session_id,
              row_number: rowNumber,
              status: 'failed',
              original_data: addr,
              error_details: { errors: [errorMessage] }
            });
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    console.log(`Import completed: ${successCount} success, ${failureCount} failures`);

    // Update session as completed
    if (session_id) {
      await supabase
        .from('property_import_sessions')
        .update({ 
          status: 'completed',
          processed_count: successCount,
          failed_count: failureCount,
          completed_at: new Date().toISOString()
        })
        .eq('id', session_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_processed: results.length,
        successful_imports: successCount,
        failed_imports: failureCount,
        results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
