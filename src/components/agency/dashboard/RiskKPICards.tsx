import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileWarning, Accessibility, Scale, ClipboardX, Banknote } from 'lucide-react';

interface Props {
  agencyId: string;
  onTabChange?: (tab: string) => void;
}

const RiskKPICards: React.FC<Props> = ({ agencyId, onTabChange }) => {
  const { data: risks } = useQuery({
    queryKey: ['agency-risk-kpis', agencyId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date().toISOString();

      const [repayRes, accomRes, inspRes, claimRes, bouncedRes] = await Promise.all([
        (supabase as any)
          .from('agency_repayment_agreements')
          .select('id, last_payment_date, start_date')
          .eq('agency_id', agencyId)
          .eq('status', 'active'),
        (supabase as any)
          .from('agency_accommodation_requests')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'pending'),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'scheduled')
          .lt('scheduled_date', today),
        (supabase as any)
          .from('agency_special_claims')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .in('status', ['submitted', 'under_review']),
        (supabase as any)
          .from('hap_disbursements')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'bounced')
          .gte('bounced_at', thirtyDaysAgo.toISOString()),
      ]);

      const atRiskRepayments = (repayRes.data || []).filter((a: any) => {
        const reference = a.last_payment_date || a.start_date;
        return reference && new Date(reference) < thirtyDaysAgo;
      }).length;

      return {
        atRiskRepayments,
        pendingAccommodations: accomRes.count || 0,
        overdueInspections: inspRes.count || 0,
        pendingClaims: claimRes.count || 0,
        bouncedDisbursements: bouncedRes.count || 0,
      };
    },
  });

  const cards = [
    {
      label: 'At-Risk Repayments',
      value: risks?.atRiskRepayments ?? 0,
      icon: FileWarning,
      tab: 'finance',
      help: 'No payment in 30+ days',
    },
    {
      label: 'Pending Accommodations',
      value: risks?.pendingAccommodations ?? 0,
      icon: Accessibility,
      tab: 'compliance',
      help: '14-day SLA — Section 504',
    },
    {
      label: 'Overdue Inspections',
      value: risks?.overdueInspections ?? 0,
      icon: ClipboardX,
      tab: 'compliance',
      help: 'Past scheduled date',
    },
    {
      label: 'Claims Awaiting Review',
      value: risks?.pendingClaims ?? 0,
      icon: Scale,
      tab: 'finance',
      help: 'Special Claims (HUD 52671)',
    },
    {
      label: 'Bounced Disbursements',
      value: risks?.bouncedDisbursements ?? 0,
      icon: Banknote,
      tab: 'finance',
      help: 'Last 30 days — banking needs review',
    },
  ];

  const hasAnyRisk = cards.some(c => c.value > 0);
  if (!hasAnyRisk) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold text-foreground">Risk & Compliance Alerts</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <Card
            key={i}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              card.value > 0 ? 'border-destructive/50' : ''
            }`}
            onClick={() => onTabChange?.(card.tab)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon
                className={`h-4 w-4 ${card.value > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.value > 0 ? 'text-destructive' : ''}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.help}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RiskKPICards;
