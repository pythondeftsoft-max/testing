import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Calendar, Clock, Globe, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import SEOPageCTA from '@/components/seo/SEOPageCTA';
import MidContentCTA from '@/components/seo/MidContentCTA';
import ToolEmbed from '@/components/seo/ToolEmbed';

interface BlogPage {
  title: string;
  h1?: string;
  body_content?: string | null;
  cta_block?: string | null;
  city?: string | null;
  state?: string | null;
  featured_image?: string | null;
  publish_date?: string | null;
  excerpt?: string | null;
  pillar?: string | null;
  content_type?: string | null;
  template?: string | null;
}

interface Props {
  page: BlogPage;
}

/**
 * Converts plain-text content (with optional heading markers) to HTML.
 */
function ensureHtmlStructure(body: string): string {
  if (/<(?:p|h[1-6]|div|ul|ol|table|section|article|blockquote)\b/i.test(body)) {
    return body
      .replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, '')
      .replace(/\{"@context"\s*:\s*"https?:\/\/schema\.org"[\s\S]*?\}\s*$/g, '')
      .trim();
  }

  let cleaned = body
    .replace(/\{"@context"\s*:\s*"https?:\/\/schema\.org"[\s\S]*?\}\s*$/g, '')
    .replace(/@context"\s*:\s*"https?:\/\/schema\.org[\s\S]*$/g, '')
    .trim();

  const lines = cleaned.split('\n');
  let html = '';
  let currentParagraph = '';

  const flush = () => {
    const text = currentParagraph.trim();
    if (text) html += `<p>${text}</p>\n`;
    currentParagraph = '';
  };

  const h2Md = /^##\s+(.+)$/;
  const h3Md = /^###\s+(.+)$/;
  const h2Marker = /^[""\u201C\u201D]?H2[""\u201C\u201D]?\s+(.+)$/i;
  const h3Marker = /^[""\u201C\u201D]?H3[""\u201C\u201D]?\s+(.+)$/i;
  const h1Marker = /^[""\u201C\u201D]?H1[""\u201C\u201D]?\s+(.+)$/i;
  const bodyMarker = /^[""\u201C\u201D]?H[123]_BODY[""\u201C\u201D]?$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    if (bodyMarker.test(trimmed)) continue;

    let m: RegExpMatchArray | null;
    if ((m = trimmed.match(h3Md)) || (m = trimmed.match(h3Marker))) {
      flush(); html += `<h3>${m[1].trim()}</h3>\n`; continue;
    }
    if ((m = trimmed.match(h2Md)) || (m = trimmed.match(h2Marker))) {
      flush(); html += `<h2>${m[1].trim()}</h2>\n`; continue;
    }
    if ((m = trimmed.match(h1Marker))) {
      flush(); html += `<h2>${m[1].trim()}</h2>\n`; continue;
    }
    currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
  }
  flush();
  return html.trim();
}

/**
 * Splits body HTML into sections at each <h2> tag for interleaving CTAs/tools.
 */
function splitAtH2(html: string): string[] {
  const parts = html.split(/(?=<h2[\s>])/i);
  return parts.filter(Boolean);
}

/** Determine which tool to embed based on content type / pillar */
function getToolForContent(page: BlogPage): 'eligibility' | 'rent-analyzer' | 'market-demand' | null {
  const ct = page.content_type?.toLowerCase() || '';
  const pillar = page.pillar?.toLowerCase() || '';
  const title = page.title?.toLowerCase() || '';

  if (ct.includes('section8') || pillar.includes('section 8') || title.includes('section 8') || title.includes('voucher')) {
    return 'eligibility';
  }
  if (ct.includes('landlord') || pillar.includes('landlord')) {
    return 'rent-analyzer';
  }
  if (ct.includes('rent') || pillar.includes('market') || pillar.includes('rent')) {
    return 'rent-analyzer';
  }
  if (pillar.includes('housing news') || pillar.includes('policy')) {
    return 'eligibility';
  }
  return null;
}

