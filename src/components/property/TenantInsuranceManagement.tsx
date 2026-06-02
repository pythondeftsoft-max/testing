import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Edit, Calendar, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { TenantInsuranceEntryForm } from "@/components/tenant/TenantInsuranceEntryForm";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';

interface TenantInsuranceManagementProps {
  propertyId: string;
  tenantId?: string;
}

export const TenantInsuranceManagement: React.FC<TenantInsuranceManagementProps> = ({
  propertyId,
  tenantId
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<any>(null);

  const { data: insuranceRecords, isLoading, refetch } = useQuery({
    queryKey: ['property-insurance', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('tenant_insurance')
        .select(`
          *,
          profiles:tenant_id (
            first_name,
            last_name
          )
        `)
        .eq('property_id', propertyId);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!propertyId
  });

  const handleFormSave = () => {
    setIsFormOpen(false);
    setEditingInsurance(null);
    refetch();
  };

  const getExpirationStatus = (expirationDate: string, isActive: boolean) => {
    if (!isActive) return { status: 'inactive', color: 'destructive', icon: AlertCircle };
    
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = differenceInDays(expDate, today);

    if (daysUntilExpiration < 0) {
      return { status: 'expired', color: 'destructive', icon: AlertCircle };
    } else if (daysUntilExpiration <= 30) {
      return { status: 'expiring-soon', color: 'orange', icon: AlertCircle };
    } else {
      return { status: 'active', color: 'green', icon: CheckCircle };
    }
  };

  const getPolicyTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      'HO-4': 'default',
      'MSI': 'secondary',
      'Third-party': 'outline',
      'Basic Liability': 'outline',
      'Comprehensive Coverage': 'default'
    };
    return <Badge variant={variants[type] as any || 'outline'}>{type}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading insurance records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tenant Insurance
            </CardTitle>
            <CardDescription>
              Manage renters insurance information for this property
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Insurance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Tenant Insurance</DialogTitle>
              </DialogHeader>
              <TenantInsuranceEntryForm
                propertyId={propertyId}
                tenantId={tenantId || ''}
                existingInsurance={editingInsurance}
                onSave={handleFormSave}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {!insuranceRecords?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insurance records found for this property.</p>
            <p className="text-sm">Add tenant insurance information to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insuranceRecords.map((record) => {
              const expStatus = getExpirationStatus(record.expiration_date, record.is_active);
              const StatusIcon = expStatus.icon;
              
              return (
                <div key={record.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">
                          {record.profiles?.first_name} {record.profiles?.last_name}
                        </h4>
                        {getPolicyTypeBadge(record.policy_type)}
                        <Badge 
                          className={
                            expStatus.color === 'destructive' ? 'bg-red-100 text-red-800 border-red-300' :
                            expStatus.color === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                            'bg-green-100 text-green-800 border-green-300'
                          }
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {expStatus.status === 'inactive' ? 'Inactive' :
                           expStatus.status === 'expired' ? 'Expired' :
                           expStatus.status === 'expiring-soon' ? 'Expires Soon' : 'Active'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-muted-foreground">Provider & Policy</div>
                          <div>{record.provider_name}</div>
                          <div className="text-muted-foreground">{record.policy_number}</div>
                        </div>

                        <div>
                          <div className="font-medium text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Coverage
                          </div>
                          <div>Liability: ${record.liability_coverage?.toLocaleString()}</div>
                          <div>Property: ${record.personal_property_coverage?.toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Policy Period
                          </div>
                          <div>{format(new Date(record.effective_date), 'MMM dd, yyyy')}</div>
                          <div>to {format(new Date(record.expiration_date), 'MMM dd, yyyy')}</div>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingInsurance(record);
                        setIsFormOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  {record.premium_amount && (
                    <div className="pt-2 border-t text-sm text-muted-foreground">
                      Premium: ${record.premium_amount} / {record.payment_frequency || 'monthly'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};