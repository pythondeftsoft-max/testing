/**
 * Shared helper: Send SMS notification to the platform owner's phone via Quo (formerly OpenPhone).
 * Bypasses sms_conversations / CRM — this is a one-way internal alert.
 */

/** Sanitise a phone number to E.164 (+1XXXXXXXXXX) */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

export interface OwnerNotification {
  subject: string;
  body: string;
}

/** Send a single SMS via Quo API. Returns the message ID on success. */
async function sendQuoSms(
  quoApiKey: string,
  fromNumber: string,
  recipient: string,
  content: string,
): Promise<string | null> {
  try {
    console.log(`[notifyOwner] Sending SMS to ${recipient.slice(0, 6)}***`);
    const res = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": quoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content.substring(0, 1600),
        from: fromNumber,
        to: [recipient],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[notifyOwner] Quo API error for ${recipient.slice(0, 6)}***:`, res.status, err);
      return null;
    }

    const data = await res.json();
    const msgId = data?.data?.id || data?.id || "ok";
    console.log(`[notifyOwner] SMS sent to ${recipient.slice(0, 6)}*** — msgId: ${msgId}`);
    return msgId;
  } catch (err) {
    console.error(`[notifyOwner] Failed to send SMS to ${recipient.slice(0, 6)}***:`, err);
    return null;
  }
}

/** Send with one retry on transient failure (5s backoff). */
async function sendQuoSmsWithRetry(
  quoApiKey: string,
  fromNumber: string,
  recipient: string,
  content: string,
): Promise<string | null> {
  const result = await sendQuoSms(quoApiKey, fromNumber, recipient, content);
  if (result) return result;

  console.log(`[notifyOwner] Retrying SMS to ${recipient.slice(0, 6)}*** after 5s...`);
  await delay(5000);
  return await sendQuoSms(quoApiKey, fromNumber, recipient, content);
}

/** Get the list of owner recipients and Quo credentials. Returns null if not configured. */
function getOwnerConfig() {
  const ownerPhone = Deno.env.get("OWNER_PHONE_NUMBER");
  if (!ownerPhone) {
    console.warn("[notifyOwner] OWNER_PHONE_NUMBER not set — skipping SMS");
    return null;
  }

  const quoApiKey = Deno.env.get("QUO_API_KEY");
  const quoFromNumber = Deno.env.get("QUO_FROM_NUMBER");

  if (!quoApiKey || !quoFromNumber) {
    console.warn("[notifyOwner] Quo credentials missing (QUO_API_KEY / QUO_FROM_NUMBER) — skipping SMS");
    return null;
  }

  const recipients = [{ phone: toE164(ownerPhone), label: "primary" }];
  const secondPhone = Deno.env.get("OWNER_PHONE_NUMBER_2");
  if (secondPhone) recipients.push({ phone: toE164(secondPhone), label: "secondary" });

  // Log masked recipients so we can verify correct numbers without exposing full PII
  for (const r of recipients) {
    const last4 = r.phone.slice(-4);
    console.log(`[notifyOwner] Configured ${r.label} recipient: ***${last4}`);
  }

  return { quoApiKey, fromNumber: toE164(quoFromNumber), recipients };
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Send a single notification to all owner phones (backward-compatible).
 * Messages are sent sequentially with a 2s gap between recipients.
 */
export async function notifyOwner({ subject, body }: OwnerNotification): Promise<void> {
  const config = getOwnerConfig();
  if (!config) return;

  const smsBody = `🔑 ${subject}\n\n${body}`;

  for (let i = 0; i < config.recipients.length; i++) {
    const r = config.recipients[i];
    await sendQuoSmsWithRetry(config.quoApiKey, config.fromNumber, r.phone, smsBody);
    if (i < config.recipients.length - 1) {
      await delay(2000);
    }
  }
}

/**
 * Send a batch of notifications with staggered per-recipient delivery.
 *
 * Flow:
 *   1. Log a manifest of all messages to be sent
 *   2. Send ALL messages to recipient 1 with 3s gaps
 *   3. Wait 30 seconds
 *   4. Send ALL messages to recipient 2 with 3s gaps (personalized slightly)
 *
 * This defeats carrier duplicate-content filters by:
 *   - Spacing messages out over time
 *   - Adding a unique recipient tag + timestamp to make each body distinct
 */
export async function notifyOwnerBatch(messages: OwnerNotification[]): Promise<void> {
  const config = getOwnerConfig();
  if (!config) return;

  if (messages.length === 0) {
    console.warn("[notifyOwnerBatch] No messages to send");
    return;
  }

  // ── Message Manifest ──
  console.log(`[notifyOwnerBatch] ═══ MANIFEST ═══`);
  console.log(`[notifyOwnerBatch] Messages: ${messages.length}`);
  console.log(`[notifyOwnerBatch] Recipients: ${config.recipients.map(r => `${r.label}(***${r.phone.slice(-4)})`).join(", ")}`);
  for (let i = 0; i < messages.length; i++) {
    console.log(`[notifyOwnerBatch]   [${i + 1}/${messages.length}] ${messages[i].subject}`);
  }
  console.log(`[notifyOwnerBatch] ════════════════`);

  const results: { recipient: string; idx: number; success: boolean }[] = [];

  for (let ri = 0; ri < config.recipients.length; ri++) {
    const recipient = config.recipients[ri];
    const recipientTag = ri === 0 ? "" : ` [${recipient.label}]`;
    const batchTs = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    console.log(`[notifyOwnerBatch] Starting batch for ${recipient.phone.slice(0, 6)}*** (${recipient.label})`);

    for (let mi = 0; mi < messages.length; mi++) {
      const msg = messages[mi];
      // Personalize: add recipient tag and per-recipient timestamp to make content unique
      const personalizedBody = ri === 0
        ? `🔑 ${msg.subject}\n\n${msg.body}`
        : `🔑 ${msg.subject}${recipientTag}\n📬 ${batchTs}\n\n${msg.body}`;

      const msgId = await sendQuoSmsWithRetry(config.quoApiKey, config.fromNumber, recipient.phone, personalizedBody);
      results.push({ recipient: recipient.label, idx: mi, success: !!msgId });

      // 3s gap between messages to the same recipient
      if (mi < messages.length - 1) {
        await delay(3000);
      }
    }

    // 30s gap between recipients
    if (ri < config.recipients.length - 1) {
      console.log(`[notifyOwnerBatch] Waiting 30s before next recipient...`);
      await delay(30000);
    }
  }

  // ── Delivery Summary ──
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`[notifyOwnerBatch] ═══ SUMMARY ═══`);
  console.log(`[notifyOwnerBatch] Sent: ${sent}/${results.length} | Failed: ${failed}`);
  if (failed > 0) {
    for (const f of results.filter(r => !r.success)) {
      console.error(`[notifyOwnerBatch]   ✗ ${f.recipient} msg[${f.idx}] FAILED`);
    }
  }
  console.log(`[notifyOwnerBatch] All batches complete`);
}
