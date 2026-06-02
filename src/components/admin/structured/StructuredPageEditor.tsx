import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import {
  useStructuredPage,
  useCreateStructuredPage,
  useUpdateStructuredPage,
  generateSlug,
  PAGE_TYPES,
  type StructuredPage,
} from '@/hooks/useStructuredPages';
import { InternalLinkPicker } from './InternalLinkPicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, string> = {
  section8_city: 'Section 8 (City)',
  section8_state: 'Section 8 (State)',
  landlord_city: 'Landlord (City)',
  property_management_city: 'Property Mgmt (City)',
  software_comparison: 'Software Comparison',
  rent_data_city: 'Rent Data (City)',
};

interface Props {
  pageId: string | null;
  onClose: () => void;
}

export const StructuredPageEditor: React.FC<Props> = ({ pageId, onClose }) => {
  const { data: existingPage, isLoading } = useStructuredPage(pageId || undefined);
  const createMutation = useCreateStructuredPage();
  const updateMutation = useUpdateStructuredPage();

  const [form, setForm] = useState({
    page_type: 'section8_city' as string,
    state: '',
    city: '',
    slug: '',
    title: '',
    meta_title: '',
    meta_description: '',
    canonical_url: '',
    h1: '',
    body_content: '',
    cta_block: '',
    internal_links: [] as string[],
    featured_image: '',
    schema_type: 'Article',
    status: 'published' as string,
    publish_date: '',
  });

  useEffect(() => {
    if (existingPage) {
      setForm({
        page_type: existingPage.page_type,
        state: existingPage.state || '',
        city: existingPage.city || '',
        slug: existingPage.slug,
        title: existingPage.title,
        meta_title: existingPage.meta_title || '',
        meta_description: existingPage.meta_description || '',
        canonical_url: existingPage.canonical_url || '',
        h1: existingPage.h1 || '',
        body_content: existingPage.body_content || '',
        cta_block: existingPage.cta_block || '',
        internal_links: (existingPage.internal_links as string[]) || [],
        featured_image: existingPage.featured_image || '',
        schema_type: existingPage.schema_type || 'Article',
        status: existingPage.status,
        publish_date: existingPage.publish_date || '',
      });
    }
  }, [existingPage]);

  // Auto-generate slug when type/state/city change (only for new pages)
  useEffect(() => {
    if (!pageId) {
      setForm((prev) => ({
        ...prev,
        slug: generateSlug(prev.page_type, prev.state || undefined, prev.city || undefined),
      }));
    }
  }, [form.page_type, form.state, form.city, pageId]);

  const handleSave = async () => {
    // Parent validation: section8_city requires section8_state parent
    if (form.page_type === 'section8_city' && form.city && form.state) {
      const { data: parentPage } = await supabase
        .from('structured_pages')
        .select('id')
        .eq('page_type', 'section8_state' as any)
        .ilike('state', form.state)
        .is('city', null)
        .single();

      if (!parentPage) {
        toast.error(`Create the state page for ${form.state} first (Section 8 State).`);
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();

    const sanitizedForm = {
      ...form,
      publish_date: form.publish_date || null,
      canonical_url: form.canonical_url || null,
      featured_image: form.featured_image || null,
      cta_block: form.cta_block || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      created_by: user?.id || null,
    };

    if (pageId && existingPage) {
      updateMutation.mutate({ id: pageId, ...sanitizedForm } as any, { onSuccess: onClose });
    } else {
      createMutation.mutate(sanitizedForm as any, { onSuccess: onClose });
    }
  };

  const setField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading && pageId) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {pageId ? 'Edit Page' : 'New Structured Page'}
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Page Type</Label>
          <Select value={form.page_type} onValueChange={(v) => setField('page_type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setField('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>State</Label>
          <Input value={form.state} onChange={(e) => setField('state', e.target.value)} placeholder="e.g. Texas" />
        </div>
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="e.g. Houston" />
        </div>
      </div>

      <div>
        <Label>Slug</Label>
        <Input value={form.slug} onChange={(e) => setField('slug', e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">Auto-generated from type + location. Edit if needed.</p>
      </div>

      <div>
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Page title" />
      </div>

      <div>
        <Label>H1 (optional, defaults to title)</Label>
        <Input value={form.h1} onChange={(e) => setField('h1', e.target.value)} placeholder="Custom H1 heading" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Meta Title</Label>
          <Input value={form.meta_title} onChange={(e) => setField('meta_title', e.target.value)} placeholder="SEO title (60 chars)" />
        </div>
        <div>
          <Label>Canonical URL</Label>
          <Input value={form.canonical_url} onChange={(e) => setField('canonical_url', e.target.value)} placeholder="Custom canonical" />
        </div>
      </div>

      <div>
        <Label>Meta Description</Label>
        <Textarea value={form.meta_description} onChange={(e) => setField('meta_description', e.target.value)} placeholder="SEO description (160 chars)" rows={2} />
      </div>

      <div>
        <Label>Body Content (HTML)</Label>
        <Textarea value={form.body_content} onChange={(e) => setField('body_content', e.target.value)} placeholder="Rich HTML content..." rows={12} />
      </div>

      <div>
        <Label>CTA Block (HTML)</Label>
        <Textarea value={form.cta_block} onChange={(e) => setField('cta_block', e.target.value)} placeholder="Custom CTA content..." rows={3} />
      </div>

      <div>
        <Label>Featured Image URL</Label>
        <Input value={form.featured_image} onChange={(e) => setField('featured_image', e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <Label>Schema Type</Label>
        <Select value={form.schema_type} onValueChange={(v) => setField('schema_type', v)}>
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

      {form.status === 'scheduled' && (
        <div>
          <Label>Publish Date</Label>
          <Input type="datetime-local" value={form.publish_date} onChange={(e) => setField('publish_date', e.target.value)} />
        </div>
      )}

      <div>
        <Label>Internal Links</Label>
        <InternalLinkPicker
          selected={form.internal_links}
          onChange={(links) => setField('internal_links', links)}
          excludeId={pageId || undefined}
        />
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
          {pageId ? 'Save Changes' : 'Create Page'}
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {pageId && form.status === 'published' && (
          <Button variant="ghost" onClick={() => window.open(`/${form.slug}`, '_blank')}>
            Preview
          </Button>
        )}
      </div>
    </div>
  );
};
