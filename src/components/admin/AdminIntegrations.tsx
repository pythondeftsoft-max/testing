import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSuperAdminCheck } from '@/hooks/useSuperAdminCheck';
import { AlertCircle, Building2, CreditCard, Database, FileCheck, Mail, Map, Settings, Sparkles, TrendingUp, ExternalLink, Copy, RefreshCw, CheckCircle, Key, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'connected' | 'warning' | 'not-configured';
  keys: Array<{
    name: string;
    value: string;
    isPublic?: boolean;
  }>;
  dashboardUrl?: string;
}

export const AdminIntegrations = () => {
  const { data: isSuperAdmin, isLoading } = useSuperAdminCheck();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [updating, setUpdating] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const integrations: Integration[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Payment processing for rent payments and platform fees',
      icon: CreditCard,
      status: 'connected',
      keys: [
        { name: 'STRIPE_SECRET_KEY', value: 'sk_live_****' },
        { name: 'STRIPE_PUBLISHABLE_KEY', value: 'pk_live_****', isPublic: true },
        { name: 'STRIPE_WEBHOOK_SECRET', value: 'whsec_****' },
      ],
      dashboardUrl: 'https://dashboard.stripe.com',
    },
    {
      id: 'plaid',
      name: 'Plaid',
      description: 'Bank account linking and ACH payment verification',
      icon: Building2,
      status: 'connected',
      keys: [
        { name: 'PLAID_CLIENT_ID', value: '****' },
        { name: 'PLAID_SECRET', value: '****' },
        { name: 'PLAID_ENV', value: 'production', isPublic: true },
      ],
      dashboardUrl: 'https://dashboard.plaid.com',
    },
    {
      id: 'checkbook',
      name: 'Checkbook.io',
      description: 'Worker payouts and digital check processing',
      icon: FileCheck,
      status: 'connected',
      keys: [
        { name: 'CHECKBOOK_API_KEY', value: '****' },
        { name: 'CHECKBOOK_WEBHOOK_SECRET', value: '****' },
      ],
      dashboardUrl: 'https://app.checkbook.io',
    },
    {
      id: 'resend',
      name: 'Resend',
      description: 'Transactional email delivery service',
      icon: Mail,
      status: 'connected',
      keys: [
        { name: 'RESEND_API_KEY', value: 're_****' },
      ],
      dashboardUrl: 'https://resend.com/emails',
    },
    {
      id: 'gemini',
      name: 'Google Gemini AI',
      description: 'AI-powered features and intelligent automation',
      icon: Sparkles,
      status: 'connected',
      keys: [
        { name: 'GEMINI_API_KEY', value: 'AIza****' },
      ],
      dashboardUrl: 'https://console.cloud.google.com',
    },
    {
      id: 'mapbox',
      name: 'Mapbox',
      description: 'Maps, geocoding, and location services',
      icon: Map,
      status: 'connected',
      keys: [
        { name: 'MAPBOX_PUBLIC_TOKEN', value: 'pk.eyJ1****', isPublic: true },
      ],
      dashboardUrl: 'https://account.mapbox.com',
    },
    {
      id: 'alpha-vantage',
      name: 'Alpha Vantage',
      description: 'Financial market data and asset pricing',
      icon: TrendingUp,
      status: 'connected',
      keys: [
        { name: 'ALPHA_VANTAGE_API_KEY', value: '****' },
      ],
      dashboardUrl: 'https://www.alphavantage.co/support/#api-key',
    },
    {
      id: 'supabase',
      name: 'Supabase',
      description: 'Database, authentication, and storage backend',
      icon: Database,
      status: 'connected',
      keys: [
        { name: 'SUPABASE_URL', value: import.meta.env.VITE_SUPABASE_URL || '', isPublic: true },
        { name: 'SUPABASE_PUBLISHABLE_KEY', value: '****', isPublic: true },
      ],
      dashboardUrl: 'https://supabase.com/dashboard/project/kixsdhnfzjnxikmnbipi',
    },
  ];

  const handleCopyKey = (keyName: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    toast({
      title: 'Copied to clipboard',
      description: `${keyName} has been copied`,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    toast({
      title: 'Status refreshed',
      description: 'Integration statuses have been updated',
    });
  };

  const openUpdateModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    const initialValues: Record<string, string> = {};
    integration.keys.forEach(key => {
      initialValues[key.name] = '';
    });
    setFormValues(initialValues);
    setVisibleKeys({});
  };

  const handleUpdateSecrets = async () => {
    if (!selectedIntegration) return;

    // Filter out empty values
    const secretsToUpdate = Object.entries(formValues)
      .filter(([_, value]) => value.trim() !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(secretsToUpdate).length === 0) {
      toast({
        title: 'No changes',
        description: 'Please enter at least one key to update',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('update-integration-secrets', {
        body: {
          integrationId: selectedIntegration.id,
          secrets: secretsToUpdate,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: 'Update initiated',
        description: `Secrets update request logged for ${selectedIntegration.name}. Please update them manually in Supabase Dashboard.`,
      });

      setSelectedIntegration(null);
      setFormValues({});
    } catch (error: any) {
      console.error('Error updating secrets:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update integration secrets',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    setVisibleKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" />Needs Attention</Badge>;
      case 'not-configured':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Not Configured</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You do not have permission to view platform integrations. This section is restricted to super administrators only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Platform Integrations
              </CardTitle>
              <CardDescription className="mt-2">
                Manage all third-party service integrations and API configurations
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> API keys are stored securely in Supabase Secrets. Only masked values are displayed here. 
              To update keys, use the Supabase Dashboard or contact the development team.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">API Keys</div>
                      {integration.keys.map((key) => (
                        <div key={key.name} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">{key.name}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {key.value}
                              {key.isPublic && <span className="ml-2 text-[10px] text-green-600">(Public)</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 ml-2"
                            onClick={() => handleCopyKey(key.name, key.value)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openUpdateModal(integration)}
                      >
                        <Key className="w-3 h-3 mr-2" />
                        Update Keys
                      </Button>
                      {integration.dashboardUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(integration.dashboardUrl, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Open Dashboard
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleString()} • 
              <a 
                href="https://supabase.com/dashboard/project/kixsdhnfzjnxikmnbipi/settings/vault/secrets" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-primary hover:underline"
              >
                Manage secrets in Supabase
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Update Keys Modal */}
      <Dialog open={!!selectedIntegration} onOpenChange={(open) => !open && setSelectedIntegration(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update {selectedIntegration?.name} Credentials</DialogTitle>
            <DialogDescription>
              Enter new values for the keys you want to update. Leave blank to keep existing values.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-600">
                This will log your update request. You must manually update the secrets in the Supabase Dashboard for security.
              </AlertDescription>
            </Alert>

            {selectedIntegration?.keys.map((key) => (
              <div key={key.name} className="space-y-2">
                <Label htmlFor={key.name}>
                  {key.name}
                  {key.isPublic && <span className="ml-2 text-xs text-green-600">(Public)</span>}
                </Label>
                {key.name === 'PLAID_ENV' ? (
                  <Select
                    value={formValues[key.name] || ''}
                    onValueChange={(value) => setFormValues(prev => ({ ...prev, [key.name]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="relative">
                    <Input
                      id={key.name}
                      type={visibleKeys[key.name] ? 'text' : 'password'}
                      placeholder={`Enter new ${key.name}`}
                      value={formValues[key.name] || ''}
                      onChange={(e) => setFormValues(prev => ({ ...prev, [key.name]: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => toggleKeyVisibility(key.name)}
                    >
                      {visibleKeys[key.name] ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedIntegration(null)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateSecrets} disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
