import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Scale } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  userId: string;
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  unpaid_rent: 'Unpaid Rent',
  vacancy_loss: 'Vacancy Loss',
  tenant_damages: 'Property Damages',
  damages: 'Property Damages',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  submitted: 'secondary',
  under_review: 'secondary',
  approved: 'default',
  partially_approved: 'default',
  denied: 'outline',
  paid: 'default',
};

const TenantSpecialClaimNotice: React.FC<Props> = ({ userId }) => {
  const { data: claims = [] } = useQuery({
    queryKey: ['tenant-special-claims', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_special_claims')
        .select('*')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (!claims.length) return null;

  const openClaims = claims.filter((c: any) => !['denied', 'paid', 'withdrawn'].includes(c.status));

  return (
    <div className="space-y-4">
      {openClaims.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Claim On Your Record</AlertTitle>
          <AlertDescription>
            A landlord has filed {openClaims.length} {openClaims.length === 1 ? 'claim' : 'claims'} that
            reference you. Under Fair Housing rules, you have the right to review these and respond
            through your caseworker.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4" /> Special Claims History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {claims.map((claim: any) => (
            <div key={claim.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {CLAIM_TYPE_LABELS[claim.claim_type] || claim.claim_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {claim.submitted_date ? format(new Date(claim.submitted_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[claim.status] || 'secondary'}>
                  {claim.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Claimed: </span>
                  <span className="font-medium">${Number(claim.claim_amount).toFixed(2)}</span>
                </div>
                {claim.approved_amount != null && (
                  <div>
                    <span className="text-muted-foreground">Approved: </span>
                    <span className="font-medium">${Number(claim.approved_amount).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {claim.description && (
                <p className="text-xs text-muted-foreground">{claim.description}</p>
              )}

              {claim.denial_reason && (
                <p className="text-xs text-muted-foreground italic">
                  <span className="font-medium">Denial reason:</span> {claim.denial_reason}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantSpecialClaimNotice;
