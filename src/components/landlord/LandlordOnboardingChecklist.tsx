import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, FileText, Landmark, FileSignature, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  userId: string;
  agencyLandlord?: {
    id: string;
    agency_id: string;
    w9_status?: string | null;
    payment_method?: string | null;
    pay_ready?: boolean | null;
  } | null;
}

/**
 * Onboarding checklist for a freshly-claimed (or migrated) landlord.
 * Drives the Pay-Ready badge — every item must be ✓ before HAP can disburse.
 */
export default function LandlordOnboardingChecklist({ userId, agencyLandlord }: Props) {
  const { data: hasContract } = useQuery({
    queryKey: ['landlord-hap-contract-any', agencyLandlord?.id],
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
    queryKey: ['landlord-properties-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId);
      return count ?? 0;
    },
  });

  const items = [
    {
      id: 'w9',
      label: 'W-9 on file',
      icon: FileText,
      done: agencyLandlord?.w9_status === 'verified' || agencyLandlord?.w9_status === 'on_file',
      cta: { label: 'Upload W-9', to: '/landlord/payments?tab=w9' },
    },
    {
      id: 'banking',
      label: 'Banking / payout method',
      icon: Landmark,
      done: !!agencyLandlord?.payment_method && agencyLandlord.payment_method !== 'none',
      cta: { label: 'Connect bank', to: '/payment-settings' },
    },
    {
      id: 'hap',
      label: 'Signed HAP contract',
      icon: FileSignature,
      done: !!hasContract,
      cta: { label: 'View HAP contracts', to: '/landlord-hap' },
    },
    {
      id: 'props',
      label: 'Property addresses confirmed',
      icon: Building2,
      done: (propsCount ?? 0) > 0,
      cta: { label: 'Add a property', to: '/property-import' },
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const allDone = completed === items.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Landlord onboarding</CardTitle>
            <CardDescription>Complete these to be Pay-Ready for HAP disbursement.</CardDescription>
          </div>
          <Badge variant={allDone ? 'default' : 'secondary'}>
            {completed}/{items.length} {allDone ? '· Pay-Ready' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={`text-sm truncate ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {item.label}
                </span>
              </div>
              {!item.done && (
                <Button asChild size="sm" variant="outline">
                  <Link to={item.cta.to}>{item.cta.label}</Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
