import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, X, Sparkles } from 'lucide-react';

interface Props {
  agencyId: string;
  onTabChange?: (tab: string) => void;
}

interface Step {
  key: string;
  label: string;
  done: boolean;
  tab?: string;
}

export const SetupHealthBanner: React.FC<Props> = ({ agencyId, onTabChange }) => {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`setup_health_dismissed_${agencyId}`) === '1';
  });

  const { data, isLoading } = useQuery({
    queryKey: ['setup_health', agencyId],
    queryFn: async () => {
      const [staff, paymentStds, vouchers, landlords, agency, notices, contact] = await Promise.all([
        supabase.from('agency_staff').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('is_active', true),
        supabase.from('agency_payment_standards').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_vouchers').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_landlords').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('housing_authorities').select('default_required_docs').eq('id', agencyId).maybeSingle(),
        supabase.from('agency_notice_templates').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        (supabase as any).rpc('get_housing_authority_contact', { _id: agencyId }),
      ]);
      const a = agency.data;
      const c = Array.isArray(contact.data) ? contact.data[0] : contact.data;
      return {
        staffCount: staff.count || 0,
        paymentStdsCount: paymentStds.count || 0,
        vouchersCount: vouchers.count || 0,
        landlordsCount: landlords.count || 0,
        hasContactInfo: !!(c?.phone || c?.email),
        hasRequirements: !!(a?.default_required_docs && a.default_required_docs.length > 0),
        noticesCount: notices.count || 0,
      };
    },
    staleTime: 60_000,
  });

  const steps: Step[] = useMemo(() => {
    if (!data) return [];
    return [
      { key: 'staff', label: 'Invite at least one staff member', done: data.staffCount > 1, tab: 'admin' },
      { key: 'payment_stds', label: 'Set payment standards by bedroom size', done: data.paymentStdsCount > 0, tab: 'finance' },
      { key: 'contact', label: 'Add your agency contact info', done: data.hasContactInfo, tab: 'admin' },
      { key: 'requirements', label: 'Set landlord enrollment requirements', done: data.hasRequirements, tab: 'admin' },
      { key: 'notices', label: 'Customize a notice template', done: data.noticesCount > 0, tab: 'comms' },
      { key: 'vouchers', label: 'Issue or import your first voucher', done: data.vouchersCount > 0, tab: 'caseload' },
      { key: 'landlords', label: 'Add at least one landlord', done: data.landlordsCount > 0, tab: 'caseload' },
    ];
  }, [data]);

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  if (dismissed || isLoading || total === 0 || pct === 100) return null;

  const dismiss = () => {
    localStorage.setItem(`setup_health_dismissed_${agencyId}`, '1');
    setDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Finish setting up your agency</div>
              <div className="text-sm text-muted-foreground">
                {completed} of {total} steps complete — {pct}% done
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={pct} className="h-2" />
        <ul className="space-y-1.5 text-sm">
          {steps.filter((s) => !s.done).slice(0, 3).map((s) => (
            <li key={s.key}>
              <button
                onClick={() => s.tab && onTabChange?.(s.tab)}
                className="flex items-center gap-2 hover:text-primary transition-colors text-left w-full"
              >
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
          {steps.filter((s) => s.done).slice(0, 2).map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-muted-foreground line-through">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
