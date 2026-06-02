import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Newspaper, MapPin, Home, GitCompare, BarChart3, Building2, Plus, Eye, Settings2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TemplateMiniPreview, TemplatePreviewDialog } from './TemplatePreviewDialog';
import { TemplateSettingsDialog } from './TemplateSettingsDialog';

const TEMPLATE_DEFS = [
  {
    template: 'blog',
    name: 'Blog Post',
    description: 'Article layout with excerpt, publish date, and reading flow. Ideal for news, guides, and thought leadership.',
    icon: Newspaper,
    contentTypes: ['blog_post'],
    keyFields: ['Excerpt', 'Publish Date', 'Featured Image', 'SEO Keywords'],
    defaultType: 'blog_post',
  },
  {
    template: 'city-landing',
    name: 'City Landing',
    description: 'Hero with city/state labels, featured image background, and prominent CTAs. Built for local SEO.',
    icon: MapPin,
    contentTypes: ['landing'],
    keyFields: ['State', 'City', 'Featured Image', 'CTA'],
    defaultType: 'landing',
  },
  {
    template: 'section8',
    name: 'Section 8',
    description: 'Rent limits, housing authority info, and voucher process sections for Section 8 coverage.',
    icon: Home,
    contentTypes: ['section8_city', 'section8_state'],
    keyFields: ['State', 'City', 'Body Content', 'CTA'],
    defaultType: 'section8_city',
  },
  {
    template: 'landlord',
    name: 'Landlord',
    description: 'Property management focused layout targeting landlords in specific markets.',
    icon: Building2,
    contentTypes: ['landlord_city', 'property_management_city'],
    keyFields: ['State', 'City', 'Body Content', 'CTA'],
    defaultType: 'landlord_city',
  },
  {
    template: 'comparison',
    name: 'Software Comparison',
    description: 'Side-by-side comparison layout for evaluating property management software alternatives.',
    icon: GitCompare,
    contentTypes: ['software_comparison'],
    keyFields: ['Body Content', 'CTA', 'Schema Data'],
    defaultType: 'software_comparison',
  },
  {
    template: 'rent-data',
    name: 'Rent Data',
    description: 'Data-focused rent information layout with metrics and market analysis for specific cities.',
    icon: BarChart3,
    contentTypes: ['rent_data_city'],
    keyFields: ['State', 'City', 'Body Content', 'Schema Data'],
    defaultType: 'rent_data_city',
  },
  {
    template: 'page',
    name: 'Page',
    description: 'Generic standalone page with hero, body, and CTA. Use for About, Terms, or custom pages.',
    icon: FileText,
    contentTypes: ['page'],
    keyFields: ['Featured Image', 'Body Content', 'CTA'],
    defaultType: 'page',
  },
] as const;

interface Props {
  onCreateFromTemplate: (contentType: string, template: string) => void;
}

export const TemplateGallery: React.FC<Props> = ({ onCreateFromTemplate }) => {
  const [previewTemplate, setPreviewTemplate] = useState<{ template: string; label: string } | null>(null);
  const [settingsTemplate, setSettingsTemplate] = useState<{ template: string; label: string } | null>(null);

  const { data: counts } = useQuery({
    queryKey: ['template-usage-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content')
        .select('template, status');
      const map: Record<string, { total: number; published: number }> = {};
      (data || []).forEach((row: any) => {
        const t = row.template || 'page';
        if (!map[t]) map[t] = { total: 0, published: 0 };
        map[t].total++;
        if (row.status === 'published') map[t].published++;
      });
      return map;
    },
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_DEFS.map((def) => {
          const Icon = def.icon;
          const stats = counts?.[def.template] || { total: 0, published: 0 };

          return (
            <Card key={def.template} className="flex flex-col border-border/60 hover:border-primary/40 transition-colors overflow-hidden">
              {/* Miniature Preview */}
              <button
                type="button"
                className="cursor-pointer"
                onClick={() => setPreviewTemplate({ template: def.template, label: def.name })}
              >
                <TemplateMiniPreview template={def.template} />
              </button>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">{def.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {stats.published}/{stats.total}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">{def.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 pt-0">
                <div className="flex flex-wrap gap-1 mb-3">
                  {def.keyFields.map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px] font-normal">
                      {f}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {def.contentTypes.map((ct) => (
                    <span key={ct} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {ct}
                    </span>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setPreviewTemplate({ template: def.template, label: def.name })}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setSettingsTemplate({ template: def.template, label: def.name })}
                  >
                    <Settings2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onCreateFromTemplate(def.defaultType, def.template)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full-size preview dialog */}
      {previewTemplate && (
        <TemplatePreviewDialog
          open
          onOpenChange={() => setPreviewTemplate(null)}
          template={previewTemplate.template}
          templateLabel={previewTemplate.label}
        />
      )}

      {/* Settings dialog */}
      {settingsTemplate && (
        <TemplateSettingsDialog
          open
          onOpenChange={() => setSettingsTemplate(null)}
          templateName={settingsTemplate.template}
          templateLabel={settingsTemplate.label}
        />
      )}
    </>
  );
};
