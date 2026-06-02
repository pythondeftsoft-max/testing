
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Building2, BedDouble, Info } from 'lucide-react';

interface VoucherStatusTabProps {
  userId: string;
}

const VoucherStatusTab = ({ userId }: VoucherStatusTabProps) => {
  const { data: tenantProfile, isLoading } = useQuery({
    queryKey: ['tenant-voucher-status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_profiles')
        .select('platform_voucher_status, voucher_status, bedrooms_approved, housing_authority_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: agency } = useQuery({
    queryKey: ['tenant-pha', tenantProfile?.housing_authority_id],
    enabled: !!tenantProfile?.housing_authority_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('housing_authorities')
        .select('name, city, state, pha_code')
        .eq('id', tenantProfile!.housing_authority_id!)
        .maybeSingle();
      if (error) throw error;
      const { data: contact } = await (supabase as any).rpc('get_my_pha_contact', {
        _id: tenantProfile!.housing_authority_id!,
      });
      const c = Array.isArray(contact) ? contact[0] : contact;
      return data ? { ...data, phone: c?.phone ?? null, email: c?.email ?? null } : null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Use platform_voucher_status (issued through the platform) instead of signup voucher_status
  const platformStatus = (tenantProfile as any)?.platform_voucher_status as string | null;
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    active: { label: 'Active', variant: 'default' },
    expired: { label: 'Expired', variant: 'destructive' },
  };

  return (
    <div className="space-y-4">
      {/* Platform Voucher Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Voucher Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {platformStatus ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Status</p>
              <Badge variant={statusConfig[platformStatus]?.variant || 'secondary'} className="text-sm px-3 py-1">
                {statusConfig[platformStatus]?.label || platformStatus}
              </Badge>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">No voucher issued through OpenKey yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apply to a housing authority waitlist in the <span className="font-medium">Agency Enrollment</span> tab to get started. Once approved, your voucher status will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bedrooms */}
      {tenantProfile?.bedrooms_approved && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BedDouble className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Bedrooms Approved</p>
                <p className="font-medium text-foreground">
                  {(tenantProfile.bedrooms_approved as string[]).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issuing PHA */}
      {agency && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Issuing Housing Authority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-foreground">{agency.name}</p>
              {agency.city && (
                <p className="text-sm text-muted-foreground">
                  {agency.city}, {agency.state}
                </p>
              )}
              {agency.pha_code && (
                <p className="text-sm text-muted-foreground">PHA Code: {agency.pha_code}</p>
              )}
              <div className="flex gap-4 mt-2">
                {agency.phone && (
                  <a href={`tel:${agency.phone}`} className="text-sm text-primary hover:underline">
                    {agency.phone}
                  </a>
                )}
                {agency.email && (
                  <a href={`mailto:${agency.email}`} className="text-sm text-primary hover:underline">
                    {agency.email}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!tenantProfile && (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No voucher information on file.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Update your profile to add your voucher details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoucherStatusTab;
