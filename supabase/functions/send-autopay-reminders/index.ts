import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, data?: any) => {
  console.log(`[send-autopay-reminders] ${step}:`, data || '');
};

interface AutopaySchedule {
  id: string;
  tenant_id: string;
  asset_id: string;
  autopay_day: number;
  amount: number;
  currency_code: string;
  next_payment_date: string;
  status: string;
  failure_count: number;
  asset: {
    asset_name: string;
    portfolio_id: string;
  };
  tenant: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting autopay reminder processing');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    logStep('Processing reminders for date', today);

    // Find schedules where next_payment_date is today and status is active
    const { data: schedules, error: schedulesError } = await supabase
      .from('asset_autopay_schedules')
      .select(`
        *,
        asset:portfolio_assets(asset_name, portfolio_id),
        tenant:profiles(email, first_name, last_name)
      `)
      .eq('next_payment_date', today)
      .eq('status', 'active');

    if (schedulesError) {
      logStep('Error fetching schedules', schedulesError);
      throw schedulesError;
    }

    logStep('Found schedules to process', schedules?.length || 0);

    let emailsSent = 0;
    let emailsSkipped = 0;

    for (const schedule of (schedules as AutopaySchedule[]) || []) {
      try {
        logStep('Processing schedule', { id: schedule.id, tenant: schedule.tenant?.email });

        if (!schedule.tenant?.email) {
          logStep('Skipping - no tenant email', schedule.id);
          emailsSkipped++;
          continue;
        }

    const supportEmail = Deno.env.get("SUPPORT_EMAIL") || "support@openkeyhousing.com";

    // Create one-click payment link
    const paymentUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'app')}/pay-rent?asset_id=${schedule.asset_id}&amount=${schedule.amount}&currency=${schedule.currency_code}`;

    // Format currency amount
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: schedule.currency_code || 'USD'
        });
        const formattedAmount = formatter.format(schedule.amount);

        // Send reminder email
        const emailResponse = await resend.emails.send({
          from: `OpenKey Housing <${supportEmail}>`,
          to: [schedule.tenant.email],
          subject: `Rent Payment Reminder - ${schedule.asset?.asset_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Rent Payment Reminder</h2>
              <p>Hello ${schedule.tenant.first_name || 'there'},</p>
              
              <p>This is a friendly reminder that your rent payment is due today for:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">${schedule.asset?.asset_name}</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #2563eb;">Amount Due: ${formattedAmount}</p>
                <p style="margin: 10px 0 0 0; color: #6b7280;">Due Date: ${today}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentUrl}" 
                   style="background: #2563eb; color: white; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  Pay Now
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                If you have already paid, please disregard this message. If you have any questions, please contact your property manager.
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px;">
                This is an automated reminder from RentFlow. 
              </p>
            </div>
          `,
        });

        if (emailResponse.error) {
          logStep('Email send error', { scheduleId: schedule.id, error: emailResponse.error });
          
          // Update failure count
          await supabase
            .from('asset_autopay_schedules')
            .update({ 
              failure_count: schedule.failure_count + 1,
              last_failure_reason: emailResponse.error.message
            })
            .eq('id', schedule.id);
          
          emailsSkipped++;
        } else {
          logStep('Email sent successfully', { scheduleId: schedule.id, messageId: emailResponse.data?.id });
          
          // Calculate next payment date (next month, same day)
          const nextDate = new Date(schedule.next_payment_date);
          nextDate.setMonth(nextDate.getMonth() + 1);
          const nextPaymentDate = nextDate.toISOString().split('T')[0];

          // Update schedule with next payment date
          await supabase
            .from('asset_autopay_schedules')
            .update({ 
              next_payment_date: nextPaymentDate,
              failure_count: 0,
              last_failure_reason: null
            })
            .eq('id', schedule.id);
          
          emailsSent++;
        }

      } catch (scheduleError) {
        logStep('Error processing schedule', { scheduleId: schedule.id, error: scheduleError });
        
        // Update failure count for this schedule
        await supabase
          .from('asset_autopay_schedules')
          .update({ 
            failure_count: schedule.failure_count + 1,
            last_failure_reason: (scheduleError instanceof Error ? scheduleError.message : String(scheduleError))
          })
          .eq('id', schedule.id);
        
        emailsSkipped++;
      }
    }

    logStep('Autopay reminder processing completed', { 
      totalSchedules: schedules?.length || 0,
      emailsSent, 
      emailsSkipped 
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalSchedules: schedules?.length || 0,
        emailsSent,
        emailsSkipped,
        date: today
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep('Fatal error in autopay reminders', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Autopay reminder processing failed',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});