import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Home, DollarSign, Building2, Info } from 'lucide-react';

interface TenantHouseholdTabProps {
  userId: string;
}

const TenantHouseholdTab = ({ userId }: TenantHouseholdTabProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-household', userId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let agencyName: string | null = null;
      if (profile?.housing_authority_id) {
        const { data: agency } = await supabase
          .from('housing_authorities')
          .select('name, city, state')
          .eq('id', profile.housing_authority_id)
          .maybeSingle();
        if (agency) agencyName = `${agency.name} — ${agency.city}, ${agency.state}`;
      }

      return { profile, agencyName };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const profile = data?.profile;

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Household Info</h3>
          <p className="text-muted-foreground">Complete your voucher enrollment to see household details here.</p>
        </CardContent>
      </Card>
    );
  }

  const bedroomsApproved = Array.isArray(profile.bedrooms_approved) && profile.bedrooms_approved.length > 0
    ? profile.bedrooms_approved.join(', ')
    : null;

  const infoRows = [
    { label: 'Household Size', value: (profile as any).household_size || (profile as any).number_of_occupants, icon: Users },
    { label: 'Bedrooms Approved', value: bedroomsApproved, icon: Home },
    { label: 'Income Level', value: (profile as any).income_level || (profile as any).income_band, icon: DollarSign },
    { label: 'Voucher Status', value: profile.voucher_status, icon: Building2 },
  ].filter(r => r.value != null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Household Information</h2>
      </div>

      <Card>
        <CardContent className="py-6 space-y-4">
          {infoRows.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-sm">{label}</span>
              </div>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {data?.agencyName && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Linked Housing Authority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{data.agencyName}</p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              To update household information (income changes, new members, etc.), please contact your Housing Authority caseworker directly. Changes require an interim recertification.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantHouseholdTab;
