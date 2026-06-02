import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { useEmailTemplates, useUpdateEmailTemplate } from '@/hooks/useEmailTemplates';
import { Eye, Edit, Plus, Search } from 'lucide-react';
import { SendEmailDialog } from './SendEmailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import WhiteLabelEmailTemplate from '@/components/WhiteLabelEmailTemplate';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

const EmailTemplatesTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all-audiences');
  const [categoryFilter, setCategoryFilter] = useState<string>('all-categories');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  // Helper function to replace template variables with sample data
  const getSampleContent = (template: any) => {
    if (!template) return '';
    
    let content = template.html_template || '';
    
    // Replace common template variables with realistic sample data
    const replacements: Record<string, string> = {
      '{{week_range}}': 'Nov 28 - Dec 4, 2024',
      '{{total_count}}': '5',
      '{{userName}}': 'John Smith',
      '{{userEmail}}': 'john.smith@example.com',
      '{{resetLink}}': '#password-reset-preview',
      '{{invitationUrl}}': '#invitation-preview',
      '{{propertyAddress}}': '123 Main St, Apt 4B, New York, NY 10001',
      '{{dueDate}}': 'December 15, 2024',
      '{{amount}}': '$1,500.00',
      '{{reminders_list}}': `
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="padding: 12px; margin: 8px 0; background: #f5f5f5; border-radius: 8px;">
            <strong>Rent Payment Due</strong><br/>
            <span style="color: #666;">December 1, 2024</span>
          </li>
          <li style="padding: 12px; margin: 8px 0; background: #f5f5f5; border-radius: 8px;">
            <strong>Maintenance Request</strong><br/>
            <span style="color: #666;">Check kitchen faucet</span>
          </li>
          <li style="padding: 12px; margin: 8px 0; background: #f5f5f5; border-radius: 8px;">
            <strong>Lease Renewal</strong><br/>
            <span style="color: #666;">Review by January 15, 2025</span>
          </li>
        </ul>
      `,
    };

    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(key, 'g'), value);
    });

    return content;
  };
  
  const { data: templates, isLoading } = useEmailTemplates({
    search: searchTerm,
    audience: audienceFilter === 'all-audiences' ? undefined : audienceFilter,
    active_only: false, // Get all templates, filter in UI
  });

  const updateTemplate = useUpdateEmailTemplate();

  // Get unique categories for filter
  const categories = Array.from(new Set(templates?.map(t => t.category).filter(Boolean)));
  
  // Filter by category and status on client side
  const filteredTemplates = templates?.filter(template => {
    const matchesCategory = categoryFilter === 'all-categories' || template.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && template.is_active) ||
      (statusFilter === 'inactive' && !template.is_active);
    return matchesCategory && matchesStatus;
  });

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    try {
      await updateTemplate.mutateAsync({
        id: templateId,
        is_active: !currentStatus
      });
      toast.success(`Template ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to update template status');
    }
  };

  const getAudienceBadge = (audience: string) => {
    const variants = {
      tenant: { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      landlord: { variant: 'secondary' as const, color: 'bg-green-100 text-green-800' },
      all: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' },
    };
    return variants[audience as keyof typeof variants] || variants.all;
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Template Name',
      cell: ({ row }: any) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'audience',
      header: 'Audience',
      cell: ({ row }: any) => {
        const badge = getAudienceBadge(row.original.audience);
        return (
          <Badge variant={badge.variant} className={badge.color}>
            {row.original.audience}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => {
        const category = row.original.category;
        if (!category) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant="outline" className="capitalize">
            {category}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.is_active}
            onCheckedChange={() => handleToggleActive(row.original.id, row.original.is_active)}
            disabled={updateTemplate.isPending}
          />
          <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
            {row.original.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewTemplate(row.original)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="email-preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email-preview">Email Preview</TabsTrigger>
                  <TabsTrigger value="raw-html">Raw HTML</TabsTrigger>
                </TabsList>

                <TabsContent value="email-preview" className="space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <WhiteLabelEmailTemplate
                      subject={previewTemplate?.subject_template?.replace(/{{.*?}}/g, 'Sample Data') || 'Email Subject'}
                      preheader={previewTemplate?.preheader}
                      content={getSampleContent(previewTemplate)}
                      ctaText={previewTemplate?.cta_text || 'View Details'}
                      ctaUrl="#preview-link"
                      recipientName="John Smith"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-900">
                    <strong>Note:</strong> This preview shows how the email will appear with your white-label branding, colors, and styling. Template variables are replaced with sample data for demonstration.
                  </div>
                </TabsContent>

                <TabsContent value="raw-html" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject Template:</label>
                    <div className="mt-1 p-3 bg-muted rounded-md text-sm font-mono">
                      {previewTemplate?.subject_template}
                    </div>
                  </div>
                  {previewTemplate?.preheader && (
                    <div>
                      <label className="text-sm font-medium">Preheader:</label>
                      <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                        {previewTemplate.preheader}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">HTML Template:</label>
                    <div 
                      className="mt-1 p-4 border rounded-md bg-white dark:bg-background"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewTemplate?.html_template) }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <SendEmailDialog template={row.original} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={audienceFilter} onValueChange={setAudienceFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-audiences">All Audiences</SelectItem>
            <SelectItem value="tenant">Tenant</SelectItem>
            <SelectItem value="landlord">Landlord</SelectItem>
            <SelectItem value="all">All Users</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-categories">All Categories</SelectItem>
            <SelectItem value="administration">Administration</SelectItem>
            {categories
              .filter(cat => cat !== 'administration')
              .map(category => (
                <SelectItem key={category} value={category!} className="capitalize">
                  {category}
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Email Templates</span>
            <Badge variant="secondary">
              {filteredTemplates?.length || 0} templates
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={filteredTemplates || []} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplatesTable;