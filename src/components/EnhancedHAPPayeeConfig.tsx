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
import { Building, User, Download, Upload, CheckCircle, AlertCircle, AlertTriangle, CreditCard, Link as LinkIcon, Clock, FileText, Info } from 'lucide-react';
import { featureFlags } from '@/config/featureFlags';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EnhancedHAPPayeeConfigProps {
  propertyId: string;
  onConfigUpdated?: () => void;
}

const EnhancedHAPPayeeConfig = ({ propertyId, onConfigUpdated }: EnhancedHAPPayeeConfigProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingForm, setGeneratingForm] = useState<string | null>(null);
  const [generatedForms, setGeneratedForms] = useState<{[key: string]: any}>({});
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
          account_number: '',
          account_type: data.account_type || 'checking',
          pha_approval_status: data.pha_approval_status || 'pending',
          auto_tracking_enabled: data.auto_tracking_enabled || false,
          forms_submitted_to_pha: data.forms_submitted_to_pha || false
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

  const handlePlaidConnect = async () => {
    if (!config?.id) {
      toast({
        title: "Error",
        description: "Please save the configuration first before connecting Plaid",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, you would:
      // 1. Initialize Plaid Link
      // 2. Get the public token from Plaid
      // 3. Send to backend to exchange for access token

      const { data, error } = await supabase.functions.invoke('plaid-hap-sync', {
        body: {
          action: 'connect',
          configId: config.id,
          plaidData: {
            public_token: 'mock_public_token',
            institution: { name: 'Mock Bank' }
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Bank account connected successfully"
      });

      fetchConfig();
    } catch (error) {
      console.error('Error connecting Plaid:', error);
      toast({
        title: "Error",
        description: "Failed to connect bank account",
        variant: "destructive"
      });
    }
  };

  const handleDocumentUpload = async (documentType: string) => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileName = `${documentType}_${config.id}_${Date.now()}.${file.name.split('.').pop()}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Update config with document URL
        const updateField = `document_${documentType}_url`;
        const { error: updateError } = await supabase
          .from('hap_payee_configs')
          .update({ [updateField]: filePath })
          .eq('id', config.id);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: `${documentType.replace('_', ' ').toUpperCase()} document uploaded successfully`
        });

        fetchConfig();
      } catch (error) {
        console.error('Error uploading document:', error);
        toast({
          title: "Error",
          description: "Failed to upload document",
          variant: "destructive"
        });
      }
    };
    input.click();
  };

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
      pending: { variant: 'outline', text: 'Pending Approval', icon: Clock },
      approved: { variant: 'default', text: 'Approved & Active', icon: CheckCircle },
      rejected: { variant: 'destructive', text: 'Rejected', icon: AlertTriangle }
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
    <div className="space-y-6">
      {/* Main Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Enhanced HAP Payee Configuration
            </div>
            {config && getStatusBadge(config.pha_approval_status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payee Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="payee-type">Who receives HAP funds?</Label>
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

          {/* Plaid Integration */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Automatic Payment Tracking</Label>
                <p className="text-sm text-muted-foreground">Connect via Plaid for automatic deposit matching</p>
              </div>
              <Switch
                checked={formData.auto_tracking_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_tracking_enabled: checked }))}
              />
            </div>
            
            {formData.auto_tracking_enabled && (
              <div className="space-y-3">
                {config?.plaid_account_id ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Connected to {config.plaid_institution_name || 'Bank Account'}
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={handlePlaidConnect}
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Connect Bank Account
                  </Button>
                )}
              </div>
            )}
          </div>

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

      {/* Document Management */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Management & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Required Forms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <Label>W-9 Form</Label>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => downloadForm('w9')}
                    disabled={generatingForm === 'w9' || !config}
                    className="w-full flex items-center gap-2"
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
                    onClick={() => handleDocumentUpload('w9')}
                    className="w-full flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Completed
                  </Button>
                  {config.document_w9_url && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Uploaded
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Direct Deposit Form</Label>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => downloadForm('direct_deposit')}
                    disabled={generatingForm === 'direct_deposit' || !config}
                    className="w-full flex items-center gap-2"
                  >
                    {generatingForm === 'direct_deposit' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {generatingForm === 'direct_deposit' ? 'Generating...' : 'Generate Form'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDocumentUpload('direct_deposit')}
                    className="w-full flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Completed
                  </Button>
                  {config.document_direct_deposit_url && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Uploaded
                    </div>
                  )}
                </div>
              </div>

              {formData.payee_type === 'property_manager' && (
                <div className="space-y-3">
                  <Label>PM Agreement</Label>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => downloadForm('pm_agreement')}
                      disabled={generatingForm === 'pm_agreement' || !config}
                      className="w-full flex items-center gap-2"
                    >
                      {generatingForm === 'pm_agreement' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {generatingForm === 'pm_agreement' ? 'Generating...' : 'Generate Agreement'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDocumentUpload('pm_agreement')}
                      className="w-full flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Completed
                    </Button>
                    {config.document_pm_agreement_url && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        Uploaded
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submission Status */}
            <div className="space-y-4 p-4 border rounded-lg">
              <Label className="text-base font-medium">Submission Status</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Forms submitted to PHA</span>
                  <Switch
                    checked={formData.forms_submitted_to_pha}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, forms_submitted_to_pha: checked }))}
                  />
                </div>

                {formData.forms_submitted_to_pha && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">PHA Approval Status</span>
                      <Select 
                        value={formData.pha_approval_status} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, pha_approval_status: value }))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(config.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                    
                    {config.approved_at && (
                      <p className="text-xs text-muted-foreground">
                        Approved: {new Date(config.approved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedHAPPayeeConfig;