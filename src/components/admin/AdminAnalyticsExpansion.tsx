import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, ClipboardCheck, TrendingUp } from 'lucide-react';
import { competitiveData } from '@/data/competitiveAnalysis';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgencyHealth {
  id: string;
  name: string;
  staffCount: number;
  activeVouchers: number;
  inspectionPassRate: number;
  avgRftaTurnaround: number;
  overallScore: number;
}

const scoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-yellow-600';
  return 'text-destructive';
};

const scoreBadge = (score: number) => {
  if (score >= 90) return 'success';
  if (score >= 75) return 'secondary';
  return 'destructive';
};

const AdminAnalyticsExpansion: React.FC = () => {
  // Competitive auto-scoring from data file
  const categories = Object.values(competitiveData);
  const allFeatures = categories.flatMap(c => c.features);
  const liveCount = allFeatures.filter(f => f.us === 'live').length;
  const partialCount = allFeatures.filter(f => f.us === 'partial').length;
  const plannedCount = allFeatures.filter(f => f.us === 'planned').length;
  const totalFeatures = allFeatures.length;
  const featureCompletionRate = Math.round((liveCount / totalFeatures) * 100);

  // Real agency health data
  const { data: agencyHealthData } = useQuery({
    queryKey: ['admin-agency-health-scores'],
    queryFn: async () => {
      // Fetch onboarded agencies
      const { data: agencies } = await supabase
        .from('housing_authorities')
        .select('id, name')
        .eq('is_onboarded', true)
        .limit(50);

      if (!agencies?.length) return [];

      const agencyIds = agencies.map(a => a.id);

      // Fetch staff counts per agency
      const { data: staffData } = await supabase
        .from('agency_staff')
        .select('agency_id')
        .eq('is_active', true)
        .in('agency_id', agencyIds);

      // Fetch voucher counts per agency
      const { data: voucherData } = await supabase
        .from('agency_vouchers')
        .select('agency_id, status')
        .in('agency_id', agencyIds);

      // Fetch inspections for pass rate
      const { data: inspData } = await supabase
        .from('inspections')
        .select('agency_id, status')
        .in('agency_id', agencyIds);

      // Build health scores
      const results: AgencyHealth[] = agencies.map(agency => {
        const staff = staffData?.filter(s => s.agency_id === agency.id) || [];
        const vouchers = voucherData?.filter(v => v.agency_id === agency.id && v.status === 'active') || [];
        const insps = inspData?.filter(i => i.agency_id === agency.id) || [];
        const passedInsps = insps.filter(i => i.status === 'completed');
        const passRate = insps.length > 0 ? Math.round((passedInsps.length / insps.length) * 100) : 0;

        // Composite score: weighted average
        const staffScore = Math.min(100, staff.length * 10);
        const voucherScore = Math.min(100, vouchers.length / 5);
        const inspScore = passRate;
        const overall = Math.round((staffScore * 0.2 + voucherScore * 0.3 + inspScore * 0.5));

        return {
          id: agency.id,
          name: agency.name,
          staffCount: staff.length,
          activeVouchers: vouchers.length,
          inspectionPassRate: passRate,
          avgRftaTurnaround: 0, // Would need rfta_packets data with timestamps
          overallScore: overall || 0,
        };
      });

      return results.sort((a, b) => b.overallScore - a.overallScore);
    },
    staleTime: 120000,
  });

  // Real revenue data from agency contracts
  const { data: revenueData } = useQuery({
    queryKey: ['admin-platform-revenue'],
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from('agency_contracts')
        .select('monthly_rate, setup_fee, custom_email_domain_fee, status')
        .eq('status', 'active');

      const mrr = contracts?.reduce((sum, c) => sum + (c.monthly_rate || 0) + (c.custom_email_domain_fee || 0), 0) || 0;
      const arr = mrr * 12;
      const activeCount = contracts?.length || 0;

      return { mrr, arr, activeContracts: activeCount };
    },
    staleTime: 120000,
  });

  const agencies = agencyHealthData || [];
  const revenue = revenueData || { mrr: 0, arr: 0, activeContracts: 0 };

  return (
    <div className="space-y-8">
      {/* Competitive Auto-Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Platform Feature Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center"><p className="text-2xl font-bold text-green-600">{liveCount}</p><p className="text-xs text-muted-foreground">Live</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-yellow-600">{partialCount}</p><p className="text-xs text-muted-foreground">Partial</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-muted-foreground">{plannedCount}</p><p className="text-xs text-muted-foreground">Planned</p></div>
            <div className="text-center"><p className="text-2xl font-bold">{featureCompletionRate}%</p><p className="text-xs text-muted-foreground">Completion</p></div>
          </div>
          <Progress value={featureCompletionRate} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">{liveCount} of {totalFeatures} features fully live across all competitive categories</p>
        </CardContent>
      </Card>

      {/* Agency Health Scores — Real Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Agency Health Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No onboarded agencies yet</p>
          ) : (
            <div className="space-y-4">
              {agencies.map(agency => (
                <div key={agency.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{agency.name}</p>
                      <Badge variant={scoreBadge(agency.overallScore) as any}>{agency.overallScore}/100</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                      <span><Users className="h-3 w-3 inline mr-1" />{agency.staffCount} staff</span>
                      <span>{agency.activeVouchers} vouchers</span>
                      <span>Pass rate: {agency.inspectionPassRate}%</span>
                      <span>Score: {agency.overallScore}</span>
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <p className={`text-lg font-bold ${scoreColor(agency.overallScore)}`}>{agency.overallScore}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Revenue — Real Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Platform Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">${revenue.mrr.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">MRR</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">${revenue.arr.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ARR</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{revenue.activeContracts}</p>
              <p className="text-xs text-muted-foreground">Active Contracts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsExpansion;
