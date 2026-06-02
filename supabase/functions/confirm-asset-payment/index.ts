import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-ASSET-PAYMENT] ${step}${detailsStr}`);
};

async function sendPaymentReceipt(transaction: any, asset: any, session: any) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  
  if (!transaction || !asset || !session) {
    logStep('Missing data for receipt email', { transaction: !!transaction, asset: !!asset, session: !!session });
    return;
  }

  // Format currency amount
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: transaction.currency_code || 'USD'
  });
  const formattedAmount = formatter.format(transaction.amount);

  // Get payer email from session
  const payerEmail = session.customer_details?.email;
  if (!payerEmail) {
    logStep('No payer email found in session');
    return;
  }

  // Send receipt to payer
  try {
    const emailSubject = `Payment Receipt - ${asset.asset_name}`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Receipt</h2>
          <p>Thank you for your payment!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">Payment Details</h3>
            <p><strong>Property:</strong> ${asset.asset_name}</p>
            <p><strong>Amount:</strong> ${formattedAmount}</p>
            <p><strong>Date:</strong> ${new Date(transaction.payment_date).toLocaleDateString()}</p>
            <p><strong>Transaction ID:</strong> ${transaction.id}</p>
            <p><strong>Payment Method:</strong> ${session.payment_method_types?.[0] || 'Card'}</p>
          </div>
          
          <p>This receipt confirms your successful payment. Keep this for your records.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">
            This is an automated receipt from RentFlow.
          </p>
        </div>
      `;
    
    const receiptEmail = await resend.emails.send({
      from: 'RentFlow <receipts@resend.dev>',
      to: [payerEmail],
      subject: emailSubject,
      html: emailHtml,
    });
    logStep('Receipt email sent to payer', payerEmail);

    // Record in email queue
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('email_queue').insert({
      to_email: payerEmail,
      subject: emailSubject,
      body: emailHtml,
      status: 'sent',
      sent_at: new Date().toISOString(),
      email_type: 'transactional',
      audience: 'all',
      template_slug: 'payment_confirmation',
      category: 'financial',
      metadata: {
        transaction_id: transaction.id,
        asset_id: asset.id,
        amount: transaction.amount,
        currency: transaction.currency_code,
        resend_email_id: receiptEmail.data?.id,
      },
    });
  } catch (error) {
    logStep('Failed to send receipt email to payer', error);
  }

  // Send notification to portfolio managers
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get portfolio managers
    const { data: managers } = await supabase
      .from('portfolio_roles')
      .select(`
        profiles:user_id(email, first_name, last_name)
      `)
      .eq('portfolio_id', asset.portfolio_id)
      .in('role_name', ['admin_partner', 'editor'])
      .eq('is_active', true);

    if (managers && managers.length > 0) {
      const managerEmails = managers
        .map(m => m.profiles?.email)
        .filter(Boolean);

      if (managerEmails.length > 0) {
        const managerSubject = `Payment Received - ${asset.asset_name}`;
        const managerHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment Received</h2>
              <p>A payment has been received for one of your properties.</p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <h3 style="margin: 0 0 10px 0; color: #15803d;">Payment Details</h3>
                <p><strong>Property:</strong> ${asset.asset_name}</p>
                <p><strong>Amount:</strong> ${formattedAmount}</p>
                <p><strong>Date:</strong> ${new Date(transaction.payment_date).toLocaleDateString()}</p>
                <p><strong>Payer:</strong> ${payerEmail}</p>
              </div>
              
              <p>View more details in your <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'app')}/landlord/payments">payment dashboard</a>.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px;">
                This is an automated notification from RentFlow.
              </p>
            </div>
          `;
        
        const managerEmail = await resend.emails.send({
          from: 'RentFlow <notifications@resend.dev>',
          to: managerEmails,
          subject: managerSubject,
          html: managerHtml,
        });
        logStep('Payment notification sent to managers', managerEmails);

        // Record each manager email in queue
        for (const email of managerEmails) {
          await supabase.from('email_queue').insert({
            to_email: email,
            subject: managerSubject,
            body: managerHtml,
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_type: 'notification',
            audience: 'all',
            template_slug: 'payment_notification',
            category: 'financial',
            metadata: {
              transaction_id: transaction.id,
              asset_id: asset.id,
              portfolio_id: asset.portfolio_id,
              amount: transaction.amount,
              currency: transaction.currency_code,
              payer_email: payerEmail,
              resend_email_id: managerEmail.data?.id,
            },
          });
        }
      }
    }
  } catch (error) {
    logStep('Failed to send manager notification', error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { session_id } = await req.json();
    logStep("Request data", { session_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the Checkout Session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent 
    });

    if (session.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Find the transaction
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('asset_payment_transactions')
      .select('*')
      .eq('stripe_session_id', session_id)
      .eq('payer_user_id', user.id)
      .single();

    if (transactionError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Check if already processed
    if (transaction.status === 'completed') {
      logStep("Transaction already completed", { transactionId: transaction.id });

      // Get asset info for completed transactions
      const { data: asset } = await supabaseClient
        .from('portfolio_assets')
        .select('asset_name, portfolio_id')
        .eq('id', transaction.asset_id)
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment already processed",
        transaction_id: transaction.id,
        transaction,
        asset
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get asset info before updating transaction
    const { data: asset, error: assetError } = await supabaseClient
      .from('portfolio_assets')
      .select('asset_name, portfolio_id')
      .eq('id', transaction.asset_id)
      .single();

    if (assetError || !asset) {
      throw new Error("Asset not found");
    }

    // Update transaction as completed
    const { data: updatedTransaction, error: updateError } = await supabaseClient
      .from('asset_payment_transactions')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)
      .select()
      .single();

    if (updateError) {
      logStep("Error updating transaction", updateError);
      throw new Error(`Failed to update transaction: ${updateError.message}`);
    }

    logStep("Transaction updated as completed", { transactionId: transaction.id });

    // Send receipt emails
    try {
      await sendPaymentReceipt(updatedTransaction, asset, session);
    } catch (emailError) {
      logStep('Failed to send receipt emails, but payment was successful', emailError);
      // Don't fail the payment confirmation if email fails
    }

    // Optional: Send notification to property manager
    try {
      const { data: assetData } = await supabaseClient
        .from('portfolio_assets')
        .select(`
          asset_name,
          portfolios(manager_id)
        `)
        .eq('id', transaction.asset_id)
        .single();

      if (assetData?.portfolios?.manager_id) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: assetData.portfolios.manager_id,
            title: 'Rent Payment Received',
            description: `Payment of ${transaction.currency_code} ${transaction.amount} received for ${assetData.asset_name}`,
            type: 'success',
            link: `/dashboard?tab=transactions`,
            category: 'payment'
          });
      }
    } catch (notificationError) {
      logStep("Failed to send notification", notificationError);
      // Don't fail the main flow for notification errors
    }

    return new Response(JSON.stringify({ 
      success: true,
      transaction_id: updatedTransaction.id,
      amount: updatedTransaction.amount,
      currency_code: updatedTransaction.currency_code,
      transaction: updatedTransaction,
      asset
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});