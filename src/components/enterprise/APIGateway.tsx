import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Code, Key, Webhook, Link, Settings, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getMockAPIKeys, 
  getMockWebhooks, 
  getMockIntegrations,
  createMockAPIKey,
  createMockWebhook,
  toggleMockAPIKey,
  type APIKey,
  type WebhookEndpoint,
  type Integration
} from '@/utils/mockEnterpriseData';

const APIGateway = () => {
  const [newAPIKey, setNewAPIKey] = useState({ name: '', permissions: [] as string[] });
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] as string[] });
  const { toast } = useToast();

  // Use mock data temporarily until database tables are created
  const apiKeys: APIKey[] = getMockAPIKeys();
  const webhooks: WebhookEndpoint[] = getMockWebhooks();
  const integrations: Integration[] = getMockIntegrations();

  const createAPIKey = {
    mutate: async (keyData: typeof newAPIKey) => {
      await createMockAPIKey(keyData);
      setNewAPIKey({ name: '', permissions: [] });
      toast({
        title: "API Key Created",
        description: "New API key has been generated successfully",
      });
    }
  };

  const createWebhook = {
    mutate: async (webhookData: typeof newWebhook) => {
      await createMockWebhook(webhookData);
      setNewWebhook({ name: '', url: '', events: [] });
      toast({
        title: "Webhook Created",
        description: "New webhook endpoint has been created successfully",
      });
    }
  };

  const toggleAPIKey = {
    mutate: async ({ keyId, isActive }: { keyId: string; isActive: boolean }) => {
      await toggleMockAPIKey({ keyId, isActive });
      toast({
        title: "API Key Updated",
        description: "API key status has been updated successfully",
      });
    }
  };

  const availablePermissions = [
    'read:properties',
    'write:properties',
    'read:portfolios',
    'write:portfolios',
    'read:payments',
    'write:payments',
    'read:analytics',
    'admin:all'
  ];

  const availableEvents = [
    'property.created',
    'property.updated',
    'payment.received',
    'lease.signed',
    'maintenance.completed',
    'tenant.approved'
  ];

  const getIntegrationStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">API Gateway & Integrations</h2>
          <p className="text-muted-foreground">Manage API access, webhooks, and third-party integrations</p>
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="documentation">API Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API Keys</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Key className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Key Name</label>
                    <Input
                      value={newAPIKey.name}
                      onChange={(e) => setNewAPIKey(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter key name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Permissions</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availablePermissions.map(permission => (
                        <Badge
                          key={permission}
                          variant={newAPIKey.permissions.includes(permission) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setNewAPIKey(prev => ({
                              ...prev,
                              permissions: prev.permissions.includes(permission)
                                ? prev.permissions.filter(p => p !== permission)
                                : [...prev.permissions, permission]
                            }));
                          }}
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => createAPIKey.mutate(newAPIKey)}>
                    Create Key
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {apiKeys.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    No API keys created yet. Create your first API key to get started.
                  </div>
                </CardContent>
              </Card>
            ) : (
              apiKeys.map((key) => (
                <Card key={key.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{key.name}</h4>
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {key.key.substring(0, 20)}...
                          </code>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {key.permissions.map(permission => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Created: {new Date(key.created_at).toLocaleDateString()} | 
                          Last used: {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={key.is_active}
                          onCheckedChange={(checked) => toggleAPIKey.mutate({ keyId: key.id, isActive: checked })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Webhook className="w-4 h-4 mr-2" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Webhook Name</label>
                    <Input
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter webhook name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Endpoint URL</label>
                    <Input
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://your-app.com/webhook"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Events</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableEvents.map(event => (
                        <Badge
                          key={event}
                          variant={newWebhook.events.includes(event) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setNewWebhook(prev => ({
                              ...prev,
                              events: prev.events.includes(event)
                                ? prev.events.filter(e => e !== event)
                                : [...prev.events, event]
                            }));
                          }}
                        >
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => createWebhook.mutate(newWebhook)}>
                    Create Webhook
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {webhooks?.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">{webhook.name}</h4>
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {webhook.url}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Last triggered: {webhook.last_triggered ? new Date(webhook.last_triggered).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <h3 className="text-lg font-semibold">Third-Party Integrations</h3>
          <div className="grid gap-4">
            {integrations?.map((integration) => (
              <Card key={integration.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Link className="h-8 w-8 text-gray-500" />
                      <div>
                        <h4 className="font-medium">{integration.name}</h4>
                        <p className="text-sm text-muted-foreground">{integration.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getIntegrationStatusColor(integration.status)}>
                        {integration.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>API Documentation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Base URL</h4>
                  <code className="text-sm">https://api.yourdomain.com/v1</code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Authentication</h4>
                  <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">GET /properties</h4>
                    <p className="text-sm text-muted-foreground">Retrieve all properties</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">POST /properties</h4>
                    <p className="text-sm text-muted-foreground">Create a new property</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">GET /portfolios</h4>
                    <p className="text-sm text-muted-foreground">Retrieve all portfolios</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">POST /payments</h4>
                    <p className="text-sm text-muted-foreground">Record a payment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APIGateway;
