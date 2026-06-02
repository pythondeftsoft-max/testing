import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building, User, Download, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react';
import PropertyDocuments from './PropertyDocuments';
import { featureFlags } from '@/config/featureFlags';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HAPPayeeConfigProps {
  propertyId: string;
  onConfigUpdated?: () => void;
}

const HAPPayeeConfig = ({ propertyId, onConfigUpdated }: HAPPayeeConfigProps) => {
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
    pha_approval_status: 'pending'
  });

  useEffect(() => {
    fetchConfig();
  }, [propertyId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('hap_payee_configs')
        .select('*')
        .eq('property_id', propertyId)
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
          account_number: '', // Never pre-fill account numbers for security
          account_type: data.account_type || 'checking',
          pha_approval_status: data.pha_approval_status || 'pending'
        });
      }
    } catch (error) {
      console.error('Error fetching HAP config:', error);
      toast({
        title: "Error",
        description: "Failed to load HAP payee configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving HAP config for propertyId:', propertyId);
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify property ownership before saving config
      console.log('Checking property ownership...');
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id, owner_id, address')
        .eq('id', propertyId)
        .single();

      console.log('Property query result:', { property, propertyError });

      if (propertyError) {
        console.error('Property query error:', propertyError);
        throw new Error(`Property query failed: ${propertyError.message}`);
      }

      if (!property) {
        throw new Error('Property not found');
      }

      if (property.owner_id !== user.id) {
        throw new Error('You do not have permission to configure this property');
      }
      
      const configData = {
        property_id: propertyId,
        payee_type: formData.payee_type,
        payee_name: formData.payee_name,
        bank_name: formData.bank_name,
        routing_number: formData.routing_number,
        account_type: formData.account_type,
        pha_approval_status: formData.pha_approval_status,
        created_by: user.id,
        // Only update account number if provided (for security)
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
        description: "HAP payee configuration saved successfully"
      });

      fetchConfig();
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error saving HAP config:', error);
      toast({
        title: "Error",
        description: "Failed to save HAP payee configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const [generatingForm, setGeneratingForm] = useState<string | null>(null);
  const [generatedForms, setGeneratedForms] = useState<{[key: string]: any}>({});

  const downloadForm = async (formType: string) => {
    if (!config || !config.id) {
      toast({
        title: "Error",
        description: "Please save the configuration first before generating forms",
        variant: "destructive"
      });
      return;
    }

    if (!formData.payee_name || !formData.routing_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields before generating forms",
        variant: "destructive"
      });
      return;
    }

    setGeneratingForm(formType);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-hap-forms', {
        body: {
          propertyId,
          formType,
          configId: config.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedForms(prev => ({
          ...prev,
          [formType]: data.document
        }));

        toast({
          title: "Form Generated",
          description: `${getFormLabel(formType)} has been generated and saved securely`,
        });

        // Download the form
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('property-documents')
          .download(data.downloadUrl);

        if (downloadError) throw downloadError;

        const url = URL.createObjectURL(fileData);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.document.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating form:', error);
      toast({
        title: "Error",
        description: "Failed to generate form. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingForm(null);
    }
  };

  const getFormLabel = (formType: string) => {
    const forms = {
      w9: 'W-9 Tax Form',
      direct_deposit: 'Direct Deposit Authorization Form',
      pm_agreement: 'Property Management Agreement'
    };
    return forms[formType as keyof typeof forms];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'outline', text: 'Pending', icon: AlertCircle },
      approved: { variant: 'default', text: 'Approved', icon: CheckCircle },
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            HAP Payee Configuration
            {config && getStatusBadge(config.pha_approval_status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payee Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="payee-type">HAP Payment Recipient</Label>
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
                    Landlord
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
                placeholder="Full name as it appears on bank account"
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

          {/* Form Downloads */}
          <div className="space-y-4">
            <Label>Required Forms</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => downloadForm('w9')}
                disabled={generatingForm === 'w9' || !config}
                className="flex items-center justify-center gap-2"
              >
                {generatingForm === 'w9' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generatingForm === 'w9' ? 'Generating...' : 'Generate W-9'}
              </Button>
              <Button
                variant="outline" 
                onClick={() => downloadForm('direct_deposit')}
                disabled={generatingForm === 'direct_deposit' || !config}
                className="flex items-center justify-center gap-2"
              >
                {generatingForm === 'direct_deposit' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generatingForm === 'direct_deposit' ? 'Generating...' : 'Generate Direct Deposit Form'}
              </Button>
              {formData.payee_type === 'property_manager' && (
                <Button 
                  variant="outline" 
                  onClick={() => downloadForm('pm_agreement')}
                  disabled={generatingForm === 'pm_agreement' || !config}
                  className="flex items-center justify-center gap-2"
                >
                  {generatingForm === 'pm_agreement' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {generatingForm === 'pm_agreement' ? 'Generating...' : 'Generate PM Agreement'}
                </Button>
              )}
            </div>
          </div>

          {/* Form Upload Status */}
          {config && (
            <div className="space-y-2">
              <Label>Submission Status</Label>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {config.forms_submitted_to_pha ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  Forms Submitted to PHA: {config.forms_submitted_to_pha ? 'Yes' : 'Pending'}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
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
      
      {/* Generated Forms Section */}
      {config && (
        <div className="mt-6">
          <PropertyDocuments propertyId={propertyId} />
        </div>
      )}
    </>
  );
};

export default HAPPayeeConfig;