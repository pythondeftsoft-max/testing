import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ComplianceHealthCardProps {
  agencyId: string;
}

interface ComplianceMetrics {
  overdueRecerts: number;
  recertsDueSoon: number;
  voucherUtilization: number;
  expiredContracts: number;
  missingW9: number;
  healthScore: number;
}

const ComplianceHealthCard: React.FC<ComplianceHealthCardProps> = ({ agencyId }) => {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) return;

    const fetchMetrics = async () => {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysOut = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const [overdueRes, dueSoonRes, totalVRes, activeVRes, expiredRes, w9Res] = await Promise.all([
        supabase.from('agency_recertifications').select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId).eq('status', 'overdue'),
        supabase.from('agency_recertifications').select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId).in('status', ['upcoming', 'documents_requested'] as any).lte('due_date', thirtyDaysOut),
        supabase.from('agency_vouchers').select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase.from('agency_vouchers').select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId).eq('status', 'active'),
        supabase.from('agency_hap_contracts').select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId).eq('status', 'active').lt('expiration_date', today),
        supabase.from('agency_landlords').select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId).eq('w9_required', true).neq('w9_status', 'approved' as any),
      ]);

      const overdueRecerts = overdueRes.count || 0;
      const recertsDueSoon = dueSoonRes.count || 0;
      const totalVouchers = totalVRes.count || 0;
      const activeVouchers = activeVRes.count || 0;
      const expiredContracts = expiredRes.count || 0;
      const missingW9 = w9Res.count || 0;

      const voucherUtilization = totalVouchers ? Math.round((activeVouchers / totalVouchers) * 100) : 0;

      let score = 100;
      if (overdueRecerts > 0) score -= Math.min(overdueRecerts * 5, 30);
      if (expiredContracts > 0) score -= Math.min(expiredContracts * 5, 20);
      if (missingW9 > 0) score -= Math.min(missingW9 * 2, 10);
      if (voucherUtilization < 90) score -= Math.round((90 - voucherUtilization) * 0.5);
      score = Math.max(0, score);

      setMetrics({ overdueRecerts, recertsDueSoon, voucherUtilization, expiredContracts, missingW9, healthScore: score });
      setLoading(false);
    };

    fetchMetrics();
  }, [agencyId]);

  if (loading || !metrics) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-destructive" />;
  };

  const indicators = [
    { label: 'Overdue Recertifications', value: metrics.overdueRecerts, bad: metrics.overdueRecerts > 0 },
    { label: 'Recerts Due ≤30 Days', value: metrics.recertsDueSoon, bad: false },
    { label: 'Voucher Utilization', value: `${metrics.voucherUtilization}%`, bad: metrics.voucherUtilization < 90 },
    { label: 'Expired HAP Contracts', value: metrics.expiredContracts, bad: metrics.expiredContracts > 0 },
    { label: 'Landlords Missing W-9', value: metrics.missingW9, bad: metrics.missingW9 > 0 },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Compliance Health
        </CardTitle>
        <div className="flex items-center gap-2">
          {getScoreIcon(metrics.healthScore)}
          <span className={`text-2xl font-bold ${getScoreColor(metrics.healthScore)}`}>
            {metrics.healthScore}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {indicators.map((ind, i) => (
            <div key={i} className={`rounded-lg border p-3 ${ind.bad ? 'border-destructive/30 bg-destructive/5' : ''}`}>
              <p className="text-xs text-muted-foreground">{ind.label}</p>
              <p className={`text-lg font-bold ${ind.bad ? 'text-destructive' : ''}`}>{ind.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceHealthCard;
