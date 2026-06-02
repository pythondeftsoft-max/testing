
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DigestCandidate {
  id: string;
  user_id: string;
  asset_id: string;
  asset_name: string;
  digest_interval: 'daily' | 'weekly';
  preferred_send_hour: number;
  timezone: string;
  digest_day_of_week?: number;
  last_email_sent_at?: string;
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
    
    console.log('🔄 Processing digest reminders...', { isDryRun, triggeredAt: body.triggeredAt })

    // Get current UTC time and hour
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentDayOfWeek = now.getUTCDay() // 0 = Sunday
    
    console.log(`📅 Current UTC time: ${now.toISOString()}, hour: ${currentHour}, day: ${currentDayOfWeek}`)

    // Find candidates ready for digest emails
    const { data: digestCandidates, error: candidatesError } = await supabase
      .from('asset_reminder_preferences')
      .select(`
        id,
        user_id,
        asset_id,
        digest_interval,
        preferred_send_hour,
        timezone,
        digest_day_of_week,
        last_email_sent_at,
        portfolio_assets!inner(asset_name)
      `)
      .eq('email_enabled', true)
      .in('delivery_channel', ['email', 'both'])
      .in('digest_interval', ['daily', 'weekly'])
      .is('mute_until', null)

    if (candidatesError) {
      console.error('❌ Error fetching digest candidates:', candidatesError)
      throw candidatesError
    }

    if (!digestCandidates?.length) {
      console.log('✅ No digest candidates found')
      return new Response(JSON.stringify({ 
        message: 'No digest candidates found',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found ${digestCandidates.length} digest candidates`)

    // Filter candidates based on timezone and schedule
    const readyCandidates: DigestCandidate[] = []

    for (const candidate of digestCandidates) {
      const userTimezone = candidate.timezone || 'UTC'
      const preferredHour = candidate.preferred_send_hour || 9
      
      try {
        // Convert current UTC time to user's timezone
        const userTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }))
        const userHour = userTime.getHours()
        const userDayOfWeek = userTime.getDay()

        // Check if it's the right hour for this user
        if (userHour !== preferredHour) {
          continue
        }

        // For weekly digests, check if it's the right day
        if (candidate.digest_interval === 'weekly') {
          const targetDay = candidate.digest_day_of_week ?? 1 // Default to Monday
          if (userDayOfWeek !== targetDay) {
            continue
          }
        }

        // Check if we haven't sent recently (avoid double sends)
        if (candidate.last_email_sent_at) {
          const lastSent = new Date(candidate.last_email_sent_at)
          const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
          
          // For daily: must be at least 20 hours ago
          // For weekly: must be at least 6 days ago
          const minHours = candidate.digest_interval === 'daily' ? 20 : 144 // 6 days
          if (hoursSinceLastSent < minHours) {
            console.log(`⏭️ Skipping ${candidate.asset_id}: last sent ${hoursSinceLastSent.toFixed(1)}hrs ago`)
            continue
          }
        }

        readyCandidates.push({
          ...candidate,
          asset_name: (candidate as any).portfolio_assets?.asset_name || 'Unknown Asset'
        })

      } catch (timezoneError) {
        console.warn(`⚠️ Timezone error for user ${candidate.user_id}:`, timezoneError)
        // Continue processing other candidates
      }
    }

    console.log(`🎯 ${readyCandidates.length} candidates ready for digest emails`)

    if (readyCandidates.length === 0) {
      return new Response(JSON.stringify({
        message: 'No candidates ready for digest emails at this time',
        processed: 0,
        totalCandidates: digestCandidates.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Group candidates by user for digest creation
    const userDigests = new Map<string, DigestCandidate[]>()
    readyCandidates.forEach(candidate => {
      const userId = candidate.user_id
      if (!userDigests.has(userId)) {
        userDigests.set(userId, [])
      }
      userDigests.get(userId)!.push(candidate)
    })

    console.log(`👥 Processing digests for ${userDigests.size} users`)

    const processedDigests: Array<{ userId: string, assetCount: number, success: boolean, error?: string }> = []
    const batchId = crypto.randomUUID()

    // Process each user's digest
    for (const [userId, userCandidates] of userDigests) {
      try {
        // Get user profile for email
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error(`❌ Error fetching user profile for ${userId}:`, profileError)
          processedDigests.push({ userId, assetCount: userCandidates.length, success: false, error: 'Profile not found' })
          continue
        }

        // Get user email from auth
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
        
        if (userError || !user?.email) {
          console.error(`❌ Error fetching user email for ${userId}:`, userError)
          processedDigests.push({ userId, assetCount: userCandidates.length, success: false, error: 'Email not found' })
          continue
        }

        const userName = userProfile.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 'Investor'
        const isWeekly = userCandidates[0].digest_interval === 'weekly'
        
        console.log(`📧 Creating ${isWeekly ? 'weekly' : 'daily'} digest for ${userName} (${user.email}) with ${userCandidates.length} assets`)

        if (!isDryRun) {
          // Create digest email entry
          const { error: emailError } = await supabase
            .from('email_queue')
            .insert({
              user_id: userId,
              subject: `${isWeekly ? 'Weekly' : 'Daily'} Asset Financial Update Digest`,
              body: `Hello ${userName},\n\nHere's your ${isWeekly ? 'weekly' : 'daily'} digest for ${userCandidates.length} asset(s):\n\n${userCandidates.map(c => `• ${c.asset_name}`).join('\n')}\n\nPlease review and update your financial information as needed.\n\nBest regards,\nYour Investment Team`,
              link: '/portfolio',
              status: 'pending'
            })

          if (emailError) {
            console.error(`❌ Error creating email for ${userId}:`, emailError)
            processedDigests.push({ userId, assetCount: userCandidates.length, success: false, error: emailError.message })
            continue
          }

          // Log each reminder in the batch
          for (const candidate of userCandidates) {
            await supabase
              .from('reminder_email_logs')
              .insert({
                reminder_id: candidate.id,
                batch_id: batchId,
                sent_at: now.toISOString(),
                status: 'sent',
                provider_message_id: null
              })

            // Update last email sent timestamp
            await supabase
              .from('asset_reminder_preferences')
              .update({ 
                last_email_sent_at: now.toISOString(),
                updated_at: now.toISOString()
              })
              .eq('id', candidate.id)
          }
        }

        processedDigests.push({ userId, assetCount: userCandidates.length, success: true })
        
      } catch (userError) {
        console.error(`❌ Error processing digest for user ${userId}:`, userError)
        processedDigests.push({ 
          userId, 
          assetCount: userCandidates.length, 
          success: false, 
          error: userError instanceof Error ? (userError instanceof Error ? userError.message : String(userError)) : 'Unknown error' 
        })
      }
    }

    const successfulDigests = processedDigests.filter(d => d.success).length
    const totalAssets = processedDigests.reduce((sum, d) => sum + d.assetCount, 0)

    console.log(`✅ Digest processing complete: ${successfulDigests}/${processedDigests.length} users, ${totalAssets} total assets`)

    return new Response(JSON.stringify({
      message: isDryRun ? 'Dry run completed successfully' : 'Digest processing completed',
      processed: successfulDigests,
      totalUsers: processedDigests.length,
      totalAssets,
      batchId: isDryRun ? null : batchId,
      results: processedDigests
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Digest processing error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error',
      processed: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
