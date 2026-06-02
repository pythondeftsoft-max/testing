import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
  agencyLandlord?: {
    id: string;
    agency_id: string;
    w9_status?: string | null;
    payment_method?: string | null;
    pay_ready?: boolean | null;
    onboarding_status?: string | null;
  } | null;
}

/**
 * Horizontal enrollment timeline shown on the landlord home.
 * Auto-hides once pay_ready is true.
 */
export default function EnrollmentTimeline({ userId, agencyLandlord }: Props) {
  const { data: hasContract } = useQuery({
    queryKey: ['lt-hap', agencyLandlord?.id],
    enabled: !!agencyLandlord?.id,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('agency_hap_contracts')
        .select('id', { count: 'exact', head: true })
        .eq('landlord_id', agencyLandlord!.id);
      return (count ?? 0) > 0;
    },
  });

  const { data: propsCount } = useQuery({
    queryKey: ['lt-props', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId);
      return count ?? 0;
    },
  });

  if (agencyLandlord?.pay_ready) return null;

  const steps = [
    { key: 'account', label: 'Account', done: true, cta: null as null | { label: string; to: string } },
    {
      key: 'pha',
      label: 'PHA Enrollment',
      done: !!agencyLandlord && agencyLandlord.onboarding_status === 'active',
      cta: agencyLandlord ? null : { label: 'Find your PHA', to: '/landlord/payments' },
    },
    {
      key: 'w9',
      label: 'W-9',
      done: agencyLandlord?.w9_status === 'approved' || agencyLandlord?.w9_status === 'on_file',
      cta: { label: 'Upload W-9', to: '/landlord/payments?tab=w9' },
    },
    {
      key: 'banking',
      label: 'Banking',
      done: !!agencyLandlord?.payment_method && agencyLandlord.payment_method !== 'none' && agencyLandlord.payment_method !== 'check',
      cta: { label: 'Connect bank', to: '/payment-settings' },
    },
    {
      key: 'props',
      label: 'First Property',
      done: (propsCount ?? 0) > 0,
      cta: { label: 'Add property', to: '/property-import' },
    },
    {
      key: 'hap',
      label: 'HAP Contract',
      done: !!hasContract,
      cta: { label: 'View HAP', to: '/landlord-hap' },
    },
  ];

  const currentIdx = steps.findIndex((s) => !s.done);
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Get Pay-Ready — {completed}/{steps.length} complete</CardTitle>
          <span className="text-xs text-muted-foreground">{pct}% to HAP payments</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {steps.map((s, i) => {
            const isCurrent = i === currentIdx;
            return (
              <React.Fragment key={s.key}>
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 min-w-[88px] px-2 py-2 rounded-md',
                    isCurrent && 'bg-primary/5 ring-1 ring-primary/40'
                  )}
                >
                  {s.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className={cn('h-5 w-5', isCurrent ? 'text-primary' : 'text-muted-foreground/40')} />
                  )}
                  <span className={cn('text-xs text-center', isCurrent ? 'font-medium' : 'text-muted-foreground')}>
                    {s.label}
                  </span>
                  {isCurrent && s.cta && (
                    <Button asChild size="sm" variant="default" className="h-7 text-xs px-2 mt-1">
                      <Link to={s.cta.to}>{s.cta.label}</Link>
                    </Button>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
