import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// HMAC-SHA256 helper using Web Crypto API (Deno-compatible)
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

interface CheckbookWebhookEvent {
  type: string
  id?: string
  data: {
    id: string
    status?: string
    amount?: number
    currency?: string
    recipient?: any
    [key: string]: any
  }
}

// Map Checkbook event types → internal payout status
// Reference: https://checkbook.io/docs/webhooks
const STATUS_MAP: Record<string, { payouts: string; items: string; finalize?: 'sent' | 'delivered' | 'failed' }> = {
  'payment.in_process': { payouts: 'processing', items: 'processing' },
  'payment.paid':       { payouts: 'delivered',  items: 'sent', finalize: 'delivered' },
  'payment.printed':    { payouts: 'sent',       items: 'sent', finalize: 'sent' },
  'payment.mailed':     { payouts: 'sent',       items: 'sent', finalize: 'sent' },
  'payment.failed':     { payouts: 'failed',     items: 'failed', finalize: 'failed' },
  'payment.void':       { payouts: 'failed',     items: 'failed', finalize: 'failed' },
  'payment.refunded':   { payouts: 'failed',     items: 'failed', finalize: 'failed' },
  // Legacy event names (kept for backward compatibility)
  'check.created':      { payouts: 'processing', items: 'processing' },
  'check.sent':         { payouts: 'sent',       items: 'sent', finalize: 'sent' },
  'check.delivered':    { payouts: 'delivered',  items: 'sent', finalize: 'delivered' },
  'check.canceled':     { payouts: 'failed',     items: 'failed', finalize: 'failed' },
  'digital_check.created':   { payouts: 'processing', items: 'processing' },
  'digital_check.sent':      { payouts: 'sent',       items: 'sent', finalize: 'sent' },
  'digital_check.delivered': { payouts: 'delivered',  items: 'sent', finalize: 'delivered' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.text()
    const signature = req.headers.get('x-checkbook-signature')
    const webhookSecret = Deno.env.get('CHECKBOOK_WEBHOOK_SECRET')

    // Verify HMAC signature when secret configured (mandatory in production)
    if (webhookSecret) {
      if (!signature) {
        console.error('Missing x-checkbook-signature header')
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const expected = await hmacSha256Hex(webhookSecret, body)
      const provided = signature.replace(/^sha256=/, '')
      const ok = timingSafeEqualStr(expected, provided)
      if (!ok) {
        console.error('Invalid webhook signature')
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const event: CheckbookWebhookEvent = JSON.parse(body)
    const checkbookId = event.data?.id
    if (!checkbookId) {
      return new Response(JSON.stringify({ error: 'Missing data.id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Replay protection — skip if we've already logged this exact event
    const { data: dup } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('entity_type', 'checkbook_webhook')
      .eq('entity_id', checkbookId)
      .eq('action', event.type)
      .maybeSingle()

    if (dup) {
      console.log(`Duplicate webhook ${event.type} for ${checkbookId}, skipping`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Checkbook webhook: ${event.type} for ${checkbookId}`)

    const mapping = STATUS_MAP[event.type]
    if (!mapping) {
      console.log(`Unhandled event type: ${event.type}`)
      // Still log it for visibility
      await supabase.from('activity_logs').insert({
        user_id: null,
        entity_type: 'checkbook_webhook',
        entity_id: checkbookId,
        action: event.type,
        new_values: event.data,
        notes: `Checkbook webhook (unhandled): ${event.type}`,
      })
      return new Response(JSON.stringify({ received: true, unhandled: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1) Update the canonical payouts row (matched by checkbook_payout_id)
    const payoutPatch: Record<string, unknown> = {
      status: mapping.payouts,
      updated_at: new Date().toISOString(),
    }
    if (mapping.finalize === 'sent') payoutPatch.sent_at = new Date().toISOString()
    if (mapping.finalize === 'delivered') payoutPatch.delivered_at = new Date().toISOString()
    if (mapping.finalize === 'failed') {
      payoutPatch.failure_reason =
        event.data?.failure_reason ?? event.data?.error ?? `Checkbook reported ${event.type}`
    }

    const { data: updatedPayouts, error: payoutErr } = await supabase
      .from('payouts')
      .update(payoutPatch)
      .eq('checkbook_payout_id', checkbookId)
      .select('id')

    if (payoutErr) {
      console.error('Failed to update payouts:', payoutErr)
    }

    // 2) Cascade to bulk_payout_items via payouts.id → items.payout_id
    if (updatedPayouts && updatedPayouts.length > 0) {
      const payoutIds = updatedPayouts.map((p) => p.id)
      const itemPatch: Record<string, unknown> = {
        status: mapping.items,
        updated_at: new Date().toISOString(),
      }
      if (mapping.finalize === 'sent' || mapping.finalize === 'delivered') {
        itemPatch.sent_at = new Date().toISOString()
      }
      if (mapping.finalize === 'failed') {
        itemPatch.error_message =
          event.data?.failure_reason ?? event.data?.error ?? `Checkbook reported ${event.type}`
        itemPatch.failure_category = 'permanent' // Checkbook-side failure = no auto-retry
        itemPatch.next_retry_at = null
      }

      const { error: itemErr } = await supabase
        .from('bulk_payout_items')
        .update(itemPatch)
        .in('payout_id', payoutIds)

      if (itemErr) console.error('Failed to update bulk_payout_items:', itemErr)
    }

    // 3) Audit log entry (also serves as replay protection sentinel)
    await supabase.from('activity_logs').insert({
      user_id: null,
      entity_type: 'checkbook_webhook',
      entity_id: checkbookId,
      action: event.type,
      new_values: event.data,
      notes: `Checkbook webhook: ${event.type} → payouts:${mapping.payouts}, items:${mapping.items}`,
    })

    return new Response(JSON.stringify({ received: true, processed: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Webhook error:', error?.message ?? error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
