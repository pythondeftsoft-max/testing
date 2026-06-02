import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-LEASE-SIGNED-PAYMENT] ${step}${detailsStr}`);
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

    const { applicationId, forceNew } = await req.json();

    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    logStep('Processing lease signed payment', { applicationId });

    // Try to find the application in all three tables
    let application: any = null;
    let sourceType: 'marketplace' | 'property' | 'push' = 'marketplace';
    let tenantIdField = 'user_id';

    // Try marketplace_applications first
    const { data: marketplaceApp, error: marketplaceError } = await supabase
      .from('marketplace_applications')
      .select(`
        *,
        properties!inner(
          id,
          address,
          owner_id,
          admin_listed,
          profiles!properties_owner_id_fkey(
            id,
            email,
            first_name,
            last_name,
            stripe_customer_id
          )
        ),
        property_units!inner(
          id,
          unit_number,
          monthly_rent,
          security_deposit
        )
      `)
      .eq('id', applicationId)
      .single();

    if (!marketplaceError && marketplaceApp) {
      application = marketplaceApp;
      sourceType = 'marketplace';
      tenantIdField = 'user_id';
      logStep('Found application in marketplace_applications');
    } else {
      // Try property_applications
      const { data: propertyApp, error: propertyError } = await supabase
        .from('property_applications')
        .select(`
          *,
          properties!inner(
            id,
            address,
            owner_id,
            admin_listed,
            profiles!properties_owner_id_fkey(
              id,
              email,
              first_name,
              last_name,
              stripe_customer_id
            )
          ),
          property_units!inner(
            id,
            unit_number,
            monthly_rent,
            security_deposit
          )
        `)
        .eq('id', applicationId)
        .single();

      if (!propertyError && propertyApp) {
        application = propertyApp;
        sourceType = 'property';
        tenantIdField = 'tenant_id';
        logStep('Found application in property_applications');
      } else {
        // Try property_pushes with explicit FK hints
        const { data: pushApp, error: pushError } = await supabase
          .from('property_pushes')
          .select(`
            *,
            properties!fk_property_pushes_property_id(
              id,
              address,
              owner_id,
              admin_listed,
              profiles!properties_owner_id_fkey(
                id,
                email,
                first_name,
                last_name,
                stripe_customer_id
              )
            ),
            property_units!property_pushes_unit_id_fkey(
              id,
              unit_number,
              monthly_rent,
              security_deposit
            )
          `)
          .eq('id', applicationId)
          .single();

        if (!pushError && pushApp) {
          application = pushApp;
          sourceType = 'push';
          tenantIdField = 'tenant_id';
          logStep('Found application in property_pushes');
        } else {
          logStep('Application not found in any table', { marketplaceError, propertyError, pushError });
          throw new Error(`Application not found in any table: ${applicationId}`);
        }
      }
    }

    // Get tenant ID based on source type
    const tenantId = application[tenantIdField];

    // Fetch tenant profile
    const { data: tenant, error: tenantError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      logStep('Tenant fetch error', tenantError);
      throw new Error(`Tenant not found: ${tenantError?.message}`);
    }

    const landlord = application.properties.profiles;
    const property = application.properties;
    const unit = application.property_units;

    logStep('Fetched details', {
      landlordId: landlord.id,
      tenantId: tenant.id,
      propertyId: property.id,
      unitId: unit.id,
      sourceType,
    });

    // Fetch placement fee configuration
    const { data: feeConfig } = await supabase
      .from('platform_configs')
      .select('config_value')
      .eq('config_key', 'placement_fee_config')
      .single();

    const percentage = feeConfig?.config_value?.percentage || 40;
    const minFee = feeConfig?.config_value?.min_fee;
    const maxFee = feeConfig?.config_value?.max_fee;

    logStep('Placement fee config', { percentage, minFee, maxFee });

    // Calculate placement fee based on percentage
    let placementFeeAmount = (unit.monthly_rent || 0) * (percentage / 100);

    // Apply min/max constraints if configured
    if (minFee && placementFeeAmount < minFee) {
      placementFeeAmount = minFee;
    }
    if (maxFee && placementFeeAmount > maxFee) {
      placementFeeAmount = maxFee;
    }

    logStep('Calculated placement fee', { 
      monthlyRent: unit.monthly_rent, 
      percentage, 
      calculatedFee: placementFeeAmount 
    });

    // Check if placement fee already exists - fetch all to handle duplicates
    const { data: existingFees } = await supabase
      .from('landlord_placement_fees')
      .select('id, stripe_checkout_url, stripe_session_id, payment_status, fee_amount, created_at')
      .eq('property_id', property.id)
      .eq('tenant_id', tenant.id)
      .eq('unit_id', unit.id)
      .order('created_at', { ascending: false });

    // Prioritize: 1) Paid fee, 2) Most recent pending
    const existingFee = existingFees?.find(f => f.payment_status === 'paid') 
      || existingFees?.[0] 
      || null;

    let paymentUrl = '';
    let placementFeeId = '';
    let needsNewCheckout = false;
    
    // Check if we need to regenerate payment link
    const amountMismatch = existingFee && existingFee.fee_amount !== placementFeeAmount;
    const shouldForceNew = forceNew || amountMismatch;

    if (amountMismatch) {
      logStep('Amount mismatch detected', { 
        existingAmount: existingFee.fee_amount, 
        newAmount: placementFeeAmount 
      });
    }

    // Determine what to do with existing fee
    if (existingFee && existingFee.payment_status === 'paid') {
      logStep('Fee already paid, skipping Stripe link generation');
      paymentUrl = existingFee.stripe_checkout_url || '';
      placementFeeId = existingFee.id;
    } else if (shouldForceNew && existingFee) {
      logStep('Force regenerating payment link', { forceNew, amountMismatch });
      
      // Expire old Stripe session if it exists
      if (existingFee.stripe_session_id) {
        try {
          await stripe.checkout.sessions.expire(existingFee.stripe_session_id);
          logStep('Old Stripe session expired', { sessionId: existingFee.stripe_session_id });
        } catch (expireError: any) {
          logStep('Warning: Could not expire old session (may already be expired)', { error: (expireError instanceof Error ? expireError.message : String(expireError)) });
        }
      }
      
      // Mark old link as expired
      await supabase
        .from('landlord_placement_fees')
        .update({ link_status: 'expired' })
        .eq('id', existingFee.id);
      
      placementFeeId = existingFee.id;
      needsNewCheckout = true; // Flag to create new checkout
    } else if (existingFee && existingFee.stripe_checkout_url && !shouldForceNew) {
      logStep('Using existing payment link');
      paymentUrl = existingFee.stripe_checkout_url;
      placementFeeId = existingFee.id;
    } else {
      // No existing fee or no existing checkout URL
      needsNewCheckout = true;
    }

    // Create new checkout session if needed
    if (needsNewCheckout) {
      // Create or get Stripe customer for landlord
      let customerId = landlord.stripe_customer_id;

      if (!customerId) {
        logStep('Creating Stripe customer for landlord');
        const customer = await stripe.customers.create({
          email: landlord.email,
          name: `${landlord.first_name} ${landlord.last_name}`,
          metadata: {
            user_id: landlord.id,
            type: 'landlord',
          },
        });
        customerId = customer.id;

        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', landlord.id);

        logStep('Created Stripe customer', { customerId });
      }

      // Determine the correct FK column for the placement fee based on source type
      const placementFeeInsert: any = {
        property_id: property.id,
        tenant_id: tenant.id,
        unit_id: unit.id,
        landlord_id: landlord.id,
        fee_amount: placementFeeAmount,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        first_month_rent: unit.monthly_rent,
        security_deposit: unit.security_deposit,
        payment_status: 'pending',
        stripe_checkout_created_at: new Date().toISOString(),
      };

      // Set the correct FK based on source type
      if (sourceType === 'marketplace') {
        placementFeeInsert.marketplace_application_id = applicationId;
      } else if (sourceType === 'property') {
        placementFeeInsert.application_id = applicationId;
      } else if (sourceType === 'push') {
        placementFeeInsert.property_push_id = applicationId;
      }

      // Create or update placement fee record
      if (existingFee && placementFeeId) {
        // Update existing fee with new amount if needed
        if (amountMismatch) {
          await supabase
            .from('landlord_placement_fees')
            .update({ 
              fee_amount: placementFeeAmount,
              link_status: 'active'
            })
            .eq('id', placementFeeId);
          logStep('Updated placement fee amount', { placementFeeId, newAmount: placementFeeAmount });
        } else {
          logStep('Using existing placement fee', { placementFeeId });
        }
      } else if (!placementFeeId) {
        logStep('Creating placement fee record', { sourceType });
        const { data: newFee, error: feeError } = await supabase
          .from('landlord_placement_fees')
          .insert(placementFeeInsert)
          .select('id')
          .single();

        if (feeError || !newFee) {
          logStep('Error creating placement fee', feeError);
          throw new Error(`Failed to create placement fee record: ${feeError?.message}`);
        }

        placementFeeId = newFee.id;
        logStep('Placement fee record created', { placementFeeId });
      }

      // Create Stripe checkout session
      logStep('Creating checkout session');
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_intent_data: {
          metadata: {
            payment_type: 'placement_fee',
            type: 'placement_fee',
            placement_fee_id: placementFeeId,
            application_id: applicationId,
            source_type: sourceType,
            property_id: property.id,
            tenant_id: tenant.id,
            landlord_id: landlord.id,
            unit_id: unit.id,
            property_address: property.address,
            tenant_name: `${tenant.first_name} ${tenant.last_name}`,
            admin_listed: property.admin_listed ? 'true' : 'false',
          },
          description: `Placement Fee for ${property.address} - Tenant: ${tenant.first_name} ${tenant.last_name}`,
        },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Placement Fee',
                description: `Property: ${property.address}\nTenant: ${tenant.first_name} ${tenant.last_name}`,
              },
              unit_amount: Math.round(placementFeeAmount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${req.headers.get('origin')}/landlord/payments?payment=success`,
        cancel_url: `${req.headers.get('origin')}/landlord/payments?payment=cancelled`,
        metadata: {
          payment_type: 'placement_fee',
          type: 'placement_fee',
          placement_fee_id: placementFeeId,
          application_id: applicationId,
          source_type: sourceType,
          property_id: property.id,
          tenant_id: tenant.id,
          landlord_id: landlord.id,
        },
      });

      logStep('Checkout session created', { sessionId: session.id, url: session.url });

      // Generate friendly slug
      const generateSlug = (address: string, date: Date): string => {
        const cleanAddress = address
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .substring(0, 50);

        const dateStr = date.toISOString().split('T')[0];
        return `${cleanAddress}-${dateStr}`;
      };

      const slug = generateSlug(property.address, new Date());
      const origin = req.headers.get('origin') || 'https://yourdomain.com';
      const friendlyUrl = `${origin}/pay/${slug}`;

      // Store payment link mapping
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      const { error: linkError } = await supabase
        .from('placement_fee_payment_links')
        .insert({
          slug,
          stripe_checkout_url: session.url,
          placement_fee_id: placementFeeId,
          property_address: property.address,
          payment_date: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (linkError) {
        logStep('Warning: Failed to store payment link', linkError);
      }

      // Update placement fee with checkout URL
      await supabase
        .from('landlord_placement_fees')
        .update({
          stripe_checkout_url: linkError ? session.url : friendlyUrl,
          stripe_session_id: session.id,
          stripe_checkout_created_at: new Date().toISOString(),
          link_status: 'active',
        })
        .eq('id', placementFeeId);

      paymentUrl = linkError ? session.url : friendlyUrl;
      
      // If forceNew, update existing messages with new payment URL and amount
      // Use the correct FK column based on source type
      if (forceNew || amountMismatch) {
        logStep('Updating existing messages with new payment link', { placementFeeId, sourceType });
        
        let messageUpdateQuery = supabase
          .from('messages')
          .update({
            payload: {
              placement_fee_id: placementFeeId,
              application_id: applicationId,
              source_type: sourceType,
              payment_url: paymentUrl,
              fee_amount: placementFeeAmount,
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              property_address: property.address,
              tenant_name: `${tenant.first_name} ${tenant.last_name}`,
            },
            message_text: `🎉 Great news! Your tenant ${tenant.first_name} ${tenant.last_name} has signed the lease for ${property.address}.

The lease is now fully executed. To complete the placement, please pay the placement fee:

📋 Placement Fee: $${placementFeeAmount.toFixed(2)}
📅 Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

💳 Use the "Pay Now" button below to complete your payment.

Once payment is received, the tenant will be officially housed and you can begin your landlord-tenant relationship.

If you have any questions, please don't hesitate to reach out.`
          })
          .eq('extension', 'placement_fee_payment');
        
        // Filter by the correct FK column
        if (sourceType === 'marketplace') {
          messageUpdateQuery = messageUpdateQuery.eq('marketplace_application_id', applicationId);
        } else if (sourceType === 'property') {
          messageUpdateQuery = messageUpdateQuery.eq('property_application_id', applicationId);
        } else if (sourceType === 'push') {
          messageUpdateQuery = messageUpdateQuery.eq('property_push_id', applicationId);
        }
        
        const { error: messageUpdateError } = await messageUpdateQuery;
        
        if (messageUpdateError) {
          logStep('Warning: Failed to update existing messages', messageUpdateError);
        } else {
          logStep('Existing messages updated successfully');
        }
      }
    } // End of needsNewCheckout block

    // Insert notification for landlord
    logStep('Creating notification for landlord');
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: landlord.id,
        title: 'Placement Fee Payment Required',
        description: `${tenant.first_name} ${tenant.last_name} signed the lease for ${property.address}. Placement fee of $${placementFeeAmount.toFixed(2)} is due.`,
        type: 'placement_fee_due',
        category: 'Payment',
        link: '/dashboard?tab=Messages',
        read: false,
      });

    if (notifError) {
      logStep('Warning: Failed to create notification', notifError);
    }

    // Insert message for landlord with payment instructions
    logStep('Creating message for landlord', { sourceType });
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const messageText = `🎉 Great news! Your tenant ${tenant.first_name} ${tenant.last_name} has signed the lease for ${property.address}.

The lease is now fully executed. To complete the placement, please pay the placement fee:

📋 Placement Fee: $${placementFeeAmount.toFixed(2)}
📅 Due Date: ${formattedDueDate}

💳 Use the "Pay Now" button below to complete your payment.

Once payment is received, the tenant will be officially housed and you can begin your landlord-tenant relationship.

If you have any questions, please don't hesitate to reach out.`;

    // Use real admin user as sender (OpenKey Housing system messages)
    // Using Logan Bauer's admin account (lb@openkeyhousing.com)
    const SYSTEM_ADMIN_ID = '926ac02b-ba75-4219-9a54-95ceaf658492';
    
    // Build message insert with correct FK based on source type
    const messageInsert: any = {
      sender_id: SYSTEM_ADMIN_ID,
      message_text: messageText,
      topic: 'Placement Fee Payment Required',
      extension: 'placement_fee_payment',
      payload: {
        placement_fee_id: placementFeeId,
        payment_url: paymentUrl,
        fee_amount: placementFeeAmount,
        due_date: dueDate.toISOString(),
        property_address: property.address,
        tenant_name: `${tenant.first_name} ${tenant.last_name}`,
        source_type: sourceType,
      },
      created_by_tenant: false,
      read_by_tenant: true,
      read_by_landlord: false,
    };

    // Set the correct FK based on source type
    if (sourceType === 'marketplace') {
      messageInsert.marketplace_application_id = applicationId;
    } else if (sourceType === 'property') {
      messageInsert.property_application_id = applicationId;
    } else if (sourceType === 'push') {
      messageInsert.property_push_id = applicationId;
    }

    const { error: messageError } = await supabase
      .from('messages')
      .insert(messageInsert);

    if (messageError) {
      logStep('Warning: Failed to create message', messageError);
    } else {
      logStep('Message created successfully');
    }

    // Send email to landlord with payment link
    let emailSent = false;
    let emailError: string | null = null;
    try {
      if (!landlord.email) {
        throw new Error('Landlord has no email on file');
      }
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!lovableKey || !resendKey) {
        throw new Error('Email gateway not configured');
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="margin: 0 0 16px;">🎉 Lease signed for ${property.address}</h2>
          <p>Hi ${landlord.first_name || 'there'},</p>
          <p>Your tenant <strong>${tenant.first_name} ${tenant.last_name}</strong> has signed the lease for <strong>${property.address}</strong>.</p>
          <p>To complete the placement, please pay the placement fee:</p>
          <div style="background:#f5f5f7; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <div><strong>Placement fee:</strong> $${placementFeeAmount.toFixed(2)}</div>
            <div><strong>Due date:</strong> ${formattedDueDate}</div>
          </div>
          <p style="text-align:center; margin: 24px 0;">
            <a href="${paymentUrl}" style="background:#0070f3; color:#fff; text-decoration:none; padding: 12px 24px; border-radius: 6px; display:inline-block; font-weight:600;">
              Pay placement fee
            </a>
          </p>
          <p style="font-size:12px; color:#666; word-break: break-all;">
            Or copy this link: ${paymentUrl}
          </p>
          <p style="font-size:12px; color:#666; margin-top: 24px;">— OpenKey Housing</p>
        </div>
      `;

      const emailResp = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': resendKey,
        },
        body: JSON.stringify({
          from: 'OpenKey <onboarding@resend.dev>',
          to: [landlord.email],
          subject: `Payment link for ${property.address}`,
          html,
        }),
      });

      if (!emailResp.ok) {
        const errText = await emailResp.text();
        throw new Error(`Email API ${emailResp.status}: ${errText}`);
      }
      emailSent = true;
      logStep('Email sent to landlord', { to: landlord.email });
    } catch (e: any) {
      emailError = e?.message || String(e);
      logStep('Warning: Failed to send email to landlord', { error: emailError });
    }

    return new Response(
      JSON.stringify({
        success: true,
        placementFeeId,
        paymentUrl,
        sourceType,
        emailSent,
        emailError,
        message: emailSent
          ? 'Landlord notified (in-app + email)'
          : 'Landlord notified (in-app only — email failed)',
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
