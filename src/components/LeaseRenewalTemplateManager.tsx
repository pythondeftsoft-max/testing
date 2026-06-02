import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeaseTemplate {
  id: string;
  template_name: string;
  template_content: string;
  template_variables: any; // JSON type from Supabase
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LeaseRenewalTemplateManagerProps {
  landlordId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelect?: (templateId: string) => void;
}

export const LeaseRenewalTemplateManager: React.FC<LeaseRenewalTemplateManagerProps> = ({
  landlordId,
  open,
  onOpenChange,
  onTemplateSelect
}) => {
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LeaseTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<LeaseTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    template_name: '',
    template_content: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, landlordId]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_renewal_templates')
        .select('*')
        .eq('landlord_id', landlordId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch templates",
      });
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setFormData({
      template_name: '',
      template_content: `LEASE RENEWAL AGREEMENT

Property Address: {{propertyAddress}}

This Lease Renewal Agreement is entered into between:

LANDLORD: {{landlordName}}
TENANT: {{tenantName}}

TERMS OF RENEWAL:

1. Original lease expiration date: {{currentLeaseEnd}}
2. New lease term end date: {{newLeaseEnd}}
3. Monthly rent amount: ${'{{newRentAmount}}'}
4. All other terms and conditions of the original lease remain in effect unless modified herein.

ADDITIONAL TERMS:
{{additionalTerms}}

SIGNATURES:

Landlord Signature: ___________________________  Date: __________
{{landlordName}}

Tenant Signature: ___________________________  Date: __________
{{tenantName}}`
    });
    setShowEditor(true);
  };

  const handleEditTemplate = (template: LeaseTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_content: template.template_content
    });
    setShowEditor(true);
  };

  const handleSaveTemplate = async () => {
    try {
      setLoading(true);

      if (!formData.template_name.trim() || !formData.template_content.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Template name and content are required",
        });
        return;
      }

      const templateData = {
        landlord_id: landlordId,
        template_name: formData.template_name.trim(),
        template_content: formData.template_content.trim(),
        template_variables: extractVariables(formData.template_content),
        is_active: true
      };

      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('lease_renewal_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('lease_renewal_templates')
          .insert(templateData);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      }

      setShowEditor(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save template",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('lease_renewal_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete template",
      });
    }
  };

  const extractVariables = (content: string): any => {
    const variables: Record<string, string> = {};
    const regex = /\{\{(\w+)\}\}/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      variables[match[1]] = `{{${match[1]}}}`;
    }
    
    return variables;
  };

  const handlePreview = (template: LeaseTemplate) => {
    setPreviewTemplate(template);
  };

  const renderPreviewContent = (content: string) => {
    return content
      .replace(/\{\{propertyAddress\}\}/g, '123 Main Street, City, State 12345')
      .replace(/\{\{landlordName\}\}/g, 'John Doe')
      .replace(/\{\{tenantName\}\}/g, 'Jane Smith')
      .replace(/\{\{currentLeaseEnd\}\}/g, '12/31/2024')
      .replace(/\{\{newLeaseEnd\}\}/g, '12/31/2025')
      .replace(/\{\{newRentAmount\}\}/g, '2,500')
      .replace(/\{\{additionalTerms\}\}/g, 'No pets allowed. Smoking prohibited.');
  };

  if (showEditor) {
    return (
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={formData.template_name}
                onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                placeholder="Enter template name..."
              />
            </div>

            <div>
              <Label htmlFor="templateContent">Template Content</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Use variables like {'{{propertyAddress}}'}, {'{{landlordName}}'}, {'{{tenantName}}'}, {'{{currentLeaseEnd}}'}, {'{{newLeaseEnd}}'}, {'{{newRentAmount}}'}, {'{{additionalTerms}}'}
              </p>
              <Textarea
                id="templateContent"
                value={formData.template_content}
                onChange={(e) => setFormData(prev => ({ ...prev, template_content: e.target.value }))}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Enter template content..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditor(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (previewTemplate) {
    return (
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate.template_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                {renderPreviewContent(previewTemplate.template_content)}
              </pre>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPreviewTemplate(null)}
              >
                Close Preview
              </Button>
              {onTemplateSelect && (
              <Button
                onClick={() => {
                  onTemplateSelect(previewTemplate.id);
                  setPreviewTemplate(null);
                }}
              >
                Use This Template
              </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lease Renewal Templates</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create and manage your custom lease renewal templates
            </p>
            <Button onClick={handleCreateTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom lease renewal template to get started
                </p>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        <CardDescription>
                          Created: {new Date(template.created_at).toLocaleDateString()}
                          {template.updated_at !== template.created_at && (
                            <> • Updated: {new Date(template.updated_at).toLocaleDateString()}</>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {Object.keys(template.template_variables || {}).length} variables
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                {onTemplateSelect && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onTemplateSelect(template.id);
                    }}
                  >
                    Use Template
                  </Button>
                )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};