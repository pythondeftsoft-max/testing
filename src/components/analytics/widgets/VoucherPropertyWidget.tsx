import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface VoucherProperty {
  id: string;
  address: string;
  monthly_rent: number;
  has_voucher: boolean;
  property_applications?: Array<{
    status: string;
    profiles?: {
      first_name: string;
      last_name: string;
    };
  }>;
}

interface VoucherPropertyWidgetProps {
  landlordId: string;
  onViewProperty?: (propertyId: string) => void;
}

export const VoucherPropertyWidget = ({ landlordId, onViewProperty }: VoucherPropertyWidgetProps) => {
  const { data: voucherProperties, isLoading, error } = useQuery({
    queryKey: ['voucher-properties', landlordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          has_voucher,
          property_applications(
            status,
            profiles!property_applications_tenant_id_fkey(first_name, last_name)
          )
        `)
        .eq('owner_id', landlordId)
        .eq('has_voucher', true)
        .is('deleted_at', null);

      if (error) throw error;
      return (data || []) as VoucherProperty[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !voucherProperties) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Unable to load voucher properties</p>
        </CardContent>
      </Card>
    );
  }

  if (voucherProperties.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No voucher properties found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Properties with vouchers will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPropertyStatus = (property: VoucherProperty) => {
    const activeApplications = property.property_applications?.filter(app => 
      ['pending', 'approved', 'screening'].includes(app.status)
    );
    if (activeApplications && activeApplications.length > 0) return 'processing';
    return 'vacant';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'default';
      case 'processing': return 'secondary';
      case 'vacant': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'occupied': return CheckCircle;
      case 'processing': return Clock;
      case 'vacant': return Building2;
      default: return Building2;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Voucher Properties ({voucherProperties.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {voucherProperties.map((property) => {
          const status = getPropertyStatus(property);
          const StatusIcon = getStatusIcon(status);
          return (
            <div key={property.id} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="font-medium text-sm">{property.address}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(property.monthly_rent || 0)}/month
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(status)} className="text-xs">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                  {onViewProperty && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewProperty(property.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {status === 'processing' && property.property_applications && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {property.property_applications.length} application(s) in progress
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};