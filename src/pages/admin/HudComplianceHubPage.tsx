import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, FileSignature, Calendar, Lock, FileText, ShieldAlert, Shield, Eye, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdminAudit } from '@/hooks/useAdminAudit';

const cards = [
  { to: '/admin/security', icon: Shield, title: 'Security Dashboard', desc: 'Sessions, MFA, backups, incidents.' },
  { to: '/admin/security/pii-access-log', icon: Eye, title: 'PII Access Log', desc: 'Every SSN/EIN/bank reveal audited.' },
  { to: '/admin/compliance/consents', icon: FileSignature, title: 'Privacy Consents', desc: 'HUD-9886, EIV, Privacy Act, W-9 releases.' },
  { to: '/admin/compliance/retention', icon: Calendar, title: 'Records Retention', desc: '24 CFR 908 retention policies & purges.' },
  { to: '/admin/compliance/legal-holds', icon: Lock, title: 'Legal Holds', desc: 'Pause purges for litigation / audit.' },
  { to: '/admin/compliance/dsar', icon: FileText, title: 'Data Requests (DSAR)', desc: 'Export, deletion, correction queue.' },
  { to: '/admin/compliance/incidents', icon: ShieldAlert, title: 'Security Incidents', desc: 'Breach log + HUD notification tracker.' },
];

export default function HudComplianceHubPage() {
  const { data: isAdmin, isLoading } = useAdminCheck();
  const { logSecurityAccess } = useAdminAudit();
  useEffect(() => { logSecurityAccess('hud_compliance_hub_view'); }, []);

  const { data: slaStats } = useQuery({
    queryKey: ['compliance-sla'],
    queryFn: async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
      const [{ count: dsarOver }, { count: breachOver }] = await Promise.all([
        supabase.from('dsar_requests' as any).select('id', { count: 'exact', head: true })
          .lt('created_at', twentyDaysAgo).not('status', 'in', '(fulfilled,denied,cancelled)'),
        supabase.from('security_incidents' as any).select('id', { count: 'exact', head: true })
          .lt('created_at', fortyFiveDaysAgo).in('severity', ['high', 'critical']).is('notification_sent_at', null),
      ]);
      return { dsarOver: dsarOver ?? 0, breachOver: breachOver ?? 0 };
    },
    enabled: !!isAdmin,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const hasAlerts = (slaStats?.dsarOver ?? 0) > 0 || (slaStats?.breachOver ?? 0) > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HUD Compliance Center</h1>
        <p className="text-muted-foreground">Privacy Act, 24 CFR §908 records retention, VAWA, breach notification.</p>
      </div>
      {hasAlerts && (
        <div className="grid gap-4 md:grid-cols-2">
          {(slaStats?.dsarOver ?? 0) > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-destructive" /> DSAR SLA at risk</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{slaStats!.dsarOver}</p><p className="text-xs text-muted-foreground">requests open &gt; 20 days (Privacy Act 30-day deadline)</p></CardContent>
            </Card>
          )}
          {(slaStats?.breachOver ?? 0) > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-destructive" /> Breach notification SLA at risk</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{slaStats!.breachOver}</p><p className="text-xs text-muted-foreground">high/critical incidents &gt; 45 days without notifications (HUD 60-day deadline)</p></CardContent>
            </Card>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map(c => (
          <Card key={c.to}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <c.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{c.title}</CardTitle>
              </div>
              <CardDescription>{c.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full"><Link to={c.to}>Open</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
