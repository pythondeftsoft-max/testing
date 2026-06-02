import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminApplicationActions } from '@/hooks/useAdminApplicationActions';
import { Calendar, User, Users } from 'lucide-react';

interface UnitTenantInfoProps {
  formData: {
    tenant_type: string;
    has_voucher: boolean;
    pha_portion: string;
    tenant_portion: string;
    status: string;
  };
  updateFormData: (field: string, value: string | boolean) => void;
  unitId?: string;
  propertyId: string;
}

export const UnitTenantInfo: React.FC<UnitTenantInfoProps> = ({
  formData,
  updateFormData,
  unitId,
  propertyId,
}) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { listApplications } = useAdminApplicationActions(propertyId);

  const isVacant = formData.status === 'available' || formData.status === 'vacant';

  useEffect(() => {
    if (isVacant && unitId) {
      fetchApplications();
    }
  }, [isVacant, unitId]);

  const fetchApplications = async () => {
    if (!unitId) return;
    
    setLoading(true);
    try {
      const allApplications = await listApplications();
      // Filter applications for this specific unit
      const unitApplications = allApplications.filter(app => app.unit_id === unitId);
      setApplications(unitApplications);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      approved: { variant: 'default' as const, label: 'Approved' },
      denied: { variant: 'destructive' as const, label: 'Denied' },
      reviewing: { variant: 'outline' as const, label: 'Under Review' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isVacant) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Unit Applications
            </CardTitle>
            <CardDescription>
              Applications submitted for this vacant unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground mb-4">
                  No applications have been submitted for this unit.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  {applications.length} application{applications.length !== 1 ? 's' : ''} found
                </div>
                {applications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{application.tenant_name || 'Unknown Applicant'}</h4>
                          <p className="text-sm text-muted-foreground">{application.tenant_email}</p>
                        </div>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Applied: {new Date(application.created_at).toLocaleDateString()}
                      </div>
                      {application.tenant_phone && (
                        <div className="text-muted-foreground">
                          Phone: {application.tenant_phone}
                        </div>
                      )}
                    </div>
                    
                    {application.notes && (
                      <div className="mt-3 p-3 bg-muted rounded text-sm">
                        <strong>Notes:</strong> {application.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show tenant info form for occupied units
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          <CardDescription>
            Configure tenant-related information including voucher details and rent portions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tenant_type">Tenant Type</Label>
            <Select value={formData.tenant_type} onValueChange={(value) => updateFormData('tenant_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select tenant type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="section8">Section 8</SelectItem>
                <SelectItem value="affordable">Affordable Housing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_voucher"
              checked={formData.has_voucher}
              onCheckedChange={(checked) => updateFormData('has_voucher', !!checked)}
            />
            <Label htmlFor="has_voucher">Has Housing Voucher</Label>
          </div>

          {formData.has_voucher && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pha_portion">PHA Portion</Label>
                <Input
                  id="pha_portion"
                  type="number"
                  step="0.01"
                  value={formData.pha_portion}
                  onChange={(e) => updateFormData('pha_portion', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="tenant_portion">Tenant Portion</Label>
                <Input
                  id="tenant_portion"
                  type="number"
                  step="0.01"
                  value={formData.tenant_portion}
                  onChange={(e) => updateFormData('tenant_portion', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};