import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function BreachAcknowledgePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'invalid'>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return setState('invalid');
      const { data, error } = await supabase
        .rpc('get_breach_notification_by_token' as any, { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) return setState('invalid');
      setState((row as any).acknowledged_at ? 'done' : 'ready');
    })();
  }, [token]);

  const acknowledge = async () => {
    setSubmitting(true);
    const { data, error } = await supabase
      .rpc('acknowledge_breach_notification' as any, { _token: token });
    setSubmitting(false);
    if (!error && data) setState('done');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Security Notice Acknowledgement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'loading' && <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {state === 'invalid' && <p className="text-muted-foreground">This acknowledgement link is invalid or expired.</p>}
          {state === 'ready' && (
            <>
              <p>Please confirm that you have received and reviewed our security notice. This helps us comply with HUD notification requirements.</p>
              <Button onClick={acknowledge} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}I acknowledge receipt
              </Button>
            </>
          )}
          {state === 'done' && (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Thank you. Your acknowledgement has been recorded.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
