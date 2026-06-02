
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderCandidate {
  id: string;
  user_id: string;
  asset_id: string;
  asset_name: string;
  frequency: 'quarterly' | 'semi-annual' | 'annual';
  last_financial_update?: string;
  next_reminder_date?: string;
  email_enabled?: boolean;
  delivery_channel?: 'in_app' | 'email' | 'both';
  digest_interval?: 'immediate' | 'daily' | 'weekly';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const isDryRun = body.dryRun === true
    const targetReminderId = body.testReminderId // For single-reminder testing
    
    console.log('🔄 Processing asset reminders...', { isDryRun, targetReminderId, triggeredAt: body.triggeredAt })

    let query = supabase
      .from('asset_reminder_preferences')
      .select(`
        id,
        user_id,
        asset_id,
        frequency,
        last_financial_update,
        next_reminder_date,
        email_enabled,
        delivery_channel,
        digest_interval,
        portfolio_assets!inner(asset_name)
      `)
      .eq('is_enabled', true)
      .is('mute_until', null)

    // If targeting a specific reminder (for testing), focus on that one
    if (targetReminderId) {
      query = query.eq('id', targetReminderId)
    } else {
      // For regular processing, only get reminders that are due
      query = query.lte('next_reminder_date', new Date().toISOString().split('T')[0])
    }

    const { data: candidates, error: candidatesError } = await query

    if (candidatesError) {
      console.error('❌ Error fetching reminder candidates:', candidatesError)
      throw candidatesError
    }

    if (!candidates?.length) {
      console.log('✅ No reminder candidates found')
      return new Response(JSON.stringify({ 
        message: targetReminderId ? 'No matching reminder found' : 'No reminders due at this time',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found ${candidates.length} reminder candidates`)

    // Separate immediate and digest reminders
    const immediateReminders: ReminderCandidate[] = []
    const digestReminders: ReminderCandidate[] = []

    candidates.forEach(candidate => {
      const reminderWithAsset: ReminderCandidate = {
        ...candidate,
        asset_name: (candidate as any).portfolio_assets?.asset_name || 'Unknown Asset'
      }

      // Check if this should be sent immediately or as part of a digest
      const isEmailEnabled = candidate.email_enabled && 
        (candidate.delivery_channel === 'email' || candidate.delivery_channel === 'both')
      
      if (isEmailEnabled && (candidate.digest_interval === 'daily' || candidate.digest_interval === 'weekly')) {
        digestReminders.push(reminderWithAsset)
      } else {
        immediateReminders.push(reminderWithAsset)
      }
    })

    console.log(`📧 ${immediateReminders.length} immediate reminders, ${digestReminders.length} digest reminders`)

    const processedReminders: Array<{ id: string, success: boolean, error?: string }> = []

    // Process immediate reminders (in-app notifications and immediate emails)
    for (const reminder of immediateReminders) {
      try {
        console.log(`📝 Processing immediate reminder for asset: ${reminder.asset_name}`)

        // Get user profile for personalization
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', reminder.user_id)
          .single()

        const userName = userProfile?.first_name ? 
          `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 'Investor'

        if (!isDryRun) {
          // Create in-app notification
          await supabase
            .from('notifications')
            .insert({
              user_id: reminder.user_id,
              title: 'Financial Update Reminder',
              description: `Time to update financial information for ${reminder.asset_name}`,
              type: 'info',
              link: `/portfolio/${reminder.asset_id}`,
              category: 'financial_reminder'
            })

          // Create email if enabled for immediate delivery
          const shouldSendEmail = reminder.email_enabled && 
            (reminder.delivery_channel === 'email' || reminder.delivery_channel === 'both') &&
            (!reminder.digest_interval || reminder.digest_interval === 'immediate')

          if (shouldSendEmail) {
            // Get user email
            const { data: { user } } = await supabase.auth.admin.getUserById(reminder.user_id)
            
            if (user?.email) {
              await supabase
                .from('email_queue')
                .insert({
                  user_id: reminder.user_id,
                  subject: `Financial Update Reminder: ${reminder.asset_name}`,
                  body: `Hello ${userName},\n\nThis is a reminder to update the financial information for your asset: ${reminder.asset_name}.\n\nPlease review and update your records as needed.\n\nBest regards,\nYour Investment Team`,
                  link: `/portfolio/${reminder.asset_id}`,
                  status: 'pending'
                })

              // Log the email
              await supabase
                .from('reminder_email_logs')
                .insert({
                  reminder_id: reminder.id,
                  sent_at: new Date().toISOString(),
                  status: 'sent',
                  provider_message_id: null
                })
            }
          }

          // Update reminder tracking
          const nextReminderDate = calculateNextReminderDate(reminder.frequency)
          await supabase
            .from('asset_reminder_preferences')
            .update({
              reminder_count: supabase.rpc('increment_reminder_count', { reminder_id: reminder.id }),
              last_email_sent_at: shouldSendEmail ? new Date().toISOString() : undefined,
              next_reminder_date: nextReminderDate,
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id)
        }

        processedReminders.push({ id: reminder.id, success: true })
        
      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error)
        processedReminders.push({ 
          id: reminder.id, 
          success: false, 
          error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error' 
        })
      }
    }

    // For digest reminders, just update their tracking but don't send emails
    // (emails will be sent by the digest processor)
    for (const reminder of digestReminders) {
      try {
        console.log(`📋 Updating digest reminder tracking for: ${reminder.asset_name}`)

        if (!isDryRun) {
          // Create in-app notification
          await supabase
            .from('notifications')
            .insert({
              user_id: reminder.user_id,
              title: 'Financial Update Reminder',
              description: `Time to update financial information for ${reminder.asset_name}`,
              type: 'info',
              link: `/portfolio/${reminder.asset_id}`,
              category: 'financial_reminder'
            })

          // Update tracking (but don't send email - that's handled by digest processor)
          const nextReminderDate = calculateNextReminderDate(reminder.frequency)
          await supabase
            .from('asset_reminder_preferences')
            .update({
              reminder_count: supabase.rpc('increment_reminder_count', { reminder_id: reminder.id }),
              next_reminder_date: nextReminderDate,
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id)
        }

        processedReminders.push({ id: reminder.id, success: true })
        
      } catch (error) {
        console.error(`❌ Error processing digest reminder ${reminder.id}:`, error)
        processedReminders.push({ 
          id: reminder.id, 
          success: false, 
          error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error' 
        })
      }
    }

    const successfulReminders = processedReminders.filter(r => r.success).length
    console.log(`✅ Processing complete: ${successfulReminders}/${processedReminders.length} successful`)

    return new Response(JSON.stringify({
      message: isDryRun ? 'Dry run completed successfully' : 'Reminder processing completed',
      processed: successfulReminders,
      total: processedReminders.length,
      immediateReminders: immediateReminders.length,
      digestReminders: digestReminders.length,
      results: processedReminders
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Reminder processing error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error',
      processed: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculateNextReminderDate(frequency: 'quarterly' | 'semi-annual' | 'annual'): string {
  const now = new Date()
  switch (frequency) {
    case 'quarterly':
      now.setMonth(now.getMonth() + 3)
      break
    case 'semi-annual':
      now.setMonth(now.getMonth() + 6)
      break
    case 'annual':
      now.setFullYear(now.getFullYear() + 1)
      break
  }
  return now.toISOString().split('T')[0]
}
