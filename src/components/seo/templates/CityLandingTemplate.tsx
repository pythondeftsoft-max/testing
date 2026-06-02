import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { MapPin, MapPinned, ChevronRight } from 'lucide-react';
import SEOPageCTA from '@/components/seo/SEOPageCTA';
import MidContentCTA from '@/components/seo/MidContentCTA';
import ToolEmbed from '@/components/seo/ToolEmbed';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface CityLandingPage {
  title: string;
  h1?: string;
  body_content?: string | null;
  cta_block?: string | null;
  city?: string | null;
  state?: string | null;
  featured_image?: string | null;
  schema_data?: Record<string, any> | null;
}

interface Props {
  page: CityLandingPage;
}

interface SchemaData {
  highlights?: Array<{ title: string; value: string; description?: string }>;
  neighborhoods?: Array<{ name: string; bullets: string[]; link?: string }>;
  faq?: Array<{ question: string; answer: string }>;
}

const CityLandingTemplate: React.FC<Props> = ({ page }) => {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const cityState = [page.city, page.state].filter(Boolean).join(', ');
  const schema = (page.schema_data || {}) as SchemaData;

  return (
    <article className="space-y-14">
      {/* ── Dark Hero ── */}
      <header
        className="relative rounded-2xl overflow-hidden bg-foreground py-20 px-6 md:px-14 text-center"
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
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--background) / 0.04) 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }} />
        <div className="relative text-background">
          {cityState && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] mb-5 bg-background/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-background/10">
              <MapPin size={13} />
              {cityState}
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl mx-auto">
            {page.h1 || page.title}
          </h1>
        </div>
      </header>

      {/* ── Highlights Grid (schema-driven) ── */}
      {schema.highlights && schema.highlights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {schema.highlights.map((h, i) => (
            <Card key={i} className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{h.title}</p>
                <p className="text-2xl font-bold text-primary tracking-tight">{h.value}</p>
                {h.description && (
                  <p className="text-xs text-muted-foreground">{h.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      {page.body_content && (
        <div
          className="prose prose-lg max-w-none prose-headings:tracking-tight"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body_content) }}
        />
      )}

      {/* ── Neighborhoods (schema-driven) ── */}
      {schema.neighborhoods && schema.neighborhoods.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center mb-8">
            Neighborhoods
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {schema.neighborhoods.map((n) => (
              <Card key={n.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPinned size={16} className="text-primary" />
                    <h3 className="font-bold text-card-foreground tracking-tight">{n.name}</h3>
                  </div>
                  {n.bullets.length > 0 && (
                    <ul className="space-y-1.5">
                      {n.bullets.map((b, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {n.link && (
                    <a href={n.link} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1">
                      View Area <ChevronRight size={12} />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ (schema-driven) ── */}
      {schema.faq && schema.faq.length > 0 && (
        <section className="rounded-xl border border-border/50 bg-card shadow-sm p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Frequently Asked Questions
          </p>
          <Accordion type="single" collapsible className="w-full">
            {schema.faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-card-foreground font-semibold">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer) }}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* ── Eligibility Calculator Embed ── */}
      <ToolEmbed tool="eligibility" city={page.city} state={page.state} />

      {/* ── Mid-Content CTA ── */}
      <MidContentCTA variant="tenant" city={page.city} state={page.state} />

      {/* ── Single Bottom CTA ── */}
      <SEOPageCTA
        templateType="city_landing"
        city={page.city}
        state={page.state}
        pageUrl={pageUrl}
        variant="bottom"
      />
    </article>
  );
};

export default CityLandingTemplate;
