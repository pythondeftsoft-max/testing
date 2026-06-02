import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DatePicker } from '@/components/DatePicker';
import { InternalLinkPicker } from '@/components/admin/structured/InternalLinkPicker';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages';
import {
  useCreateContent,
  useUpdateContent,
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  TEMPLATES,
  type ContentItem,
} from '@/hooks/useContent';

interface Props {
  contentId: string | null;
  onClose: () => void;
  defaultContentType?: string;
  defaultTemplate?: string;
}

const EMPTY_FORM: Partial<ContentItem> = {
  content_type: 'page',
  template: '',
  title: '',
  slug: '',
  status: 'draft',
  body: '',
  meta_title: '',
  meta_description: '',
  cta_text: '',
  cta_url: '',
  featured_image: '',
  featured_image_alt: '',
  state: '',
  city: '',
  canonical_url: '',
  schema_type: 'Article',
  excerpt: '',
  seo_keywords: [],
  internal_links: [],
  language: 'en',
  parent_post_id: null,
  pillar_id: null,
  publish_date: null,
  scheduled_publish_at: null,
};

export const ContentEditor: React.FC<Props> = ({ contentId, onClose, defaultContentType, defaultTemplate }) => {
  const [form, setForm] = useState<Partial<ContentItem>>({
    ...EMPTY_FORM,
    ...(defaultContentType ? { content_type: defaultContentType } : {}),
    ...(defaultTemplate ? { template: defaultTemplate } : {}),
  });
  const [loading, setLoading] = useState(false);
  const [seoKeywordsText, setSeoKeywordsText] = useState('');

  const createContent = useCreateContent();
  const updateContent = useUpdateContent();
  const { data: supportedLanguages = [] } = useSupportedLanguages();

  useEffect(() => {
    if (contentId) {
      setLoading(true);
      supabase
        .from('content')
        .select('*')
        .eq('id', contentId)
        .single()
        .then(({ data }) => {
          if (data) {
            const item = data as unknown as ContentItem;
            setForm(item);
            setSeoKeywordsText((item.seo_keywords || []).join(', '));
          }
          setLoading(false);
        });
    }
  }, [contentId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleSave = () => {
    if (!form.title || !form.slug) return;

    // Parse seo_keywords from comma-separated text
    const keywords = seoKeywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      ...form,
      seo_keywords: keywords,
    };

    if (contentId) {
      updateContent.mutate({ id: contentId, ...payload } as any, { onSuccess: onClose });
    } else {
      createContent.mutate(payload as any, { onSuccess: onClose });
    }
  };

  const isLocationBased = ['landing', 'section8_city', 'section8_state', 'landlord_city', 'property_management_city', 'rent_data_city'].includes(form.content_type || '');

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={handleSave} disabled={!form.title || !form.slug}>
          <Save className="h-4 w-4 mr-2" />
          {contentId ? 'Update' : 'Create'}
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={['core', 'content', 'seo', 'publishing', 'linking', 'location']} className="space-y-2">
        {/* Section 1: Core */}
        <AccordionItem value="core">
          <AccordionTrigger className="text-base font-semibold">Core</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Content Type</Label>
                <Select
                  value={form.content_type || 'page'}
                  onValueChange={(v) => handleChange('content_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CONTENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Template</Label>
                <Select
                  value={form.template || ''}
                  onValueChange={(v) => handleChange('template', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Title *</Label>
                <Input
                  value={form.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Content title"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug || ''}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="url-friendly-slug"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status || 'draft'}
                  onValueChange={(v) => handleChange('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Content */}
        <AccordionItem value="content">
          <AccordionTrigger className="text-base font-semibold">Content</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Excerpt</Label>
                <Textarea
                  value={form.excerpt || ''}
                  onChange={(e) => handleChange('excerpt', e.target.value)}
                  placeholder="Short summary..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Featured Image URL</Label>
                <Input
                  value={form.featured_image || ''}
                  onChange={(e) => handleChange('featured_image', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Featured Image Alt Text</Label>
                <Input
                  value={form.featured_image_alt || ''}
                  onChange={(e) => handleChange('featured_image_alt', e.target.value)}
                  placeholder="Descriptive alt text for image"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Body (HTML)</Label>
                <Textarea
                  value={form.body || ''}
                  onChange={(e) => handleChange('body', e.target.value)}
                  placeholder="<h2>Your content here...</h2>"
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: SEO */}
        <AccordionItem value="seo">
          <AccordionTrigger className="text-base font-semibold">SEO</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Meta Title</Label>
                <Input
                  value={form.meta_title || ''}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  placeholder="SEO title (under 60 chars)"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={form.meta_description || ''}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  placeholder="SEO description (under 160 chars)"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Label>SEO Keywords</Label>
                <Input
                  value={seoKeywordsText}
                  onChange={(e) => setSeoKeywordsText(e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated list of target keywords</p>
              </div>
              <div className="md:col-span-2">
                <Label>Canonical URL</Label>
                <Input
                  value={form.canonical_url || ''}
                  onChange={(e) => handleChange('canonical_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Schema Type</Label>
                <Select
                  value={form.schema_type || 'Article'}
                  onValueChange={(v) => handleChange('schema_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="FAQPage">FAQPage</SelectItem>
                    <SelectItem value="LocalBusiness">LocalBusiness</SelectItem>
                    <SelectItem value="WebPage">WebPage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Publishing */}
        <AccordionItem value="publishing">
          <AccordionTrigger className="text-base font-semibold">Publishing</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Publish Date</Label>
                <DatePicker
                  date={form.publish_date ? new Date(form.publish_date) : undefined}
                  onDateChange={(d) =>
                    setForm((prev) => ({ ...prev, publish_date: d ? d.toISOString() : null }))
                  }
                  placeholder="Select publish date"
                />
              </div>

              {form.status === 'scheduled' && (
                <div>
                  <Label>Scheduled Publish At</Label>
                  <DatePicker
                    date={form.scheduled_publish_at ? new Date(form.scheduled_publish_at) : undefined}
                    onDateChange={(d) =>
                      setForm((prev) => ({ ...prev, scheduled_publish_at: d ? d.toISOString() : null }))
                    }
                    placeholder="Auto-publish date"
                  />
                </div>
              )}

              <div>
                <Label>Language</Label>
                <Select
                  value={form.language || 'en'}
                  onValueChange={(v) => handleChange('language', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.length > 0
                      ? supportedLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.native_name} ({lang.code})
                          </SelectItem>
                        ))
                      : <SelectItem value="en">English (en)</SelectItem>
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Parent Post ID</Label>
                <Input
                  value={form.parent_post_id || ''}
                  onChange={(e) => handleChange('parent_post_id', e.target.value)}
                  placeholder="UUID of English parent post"
                />
                <p className="text-xs text-muted-foreground mt-1">Links this translation to its parent</p>
              </div>

              <div>
                <Label>Pillar ID</Label>
                <Input
                  value={form.pillar_id || ''}
                  onChange={(e) => handleChange('pillar_id', e.target.value)}
                  placeholder="UUID of SEO pillar"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Linking */}
        <AccordionItem value="linking">
          <AccordionTrigger className="text-base font-semibold">Linking & CTA</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Internal Links</Label>
                <InternalLinkPicker
                  selected={form.internal_links || []}
                  onChange={(ids) => setForm((prev) => ({ ...prev, internal_links: ids }))}
                  excludeId={contentId || undefined}
                />
              </div>

              <div>
                <Label>CTA Text</Label>
                <Input
                  value={form.cta_text || ''}
                  onChange={(e) => handleChange('cta_text', e.target.value)}
                  placeholder="Get Matched Now"
                />
              </div>
              <div>
                <Label>CTA URL</Label>
                <Input
                  value={form.cta_url || ''}
                  onChange={(e) => handleChange('cta_url', e.target.value)}
                  placeholder="/signup?ref=..."
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 6: Location */}
        {isLocationBased && (
          <AccordionItem value="location">
            <AccordionTrigger className="text-base font-semibold">Location</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>State</Label>
                  <Input
                    value={form.state || ''}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="Texas"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={form.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Dallas"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};
