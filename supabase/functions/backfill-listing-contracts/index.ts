import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const generateFullContractText = (listing: any, property: any, unit: any | null, signerName: string, signDate: string) => {
  const propertyAddress = property.address || property.street_address || 'Address not provided'
  const bedrooms = unit?.bedrooms || property.bedrooms || 'N/A'
  const bathrooms = unit?.bathrooms || property.bathrooms || 'N/A'
  const monthlyRent = unit?.monthly_rent || property.desired_rent || property.monthly_rent || '0'
  const unitDescription = unit ? `Unit ${unit.unit_number || unit.unit_name}` : 'Whole Property'
  const placementFeePercentage = 40
  const placementFeeAmount = (parseFloat(monthlyRent) * placementFeePercentage) / 100
  const formattedFeeAmount = placementFeeAmount.toFixed(2)
  const signerEmail = property.profiles?.email || 'Not provided'
  const signerPhone = property.profiles?.phone || 'Not provided'
  
  return `LANDLORD-TENANT PLACEMENT AGREEMENT

This Agreement is made on ${signDate}, by and between:

Agency
OpenKey Housing LLC (hereafter referred to as 'Agency')
Contact: support@openkey.com

Landlord / Owner
Full Name: ${signerName}
Phone: ${signerPhone}
Email: ${signerEmail}
Mailing Address: ${propertyAddress}

1. Purpose
Agency agrees to locate and refer one or more qualified Section 8 voucher holders to rent available units owned by the Landlord. The Landlord agrees to compensate the Agency for each successful placement.

2. Properties & Units Covered
This agreement applies to the following available unit(s):

Property Address: ${propertyAddress}
${unitDescription}: ${bedrooms}br/${bathrooms}ba
Monthly Rent: $${monthlyRent}

*Landlord certifies that the above units are available and will notify Agency if availability changes. Additional properties may be added by mutual written agreement.

3. Placement Fee
The Landlord agrees to pay the Agency a one-time fee equal to ${placementFeePercentage}% of the first month's rent per unit successfully filled ($${formattedFeeAmount}).
The fee is due within 3 business days of lease signing or tenant move-in, whichever occurs first.
This fee applies per unit placed.
There are no recurring fees beyond initial placement.

4. Refund Policy
If a referred tenant fails to move in for reasons outside the Landlord's control, the placement fee will be fully refunded.

5. Landlord Responsibilities
The Landlord agrees to:
- Ensure each unit is rent-ready and capable of passing a Section 8 inspection.
- Communicate promptly with the Agency regarding move-in timelines, inspection scheduling, and lease execution.
- Notify the Agency immediately if a unit becomes unavailable or is rented by another party.

6. Independent Relationship
The Agency is not acting as a property manager, leasing agent, legal advisor, or maintenance provider.
The Agency's sole role is tenant placement through referral and coordination.

7. Term & Termination
This agreement remains in effect until all listed units are filled or either party terminates in writing.
Termination does not cancel fees owed for successful placements already completed.

8. Entire Agreement
This agreement reflects the full understanding between the parties and supersedes any prior verbal or written agreements.
Any changes must be made in writing and signed by both parties.

9. Signatures
Landlord Signature: ${signerName}                    Date: ${signDate}
Agency (OpenKey Housing LLC) Signature: OpenKey Housing LLC     Date: ${signDate}

This document was electronically signed through the OpenKey platform.
Generated from listing request: ${listing.id}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting backfill of listing contracts...')

    // Find all listing requests without contracts
    const { data: listingsWithoutContracts, error: fetchError } = await supabaseClient
      .from('property_tenant_requests')
      .select(`
        id,
        property_id,
        unit_id,
        listing_event_type,
        created_at,
        delisted_at,
        status,
        properties!inner (
          owner_id,
          address,
          street_address,
          city,
          state,
          zipcode,
          bedrooms,
          bathrooms,
          monthly_rent,
          desired_rent,
          property_type,
          profiles!properties_owner_id_fkey (
            first_name,
            last_name,
            email,
            phone,
            user_type
          )
        ),
        property_units (
          unit_number,
          unit_name,
          bedrooms,
          bathrooms,
          monthly_rent
        )
      `)
      .in('listing_event_type', ['initial_listing', 're_listing'])

    if (fetchError) {
      console.error('Error fetching listings:', fetchError)
      throw fetchError
    }

    console.log(`Found ${listingsWithoutContracts?.length || 0} total listing requests`)

    // Check which ones already have contracts
    const { data: existingContracts, error: contractError } = await supabaseClient
      .from('property_listing_contracts')
      .select('id, listing_request_id, contract_text, signature_date')

    if (contractError) {
      console.error('Error fetching existing contracts:', contractError)
      throw contractError
    }

    const existingRequestIds = new Set(
      existingContracts?.map(c => c.listing_request_id).filter(Boolean) || []
    )

    // Split into contracts to create vs contracts to update
    const listingsNeedingContracts = (listingsWithoutContracts || []).filter(
      listing => !existingRequestIds.has(listing.id)
    )

    const listingsWithOutdatedContracts = (existingContracts || []).filter(
      c => c.contract_text && (
        c.contract_text.length < 500 || // Short contracts
        c.contract_text.includes('[Digital Signature]') || // Old signature placeholder
        !c.contract_text.includes('OpenKey Housing LLC') // Missing full company name
      )
    )

    console.log(`${listingsNeedingContracts.length} listings need new contracts`)
    console.log(`${listingsWithOutdatedContracts.length} contracts need updating with corrected text`)

    let successCount = 0
    let errorCount = 0
    let updateCount = 0
    const errors: any[] = []

    // First, update existing contracts with outdated text
    for (const existingContract of listingsWithOutdatedContracts) {
      try {
        // Find the corresponding listing
        const listing = (listingsWithoutContracts || []).find(
          l => l.id === existingContract.listing_request_id
        )
        
        if (!listing) {
          console.log(`Skipping contract ${existingContract.id} - listing not found`)
          continue
        }

        const property = listing.properties as any
        const profile = property?.profiles as any
        
        const signerName = [profile?.first_name, profile?.last_name]
          .filter(Boolean)
          .join(' ') || 'Property Owner'
        
        const signDateFormatted = existingContract.signature_date || 
          (listing.created_at 
            ? new Date(listing.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))

        const unit = listing.property_units || null
        const contractText = generateFullContractText(listing, property, unit, signerName, signDateFormatted)

        const { error: updateError } = await supabaseClient
          .from('property_listing_contracts')
          .update({ contract_text: contractText })
          .eq('id', existingContract.id)

        if (updateError) {
          console.error(`Error updating contract ${existingContract.id}:`, updateError)
          errorCount++
          errors.push({ contract_id: existingContract.id, error: updateError.message })
        } else {
          updateCount++
          console.log(`✓ Updated contract ${existingContract.id} with full text`)
        }
      } catch (err) {
        console.error(`Exception updating contract ${existingContract.listing_request_id}:`, err)
        errorCount++
        errors.push({ contract_id: existingContract.id, error: String(err) })
      }
    }

    // Then create contracts for listings without contracts
    for (const listing of listingsNeedingContracts) {
      try {
        const property = listing.properties as any
        const profile = property?.profiles as any
        
        console.log('Processing listing:', listing.id)
        console.log('Profile data:', profile)
        
        // Construct full name from first and last name
        const signerName = [profile?.first_name, profile?.last_name]
          .filter(Boolean)
          .join(' ') || 'Property Owner'
        
        console.log('Constructed signer name:', signerName)
        console.log('Property address:', property.address)
        
        // Format the signature date
        const signDateFormatted = listing.created_at 
          ? new Date(listing.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

        // Get unit data if this is a multi-unit listing
        const unit = listing.property_units || null

        // Generate full contract text
        const contractStatus = listing.delisted_at ? 'terminated' : 'active'
        const contractText = generateFullContractText(listing, property, unit, signerName, signDateFormatted)

        const contractData = {
          property_id: listing.property_id,
          unit_id: listing.unit_id,
          listing_request_id: listing.id,
          signer_name: signerName,
          signer_role: 'Property Owner',
          signed_by: property.owner_id,
          digital_signature: signerName,
          signature_date: listing.created_at ? new Date(listing.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          property_address: property.address || 'Address not provided',
          contract_type: 'listing_agreement',
          signed_at: listing.created_at,
          listing_date: listing.created_at,
          contract_status: contractStatus,
          contract_text: contractText,
        }
        
        console.log('Contract data to insert:', JSON.stringify(contractData, null, 2))

        const { error: insertError } = await supabaseClient
          .from('property_listing_contracts')
          .insert(contractData)

        if (insertError) {
          console.error(`Error creating contract for listing ${listing.id}:`, insertError)
          errorCount++
          errors.push({ listing_id: listing.id, error: insertError.message })
        } else {
          successCount++
          console.log(`✓ Created contract for listing ${listing.id} (${listing.listing_event_type})`)
        }
      } catch (err) {
        console.error(`Exception creating contract for listing ${listing.id}:`, err)
        errorCount++
        errors.push({ listing_id: listing.id, error: String(err) })
      }
    }

    console.log(`Backfill complete: ${successCount} contracts created, ${updateCount} contracts updated, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backfill completed',
        results: {
          total_listings_found: listingsWithoutContracts?.length || 0,
          already_had_contracts: existingRequestIds.size,
          listings_needing_contracts: listingsNeedingContracts.length,
          contracts_created: successCount,
          contracts_updated: updateCount,
          errors: errorCount,
          error_details: errors,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Backfill error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
