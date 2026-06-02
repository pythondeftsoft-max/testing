import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PLACEMENT-FEE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { applicationId, propertyId, tenantId, amount, propertyAddress, forceNew } = await req.json();

    logStep('Creating placement fee payment', { applicationId: applicationId || 'none', propertyId, tenantId, amount, forceNew: !!forceNew });

    // Check for existing placement fees - fetch all to handle duplicates properly
    logStep('Checking for existing placement fees');
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: existingFees } = await supabase
      .from('landlord_placement_fees')
      .select('id, stripe_checkout_url, stripe_session_id, stripe_checkout_created_at, payment_status')
      .eq('property_id', propertyId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Find valid pending fee (< 3 days old) or paid fee
    const existingFee = existingFees?.find(f => 
      f.payment_status === 'pending' && 
      f.stripe_checkout_url &&
      f.stripe_checkout_created_at &&
      new Date(f.stripe_checkout_created_at) > threeDaysAgo
    ) || null;

    const paidFee = existingFees?.find(f => f.payment_status === 'paid') || null;

    // If valid (< 3 days old) link exists with pending status, return it — unless caller forced a new one
    if (!forceNew && existingFee?.stripe_checkout_url && existingFee.stripe_checkout_created_at) {
      logStep('Returning existing valid payment link (< 3 days old)');
      return new Response(
        JSON.stringify({
          success: true,
          paymentUrl: existingFee.stripe_checkout_url,
          sessionId: existingFee.stripe_session_id,
          placementFeeId: existingFee.id,
          isExisting: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // paidFee already checked above in existingFees query

    if (paidFee) {
      logStep('Fee already marked as paid, cannot create new payment link');
      return new Response(
        JSON.stringify({
          error: 'This placement fee has already been paid. Cannot create a new payment link.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get property and tenant details
    let landlord, tenant, unitId, propertyInfo, landlordId, address;
    let application: any;
    let units: any;
    let appError: any;
    let unitsError: any;

    if (applicationId) {
      // Fetch via application - check both unit_applications and marketplace_applications
      logStep('Fetching via application', { applicationId });
      
      // First try unit_applications
      ({ data: application, error: appError } = await supabase
        .from('unit_applications')
        .select(`
          *,
          property_units!inner(
            id,
            unit_number,
            unit_name,
            property_id,
            monthly_rent,
            security_deposit
          ),
          profiles!unit_applications_tenant_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', applicationId)
        .maybeSingle());

      if (application) {
        logStep('Found in unit_applications');
      } else {
        // Try marketplace_applications with separate queries (no FK joins)
        logStep('Not in unit_applications, trying marketplace_applications');
        
        // First get the marketplace application without joins
        const { data: marketplaceApp, error: marketplaceError } = await supabase
          .from('marketplace_applications')
          .select('*')
          .eq('id', applicationId)
          .maybeSingle();

        if (marketplaceError) {
          logStep('Marketplace query error', marketplaceError);
        }

        if (marketplaceApp) {
          logStep('Found in marketplace_applications', { unitId: marketplaceApp.unit_id, userId: marketplaceApp.user_id });
          
          // Fetch property_units separately
          const { data: unitData, error: unitError } = await supabase
            .from('property_units')
            .select('id, unit_number, unit_name, property_id, monthly_rent, security_deposit')
            .eq('id', marketplaceApp.unit_id)
            .single();

          if (unitError) {
            logStep('Unit fetch error', unitError);
          }

          // Fetch profiles separately
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', marketplaceApp.user_id)
            .single();

          if (profileError) {
            logStep('Profile fetch error', profileError);
          }

          // Normalize to match unit_applications format
          application = {
            ...marketplaceApp,
            tenant_id: marketplaceApp.user_id,
            property_units: unitData,
            profiles: profileData,
          };
          logStep('Found in marketplace_applications with data', { hasUnit: !!unitData, hasProfile: !!profileData });
        }
      }

      if (!application) {
        // Try property_applications (lease-signed flow)
        logStep('Not in marketplace_applications, trying property_applications');
        const { data: propApp, error: propAppError } = await supabase
          .from('property_applications')
          .select('*')
          .eq('id', applicationId)
          .maybeSingle();

        if (propAppError) logStep('property_applications query error', propAppError);

        if (propApp) {
          logStep('Found in property_applications', { unitId: propApp.unit_id, tenantId: propApp.tenant_id });

          const { data: unitData, error: unitError } = await supabase
            .from('property_units')
            .select('id, unit_number, unit_name, property_id, monthly_rent, security_deposit')
            .eq('id', propApp.unit_id)
            .single();
          if (unitError) logStep('Unit fetch error (property_applications)', unitError);

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', propApp.tenant_id)
            .single();
          if (profileError) logStep('Profile fetch error (property_applications)', profileError);

          application = {
            ...propApp,
            tenant_id: propApp.tenant_id,
            property_units: unitData,
            profiles: profileData,
          };
        }
      }

      if (!application) {
        logStep('Application not found in any table');
        throw new Error('Application not found in unit_applications, marketplace_applications, or property_applications');
      }

      // Get property with landlord details
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select(`
          admin_listed,
          owner_id,
          address,
          profiles!properties_owner_id_fkey(
            email,
            first_name,
            last_name,
            stripe_customer_id
          )
        `)
        .eq('id', application.property_units.property_id)
        .single();
      
      if (propError || !property) {
        logStep('Property fetch error', propError);
        throw new Error(`Property not found: ${propError?.message}`);
      }

      landlord = property.profiles;
      tenant = application.profiles;
      unitId = application.property_units.id;
      landlordId = property.owner_id;
      propertyInfo = property;
      address = property.address;
    } else {
      // Fetch directly via property and tenant IDs
      logStep('Fetching directly via property and tenant');
      
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select(`
          admin_listed,
          owner_id,
          address,
          profiles!properties_owner_id_fkey(
            email,
            first_name,
            last_name,
            stripe_customer_id
          )
        `)
        .eq('id', propertyId)
        .single();

      if (propError || !property) {
        logStep('Property fetch error', propError);
        throw new Error(`Property not found: ${propError?.message}`);
      }

      ({ data: units, error: unitsError } = await supabase
        .from('property_units')
        .select('id, monthly_rent, security_deposit')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .maybeSingle());

      if (unitsError || !units) {
        logStep('Unit fetch error', unitsError);
        throw new Error(`Property unit not found: ${unitsError?.message}`);
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenantData) {
        logStep('Tenant fetch error', tenantError);
        throw new Error(`Tenant not found: ${tenantError?.message}`);
      }

      landlord = property.profiles;
      tenant = tenantData;
      unitId = units.id;
      landlordId = property.owner_id;
      propertyInfo = property;
      address = property.address;
    }

    if (!landlord) {
      logStep('No landlord found');
      throw new Error('No landlord associated with this property');
    }

    // Store unit financial data
    const unitData = applicationId 
      ? { 
          monthly_rent: application?.property_units?.monthly_rent,
          security_deposit: application?.property_units?.security_deposit 
        }
      : { 
          monthly_rent: units?.monthly_rent,
          security_deposit: units?.security_deposit 
        };

    logStep('Fetched details', { landlordId, tenantId, unitId, unitData });

    // Create or get Stripe customer for landlord
    const landlordObj = landlord as { email?: string; first_name?: string; last_name?: string; stripe_customer_id?: string };
    let customerId = landlordObj.stripe_customer_id;

    if (!customerId) {
      logStep('Creating Stripe customer for landlord');
      const customer = await stripe.customers.create({
        email: landlordObj.email,
        name: `${landlordObj.first_name ?? ''} ${landlordObj.last_name ?? ''}`.trim(),
        metadata: {
          user_id: landlordId,
          type: 'landlord',
        },
      });
      customerId = customer.id;

      // Update landlord profile with stripe_customer_id
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', landlordId);
      
      logStep('Created Stripe customer', { customerId });
    }

    // Reuse existing pending placement fee row if one exists. The DB has a
    // unique index on (property_id, unit_id, tenant_id) where
    // payment_status='pending', so we must match on the resolved unit_id —
    // not just property+tenant — and we must always handle a 23505 race by
    // re-fetching and updating the conflicting row.
    let placementFeeId: string | null = null;

    // Re-query using the authoritative unit_id we just resolved.
    const { data: pendingByUnit } = await supabase
      .from('landlord_placement_fees')
      .select('id')
      .eq('property_id', propertyId)
      .eq('unit_id', unitId)
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingByUnit?.id) {
      logStep('Reusing existing pending placement fee row', { placementFeeId: pendingByUnit.id });
      placementFeeId = pendingByUnit.id;
      const { error: refreshError } = await supabase
        .from('landlord_placement_fees')
        .update({
          fee_amount: amount,
          ...(unitData.monthly_rent && { first_month_rent: unitData.monthly_rent }),
          ...(unitData.security_deposit && { security_deposit: unitData.security_deposit }),
          stripe_checkout_created_at: new Date().toISOString(),
        })
        .eq('id', placementFeeId);
      if (refreshError) {
        logStep('Warning: failed to refresh existing placement fee row', refreshError);
      }
    } else {
      logStep('Creating placement fee record');
      const { data: placementFee, error: feeError } = await supabase
        .from('landlord_placement_fees')
        .insert({
          property_id: propertyId,
          tenant_id: tenantId,
          unit_id: unitId,
          landlord_id: landlordId,
          fee_amount: amount,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ...(unitData.monthly_rent && { first_month_rent: unitData.monthly_rent }),
          ...(unitData.security_deposit && { security_deposit: unitData.security_deposit }),
          payment_status: 'pending',
          stripe_checkout_created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (feeError || !placementFee) {
        // Race fallback: if the unique index tripped, fetch the existing
        // pending row and reuse it instead of failing the request.
        if ((feeError as any)?.code === '23505') {
          logStep('23505 on insert — falling back to existing pending row');
          const { data: raceRow } = await supabase
            .from('landlord_placement_fees')
            .select('id')
            .eq('property_id', propertyId)
            .eq('unit_id', unitId)
            .eq('tenant_id', tenantId)
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (raceRow?.id) {
            placementFeeId = raceRow.id;
            await supabase
              .from('landlord_placement_fees')
              .update({
                fee_amount: amount,
                ...(unitData.monthly_rent && { first_month_rent: unitData.monthly_rent }),
                ...(unitData.security_deposit && { security_deposit: unitData.security_deposit }),
                stripe_checkout_created_at: new Date().toISOString(),
              })
              .eq('id', placementFeeId);
          }
        }
        if (!placementFeeId) {
          logStep('Error creating placement fee', feeError);
          throw new Error(`Failed to create placement fee record: ${feeError?.message}`);
        }
      } else {
        placementFeeId = placementFee.id;
      }
    }
    logStep('Placement fee record ready', { placementFeeId });

    // Create checkout session (will auto-create payment intent with metadata including placement_fee_id)
    logStep('Creating checkout session');
    // Intentionally do NOT attach `customer` or `customer_email`. The landlord
    // pays this link and should enter their own email at Stripe checkout —
    // we don't want the page pre-filled with the tenant's profile email.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        metadata: {
          payment_type: 'placement_fee',
          type: 'placement_fee',
          placement_fee_id: placementFeeId,
          ...(applicationId && { application_id: applicationId }),
          property_id: propertyId,
          tenant_id: tenantId,
          landlord_id: landlordId,
          unit_id: unitId,
          property_address: address || propertyAddress,
          tenant_name: `${tenant.first_name} ${tenant.last_name}`,
          admin_listed: propertyInfo?.admin_listed ? 'true' : 'false',
      },
      description: `OpenKey Housing - Placement fee for ${address || propertyAddress}`,
    },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'OpenKey Housing Placement Fee',
              description: `Placement fee for ${address || propertyAddress}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      custom_text: {
        submit: {
          message: 'Questions? Contact OpenKey Housing at support@openkeyhousing.com',
        },
      },
      success_url: `https://openkeyhousing.com/pay/success?session_id={CHECKOUT_SESSION_ID}&pf=${placementFeeId}`,
      cancel_url: `https://openkeyhousing.com/admin?tab=house-hunter&payment=cancelled`,
      metadata: {
        payment_type: 'placement_fee',
        type: 'placement_fee',
        placement_fee_id: placementFeeId,
        ...(applicationId && { application_id: applicationId }),
        property_id: propertyId,
        tenant_id: tenantId,
        landlord_id: landlordId,
      },
    });

    logStep('Checkout session created', { sessionId: session.id, url: session.url });

    // Generate friendly slug from address and date
    const generateSlug = (address: string, date: Date): string => {
      const cleanAddress = address
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      return `${cleanAddress}-${dateStr}`;
    };

    const slug = generateSlug(address || propertyAddress, new Date());
    // Always use the canonical public domain. Never let Lovable preview/project domains leak into payment links.
    const normalizeOrigin = (raw: string | null | undefined): string => {
      const fallback = 'https://openkeyhousing.com';
      if (!raw) return fallback;
      try {
        const u = new URL(raw);
        const host = u.hostname.toLowerCase();
        if (host.includes('lovableproject.com') || host.includes('lovable.app') || host.includes('lovable.dev') || host.includes('supabase.co')) {
          return fallback;
        }
        return `${u.protocol}//${u.host}`;
      } catch {
        return fallback;
      }
    };
    const origin = normalizeOrigin(Deno.env.get('PUBLIC_SITE_URL') || req.headers.get('origin'));
    const friendlyUrl = `${origin}/pay/${slug}`;

    logStep('Generated friendly payment link', { slug, friendlyUrl });

    // Friendly payment links no longer expire by time. They stay valid until the
    // placement fee is paid OR a newer link is generated for the same fee
    // (which auto-supersedes the previous one). Keep `expires_at` populated for
    // backward-compat read paths, but the resolver no longer enforces it.
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 5);

    // Supersede any previously-active link for this placement fee so the unique
    // active-per-fee index stays satisfied when we insert the new row.
    const { error: supersedeError } = await supabase
      .from('placement_fee_payment_links')
      .update({ superseded_at: new Date().toISOString(), superseded_by_slug: slug })
      .eq('placement_fee_id', placementFeeId)
      .is('paid_at', null)
      .is('superseded_at', null)
      .neq('slug', slug);
    if (supersedeError) {
      logStep('Warning: Failed to supersede prior payment link(s)', supersedeError);
    }

    let friendlyLinkOk = false;
    const { error: linkError } = await supabase
      .from('placement_fee_payment_links')
      .insert({
        slug,
        stripe_checkout_url: session.url,
        placement_fee_id: placementFeeId,
        property_address: address || propertyAddress,
        payment_date: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

    if (!linkError) {
      friendlyLinkOk = true;
    } else if ((linkError as any).code === '23505') {
      // Same slug already exists (same address, same calendar day) — refresh
      // its Stripe URL and clear paid/superseded so it routes to this new session.
      logStep('Slug exists, refreshing existing friendly link');
      const { error: updateLinkError } = await supabase
        .from('placement_fee_payment_links')
        .update({
          stripe_checkout_url: session.url,
          placement_fee_id: placementFeeId,
          property_address: address || propertyAddress,
          payment_date: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          paid_at: null,
          superseded_at: null,
          superseded_by_slug: null,
        })
        .eq('slug', slug);
      if (updateLinkError) {
        logStep('Warning: Failed to update existing friendly link', updateLinkError);
      } else {
        friendlyLinkOk = true;
      }
    } else {
      logStep('Warning: Failed to store payment link', linkError);
    }

    // Update placement fee with friendly URL (or fallback to Stripe URL if link creation failed)
    const finalUrl = friendlyLinkOk ? friendlyUrl : session.url;
    const { error: updateError } = await supabase
      .from('landlord_placement_fees')
      .update({
        stripe_checkout_url: finalUrl,
        stripe_session_id: session.id,
        stripe_checkout_created_at: new Date().toISOString(),
      })
      .eq('id', placementFeeId);

    if (updateError) {
      logStep('Error storing checkout URL', updateError);
    } else {
      logStep('Checkout URL stored', { placementFeeId, friendlyLinkOk });
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: finalUrl,
        sessionId: session.id,
        placementFeeId: placementFeeId,
        isExisting: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep('ERROR', { message: (error instanceof Error ? error.message : String(error)), stack: error.stack });
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