/** Determine mid-content CTA variant */
function getMidCTAVariant(page: BlogPage): 'tenant' | 'landlord' | 'signup' {
  const ct = page.content_type?.toLowerCase() || '';
  const pillar = page.pillar?.toLowerCase() || '';
  if (ct.includes('landlord') || pillar.includes('landlord')) return 'landlord';
  if (ct.includes('section8') || pillar.includes('section 8') || pillar.includes('tenant')) return 'tenant';
  return 'signup';
}

const PILLAR_LABELS: Record<string, string> = {
  'section 8 basics': 'Section 8',
  'landlord resources': 'Landlord Tips',
  'market insights': 'Market Data',
  'tenant resources': 'Tenant Guide',
  'housing news': 'Housing News',
};

const BlogTemplate: React.FC<Props> = ({ page }) => {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const rawBody = page.body_content || '';
  const body = ensureHtmlStructure(rawBody);
  const wordCount = body.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const formattedDate = page.publish_date
    ? format(new Date(page.publish_date), 'MMMM d, yyyy')
    : null;

  const sections = splitAtH2(body);
  const toolType = getToolForContent(page);
  const midCTAVariant = getMidCTAVariant(page);
  const pillarLabel = page.pillar ? PILLAR_LABELS[page.pillar.toLowerCase()] || page.pillar : null;

  // Insert mid-CTA after 2nd section, tool after 4th (or 3rd if fewer)
  const midCTAIndex = Math.min(2, sections.length);
  const toolIndex = Math.min(4, sections.length);

  return (
    <article className="space-y-12">
      {/* ── Dark Hero ── */}
      <header
        className="relative rounded-2xl overflow-hidden py-20 px-6 md:px-14 text-center bg-foreground"
        style={
          page.featured_image
            ? {
                backgroundImage: `linear-gradient(to bottom, hsl(0 0% 0% / 0.55), hsl(0 0% 0% / 0.75)), url(${page.featured_image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {/* Dot grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--background) / 0.04) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />

        <div className="relative text-background">
          {/* Pillar badge */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {pillarLabel && (
              <Badge variant="outline" className="bg-background/10 text-background/80 border-background/20 backdrop-blur-sm text-xs uppercase tracking-widest">
                <Tag size={10} className="mr-1" />
                {pillarLabel}
              </Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl mx-auto">
            {page.h1 || page.title}
          </h1>
        </div>
      </header>

      {/* ── Meta Bar ── */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground border-b border-border/50 pb-6">
        {formattedDate && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} />
            {formattedDate}
          </span>
        )}
        {formattedDate && <span className="text-border">·</span>}
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} />
          {readingTime} min read
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Globe size={14} />
          EN
        </span>
      </div>

      {/* ── Excerpt ── */}
      {page.excerpt && (
        <blockquote className="border-l-4 border-primary pl-6 py-3 text-lg italic text-muted-foreground bg-muted/10 rounded-r-lg pr-6">
          {page.excerpt}
        </blockquote>
      )}

      {/* ── Body with interleaved CTAs and Tools ── */}
      {sections.map((section, i) => (
        <React.Fragment key={i}>
          <div
            className="prose prose-lg max-w-none
              prose-headings:tracking-tight
              prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-3 prose-h2:mb-6 prose-h2:text-foreground
              prose-h3:text-foreground/90
              prose-table:border prose-table:border-border/30 prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2
              prose-li:marker:text-primary
              [&_.callout]:rounded-lg [&_.callout]:border [&_.callout]:border-primary/20 [&_.callout]:bg-primary/5 [&_.callout]:p-4 [&_.callout]:my-4"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(section) }}
          />

          {/* Mid-content CTA after 2nd section */}
          {i + 1 === midCTAIndex && sections.length > 2 && (
            <MidContentCTA
              variant={midCTAVariant}
              city={page.city}
              state={page.state}
            />
          )}

          {/* Tool embed after 4th section (or 3rd) */}
          {i + 1 === toolIndex && toolType && (
            <ToolEmbed
              tool={toolType}
              city={page.city}
              state={page.state}
            />
          )}
        </React.Fragment>
      ))}

      {/* ── Bottom CTA ── */}
      <SEOPageCTA
        templateType="blog"
        city={page.city}
        state={page.state}
        pageUrl={pageUrl}
        variant="bottom"
      />
    </article>
  );
};

export default BlogTemplate;
