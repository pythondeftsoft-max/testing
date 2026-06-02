import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Webhook, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_PROJECT_REF = 'kixsdhnfzjnxikmnbipi';
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/checkbook-webhook`;

const EVENTS = [
  'payment.in_process',
  'payment.paid',
  'payment.printed',
  'payment.mailed',
  'payment.failed',
  'payment.void',
  'payment.refunded',
];

export default function CheckbookWebhookInfo() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    toast({ title: 'Copied', description: 'Webhook URL copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-5 h-5" /> Real-Time Status Webhook
        </CardTitle>
        <CardDescription>
          Register this webhook in your Checkbook account to receive sub-second status updates
          (sent → delivered → failed) instead of waiting for the next refresh.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
          <div className="flex gap-2 mt-1">
            <Input value={WEBHOOK_URL} readOnly className="font-mono text-xs" />
            <Button onClick={handleCopy} size="sm" variant="outline" className="shrink-0">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Events to subscribe</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {EVENTS.map((e) => (
              <Badge key={e} variant="outline" className="font-mono text-xs">
                {e}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
          <p className="font-medium">Setup steps</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
            <li>Open Checkbook → Settings → Developer → Webhooks</li>
            <li>Click <strong>Add Webhook</strong> and paste the URL above</li>
            <li>Select all the events listed above</li>
            <li>Save the signing secret Checkbook gives you — share it with your platform admin so we can verify incoming events</li>
          </ol>
          <Button asChild size="sm" variant="ghost" className="gap-1 mt-1">
            <a href="https://checkbook.io/dashboard/api" target="_blank" rel="noreferrer">
              Open Checkbook Webhooks <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
