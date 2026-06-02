import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Zap, 
  Mail, 
  Users, 
  BarChart3, 
  Webhook, 
  Settings, 
  Plus, 
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WhiteLabelIntegrationHubProps {
  configId: string;
}

interface Integration {
  id?: string;
  integration_type: string;
  integration_name: string;
  api_credentials: Record<string, any>;
  webhook_url?: string;
  webhook_secret?: string;
  settings: Record<string, any>;
  is_active: boolean;
  last_sync_at?: string;
}

interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface CustomForm {
  id?: string;
  form_name: string;
  form_type: string;
  fields: FormField[];
  styling: Record<string, any>;
  success_message?: string;
  redirect_url?: string;
  email_notifications: boolean;
  integration_mappings: Record<string, any>;
  is_active: boolean;
}

export function WhiteLabelIntegrationHub({ configId }: WhiteLabelIntegrationHubProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddIntegrationOpen, setIsAddIntegrationOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newIntegration, setNewIntegration] = useState<Partial<Integration>>({
    integration_type: 'email',
    integration_name: '',
    api_credentials: {},
    settings: {},
    is_active: true
  });
  const [newForm, setNewForm] = useState<Partial<CustomForm>>({
    form_name: '',
    form_type: 'contact',
    fields: [],
    styling: {},
    email_notifications: true,
    integration_mappings: {},
    is_active: true
  });

  // Fetch integrations
  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['whiteLabelIntegrations', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_integrations')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Integration[];
    }
  });

  // Fetch forms
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ['whiteLabelForms', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_forms')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(form => ({
        ...form,
        fields: (form.fields as any) || []
      })) as CustomForm[];
    }
  });

  // Add integration mutation
  const addIntegrationMutation = useMutation({
    mutationFn: async (integration: Partial<Integration>) => {
      const { data, error } = await supabase
        .from('white_label_integrations')
        .insert({
          config_id: configId,
          integration_type: integration.integration_type!,
          integration_name: integration.integration_name!,
          api_credentials: integration.api_credentials as any,
          webhook_url: integration.webhook_url,
          webhook_secret: integration.webhook_secret,
          settings: integration.settings as any,
          is_active: integration.is_active
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelIntegrations'] });
      setIsAddIntegrationOpen(false);
      setNewIntegration({
        integration_type: 'email',
        integration_name: '',
        api_credentials: {},
        settings: {},
        is_active: true
      });
      toast({
        title: "Integration added",
        description: "Integration has been configured successfully.",
      });
    }
  });

  // Add form mutation
  const addFormMutation = useMutation({
    mutationFn: async (form: Partial<CustomForm>) => {
      const { data, error } = await supabase
        .from('white_label_forms')
        .insert({
          config_id: configId,
          form_name: form.form_name!,
          form_type: form.form_type || 'contact',
          fields: form.fields as any,
          styling: form.styling as any,
          success_message: form.success_message,
          redirect_url: form.redirect_url,
          email_notifications: form.email_notifications ?? true,
          integration_mappings: form.integration_mappings as any,
          is_active: form.is_active ?? true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelForms'] });
      setIsAddFormOpen(false);
      setNewForm({
        form_name: '',
        form_type: 'contact',
        fields: [],
        styling: {},
        email_notifications: true,
        integration_mappings: {},
        is_active: true
      });
      toast({
        title: "Form created",
        description: "Custom form has been created successfully.",
      });
    }
  });

  // Toggle integration status
  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('white_label_integrations')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelIntegrations'] });
    }
  });

  const integrationTypes = [
    { value: 'email', label: 'Email Marketing', icon: Mail },
    { value: 'crm', label: 'CRM System', icon: Users },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'webhook', label: 'Webhook', icon: Webhook },
  ];

  const popularIntegrations = [
    { name: 'Mailchimp', type: 'email', description: 'Email marketing and automation' },
    { name: 'HubSpot', type: 'crm', description: 'Customer relationship management' },
    { name: 'Google Analytics', type: 'analytics', description: 'Website analytics and tracking' },
    { name: 'Zapier', type: 'webhook', description: 'Workflow automation' },
    { name: 'Salesforce', type: 'crm', description: 'Sales and customer management' },
    { name: 'ConvertKit', type: 'email', description: 'Email marketing for creators' },
  ];

  const formFieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Button' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    });
  };

  const addFormField = () => {
    setNewForm(prev => ({
      ...prev,
      fields: [
        ...(prev.fields || []),
        {
          name: `field_${(prev.fields || []).length + 1}`,
          type: 'text',
          label: 'New Field',
          required: false
        }
      ]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Integration & Automation Hub
        </CardTitle>
        <CardDescription>
          Connect your white-label site with external services and create custom forms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="forms">Custom Forms</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Connected Integrations</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your site with popular business tools and services
                </p>
              </div>
              <Dialog open={isAddIntegrationOpen} onOpenChange={setIsAddIntegrationOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Integration</DialogTitle>
                    <DialogDescription>
                      Connect a new service to your white-label site.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="integration_type">Integration Type</Label>
                        <Select
                          value={newIntegration.integration_type}
                          onValueChange={(value) => setNewIntegration(prev => ({ ...prev, integration_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {integrationTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="integration_name">Service Name</Label>
                        <Input
                          id="integration_name"
                          placeholder="e.g., Mailchimp, HubSpot"
                          value={newIntegration.integration_name || ''}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, integration_name: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="api_key">API Key</Label>
                      <Input
                        id="api_key"
                        type="password"
                        placeholder="Enter your API key"
                        onChange={(e) => setNewIntegration(prev => ({
                          ...prev,
                          api_credentials: { ...prev.api_credentials, api_key: e.target.value }
                        }))}
                      />
                    </div>

                    {newIntegration.integration_type === 'webhook' && (
                      <div>
                        <Label htmlFor="webhook_url">Webhook URL</Label>
                        <Input
                          id="webhook_url"
                          placeholder="https://your-service.com/webhook"
                          value={newIntegration.webhook_url || ''}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, webhook_url: e.target.value }))}
                        />
                      </div>
                    )}

                    <Button 
                      onClick={() => addIntegrationMutation.mutate(newIntegration)}
                      disabled={!newIntegration.integration_name || addIntegrationMutation.isPending}
                      className="w-full"
                    >
                      {addIntegrationMutation.isPending ? "Adding..." : "Add Integration"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Integrations */}
              <div className="space-y-4">
                <h4 className="font-medium">Active Integrations</h4>
                {integrationsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading integrations...</div>
                ) : integrations?.length ? (
                  integrations.map((integration) => (
                    <Card key={integration.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {React.createElement(
                              integrationTypes.find(t => t.value === integration.integration_type)?.icon || Settings,
                              { className: "h-5 w-5" }
                            )}
                            <div>
                              <div className="font-medium">{integration.integration_name}</div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {integration.integration_type}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={integration.is_active ? "default" : "secondary"}>
                              {integration.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Switch
                              checked={integration.is_active}
                              onCheckedChange={(checked) => 
                                toggleIntegrationMutation.mutate({ id: integration.id!, is_active: checked })
                              }
                            />
                          </div>
                        </div>
                        {integration.last_sync_at && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No integrations configured yet.</div>
                )}
              </div>

              {/* Popular Integrations */}
              <div className="space-y-4">
                <h4 className="font-medium">Popular Integrations</h4>
                <div className="space-y-2">
                  {popularIntegrations.map((integration, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {React.createElement(
                              integrationTypes.find(t => t.value === integration.type)?.icon || Settings,
                              { className: "h-5 w-5" }
                            )}
                            <div>
                              <div className="font-medium">{integration.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {integration.description}
                              </div>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="forms" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Custom Forms</h3>
                <p className="text-sm text-muted-foreground">
                  Create custom forms to capture leads and data from your visitors
                </p>
              </div>
              <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Form
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Custom Form</DialogTitle>
                    <DialogDescription>
                      Build a custom form to embed on your white-label site.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="form_name">Form Name</Label>
                        <Input
                          id="form_name"
                          placeholder="Contact Form"
                          value={newForm.form_name || ''}
                          onChange={(e) => setNewForm(prev => ({ ...prev, form_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="form_type">Form Type</Label>
                        <Select
                          value={newForm.form_type}
                          onValueChange={(value) => setNewForm(prev => ({ ...prev, form_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contact">Contact Form</SelectItem>
                            <SelectItem value="newsletter">Newsletter Signup</SelectItem>
                            <SelectItem value="feedback">Feedback Form</SelectItem>
                            <SelectItem value="lead">Lead Capture</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Form Fields</Label>
                        <Button variant="outline" size="sm" onClick={addFormField}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Field
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {newForm.fields?.map((field, index) => (
                          <div key={index} className="grid grid-cols-4 gap-2 p-2 border rounded">
                            <Input
                              placeholder="Field name"
                              value={field.name}
                              onChange={(e) => {
                                const updatedFields = [...(newForm.fields || [])];
                                updatedFields[index] = { ...field, name: e.target.value };
                                setNewForm(prev => ({ ...prev, fields: updatedFields }));
                              }}
                            />
                            <Input
                              placeholder="Label"
                              value={field.label}
                              onChange={(e) => {
                                const updatedFields = [...(newForm.fields || [])];
                                updatedFields[index] = { ...field, label: e.target.value };
                                setNewForm(prev => ({ ...prev, fields: updatedFields }));
                              }}
                            />
                            <Select
                              value={field.type}
                              onValueChange={(value) => {
                                const updatedFields = [...(newForm.fields || [])];
                                updatedFields[index] = { ...field, type: value };
                                setNewForm(prev => ({ ...prev, fields: updatedFields }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {formFieldTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => {
                                  const updatedFields = [...(newForm.fields || [])];
                                  updatedFields[index] = { ...field, required: checked };
                                  setNewForm(prev => ({ ...prev, fields: updatedFields }));
                                }}
                              />
                              <Label className="text-xs">Required</Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="success_message">Success Message</Label>
                        <Textarea
                          id="success_message"
                          placeholder="Thank you for your submission!"
                          value={newForm.success_message || ''}
                          onChange={(e) => setNewForm(prev => ({ ...prev, success_message: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="redirect_url">Redirect URL (optional)</Label>
                        <Input
                          id="redirect_url"
                          placeholder="https://example.com/thank-you"
                          value={newForm.redirect_url || ''}
                          onChange={(e) => setNewForm(prev => ({ ...prev, redirect_url: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="email_notifications"
                        checked={newForm.email_notifications}
                        onCheckedChange={(checked) => setNewForm(prev => ({ ...prev, email_notifications: checked }))}
                      />
                      <Label htmlFor="email_notifications">Send email notifications</Label>
                    </div>

                    <Button 
                      onClick={() => addFormMutation.mutate(newForm)}
                      disabled={!newForm.form_name || addFormMutation.isPending}
                      className="w-full"
                    >
                      {addFormMutation.isPending ? "Creating..." : "Create Form"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {formsLoading ? (
              <div className="text-center py-8">Loading forms...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {forms?.map((form) => (
                  <Card key={form.id}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        {form.form_name}
                        <Badge variant={form.is_active ? "default" : "secondary"}>
                          {form.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="capitalize">
                        {form.form_type} • {form.fields.length} fields
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Fields:</strong> {form.fields.map(f => f.label).join(', ')}
                        </div>
                        {form.success_message && (
                          <div className="text-sm">
                            <strong>Success Message:</strong> {form.success_message}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-4">
                          <Button variant="outline" size="sm">
                            Edit Form
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(`<form-embed id="${form.id}"></form-embed>`)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Embed
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Webhook Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set up webhooks to receive real-time notifications when events occur on your site
              </p>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Webhook Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Form Events</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>form.submitted</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>form.validation_failed</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Page Events</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>page.viewed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>site.published</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Webhook Endpoints</h4>
                      <div className="space-y-2">
                        {integrations?.filter(i => i.integration_type === 'webhook').map((webhook) => (
                          <div key={webhook.id} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{webhook.integration_name}</div>
                              <div className="text-sm text-muted-foreground">{webhook.webhook_url}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={webhook.is_active ? "default" : "secondary"}>
                                {webhook.is_active ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {webhook.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <Button variant="outline" size="sm">
                                Test
                              </Button>
                            </div>
                          </div>
                        ))}
                        {!integrations?.some(i => i.integration_type === 'webhook') && (
                          <div className="text-sm text-muted-foreground">
                            No webhook endpoints configured. Add a webhook integration to get started.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Webhook Payload Example</h4>
                      <div className="bg-muted p-4 rounded font-mono text-sm">
                        <pre>{`{
  "event": "form.submitted",
  "timestamp": "2024-01-20T10:30:00Z",
  "site_id": "${configId}",
  "data": {
    "form_id": "contact-form",
    "form_name": "Contact Form",
    "submission": {
      "name": "John Doe",
      "email": "john@example.com",
      "message": "Hello from your website!"
    },
    "metadata": {
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "referrer": "https://google.com"
    }
  }
}`}</pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}