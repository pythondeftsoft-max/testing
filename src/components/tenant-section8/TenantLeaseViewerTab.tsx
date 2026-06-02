import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TenantLeaseViewerTabProps {
  userId: string;
}

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }> = {
  active: { variant: 'default', icon: CheckCircle2, label: 'Active' },
  fully_executed: { variant: 'default', icon: CheckCircle2, label: 'Fully Executed' },
  pending_signature: { variant: 'secondary', icon: Clock, label: 'Pending Signature' },
  draft: { variant: 'outline', icon: FileText, label: 'Draft' },
  expired: { variant: 'destructive', icon: AlertTriangle, label: 'Expired' },
  terminated: { variant: 'destructive', icon: AlertTriangle, label: 'Terminated' },
};

const TenantLeaseViewerTab: React.FC<TenantLeaseViewerTabProps> = ({ userId }) => {
  const { data: leases, isLoading } = useQuery({
    queryKey: ['tenant-leases', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_leases')
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

  if (!leases?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active leases found</p>
          <p className="text-xs text-muted-foreground mt-1">Your lease will appear here once executed by your landlord</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {leases.map((lease: any) => {
        const config = statusConfig[lease.status] || statusConfig.draft;
        const Icon = config.icon;
        return (
          <Card key={lease.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{lease.property_address || 'Lease Agreement'}</CardTitle>
                <Badge variant={config.variant} className="flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Monthly Rent</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {lease.monthly_rent ? `$${Number(lease.monthly_rent).toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Your Portion</p>
                  <p className="font-medium">
                    {lease.tenant_portion ? `$${Number(lease.tenant_portion).toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Lease Start</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {lease.start_date ? format(new Date(lease.start_date), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Lease End</p>
                  <p className="font-medium">
                    {lease.end_date ? format(new Date(lease.end_date), 'MMM d, yyyy') : 'Month-to-Month'}
                  </p>
                </div>
              </div>
              {lease.hap_portion && (
                <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                  <span className="text-muted-foreground">HAP Subsidy: </span>
                  <span className="font-medium text-green-600">${Number(lease.hap_portion).toLocaleString()}/mo</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TenantLeaseViewerTab;
