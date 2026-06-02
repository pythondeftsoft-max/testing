import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, ArrowLeft, Upload, FileText, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExternalRenewalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantId: string;
  currentRent: number;
  currentLeaseEnd: string;
  propertyAddress: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const ExternalRenewalForm: React.FC<ExternalRenewalFormProps> = ({
  open,
  onOpenChange,
  propertyId,
  tenantId,
  currentRent,
  currentLeaseEnd,
  propertyAddress,
  onSuccess,
  onBack
}) => {
  const [formData, setFormData] = useState({
    newRentAmount: currentRent.toString(),
    hapPortion: '0',
    tenantPortion: currentRent.toString(),
    rentDueDay: '1',
    newLeaseEnd: new Date(new Date(currentLeaseEnd).setFullYear(new Date(currentLeaseEnd).getFullYear() + 1)).toISOString().split('T')[0],
    actualSignedDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [leaseDocument, setLeaseDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVoucherTenant, setIsVoucherTenant] = useState(false);
  const { toast } = useToast();

  // Check for existing voucher status and rent split data
  useEffect(() => {
    const checkVoucherStatus = async () => {
      try {
        // Fetch existing rent splits
        const { data: rentSplits } = await supabase
          .from('rent_splits')
          .select('*')
          .eq('property_id', propertyId)
          .eq('is_active', true)
          .order('effective_date', { ascending: false })
          .limit(1);

        if (rentSplits && rentSplits.length > 0) {
          const split = rentSplits[0];
          // Pre-populate with existing split data
          setFormData(prev => ({
            ...prev,
            hapPortion: split.pha_portion?.toString() || '0',
            tenantPortion: split.tenant_portion?.toString() || currentRent.toString(),
            rentDueDay: split.tenant_payment_day?.toString() || '1'
          }));

          // Detect if voucher tenant
          if (split.pha_portion && split.pha_portion > 0) {
            setIsVoucherTenant(true);
          }
        } else {
          // Default to market-rate (HAP = $0, Tenant = Full Rent)
          setFormData(prev => ({
            ...prev,
            hapPortion: '0',
            tenantPortion: currentRent.toString(),
            rentDueDay: '1'
          }));
        }

        // Also check property rent_due_day for backup
        const { data: property } = await supabase
          .from('properties')
          .select('rent_due_day')
          .eq('id', propertyId)
          .single();

        if (property?.rent_due_day && formData.rentDueDay === '1') {
          setFormData(prev => ({
            ...prev,
            rentDueDay: property.rent_due_day.toString()
          }));
        }
      } catch (error) {
        console.error('Error checking voucher status:', error);
      }
    };

    if (propertyId) {
      checkVoucherStatus();
    }
  }, [propertyId, currentRent]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a PDF, JPG, or PNG file",
        });
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB",
        });
        return;
      }

      setLeaseDocument(file);
    }
  };

  const uploadDocument = async (file: File, renewalId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${renewalId}_${Date.now()}.${fileExt}`;
      const filePath = `lease-renewals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading document:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!formData.newRentAmount || !formData.newLeaseEnd || !formData.actualSignedDate) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill in all required fields",
        });
        return;
      }

      // Validate document is uploaded
      if (!leaseDocument) {
        toast({
          variant: "destructive",
          title: "Lease Document Required",
          description: "Please upload the signed lease document",
        });
        return;
      }

      // Validate rent split portions
      const totalRent = parseFloat(formData.newRentAmount);
      const hapPortion = parseFloat(formData.hapPortion);
      const tenantPortion = parseFloat(formData.tenantPortion);

      if (Math.abs((hapPortion + tenantPortion) - totalRent) > 0.01) {
        toast({
          variant: "destructive",
          title: "Invalid Rent Split",
          description: `HAP Portion ($${hapPortion}) + Tenant Portion ($${tenantPortion}) must equal Total Rent ($${totalRent})`,
        });
        return;
      }

      // Validate dates
      const currentLeaseDate = new Date(currentLeaseEnd);
      const newLeaseDate = new Date(formData.newLeaseEnd);
      const signedDate = new Date(formData.actualSignedDate);

      if (newLeaseDate <= currentLeaseDate) {
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: "New lease end date must be after current lease end date",
        });
        return;
      }

      if (signedDate > new Date()) {
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: "Signed date cannot be in the future",
        });
        return;
      }

      // Check for existing active renewals
      const { data: existingRenewals } = await supabase
        .from('lease_renewals')
        .select('id')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .in('renewal_status', ['pending', 'sent', 'signed']);

      if (existingRenewals && existingRenewals.length > 0) {
        toast({
          variant: "destructive",
          title: "Active Renewal Exists",
          description: "There is already an active lease renewal for this tenant",
        });
        return;
      }

      // Create lease renewal record
      const renewalData = {
        property_id: propertyId,
        tenant_id: tenantId,
        current_lease_end: currentLeaseEnd,
        proposed_lease_end: formData.newLeaseEnd,
        new_rent_amount: parseFloat(formData.newRentAmount),
        renewal_status: 'signed', // External renewals are already completed
        renewal_type: 'external',
        custom_template_uploaded: false,
        notice_sent_date: formData.actualSignedDate,
        response_due_date: formData.actualSignedDate,
        signed_date: formData.actualSignedDate,
        notes: formData.notes || 'External renewal recorded - lease document uploaded'
      };

      const { data: renewalResult, error: renewalError } = await supabase
        .from('lease_renewals')
        .insert(renewalData)
        .select()
        .single();

      if (renewalError) throw renewalError;

      // Upload document (required)
      const documentPath = await uploadDocument(leaseDocument!, renewalResult.id);
      if (!documentPath) {
        toast({
          variant: "destructive",
          title: "Document Upload Failed",
          description: "Failed to upload the lease document. Please try again.",
        });
        return;
      }

      // Update renewal with document path
      await supabase
        .from('lease_renewals')
        .update({ external_lease_document_path: documentPath })
        .eq('id', renewalResult.id);

      // Create a simple contract record for consistency
      const contractContent = `EXTERNAL LEASE RENEWAL RECORD

Property Address: ${propertyAddress}
Tenant: [Tenant Name]
Landlord: [Landlord Name]

Renewal Details:
- Original lease end: ${new Date(currentLeaseEnd).toLocaleDateString()}
- New lease end: ${new Date(formData.newLeaseEnd).toLocaleDateString()}
- New monthly rent: $${parseFloat(formData.newRentAmount).toLocaleString()}
- Signed date: ${new Date(formData.actualSignedDate).toLocaleDateString()}

Note: This lease renewal was processed outside of OpenKey. 
Signed lease document has been uploaded to OpenKey for record keeping.`;

      await supabase.from('lease_renewal_contracts').insert({
        lease_renewal_id: renewalResult.id,
        contract_template: contractContent,
        contract_status: 'signed',
        landlord_signed: true,
        tenant_signed: true,
        landlord_signed_at: formData.actualSignedDate,
        tenant_signed_at: formData.actualSignedDate
      });

      // Update property lease information
      await supabase
        .from('properties')
        .update({
          lease_end_date: formData.newLeaseEnd,
          monthly_rent: parseFloat(formData.newRentAmount),
          rent_due_day: parseInt(formData.rentDueDay)
        })
        .eq('id', propertyId);

      // Upsert rent_splits table
      await supabase
        .from('rent_splits')
        .upsert({
          property_id: propertyId,
          total_rent: parseFloat(formData.newRentAmount),
          pha_portion: parseFloat(formData.hapPortion),
          tenant_portion: parseFloat(formData.tenantPortion),
          tenant_payment_day: parseInt(formData.rentDueDay),
          effective_date: formData.newLeaseEnd,
          is_active: true
        }, {
          onConflict: 'property_id',
          ignoreDuplicates: false
        });

      // Send notification to tenant
      await supabase.from('notifications').insert({
        user_id: tenantId,
        title: 'Lease Renewal Completed',
        description: `Your lease renewal for ${propertyAddress} has been processed and updated in OpenKey.`,
        type: 'success',
        link: '/tenant/lease-info'
      });

      toast({
        title: "Success",
        description: "External lease renewal has been recorded successfully",
      });

      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Error recording external renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record external lease renewal",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle>Record External Lease Renewal</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">External Renewal Process</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Use this option when you've already completed the lease renewal process outside of OpenKey. 
                    This will update your property records and maintain accurate lease information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Recording renewal for: <strong>{propertyAddress}</strong>
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="newRent">New Monthly Rent Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newRent"
                  type="number"
                  value={formData.newRentAmount}
                  onChange={(e) => {
                    const newTotal = e.target.value;
                    const hap = parseFloat(formData.hapPortion) || 0;
                    const tenant = parseFloat(newTotal) - hap;
                    setFormData(prev => ({ 
                      ...prev, 
                      newRentAmount: newTotal,
                      tenantPortion: tenant >= 0 ? tenant.toFixed(2) : '0'
                    }));
                  }}
                  className="pl-10"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Rent Split Section */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Rent Split Details</CardTitle>
                  {isVoucherTenant && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Voucher Tenant
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  HAP Portion is what the housing authority pays. Tenant Portion is what the tenant pays directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div>
                  <Label htmlFor="hapPortion" className="text-sm">HAP Portion (PHA Pays)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="hapPortion"
                      type="number"
                      value={formData.hapPortion}
                      onChange={(e) => {
                        const hap = e.target.value;
                        const total = parseFloat(formData.newRentAmount) || 0;
                        const tenant = total - parseFloat(hap);
                        setFormData(prev => ({ 
                          ...prev, 
                          hapPortion: hap,
                          tenantPortion: tenant >= 0 ? tenant.toFixed(2) : '0'
                        }));
                      }}
                      className="pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tenantPortion" className="text-sm">Tenant Portion (Tenant Pays)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="tenantPortion"
                      type="number"
                      value={formData.tenantPortion}
                      onChange={(e) => {
                        const tenant = e.target.value;
                        const total = parseFloat(formData.newRentAmount) || 0;
                        const hap = total - parseFloat(tenant);
                        setFormData(prev => ({ 
                          ...prev, 
                          tenantPortion: tenant,
                          hapPortion: hap >= 0 ? hap.toFixed(2) : '0'
                        }));
                      }}
                      className="pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="rentDueDay" className="text-sm">Rent Due Day *</Label>
                  <Select 
                    value={formData.rentDueDay} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, rentDueDay: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Day of the month when rent is due
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Rent Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">Rent Breakdown</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Total Rent</p>
                        <p className="font-semibold">${parseFloat(formData.newRentAmount || '0').toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">HAP (PHA)</p>
                        <p className="font-semibold">${parseFloat(formData.hapPortion || '0').toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tenant</p>
                        <p className="font-semibold">${parseFloat(formData.tenantPortion || '0').toFixed(2)}</p>
                      </div>
                    </div>
                    {Math.abs((parseFloat(formData.hapPortion) + parseFloat(formData.tenantPortion)) - parseFloat(formData.newRentAmount)) > 0.01 && (
                      <Badge variant="destructive" className="text-xs">
                        Warning: Portions don't add up to total rent
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label htmlFor="newLeaseEnd">New Lease End Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newLeaseEnd"
                  type="date"
                  value={formData.newLeaseEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, newLeaseEnd: e.target.value }))}
                  className="pl-10"
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="signedDate">Date Renewal Was Signed *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signedDate"
                  type="date"
                  value={formData.actualSignedDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualSignedDate: e.target.value }))}
                  className="pl-10"
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="leaseDocument">Upload Signed Lease Document *</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">The signed lease document is required for external renewals</p>
              <div className="mt-2">
                <input
                  type="file"
                  id="leaseDocument"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                <label
                  htmlFor="leaseDocument"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    leaseDocument 
                      ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                      : 'border-destructive/50 bg-destructive/5 hover:bg-destructive/10'
                  }`}
                >
                  {leaseDocument ? (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <FileText className="w-4 h-4" />
                      <span>{leaseDocument.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-sm text-destructive">
                      <Upload className="w-6 h-6" />
                      <span className="font-medium">Click to upload signed lease document</span>
                      <span className="text-xs">PDF, JPG, PNG (max 10MB) - Required</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information about the renewal..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Renewal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};