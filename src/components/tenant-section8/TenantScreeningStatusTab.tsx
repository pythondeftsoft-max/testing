import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Props {
  userId: string;
}

const resultConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }> = {
  pass: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
  approved: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
  fail: { variant: 'destructive', icon: XCircle, label: 'Denied' },
  denied: { variant: 'destructive', icon: XCircle, label: 'Denied' },
  pending: { variant: 'secondary', icon: Clock, label: 'Pending Review' },
  conditional: { variant: 'outline', icon: AlertTriangle, label: 'Conditional' },
};

const TenantScreeningStatusTab: React.FC<Props> = ({ userId }) => {
  const { data: results, isLoading } = useQuery({
    queryKey: ['tenant-screening-status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_results')
        .select('*')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!results?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No screening results</p>
          <p className="text-xs text-muted-foreground mt-1">Results from landlord screenings will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result: any) => {
        const config = resultConfig[result.overall_result] || resultConfig.pending;
        const Icon = config.icon;
        return (
          <Card key={result.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">Screening Application</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted {format(new Date(result.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <Badge variant={config.variant} className="flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              {result.overall_result === 'fail' && result.adverse_action_sent && (
                <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive">
                  An adverse action notice has been provided. You have the right to dispute any inaccurate information.
                </div>
              )}
              {result.notes && (
                <p className="text-xs text-muted-foreground mt-2">{result.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TenantScreeningStatusTab;
