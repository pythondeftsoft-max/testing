import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Key, Copy, Trash2, Plus, Globe, Webhook, Code } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface APIKey {
  id: string;
  key_name: string;
  api_key_hash: string;
  permissions: Record<string, any>;
  rate_limit: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Webhook {
  id: string;
  webhook_name: string;
  endpoint_url: string;
  events: string[];
  secret_key: string | null;
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface WhiteLabelAPIManagerProps {
  configId: string;
}

const WhiteLabelAPIManager = ({ configId }: WhiteLabelAPIManagerProps) => {
  const [isAddAPIKeyModalOpen, setIsAddAPIKeyModalOpen] = useState(false);
  const [isAddWebhookModalOpen, setIsAddWebhookModalOpen] = useState(false);
  const [generatedAPIKey, setGeneratedAPIKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch API keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['white-label-api-keys', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_api_keys')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as APIKey[];
    },
  });

  // Fetch webhooks
  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ['white-label-webhooks', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_webhooks')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Webhook[];
    },
  });

  // Create API key mutation
  const createAPIKeyMutation = useMutation({
    mutationFn: async (keyData: any) => {
      // Generate a random API key
      const apiKey = 'wl_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Hash the API key for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: result, error } = await supabase
        .from('white_label_api_keys')
        .insert({
          config_id: configId,
          api_key_hash: apiKeyHash,
          ...keyData,
        })
        .select()
        .single();

      if (error) throw error;
      
      setGeneratedAPIKey(apiKey);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-api-keys', configId] });
      setIsAddAPIKeyModalOpen(false);
      toast({
        title: 'Success',
        description: 'API key created successfully',
      });
    },
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (webhookData: any) => {
      const { data, error } = await supabase
        .from('white_label_webhooks')
        .insert({
          config_id: configId,
          ...webhookData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-webhooks', configId] });
      setIsAddWebhookModalOpen(false);
      toast({
        title: 'Success',
        description: 'Webhook created successfully',
      });
    },
  });

  // Delete API key mutation
  const deleteAPIKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('white_label_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-api-keys', configId] });
      toast({
        title: 'Success',
        description: 'API key deleted successfully',
      });
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('white_label_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-webhooks', configId] });
      toast({
        title: 'Success',
        description: 'Webhook deleted successfully',
      });
    },
  });

  const handleCreateAPIKey = (data: FormData) => {
    const formData = Object.fromEntries(data.entries());
    
    createAPIKeyMutation.mutate({
      key_name: formData.key_name,
      permissions: {
        read: formData.read_permission === 'on',
        write: formData.write_permission === 'on',
        analytics: formData.analytics_permission === 'on',
      },
      rate_limit: parseInt(formData.rate_limit as string),
      expires_at: formData.expires_at || null,
    });
  };

  const handleCreateWebhook = (data: FormData) => {
    const formData = Object.fromEntries(data.entries());
    
    createWebhookMutation.mutate({
      webhook_name: formData.webhook_name,
      endpoint_url: formData.endpoint_url,
      events: (formData.events as string).split(',').map(e => e.trim()),
      secret_key: formData.secret_key || null,
      retry_count: parseInt(formData.retry_count as string),
      timeout_seconds: parseInt(formData.timeout_seconds as string),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">API & Integrations</h2>
        <p className="text-muted-foreground">
          Manage API keys and webhook integrations for your white-label site
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API Keys</h3>
            <Dialog open={isAddAPIKeyModalOpen} onOpenChange={setIsAddAPIKeyModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for programmatic access
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); handleCreateAPIKey(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div>
                    <Label htmlFor="key_name">Key Name</Label>
                    <Input
                      id="key_name"
                      name="key_name"
                      placeholder="Production API Key"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Permissions</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="read_permission" name="read_permission" defaultChecked />
                        <Label htmlFor="read_permission">Read Access</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="write_permission" name="write_permission" />
                        <Label htmlFor="write_permission">Write Access</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="analytics_permission" name="analytics_permission" defaultChecked />
                        <Label htmlFor="analytics_permission">Analytics Access</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="rate_limit">Rate Limit (requests/hour)</Label>
                    <Input
                      id="rate_limit"
                      name="rate_limit"
                      type="number"
                      defaultValue="1000"
                      min="100"
                      max="10000"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="expires_at">Expiration Date (optional)</Label>
                    <Input
                      id="expires_at"
                      name="expires_at"
                      type="datetime-local"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createAPIKeyMutation.isPending}>
                      {createAPIKeyMutation.isPending ? 'Creating...' : 'Create API Key'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAddAPIKeyModalOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Generated API Key Display */}
          {generatedAPIKey && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">API Key Generated</CardTitle>
                <CardDescription className="text-green-700">
                  Make sure to copy this key. You won't be able to see it again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-green-100 rounded text-sm font-mono">
                    {generatedAPIKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedAPIKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  className="mt-2" 
                  onClick={() => setGeneratedAPIKey(null)}
                  variant="outline"
                  size="sm"
                >
                  I've saved the key
                </Button>
              </CardContent>
            </Card>
          )}

          {/* API Keys List */}
          <Card>
            <CardContent className="p-0">
              {keysLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.key_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {key.permissions.read && <Badge variant="secondary">Read</Badge>}
                            {key.permissions.write && <Badge variant="secondary">Write</Badge>}
                            {key.permissions.analytics && <Badge variant="secondary">Analytics</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{key.rate_limit}/hour</TableCell>
                        <TableCell>
                          {key.last_used_at 
                            ? new Date(key.last_used_at).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAPIKeyMutation.mutate(key.id)}
                            disabled={deleteAPIKeyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No API keys created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Webhooks</h3>
            <Dialog open={isAddWebhookModalOpen} onOpenChange={setIsAddWebhookModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Webhook</DialogTitle>
                  <DialogDescription>
                    Add a webhook endpoint to receive real-time notifications
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); handleCreateWebhook(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div>
                    <Label htmlFor="webhook_name">Webhook Name</Label>
                    <Input
                      id="webhook_name"
                      name="webhook_name"
                      placeholder="User Registration Webhook"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endpoint_url">Endpoint URL</Label>
                    <Input
                      id="endpoint_url"
                      name="endpoint_url"
                      type="url"
                      placeholder="https://example.com/webhook"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="events">Events (comma-separated)</Label>
                    <Input
                      id="events"
                      name="events"
                      placeholder="user.created, application.submitted"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="secret_key">Secret Key (optional)</Label>
                    <Input
                      id="secret_key"
                      name="secret_key"
                      placeholder="webhook_secret_123"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="retry_count">Retry Count</Label>
                      <Input
                        id="retry_count"
                        name="retry_count"
                        type="number"
                        defaultValue="3"
                        min="0"
                        max="10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeout_seconds">Timeout (seconds)</Label>
                      <Input
                        id="timeout_seconds"
                        name="timeout_seconds"
                        type="number"
                        defaultValue="30"
                        min="5"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createWebhookMutation.isPending}>
                      {createWebhookMutation.isPending ? 'Creating...' : 'Create Webhook'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAddWebhookModalOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Webhooks List */}
          <Card>
            <CardContent className="p-0">
              {webhooksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : webhooks && webhooks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.webhook_name}</TableCell>
                        <TableCell>
                          <code className="text-sm">{webhook.endpoint_url}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{webhook.events.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {webhook.last_triggered_at 
                            ? new Date(webhook.last_triggered_at).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.is_active ? "default" : "secondary"}>
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                            disabled={deleteWebhookMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No webhooks configured yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Learn how to integrate with your white-label API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Base URL</h4>
                <code className="bg-muted p-2 rounded block">
                  https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/api-gateway
                </code>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Authentication</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Include your API key in the request headers:
                </p>
                <code className="bg-muted p-2 rounded block">
                  X-API-Key: your_api_key_here
                </code>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Available Endpoints</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2 font-medium">
                    <span>Method</span>
                    <span>Endpoint</span>
                    <span>Description</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/config</code>
                    <span>Get configuration</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline">PUT</Badge>
                    <code>/config</code>
                    <span>Update configuration</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/analytics</code>
                    <span>Get analytics data</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/content</code>
                    <span>Get published content</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline">POST</Badge>
                    <code>/content</code>
                    <span>Create new content</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Example Request</h4>
                <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`curl -X GET \\
  https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/api-gateway/config \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json"`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhiteLabelAPIManager;