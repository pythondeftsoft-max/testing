import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Clock, Eye, MapPin, Bed, DollarSign } from 'lucide-react';
import { useWorkerWorkload } from '@/hooks/useWorkerWorkload';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import TenantProfileModal from '@/components/TenantProfileModal';

interface WorkloadDashboardProps {
  onPushProperties?: (tenantId: string) => void;
}

export const WorkloadDashboard = ({ onPushProperties }: WorkloadDashboardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tenants } = useWorkerWorkload(user?.id);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Format bedrooms display
  const formatBedrooms = (bedrooms?: string[] | null): string => {
    if (!bedrooms || bedrooms.length === 0) return 'N/A';
    const parsed = bedrooms
      .map(br => {
        if (br === 'Studio') return '0';
        if (br.includes('BR')) {
          return br.replace('BR', '');
        }
        return br;
      })
      .sort();
    
    if (parsed.length === 1) return `${parsed[0]} BR`;
    return `${parsed[0]}-${parsed[parsed.length - 1]} BR`;
  };

  // Format rent range
  const formatRentRange = (min?: number | null, max?: number | null): string => {
    if (!min && !max) return 'N/A';
    if (min && max && min === max) return `$${min.toLocaleString()}`;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return 'N/A';
  };

  if (tenants.isLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>My Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Tenants ({tenants.data?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tenants.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No assigned tenants yet. Check the Unassigned Queue to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {tenants.data?.map((tenant) => (
              <div
                key={tenant.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  {/* Header with name and voucher badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{tenant.full_name}</span>
                    {tenant.voucher_holder && (
                      <Badge variant="success" className="text-xs">Voucher</Badge>
                    )}
                    <Badge variant={
                      tenant.housing_status === 'seeking' ? 'secondary' :
                      tenant.housing_status === 'applied' ? 'default' :
                      tenant.housing_status === 'approved' ? 'success' : 'outline'
                    }>
                      {tenant.housing_status}
                    </Badge>
                  </div>

                  {/* Details row with icons */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3 h-3" />
                      {formatBedrooms(tenant.bedrooms_approved)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatRentRange(tenant.rent_range_min, tenant.rent_range_max)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {tenant.city || 'N/A'}{tenant.zip_code && tenant.zip_code !== 'N/A' ? `, ${tenant.zip_code}` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(tenant.created_at))} seeking
                    </span>
                  </div>

                  {/* Application count */}
                  <div className="text-sm text-muted-foreground">
                    {tenant.applications_count} applications
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTenantId(tenant.id);
                      setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPushProperties?.(tenant.id)}
                    className="w-full sm:w-auto"
                  >
                    Push Properties <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Tenant Profile Modal */}
      {selectedTenantId && (
        <TenantProfileModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTenantId(null);
          }}
          tenantId={selectedTenantId}
          propertyId=""
        />
      )}
    </Card>
  );
};
