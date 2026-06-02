import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, FileText, Globe, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import {
  useSEOPageTemplates,
  useSEOGeneratedPages,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useTogglePagePublished,
  SEOPageTemplate,
  CreateTemplateInput,
} from '@/hooks/useSEOPageTemplates';

const TEMPLATE_TYPES = [
  { value: 'section_8', label: 'Section 8 Housing' },
  { value: 'housing_voucher', label: 'Housing Voucher Assistance' },
  { value: 'landlord_voucher', label: 'Landlords Who Accept Vouchers' },
  { value: 'assisted_living', label: 'Assisted Living' },
  { value: 'senior_housing', label: 'Senior Housing' },
  { value: 'affordable', label: 'Affordable Housing' },
];

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];

const defaultTemplate: CreateTemplateInput = {
  name: '',
  base_title: '',
  template_type: 'section_8',
  generate_state_pages: true,
  generate_city_pages: true,
  generate_zipcode_pages: false,
  generate_county_pages: false,
  meta_description_template: '',
  content_template: '',
  bedrooms_filter: null,
  active: true,
};

export const SEOAutoPostRules = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SEOPageTemplate | null>(null);
  const [formData, setFormData] = useState<CreateTemplateInput>(defaultTemplate);

  const { data: templates = [], isLoading: templatesLoading } = useSEOPageTemplates();
  const { data: generatedPages = [], isLoading: pagesLoading } = useSEOGeneratedPages();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const togglePublished = useTogglePagePublished();

  const handleOpenDialog = (template?: SEOPageTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        base_title: template.base_title,
        template_type: template.template_type,
        generate_state_pages: template.generate_state_pages,
        generate_city_pages: template.generate_city_pages,
        generate_zipcode_pages: template.generate_zipcode_pages,
        generate_county_pages: template.generate_county_pages,
        meta_description_template: template.meta_description_template || '',
        content_template: template.content_template || '',
        bedrooms_filter: template.bedrooms_filter,
        active: template.active,
      });
    } else {
      setEditingTemplate(null);
      setFormData(defaultTemplate);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData(defaultTemplate);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.base_title) return;

    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData });
    } else {
      await createTemplate.mutateAsync(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  const handleBedroomChange = (bedroom: number, checked: boolean) => {
    const current = formData.bedrooms_filter || [];
    if (checked) {
      setFormData({ ...formData, bedrooms_filter: [...current, bedroom].sort() });
    } else {
      const filtered = current.filter(b => b !== bedroom);
      setFormData({ ...formData, bedrooms_filter: filtered.length > 0 ? filtered : null });
    }
  };

  const getLocationLevelBadges = (template: SEOPageTemplate) => {
    const levels = [];
    if (template.generate_state_pages) levels.push('State');
    if (template.generate_city_pages) levels.push('City');
    if (template.generate_zipcode_pages) levels.push('Zipcode');
    if (template.generate_county_pages) levels.push('County');
    return levels;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="generated">
            <Globe className="h-4 w-4 mr-2" />
            Generated Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">SEO Page Templates</CardTitle>
                <CardDescription>
                  Create templates that auto-generate SEO pages for each property location
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? 'Edit Template' : 'Create SEO Template'}
                    </DialogTitle>
                    <DialogDescription>
                      Define a template that will generate SEO pages for each unique location
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Section 8 Housing - Georgia Cities"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Template Type</Label>
                        <Select
                          value={formData.template_type}
                          onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="base_title">Base Title</Label>
                      <Input
                        id="base_title"
                        placeholder="e.g., Section 8 Housing Assistance"
                        value={formData.base_title}
                        onChange={(e) => setFormData({ ...formData, base_title: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Combined with location: "Section 8 Housing Assistance in Atlanta, GA"
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label>Location Levels to Generate</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="state"
                            checked={formData.generate_state_pages}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, generate_state_pages: !!checked })
                            }
                          />
                          <Label htmlFor="state" className="font-normal">
                            State (e.g., "Section 8 Apartments GA")
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="city"
                            checked={formData.generate_city_pages}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, generate_city_pages: !!checked })
                            }
                          />
                          <Label htmlFor="city" className="font-normal">
                            City (e.g., "Section 8 Apartments Atlanta GA")
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="zipcode"
                            checked={formData.generate_zipcode_pages}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, generate_zipcode_pages: !!checked })
                            }
                          />
                          <Label htmlFor="zipcode" className="font-normal flex items-center gap-1">
                            Zipcode
                            <span className="text-amber-500 flex items-center gap-0.5 text-xs">
                              <AlertTriangle className="h-3 w-3" /> Advanced
                            </span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="county"
                            checked={formData.generate_county_pages}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, generate_county_pages: !!checked })
                            }
                          />
                          <Label htmlFor="county" className="font-normal flex items-center gap-1">
                            County
                            <span className="text-amber-500 flex items-center gap-0.5 text-xs">
                              <AlertTriangle className="h-3 w-3" /> Advanced
                            </span>
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600">
                        ⚠️ Zipcode and County pages require unique data per location to avoid thin content penalties.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Bedroom Filter (Optional)</Label>
                      <div className="flex gap-4">
                        {BEDROOM_OPTIONS.map((bed) => (
                          <div key={bed} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bed-${bed}`}
                              checked={formData.bedrooms_filter?.includes(bed) || false}
                              onCheckedChange={(checked) => handleBedroomChange(bed, !!checked)}
                            />
                            <Label htmlFor={`bed-${bed}`} className="font-normal">
                              {bed} BR
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meta">Meta Description Template</Label>
                      <Textarea
                        id="meta"
                        placeholder="Find help with {template_type} in {city}, {state}. OpenKey connects tenants and landlords through direct matching designed to speed up placement."
                        value={formData.meta_description_template || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, meta_description_template: e.target.value })
                        }
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Placeholders: {'{city}'}, {'{state}'}, {'{zipcode}'}, {'{county}'}, {'{template_type}'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content Template</Label>
                      <Textarea
                        id="content"
                        placeholder="OpenKey supports voucher holders in {city}, {state} by matching them directly with landlords who accept housing assistance. We do not operate a public marketplace, which helps reduce delays and application fatigue."
                        value={formData.content_template || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, content_template: e.target.value })
                        }
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                      />
                      <Label htmlFor="active">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={createTemplate.isPending || updateTemplate.isPending}
                    >
                      {editingTemplate ? 'Update' : 'Create'} Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates yet. Create one to start generating SEO pages automatically.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Base Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location Levels</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.base_title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {TEMPLATE_TYPES.find((t) => t.value === template.template_type)?.label ||
                              template.template_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {getLocationLevelBadges(template).map((level) => (
                              <Badge key={level} variant="secondary" className="text-xs">
                                {level}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.active ? 'default' : 'secondary'}>
                            {template.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(template)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generated">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generated SEO Pages</CardTitle>
              <CardDescription>
                Pages automatically created from your templates when properties are listed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pagesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading pages...</div>
              ) : generatedPages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pages generated yet. Pages will appear here when properties are listed on market.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedPages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          /{page.slug}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{page.location_level}</Badge>
                        </TableCell>
                        <TableCell>{page.property_count}</TableCell>
                        <TableCell>
                          <Badge variant={page.published ? 'default' : 'secondary'}>
                            {page.published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              togglePublished.mutate({
                                id: page.id,
                                published: !page.published,
                              })
                            }
                          >
                            {page.published ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
