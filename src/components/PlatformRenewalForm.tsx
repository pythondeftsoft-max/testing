import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, ArrowLeft, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSendAdminEmail } from '@/hooks/useSendAdminEmail';
import { useUserEmail } from '@/hooks/useUserEmail';
import { format } from 'date-fns';

interface PlatformRenewalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantId: string;
  currentRent: number;
  currentLeaseEnd: string;
  propertyAddress: string;
  renewalType: 'platform_system' | 'platform_custom';
  templateId?: string | null;
  onSuccess?: () => void;
  onBack?: () => void;
}

interface LeaseTemplate {
  id: string;
  template_name: string;
  template_content: string;
  template_variables: any; // JSON type from Supabase
}

export const PlatformRenewalForm: React.FC<PlatformRenewalFormProps> = ({
  open,
  onOpenChange,
  propertyId,
  tenantId,
  currentRent,
  currentLeaseEnd,
  propertyAddress,
  renewalType,
  templateId,
  onSuccess,
  onBack
}) => {
  const [formData, setFormData] = useState({
    newRentAmount: currentRent.toString(),
    hapPortion: '',
    tenantPortion: '',
    rentDueDay: '1',
    proposedLeaseEnd: new Date(new Date(currentLeaseEnd).setFullYear(new Date(currentLeaseEnd).getFullYear() + 1)).toISOString().split('T')[0],
    responseDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    landlordName: '',
    landlordAgree: false
  });
  const [isVoucherTenant, setIsVoucherTenant] = useState(false);
  const [template, setTemplate] = useState<LeaseTemplate | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const sendEmail = useSendAdminEmail();
  const { data: tenantEmail } = useUserEmail(tenantId);

  useEffect(() => {
    if (renewalType === 'platform_custom' && templateId) {
      fetchTemplate();
    }
    checkVoucherStatus();
    fetchTenantName();
  }, [renewalType, templateId, tenantId]);

  const fetchTenantName = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', tenantId)
        .single();
      
      if (data) {
        setTenantName(`${data.first_name || ''} ${data.last_name || ''}`.trim() || '[Tenant Name]');
      }
    } catch (error) {
      console.error('Error fetching tenant name:', error);
    }
  };

  const checkVoucherStatus = async () => {
    try {
      const { data: rentSplit } = await supabase
        .from('rent_splits')
        .select('*')
        .eq('property_id', propertyId)
        .maybeSingle();

      if (rentSplit && (rentSplit.pha_portion || rentSplit.tenant_portion)) {
        setIsVoucherTenant(true);
        setFormData(prev => ({
          ...prev,
          hapPortion: rentSplit.pha_portion?.toString() || '0',
          tenantPortion: rentSplit.tenant_portion?.toString() || prev.newRentAmount
        }));
      } else {
        // Default: HAP = $0, Tenant pays full rent (market-rate)
        setFormData(prev => ({
          ...prev,
          hapPortion: '0',
          tenantPortion: prev.newRentAmount
        }));
      }
    } catch (error) {
      console.error('Error checking voucher status:', error);
    }
  };

  const fetchTemplate = async () => {
    if (!templateId) return;

    try {
      const { data, error } = await supabase
        .from('lease_renewal_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load template",
      });
    }
  };

  const generateSystemTemplate = (newRent: number, newLeaseEnd: string) => {
    const today = new Date().toLocaleDateString();
    const hapAmount = parseFloat(formData.hapPortion) || 0;
    const tenantAmount = parseFloat(formData.tenantPortion) || newRent;
    
    // Build rent section conditionally based on HAP portion
    const rentSection = hapAmount > 0 
      ? `4. RENT PAYMENT BREAKDOWN:
   Total Rent: $${newRent.toLocaleString()}
   Housing Assistance (HAP) Portion: $${hapAmount.toLocaleString()}
   Tenant Portion: $${tenantAmount.toLocaleString()}`
      : `4. Monthly rent amount: $${newRent.toLocaleString()}`;

    return `LEASE RENEWAL AGREEMENT

Property Address: ${propertyAddress}

This Lease Renewal Agreement is entered into between:

LANDLORD: ${formData.landlordName || '[Landlord Name]'}
TENANT: ${tenantName || '[Tenant Name]'}

TERMS OF RENEWAL:

1. Original lease expiration date: ${new Date(currentLeaseEnd).toLocaleDateString()}
2. New lease term start date: ${new Date(currentLeaseEnd).toLocaleDateString()}
3. New lease term end date: ${new Date(newLeaseEnd).toLocaleDateString()}
${rentSection}
5. All other terms and conditions of the original lease remain in effect unless modified herein.

SIGNATURES:

Landlord Signature: ${formData.landlordName}  Date: ${today}
${formData.landlordName}

Tenant Signature: ___________________________  Date: __________
${tenantName || '[Tenant Name]'}`;
  };

  const generateCustomTemplate = (templateContent: string, newRent: number, newLeaseEnd: string) => {
    const today = new Date().toLocaleDateString();
    const hapAmount = parseFloat(formData.hapPortion) || 0;
    const tenantAmount = parseFloat(formData.tenantPortion) || newRent;
    
    // Build rent breakdown for template variables
    const rentBreakdown = hapAmount > 0 
      ? `RENT PAYMENT BREAKDOWN:\n   Total Rent: $${newRent.toLocaleString()}\n   Housing Assistance (HAP) Portion: $${hapAmount.toLocaleString()}\n   Tenant Portion: $${tenantAmount.toLocaleString()}`
      : `Monthly rent amount: $${newRent.toLocaleString()}`;

    return templateContent
      .replace(/\{\{propertyAddress\}\}/g, propertyAddress)
      .replace(/\{\{currentLeaseEnd\}\}/g, new Date(currentLeaseEnd).toLocaleDateString())
      .replace(/\{\{newLeaseEnd\}\}/g, new Date(newLeaseEnd).toLocaleDateString())
      .replace(/\{\{newRentAmount\}\}/g, newRent.toLocaleString())
      .replace(/\{\{rentBreakdown\}\}/g, rentBreakdown)
      .replace(/\{\{hapPortion\}\}/g, hapAmount > 0 ? hapAmount.toLocaleString() : '')
      .replace(/\{\{tenantPortion\}\}/g, tenantAmount.toLocaleString())
      .replace(/\{\{additionalTerms\}\}/g, formData.notes || 'None specified')
      .replace(/\{\{landlordName\}\}/g, formData.landlordName || '[Landlord Name]')
      .replace(/\{\{tenantName\}\}/g, tenantName || '[Tenant Name]')
      .replace(
        /Landlord Signature: _+\s+Date: _+/g, 
        `Landlord Signature: ${formData.landlordName}  Date: ${today}`
      );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate landlord signature
      if (!formData.landlordName.trim()) {
        toast({
          variant: "destructive",
          title: "Signature Required",
          description: "Please enter your full legal name",
        });
        setLoading(false);
        return;
      }

      if (!formData.landlordAgree) {
        toast({
          variant: "destructive",
          title: "Agreement Required",
          description: "Please agree to sign this document electronically",
        });
        setLoading(false);
        return;
      }

      // Validate all required fields
      const newRent = parseFloat(formData.newRentAmount);
      if (isNaN(newRent) || newRent <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Rent Amount",
          description: "Please enter a valid rent amount",
        });
        setLoading(false);
        return;
      }

      // Validate rent portions (always required)
      const hapPortion = parseFloat(formData.hapPortion);
      const tenantPortion = parseFloat(formData.tenantPortion);
      
      if (isNaN(hapPortion) || hapPortion < 0 || isNaN(tenantPortion) || tenantPortion < 0) {
        toast({
          variant: "destructive",
          title: "Invalid Portions",
          description: "Please enter valid HAP and tenant portions",
        });
        setLoading(false);
        return;
      }

      if (Math.abs((hapPortion + tenantPortion) - newRent) > 0.01) {
        toast({
          variant: "destructive",
          title: "Portion Mismatch",
          description: "HAP portion + Tenant portion must equal total rent",
        });
        setLoading(false);
        return;
      }

      if (!formData.proposedLeaseEnd) {
        toast({
          variant: "destructive",
          title: "Missing Lease End Date",
          description: "Please specify the new lease end date",
        });
        setLoading(false);
        return;
      }

      // Validate dates
      const currentLeaseDate = new Date(currentLeaseEnd);
      const proposedLeaseDate = new Date(formData.proposedLeaseEnd);
      const responseDueDate = new Date(formData.responseDueDate);

      if (proposedLeaseDate <= currentLeaseDate) {
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: "New lease end date must be after current lease end date",
        });
        return;
      }

      if (responseDueDate <= new Date()) {
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: "Response due date must be in the future",
        });
        return;
      }

      // Check for existing active renewals
      const { data: existingRenewals } = await supabase
        .from('lease_renewals')
        .select('id')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .in('renewal_status', ['pending', 'sent']);

      if (existingRenewals && existingRenewals.length > 0) {
        toast({
          variant: "destructive",
          title: "Active Renewal Exists",
          description: "There is already an active lease renewal for this tenant",
        });
        return;
      }

      // Create lease renewal
      const renewalData = {
        property_id: propertyId,
        tenant_id: tenantId,
        current_lease_end: currentLeaseEnd,
        proposed_lease_end: formData.proposedLeaseEnd,
        new_rent_amount: parseFloat(formData.newRentAmount),
        new_hap_portion: parseFloat(formData.hapPortion),
        new_tenant_portion: parseFloat(formData.tenantPortion),
        new_rent_due_day: parseInt(formData.rentDueDay),
        renewal_status: 'sent',
        renewal_type: renewalType,
        custom_template_uploaded: renewalType === 'platform_custom',
        notice_sent_date: new Date().toISOString().split('T')[0],
        response_due_date: formData.responseDueDate,
        notes: formData.notes || null
      };

      const { data: renewalResult, error: renewalError } = await supabase
        .from('lease_renewals')
        .insert(renewalData)
        .select()
        .single();

      if (renewalError) throw renewalError;

      // Generate contract content
      const contractContent = renewalType === 'platform_custom' && template
        ? generateCustomTemplate(template.template_content, parseFloat(formData.newRentAmount), formData.proposedLeaseEnd)
        : generateSystemTemplate(parseFloat(formData.newRentAmount), formData.proposedLeaseEnd);

      // Create contract with landlord signature
      const contractData = {
        lease_renewal_id: renewalResult.id,
        contract_template: contractContent,
        contract_status: 'landlord_signed',
        landlord_signature: JSON.stringify({
          name: formData.landlordName,
          date: new Date().toISOString(),
          timestamp: Date.now()
        }),
        landlord_signed_at: new Date().toISOString(),
        ...(renewalType === 'platform_custom' && template ? { template_id: template.id } : {})
      };

      const { error: contractError } = await supabase
        .from('lease_renewal_contracts')
        .insert(contractData);

      if (contractError) throw contractError;

      // Send notification to tenant
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: tenantId,
        title: 'Lease Renewal Offer Received',
        description: `Your landlord has sent you a lease renewal offer for ${propertyAddress}. Please review and respond.`,
        type: 'lease_renewal',
        category: 'Lease',
        priority: 'high',
        link: '/dashboard?tab=Rent Payments&subTab=lease-renewal'
      });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't throw - lease renewal was created successfully
      }

      // Send email notification to tenant
      if (tenantEmail) {
        try {
          // Get tenant's name from profiles
          const { data: tenantProfile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', tenantId)
            .single();

          const tenantName = tenantProfile?.first_name || 'Valued Tenant';
          
          await sendEmail.mutateAsync({
            templateSlug: 'lease_renewal_offer_sent',
            recipientEmail: tenantEmail,
            contextVariables: {
              tenant_name: tenantName,
              property_address: propertyAddress,
              current_rent: currentRent.toString(),
              new_rent: formData.newRentAmount,
              current_lease_end: format(new Date(currentLeaseEnd), 'MMMM d, yyyy'),
              proposed_lease_end: format(new Date(formData.proposedLeaseEnd), 'MMMM d, yyyy'),
              response_due_date: format(new Date(formData.responseDueDate), 'MMMM d, yyyy'),
              view_link: `${window.location.origin}/dashboard?tab=Rent+Payments&subTab=lease-renewal`,
              notes: formData.notes || 'No additional notes provided'
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't throw - lease renewal was created successfully
          toast({
            title: "Warning",
            description: "Renewal sent but email notification failed. Tenant can still view it in the dashboard.",
            variant: "default"
          });
        }
      }

      toast({
        title: "Success",
        description: "Lease renewal offer sent to tenant successfully",
      });

      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Error sending lease renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send lease renewal offer",
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
            <DialogTitle>
              {renewalType === 'platform_custom' ? 'Custom Template Renewal' : 'Standard Renewal'}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Sending renewal offer for: <strong>{propertyAddress}</strong>
            </p>
            
            {renewalType === 'platform_custom' && template && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                  </div>
                  <CardDescription>
                    Using custom template with {Object.keys(template.template_variables || {}).length} variables
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">Custom Template</Badge>
                </CardContent>
              </Card>
            )}
            
            {renewalType === 'platform_system' && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Using OpenKey Standard Template</span>
                    <Badge variant="outline">System Template</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="newRent">Total Monthly Rent *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newRent"
                  type="number"
                  value={formData.newRentAmount}
                  onChange={(e) => {
                    const total = e.target.value;
                    setFormData(prev => {
                      const totalNum = parseFloat(total) || 0;
                      const hapNum = parseFloat(prev.hapPortion) || 0;
                      
                      // Auto-calculate tenant portion when total changes
                      const newTenantPortion = Math.max(0, totalNum - hapNum).toFixed(2);
                      
                      return {
                        ...prev,
                        newRentAmount: total,
                        tenantPortion: newTenantPortion
                      };
                    });
                  }}
                  className="pl-10"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Rent Split Information - Always shown */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Rent Split:</strong> HAP Portion is what the housing authority pays. Tenant Portion is what the tenant pays directly each month.
                </p>
                {isVoucherTenant && (
                  <Badge variant="secondary" className="mb-2">Voucher Tenant</Badge>
                )}
                {!isVoucherTenant && (
                  <p className="text-xs text-muted-foreground">For market-rate tenants, set HAP to $0 and tenant pays full rent.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hapPortion">HAP Portion (PHA Pays) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="hapPortion"
                    type="number"
                    value={formData.hapPortion}
                    onChange={(e) => {
                      const hap = e.target.value;
                      setFormData(prev => {
                        const totalNum = parseFloat(prev.newRentAmount) || 0;
                        const hapNum = parseFloat(hap) || 0;
                        const newTenantPortion = Math.max(0, totalNum - hapNum).toFixed(2);
                        
                        return {
                          ...prev,
                          hapPortion: hap,
                          tenantPortion: newTenantPortion
                        };
                      });
                    }}
                    className="pl-10"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

              <div>
                <Label htmlFor="tenantPortion">Tenant Portion (Tenant Pays) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="tenantPortion"
                    type="number"
                    value={formData.tenantPortion}
                    onChange={(e) => {
                      const tenant = e.target.value;
                      setFormData(prev => {
                        const totalNum = parseFloat(prev.newRentAmount) || 0;
                        const tenantNum = parseFloat(tenant) || 0;
                        const newHapPortion = Math.max(0, totalNum - tenantNum).toFixed(2);
                        
                        return {
                          ...prev,
                          tenantPortion: tenant,
                          hapPortion: newHapPortion
                        };
                      });
                    }}
                    className="pl-10"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This is the amount the tenant will pay each month
                </p>
              </div>
            </div>

            {/* Rent Summary */}
            {formData.newRentAmount && formData.hapPortion && formData.tenantPortion && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>Total Rent:</span>
                      <span>${parseFloat(formData.newRentAmount || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>HAP (PHA):</span>
                      <span>${parseFloat(formData.hapPortion || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tenant:</span>
                      <span>${parseFloat(formData.tenantPortion || '0').toFixed(2)}</span>
                    </div>
                    {Math.abs((parseFloat(formData.hapPortion || '0') + parseFloat(formData.tenantPortion || '0')) - parseFloat(formData.newRentAmount || '0')) > 0.01 && (
                      <p className="text-xs text-destructive mt-2">⚠️ Portions don't add up to total rent</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="rentDueDay">Rent Due Date (Day of Month) *</Label>
              <select
                id="rentDueDay"
                value={formData.rentDueDay}
                onChange={(e) => setFormData(prev => ({ ...prev, rentDueDay: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="proposedEnd">New Lease End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="proposedEnd"
                  type="date"
                  value={formData.proposedLeaseEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, proposedLeaseEnd: e.target.value }))}
                  className="pl-10"
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="responseDate">Response Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="responseDate"
                  type="date"
                  value={formData.responseDueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, responseDueDate: e.target.value }))}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">
                {renewalType === 'platform_custom' ? 'Additional Terms' : 'Notes for Tenant'} (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder={renewalType === 'platform_custom' 
                  ? "Additional terms that will be included in the contract..." 
                  : "Any additional terms or conditions..."
                }
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Landlord Signature (Required)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="landlordName">Full Legal Name *</Label>
                <Input
                  id="landlordName"
                  type="text"
                  placeholder="Enter your full legal name"
                  value={formData.landlordName}
                  onChange={(e) => setFormData(prev => ({ ...prev, landlordName: e.target.value }))}
                  required
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <strong>Date:</strong> {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="landlordAgree"
                  checked={formData.landlordAgree}
                  onChange={(e) => setFormData(prev => ({ ...prev, landlordAgree: e.target.checked }))}
                  className="mt-1"
                  required
                />
                <Label htmlFor="landlordAgree" className="text-sm font-normal cursor-pointer">
                  I agree to sign this lease renewal document electronically and confirm that all information provided is accurate.
                </Label>
              </div>
            </CardContent>
          </Card>

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
              {loading ? 'Signing & Sending...' : 'Sign & Send Renewal Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};