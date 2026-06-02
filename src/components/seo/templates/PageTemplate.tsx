import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import SEOPageCTA from '@/components/seo/SEOPageCTA';

interface PageData {
  title: string;
  h1?: string;
  body_content?: string | null;
  cta_block?: string | null;
  featured_image?: string | null;
}

interface Props {
  page: PageData;
}

const PageTemplate: React.FC<Props> = ({ page }) => {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <article className="space-y-16">
      {/* Hero */}
      <header
        className="relative rounded-2xl overflow-hidden py-16 px-6 md:px-14 text-center"
        style={
          page.featured_image
            ? {
                backgroundImage: `linear-gradient(to bottom, hsl(0 0% 0% / 0.6), hsl(0 0% 0% / 0.8)), url(${page.featured_image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {/* Dark bg with dot grid when no image */}
        {!page.featured_image && (
          <>
            <div className="absolute inset-0 bg-foreground rounded-2xl" />
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--background) / 0.05) 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }} />
          </>
        )}
        <h1 className={`relative text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl mx-auto ${page.featured_image || !page.featured_image ? 'text-background' : 'text-foreground'}`}>
          {page.h1 || page.title}
        </h1>
      </header>

      {/* Body */}
      {page.body_content && (
        <div
          className="prose prose-lg max-w-none prose-headings:tracking-tight"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body_content) }}
        />
      )}

      {/* Single Bottom CTA */}
      <SEOPageCTA
        templateType="page"
        pageUrl={pageUrl}
        variant="bottom"
      />
    </article>
  );
};

export default PageTemplate;
