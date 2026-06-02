// Shared Resend gateway helper — avoids broken npm:resend import
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

export interface ResendEmail {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{ filename: string; content: string }>;
  tags?: Array<{ name: string; value: string }>;
}

export interface ResendClient {
  emails: {
    send: (email: ResendEmail) => Promise<{ data: { id?: string } | null; error: { message: string } | null }>;
  };
}

export function createResendClient(_apiKey?: string): ResendClient {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  return {
    emails: {
      send: async (email: ResendEmail) => {
        if (!lovableKey) {
          return { data: null, error: { message: 'LOVABLE_API_KEY not configured' } };
        }
        if (!resendKey) {
          return { data: null, error: { message: 'RESEND_API_KEY not configured' } };
        }
        try {
          const toArray = Array.isArray(email.to) ? email.to : [email.to];
          const res = await fetch(`${GATEWAY_URL}/emails`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lovableKey}`,
              'X-Connection-Api-Key': resendKey,
            },
            body: JSON.stringify({ ...email, to: toArray }),
          });
          const json = await res.json();
          if (!res.ok) {
            return { data: null, error: { message: json?.error?.message || json?.message || `HTTP ${res.status}` } };
          }
          return { data: json, error: null };
        } catch (err) {
          return { data: null, error: { message: err instanceof Error ? err.message : String(err) } };
        }
      },
    },
  };
}

// Legacy compat shim so `new Resend(key)` keeps working
export class Resend {
  emails: ResendClient['emails'];
  constructor(apiKey?: string) {
    this.emails = createResendClient(apiKey).emails;
  }
}
