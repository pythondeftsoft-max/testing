import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting lease document backfill...');

    // Find all executed leases that don't have document records
    const { data: executedLeases, error: leasesError } = await supabase
      .from('marketplace_applications')
      .select(`
        id,
        user_id,
        property_id,
        unit_id,
        lease_start_date,
        lease_end_date,
        landlord_signature_name,
        landlord_signed_at,
        tenant_signature_name,
        tenant_signed_at,
        lease_method,
        lease_fully_executed_at,
        property:properties(address, city, state, zipcode, owner_id),
        unit:property_units(unit_name, unit_number, monthly_rent)
      `)
      .not('lease_fully_executed_at', 'is', null)
      .order('lease_fully_executed_at', { ascending: false });

    if (leasesError) {
      console.error('Error fetching executed leases:', leasesError);
      throw leasesError;
    }

    console.log(`Found ${executedLeases?.length || 0} executed leases`);

    const results = {
      processed: 0,
      skipped: 0,
      created: 0,
      errors: [] as string[],
    };

    for (const lease of executedLeases || []) {
      results.processed++;

      // Check if document already exists for this unit
      const { data: existingDoc, error: checkError } = await supabase
        .from('property_unit_documents')
        .select('id')
        .eq('unit_id', lease.unit_id)
        .eq('document_type', 'Lease Agreement')
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking existing doc for lease ${lease.id}:`, checkError);
        results.errors.push(`Lease ${lease.id}: ${checkError.message}`);
        continue;
      }

      if (existingDoc) {
        console.log(`Lease ${lease.id} already has document record, skipping`);
        results.skipped++;
        continue;
      }

      // Build address
      const property = lease.property as any;
      const unit = lease.unit as any;
      
      if (!property || !unit) {
        console.log(`Lease ${lease.id} missing property/unit data, skipping`);
        results.skipped++;
        continue;
      }

      const fullAddress = [
        property.address,
        property.city,
        property.state,
        property.zipcode
      ].filter(Boolean).join(', ');

      const unitIdentifier = unit.unit_name || unit.unit_number || '1';

      // Generate simple PDF using basic PDF structure
      // For a proper PDF with jsPDF, this would need to be done client-side
      // Here we create a placeholder document record that points to a text file
      // In production, you'd generate a real PDF client-side and upload it
      
      const fileName = `Signed_Lease_Agreement_${unitIdentifier}_${new Date(lease.lease_fully_executed_at).toISOString().split('T')[0]}.txt`;
      const filePath = `${lease.property_id}/leases/${Date.now()}-${fileName}`;

      // Create a simple text representation of the lease
      const leaseContent = `
LEASE AGREEMENT
===============

Property: ${fullAddress}
Unit: ${unitIdentifier}
Monthly Rent: $${unit.monthly_rent || 'N/A'}

Lease Term: ${lease.lease_start_date || 'N/A'} to ${lease.lease_end_date || 'N/A'}

SIGNATURES:

Landlord: ${lease.landlord_signature_name || 'N/A'}
Signed: ${lease.landlord_signed_at ? new Date(lease.landlord_signed_at).toLocaleDateString() : 'N/A'}

Tenant: ${lease.tenant_signature_name || 'N/A'}  
Signed: ${lease.tenant_signed_at ? new Date(lease.tenant_signed_at).toLocaleDateString() : 'N/A'}

Lease Method: ${lease.lease_method || 'openkey'}
Fully Executed: ${lease.lease_fully_executed_at ? new Date(lease.lease_fully_executed_at).toLocaleDateString() : 'N/A'}

---
This is a placeholder document. The original lease was digitally signed via OpenKey.
To generate a formatted PDF, use the "Download Lease" option in the application.
      `.trim();

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filePath, new Blob([leaseContent], { type: 'text/plain' }), {
          contentType: 'text/plain',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Error uploading document for lease ${lease.id}:`, uploadError);
        results.errors.push(`Lease ${lease.id}: Upload failed - ${uploadError.message}`);
        continue;
      }

      // Create document record
      const { error: insertError } = await supabase
        .from('property_unit_documents')
        .insert({
          unit_id: lease.unit_id,
          uploaded_by: property.owner_id || lease.user_id,
          file_name: fileName,
          document_type: 'Lease Agreement',
          file_path: filePath,
        });

      if (insertError) {
        console.error(`Error creating document record for lease ${lease.id}:`, insertError);
        results.errors.push(`Lease ${lease.id}: Insert failed - ${insertError.message}`);
        continue;
      }

      console.log(`Created document record for lease ${lease.id}`);
      results.created++;
    }

    console.log('Backfill complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} leases. Created ${results.created} documents. Skipped ${results.skipped}.`,
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
