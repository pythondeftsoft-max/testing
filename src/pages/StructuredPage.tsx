import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useContentBySlug, type ContentItem } from '@/hooks/useContent';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import NotFound from './NotFound';
import Section8Template from '@/components/seo/templates/Section8Template';
import LandlordTemplate from '@/components/seo/templates/LandlordTemplate';
import ComparisonTemplate from '@/components/seo/templates/ComparisonTemplate';
import RentDataTemplate from '@/components/seo/templates/RentDataTemplate';
import CityLandingTemplate from '@/components/seo/templates/CityLandingTemplate';
import PageTemplate from '@/components/seo/templates/PageTemplate';
import BlogTemplate from '@/components/seo/templates/BlogTemplate';
import PropertyManagementTemplate from '@/components/seo/templates/PropertyManagementTemplate';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Adapter: convert ContentItem to StructuredPage shape for templates
function toStructuredPage(item: ContentItem) {
  return {
    id: item.id,
    page_type: item.content_type,
    state: item.state,
    city: item.city,
    slug: item.slug,
    title: item.title,
    meta_title: item.meta_title,
    meta_description: item.meta_description,
    canonical_url: item.canonical_url,
    h1: item.meta_title || item.title,
    body_content: item.body,
    cta_block: null,
    internal_links: item.internal_links || [],
    featured_image: item.featured_image,
    schema_type: item.schema_type,
    schema_data: item.schema_data,
    status: item.status,
    publish_date: item.publish_date,
    created_at: item.created_at,
    updated_at: item.updated_at,
    created_by: item.created_by,
  };
}

// Internal links component
const InternalLinks: React.FC<{ linkIds: string[] }> = ({ linkIds }) => {
  const { data: linkedPages } = useQuery({
    queryKey: ['content-links', linkIds],
    queryFn: async () => {
      if (!linkIds.length) return [];
      const { data } = await supabase
        .from('content')
        .select('id, title, slug')
        .in('id', linkIds)
        .eq('status', 'published');
      return (data || []) as Array<{ id: string; title: string; slug: string }>;
    },
    enabled: linkIds.length > 0,
  });

  if (!linkedPages?.length) return null;

  return (
    <nav className="mt-12 border-t pt-8">
      <h2 className="text-xl font-semibold text-foreground mb-4">Related Pages</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {linkedPages.map((p) => (
          <li key={p.id}>
            <a href={`/${p.slug}`} className="text-primary hover:underline">
              {p.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Draft preview banner
const DraftBanner: React.FC<{ status: string }> = ({ status }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const label = status === 'scheduled' ? 'Scheduled' : 'Draft';
  return (
    <div className="bg-warning/15 border-b border-warning/30 px-4 py-2 text-center text-sm text-warning-foreground flex items-center justify-center gap-2">
      <Link to="/admin?tab=blog" className="text-primary hover:underline font-medium text-xs">← Back to Admin</Link>
      <span className="text-muted-foreground">|</span>
      <span className="font-medium">⚠ {label} Preview</span>
      <span className="text-muted-foreground">— This content is not yet published.</span>
      <button onClick={() => setDismissed(true)} className="ml-2 text-muted-foreground hover:text-foreground text-xs">✕</button>
    </div>
  );
};

const StructuredPageView: React.FC = () => {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const searchParams = new URLSearchParams(location.search);
  const isPreview = searchParams.get('preview') === 'true';
  const { user, loading: authLoading } = useAuth();

  const { data: item, isLoading, error } = useContentBySlug(slug, isPreview, isPreview ? user?.id : undefined);

  // When preview mode, wait for auth to resolve before showing NotFound
  const stillLoading = isLoading || (isPreview && authLoading);

  if (stillLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto py-16 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!item || error) return <NotFound />;

  const page = toStructuredPage(item);

  const renderTemplate = () => {
    const t = item.template || item.content_type;
    switch (t) {
      case 'blog':
      case 'blog_post':
        return <BlogTemplate page={page as any} />;
      case 'section8':
      case 'section8_city':
      case 'section8_state':
        return <Section8Template page={page as any} />;
      case 'landlord':
      case 'landlord_city':
      case 'landlord_state':
        return <LandlordTemplate page={page as any} />;
      case 'property-management':
      case 'property_management_city':
      case 'pm_city':
        return <PropertyManagementTemplate page={page as any} />;
      case 'comparison':
      case 'software_comparison':
        return <ComparisonTemplate page={page as any} />;
      case 'rent-data':
      case 'rent_data_city':
        return <RentDataTemplate page={page as any} />;
      case 'city-landing':
      case 'landing':
        return <CityLandingTemplate page={page as any} />;
      default:
        return <PageTemplate page={page as any} />;
    }
  };

  const siteUrl = window.location.origin;
  const canonicalUrl = item.canonical_url || `${siteUrl}/${item.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{item.meta_title || item.title}</title>
        {item.meta_description && <meta name="description" content={item.meta_description} />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={item.meta_title || item.title} />
        {item.meta_description && <meta property="og:description" content={item.meta_description} />}
        {item.featured_image && <meta property="og:image" content={item.featured_image} />}
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        {item.schema_data && Object.keys(item.schema_data).length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': item.schema_type || 'Article',
              ...item.schema_data,
            })}
          </script>
        )}
      </Helmet>

      <Navigation />
      {item.status !== 'published' && <DraftBanner status={item.status} />}
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {renderTemplate()}
        {item.internal_links && item.internal_links.length > 0 && (
          <InternalLinks linkIds={item.internal_links} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StructuredPageView;
