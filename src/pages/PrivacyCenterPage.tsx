import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, FileSignature, FileText, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CONSENT_TYPES = [
  { key: 'hud_9886', label: 'HUD-9886 Authorization for Release of Information', body: 'I authorize HUD, the housing authority, and their representatives to verify income, employment, assets, household composition, criminal history, and credit history as needed to determine eligibility and rent. This release expires 15 months after signed unless renewed.' },
  { key: 'privacy_act_notice', label: 'Privacy Act Notice (acknowledgment)', body: 'I acknowledge receipt of the federal Privacy Act notice describing the routine uses of my personal information collected by HUD-funded housing programs.' },
  { key: 'eiv_consent', label: 'EIV (Enterprise Income Verification) Consent', body: 'I consent to the housing authority accessing HUD\'s Enterprise Income Verification system to verify my income and benefits.' },
  { key: 'background_check', label: 'Background / Criminal History Release', body: 'I consent to a background and criminal history check as part of the application screening process.' },
  { key: 'w9_release', label: 'W-9 / Tax Information Release (Landlords)', body: 'I authorize the housing authority to use my W-9 information for HAP payment and IRS 1099 reporting.' },
];

export default function PrivacyCenterPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openType, setOpenType] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const { data: consents, isLoading } = useQuery({
    queryKey: ['my-consents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('hud_privacy_consents' as any).select('*').eq('user_id', user!.id).order('signed_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const sign = useMutation({
    mutationFn: async (consent_type: string) => {
      const { error } = await supabase.from('hud_privacy_consents' as any).insert({
        user_id: user!.id, consent_type,
        signature_data: { method: 'web_click', name: user!.email, agreed_at: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Consent recorded'); qc.invalidateQueries({ queryKey: ['my-consents'] }); setOpenType(null); setAgreed(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hud_privacy_consents' as any).update({ revoked_at: new Date().toISOString(), revoked_reason: 'User self-revoked' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Consent revoked'); qc.invalidateQueries({ queryKey: ['my-consents'] }); },
  });

  if (!user) return <Navigate to="/auth" replace />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const activeByType = new Map<string, any>();
  consents?.forEach(c => {
    if (!c.revoked_at && new Date(c.expires_at) > new Date() && !activeByType.has(c.consent_type)) activeByType.set(c.consent_type, c);
  });

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Privacy & Consent Center</h1>
        <p className="text-muted-foreground">Review, sign, or revoke HUD-required releases. You can also request your data or deletion.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/my-data-request"><FileText className="h-4 w-4 mr-2" />Request My Data / Deletion</Link></Button>
        <Button asChild variant="outline"><Link to="/vawa-certify"><ShieldAlert className="h-4 w-4 mr-2" />VAWA Self-Certification</Link></Button>
      </div>

      <div className="grid gap-4">
        {CONSENT_TYPES.map(t => {
          const active = activeByType.get(t.key);
          return (
            <Card key={t.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><FileSignature className="h-4 w-4" />{t.label}</CardTitle>
                    {active && <CardDescription>Signed {format(new Date(active.signed_at), 'PP')} · expires {format(new Date(active.expires_at), 'PP')}</CardDescription>}
                  </div>
                  {active ? <Badge>Active</Badge> : <Badge variant="outline">Not signed</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                {!active && (
                  <Dialog open={openType === t.key} onOpenChange={o => { setOpenType(o ? t.key : null); setAgreed(false); }}>
                    <DialogTrigger asChild><Button>Review & Sign</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{t.label}</DialogTitle></DialogHeader>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{t.body}</p>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={agreed} onCheckedChange={v => setAgreed(!!v)} />
                        I have read and agree. My click is my electronic signature.
                      </label>
                      <DialogFooter>
                        <Button disabled={!agreed} onClick={() => sign.mutate(t.key)}>Sign Electronically</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {active && <Button variant="outline" onClick={() => revoke.mutate(active.id)}>Revoke</Button>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
