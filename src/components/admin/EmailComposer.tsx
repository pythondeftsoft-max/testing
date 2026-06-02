import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useUnhousedTenants } from '@/hooks/useUnhousedTenants';
import { useSendPropertyMatch } from '@/hooks/useSendPropertyMatch';
import { Mail, Send, Users, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

const EmailComposer = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [propertyContext, setPropertyContext] = useState({
    property_address: '',
    property_rent: '',
    property_url: ''
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: templates } = useEmailTemplates({ audience: 'tenant' });
  const { data: tenants } = useUnhousedTenants();
  const { mutate: sendEmails, isPending } = useSendPropertyMatch();

  const selectedTemplateData = templates?.find(t => t.slug === selectedTemplate);

  const renderPreview = () => {
    if (!selectedTemplateData) return null;
    
    let html = selectedTemplateData.html_template;
    
    // Replace placeholders with actual values
    html = html.replace(/\{\{tenant_name\}\}/g, 'Sample Tenant');
    html = html.replace(/\{\{property_address\}\}/g, propertyContext.property_address || '123 Sample Street');
    html = html.replace(/\{\{property_rent\}\}/g, propertyContext.property_rent || '1500');
    html = html.replace(/\{\{property_url\}\}/g, propertyContext.property_url || 'https://example.com/property');
    
    return html;
  };

  const handleSendEmails = () => {
    if (!selectedTemplate || selectedTenants.length === 0) return;

    selectedTenants.forEach(tenantId => {
      sendEmails({
        tenantId,
        templateSlug: selectedTemplate,
        propertyContext
      });
    });
  };

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const selectAllTenants = () => {
    if (selectedTenants.length === tenants?.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(tenants?.map(t => t.id) || []);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Compose Email Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Email Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an email template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map(template => (
                    <SelectItem key={template.slug} value={template.slug}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {template.audience}
                        </Badge>
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property Context */}
            {selectedTemplate && (
              <div className="space-y-4">
                <Label>Property Context (for placeholders)</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Property Address</Label>
                    <Input
                      placeholder="123 Main Street, City, State"
                      value={propertyContext.property_address}
                      onChange={(e) => setPropertyContext(prev => ({
                        ...prev,
                        property_address: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Monthly Rent</Label>
                    <Input
                      placeholder="1500"
                      value={propertyContext.property_rent}
                      onChange={(e) => setPropertyContext(prev => ({
                        ...prev,
                        property_rent: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Property URL</Label>
                    <Input
                      placeholder="https://example.com/property/123"
                      value={propertyContext.property_url}
                      onChange={(e) => setPropertyContext(prev => ({
                        ...prev,
                        property_url: e.target.value
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preview Button */}
            {selectedTemplate && (
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Email Preview</DialogTitle>
                  </DialogHeader>
                  <div className="border rounded-md p-4 bg-white">
                    <div 
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderPreview() || '') }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Recipient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Recipients
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose unhoused tenants to receive this email
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllTenants}
              >
                {selectedTenants.length === tenants?.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Badge variant="secondary">
                {selectedTenants.length} of {tenants?.length || 0} selected
              </Badge>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {tenants?.map(tenant => (
                <div
                  key={tenant.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedTenants.includes(tenant.id)
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleTenantSelection(tenant.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {tenant.first_name} {tenant.last_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tenant.housing_preferences && (
                        <Badge variant="outline" className="text-xs">
                          ${tenant.housing_preferences.min_rent || 0}-{tenant.housing_preferences.max_rent || 0}
                        </Badge>
                      )}
                      {selectedTenants.includes(tenant.id) && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Ready to send to {selectedTenants.length} recipients
              </p>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  Using template: {selectedTemplateData?.name}
                </p>
              )}
            </div>
            <Button
              onClick={handleSendEmails}
              disabled={!selectedTemplate || selectedTenants.length === 0 || isPending}
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {isPending ? 'Sending...' : `Send to ${selectedTenants.length} Recipients`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailComposer;