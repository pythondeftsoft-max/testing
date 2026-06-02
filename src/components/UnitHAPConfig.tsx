import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building, User, CheckCircle, AlertCircle, Clock, DollarSign, CreditCard } from 'lucide-react';
import { PlaidLink } from './PlaidLink';

interface UnitHAPConfigProps {
  propertyId: string;
  unitId: string;
  unitNumber: string;
  onConfigUpdated?: () => void;
}

const UnitHAPConfig = ({ propertyId, unitId, unitNumber, onConfigUpdated }: UnitHAPConfigProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    payee_type: 'landlord',
    payee_name: '',
    bank_name: '',
    routing_number: '',
    account_number: '',
    account_type: 'checking',
    pha_approval_status: 'pending',
    auto_tracking_enabled: false,
    forms_submitted_to_pha: false
  });

  useEffect(() => {
    fetchConfig();
  }, [unitId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('hap_payee_configs')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
        setFormData({
          payee_type: data.payee_type,
          payee_name: data.payee_name || '',
          bank_name: data.bank_name || '',
          routing_number: data.routing_number || '',
          account_number: '',
          account_type: data.account_type || 'checking',
          pha_approval_status: data.pha_approval_status || 'pending',
          auto_tracking_enabled: data.auto_tracking_enabled || false,
          forms_submitted_to_pha: data.forms_submitted_to_pha || false
        });
      }
    } catch (error) {
      console.error('Error fetching unit HAP config:', error);
      toast({
        title: "Error",
        description: "Failed to load unit HAP configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify property ownership
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id, owner_id')
        .eq('id', propertyId)
        .single();

      if (propertyError || property.owner_id !== user.id) {
        throw new Error('You do not have permission to configure this property');
      }
      
      const configData = {
        property_id: propertyId,
        unit_id: unitId,
        payee_type: formData.payee_type,
        payee_name: formData.payee_name,
        bank_name: formData.bank_name,
        routing_number: formData.routing_number,
        account_type: formData.account_type,
        pha_approval_status: formData.pha_approval_status,
        auto_tracking_enabled: formData.auto_tracking_enabled,
        forms_submitted_to_pha: formData.forms_submitted_to_pha,
        created_by: user.id,
        ...(formData.forms_submitted_to_pha && !config?.submitted_at && { submitted_at: new Date().toISOString() }),
        ...(formData.pha_approval_status === 'approved' && !config?.approved_at && { approved_at: new Date().toISOString() }),
        ...(formData.account_number && { account_number_encrypted: formData.account_number })
      };

      if (config) {
        const { error } = await supabase
          .from('hap_payee_configs')
          .update(configData)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hap_payee_configs')
          .insert(configData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `HAP configuration saved for Unit ${unitNumber}`
      });

      fetchConfig();
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error saving unit HAP config:', error);
      toast({
        title: "Error",
        description: "Failed to save unit HAP configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'outline', text: 'Pending Approval', icon: Clock },
      approved: { variant: 'default', text: 'Approved & Active', icon: CheckCircle },
      rejected: { variant: 'destructive', text: 'Rejected', icon: AlertCircle }
    };

    const statusConfig = variants[status as keyof typeof variants] || variants.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {statusConfig.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Unit {unitNumber} HAP Configuration
          </div>
          {config && getStatusBadge(config.pha_approval_status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payee Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="payee-type">Who receives HAP funds for this unit?</Label>
          <Select 
            value={formData.payee_type} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, payee_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landlord">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Landlord (Property Owner)
                </div>
              </SelectItem>
              <SelectItem value="property_manager">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Property Manager
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payee Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payee-name">Payee Name *</Label>
            <Input
              id="payee-name"
              value={formData.payee_name}
              onChange={(e) => setFormData(prev => ({ ...prev, payee_name: e.target.value }))}
              placeholder="Full legal name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-name">Bank Name</Label>
            <Input
              id="bank-name"
              value={formData.bank_name}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
              placeholder="e.g., Chase Bank"
            />
          </div>
        </div>

        {/* Banking Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="routing-number">Routing Number *</Label>
            <Input
              id="routing-number"
              value={formData.routing_number}
              onChange={(e) => setFormData(prev => ({ ...prev, routing_number: e.target.value }))}
              placeholder="9-digit routing number"
              maxLength={9}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-number">Account Number *</Label>
            <Input
              id="account-number"
              type="password"
              value={formData.account_number}
              onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
              placeholder="Enter to update"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-type">Account Type</Label>
            <Select 
              value={formData.account_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Controls */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Automatic Payment Tracking</Label>
              <p className="text-sm text-muted-foreground">Enable automatic tracking for this unit</p>
            </div>
            <Switch
              checked={formData.auto_tracking_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_tracking_enabled: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Forms Submitted to PHA</Label>
              <p className="text-sm text-muted-foreground">Mark when forms are submitted</p>
            </div>
            <Switch
              checked={formData.forms_submitted_to_pha}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, forms_submitted_to_pha: checked }))}
            />
          </div>
        </div>

        {/* Bank Connection Section */}
        {config && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4" />
                Bank Account Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlaidLink
                configId={config.id}
                onSuccess={() => {
                  fetchConfig();
                  onConfigUpdated?.();
                }}
                isConnected={config.auto_tracking_enabled && !!config.plaid_institution_name}
                institutionName={config.plaid_institution_name}
              />
            </CardContent>
          </Card>
        )}

        {/* Save Configuration */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving || !formData.payee_name || !formData.routing_number}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitHAPConfig;