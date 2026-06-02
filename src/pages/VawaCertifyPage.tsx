import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function VawaCertifyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const { data: cert, isLoading } = useQuery({
    queryKey: ['my-vawa', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('vawa_certifications' as any).select('*').eq('user_id', user!.id).is('revoked_at', null).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const sign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vawa_certifications' as any).insert({
        user_id: user!.id, certification_type: 'hud_5382',
        signature_data: { method: 'web_click', email: user!.email, agreed_at: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Certification recorded — your address is now masked.'); qc.invalidateQueries({ queryKey: ['my-vawa'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vawa_certifications' as any).update({ revoked_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Revoked'); qc.invalidateQueries({ queryKey: ['my-vawa'] }); },
  });

  if (!user) return <Navigate to="/auth" replace />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" />VAWA Self-Certification</h1>
        <p className="text-muted-foreground">Violence Against Women Act (24 CFR §5.2005). Survivors of domestic violence, dating violence, sexual assault, or stalking may self-certify for housing protections.</p>
      </div>

      <Alert>
        <AlertDescription>
          Self-certifying activates address masking across the platform. Your street address and current property will be hidden from all non-essential staff. Only your assigned caseworker and platform admins will see it. Your signed certification (HUD-5382) is stored confidentially.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{cert ? 'Active Certification' : 'Sign HUD-5382'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cert ? (
            <div className="space-y-3">
              <Badge>Active</Badge>
              <p className="text-sm">Signed {format(new Date(cert.signed_at), 'PP')}.</p>
              <Button variant="outline" onClick={() => revoke.mutate(cert.id)}>Revoke certification</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">By signing, I certify that I am a victim of domestic violence, dating violence, sexual assault, or stalking, and request the housing protections afforded under VAWA. I understand this certification is confidential.</p>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={agreed} onCheckedChange={v => setAgreed(!!v)} className="mt-1" />
                I certify the above under penalty of perjury. My click is my electronic signature.
              </label>
              <Button disabled={!agreed} onClick={() => sign.mutate()}>Sign Electronically</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
