import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Key, 
  Settings, 
  Building,
  Globe,
  Lock,
  UserCheck,
  Download,
  Upload
} from 'lucide-react';

const EnterpriseSSO = () => {
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('azure-ad');

  const ssoProviders = [
    {
      id: 'azure-ad',
      name: 'Azure Active Directory',
      type: 'SAML 2.0',
      status: 'active',
      users: 1240,
      lastSync: '2024-01-15 14:30',
      logo: '🔷'
    },
    {
      id: 'okta',
      name: 'Okta',
      type: 'OIDC',
      status: 'configured',
      users: 0,
      lastSync: 'Never',
      logo: '🔵'
    },
    {
      id: 'google-workspace',
      name: 'Google Workspace',
      type: 'OAuth 2.0',
      status: 'active',
      users: 89,
      lastSync: '2024-01-15 12:15',
      logo: '🟢'
    },
    {
      id: 'onelogin',
      name: 'OneLogin',
      type: 'SAML 2.0',
      status: 'inactive',
      users: 0,
      lastSync: 'Never',
      logo: '🟠'
    }
  ];

  const crmIntegrations = [
    {
      id: 'salesforce',
      name: 'Salesforce',
      status: 'connected',
      lastSync: '2024-01-15 16:45',
      records: 15420,
      syncFrequency: 'Real-time'
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      status: 'connected',
      lastSync: '2024-01-15 15:30',
      records: 8930,
      syncFrequency: 'Hourly'
    },
    {
      id: 'pipedrive',
      name: 'Pipedrive',
      status: 'configured',
      lastSync: 'Never',
      records: 0,
      syncFrequency: 'Daily'
    }
  ];

  const erpSystems = [
    {
      id: 'sap',
      name: 'SAP ERP',
      status: 'connected',
      modules: ['Finance', 'HR', 'Procurement'],
      lastSync: '2024-01-15 18:20'
    },
    {
      id: 'oracle',
      name: 'Oracle ERP Cloud',
      status: 'configured',
      modules: ['Finance', 'Supply Chain'],
      lastSync: 'Never'
    },
    {
      id: 'netsuite',
      name: 'NetSuite',
      status: 'error',
      modules: ['Finance'],
      lastSync: '2024-01-14 09:15'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'configured':
        return <Badge variant="secondary"><Settings className="w-3 h-3 mr-1" />Configured</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Enterprise Integration Hub</h2>
          <p className="text-muted-foreground">Manage SSO, CRM, and ERP system integrations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={ssoEnabled} 
              onCheckedChange={setSsoEnabled}
              id="sso-enabled"
            />
            <label htmlFor="sso-enabled" className="text-sm font-medium">SSO Enabled</label>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">SSO Providers</p>
                <p className="text-2xl font-bold text-foreground">
                  {ssoProviders.filter(p => p.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">SSO Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {ssoProviders.reduce((acc, p) => acc + p.users, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">CRM Records</p>
                <p className="text-2xl font-bold text-foreground">
                  {(crmIntegrations.reduce((acc, c) => acc + c.records, 0) / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">ERP Systems</p>
                <p className="text-2xl font-bold text-foreground">
                  {erpSystems.filter(e => e.status === 'connected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sso" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sso">SSO Providers</TabsTrigger>
          <TabsTrigger value="crm">CRM Integration</TabsTrigger>
          <TabsTrigger value="erp">ERP Systems</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="sso">
          <Card>
            <CardHeader>
              <CardTitle>Single Sign-On Providers</CardTitle>
              <CardDescription>Manage enterprise identity providers and user authentication</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ssoProviders.map((provider) => (
                  <Card key={provider.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{provider.logo}</span>
                            <div>
                              <h4 className="font-medium">{provider.name}</h4>
                              <p className="text-sm text-muted-foreground">{provider.type}</p>
                            </div>
                            {getStatusBadge(provider.status)}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Active Users</span>
                              <p className="text-lg font-semibold">{provider.users.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Last Sync</span>
                              <p className="text-sm font-medium">{provider.lastSync}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Status</span>
                              <p className="text-sm font-medium capitalize">{provider.status}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {provider.status === 'active' && (
                            <Button variant="ghost" size="sm">
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">Configure</Button>
                          <Button variant="ghost" size="sm">Test</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="border-2 border-dashed border-muted">
                  <CardContent className="p-6 text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-medium mb-2">Add New SSO Provider</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect additional identity providers for your organization
                    </p>
                    <Button variant="outline">
                      <Key className="w-4 h-4 mr-2" />
                      Add Provider
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm">
          <Card>
            <CardHeader>
              <CardTitle>CRM Integrations</CardTitle>
              <CardDescription>Connect and synchronize customer relationship management systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {crmIntegrations.map((crm) => (
                  <Card key={crm.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Building className="w-8 h-8 text-primary" />
                            <div>
                              <h4 className="font-medium">{crm.name}</h4>
                              <p className="text-sm text-muted-foreground">CRM Platform</p>
                            </div>
                            {getStatusBadge(crm.status)}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Records Synced</span>
                              <p className="text-lg font-semibold">{crm.records.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Sync Frequency</span>
                              <p className="text-sm font-medium">{crm.syncFrequency}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Last Sync</span>
                              <p className="text-sm font-medium">{crm.lastSync}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">Configure</Button>
                          <Button variant="ghost" size="sm">Sync Now</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="erp">
          <Card>
            <CardHeader>
              <CardTitle>ERP System Integration</CardTitle>
              <CardDescription>Enterprise resource planning system connections and data flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {erpSystems.map((erp) => (
                  <Card key={erp.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Globe className="w-8 h-8 text-primary" />
                            <div>
                              <h4 className="font-medium">{erp.name}</h4>
                              <p className="text-sm text-muted-foreground">ERP System</p>
                            </div>
                            {getStatusBadge(erp.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Connected Modules</span>
                              <div className="flex gap-1 mt-1">
                                {erp.modules.map((module) => (
                                  <Badge key={module} variant="outline" className="text-xs">
                                    {module}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Last Sync</span>
                              <p className="text-sm font-medium">{erp.lastSync}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">Configure</Button>
                          <Button variant="ghost" size="sm">Test</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>SSO Configuration</CardTitle>
                <CardDescription>Global single sign-on settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Organization Domain</Label>
                  <Input id="domain" placeholder="company.com" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="entity-id">Entity ID</Label>
                  <Input id="entity-id" placeholder="https://app.company.com/sso" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="acs-url">ACS URL</Label>
                  <Input id="acs-url" placeholder="https://app.company.com/sso/acs" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="force-sso">Force SSO Login</Label>
                    <p className="text-sm text-muted-foreground">Require all users to authenticate via SSO</p>
                  </div>
                  <Switch id="force-sso" />
                </div>
                
                <Button className="w-full">Save SSO Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>Global integration configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input id="webhook-url" placeholder="https://api.company.com/webhooks" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input id="api-key" type="password" placeholder="••••••••••••••••" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-provision">Auto-provision Users</Label>
                    <p className="text-sm text-muted-foreground">Automatically create users from SSO</p>
                  </div>
                  <Switch id="auto-provision" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="real-time-sync">Real-time Sync</Label>
                    <p className="text-sm text-muted-foreground">Enable real-time data synchronization</p>
                  </div>
                  <Switch id="real-time-sync" defaultChecked />
                </div>
                
                <Button className="w-full">Save Integration Settings</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnterpriseSSO;