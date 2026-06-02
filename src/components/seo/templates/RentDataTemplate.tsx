import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { MapPin, BarChart3, TrendingUp, TrendingDown, Minus, MapPinned, ChevronRight } from 'lucide-react';
import type { StructuredPage } from '@/hooks/useStructuredPages';
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

interface Props {
  page: StructuredPage;
}

interface SchemaData {
  metrics?: Array<{ label: string; value: string; change?: string }>;
  neighborhoods?: Array<{ name: string; bullets: string[]; link?: string }>;
  faq?: Array<{ question: string; answer: string }>;
}

const RentDataTemplate: React.FC<Props> = ({ page }) => {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const cityState = [page.city, page.state].filter(Boolean).join(', ');
  const body = page.body_content || '';
  const schema = (page.schema_data || {}) as SchemaData;
  const hasSchemaMetrics = !!(schema.metrics && schema.metrics.length > 0);

  // Fallback: HTML markers for pages without schema_data
  const hasMarkers = body.includes('<!-- metrics -->');
  const metricsHtml = hasMarkers ? body.split('<!-- metrics -->')[1]?.split('<!--')[0] || '' : '';
  const restHtml = hasMarkers
    ? [body.split('<!-- metrics -->')[0], body.split('<!-- metrics -->')[1]?.split('-->').slice(1).join('-->')].filter(Boolean).join('')
    : body;

  const getChangeIcon = (change?: string) => {
    if (!change) return null;
    if (change.startsWith('+')) return <TrendingUp size={14} className="text-green-600" />;
    if (change.startsWith('-')) return <TrendingDown size={14} className="text-red-600" />;
    return <Minus size={14} className="text-muted-foreground" />;
  };

  return (
    <article className="space-y-14">
      {/* ── Dark Hero ── */}
      <header className="relative rounded-2xl overflow-hidden bg-foreground py-16 px-6 md:px-14 text-center">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--background) / 0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-background/60 bg-background/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-background/10">
              <BarChart3 size={13} />
              Rent Data
            </div>
            {cityState && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-background/50">
                <MapPin size={13} />
                {cityState}
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-background leading-tight tracking-tight max-w-3xl mx-auto">
            {page.h1 || page.title}
          </h1>
        </div>
      </header>

      {/* ── Stat Cards (schema-driven) ── */}
      {hasSchemaMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {schema.metrics!.map((m, i) => (
            <Card key={i} className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold text-primary tracking-tight">{m.value}</p>
                {m.change && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    {getChangeIcon(m.change)}
                    <span>{m.change} YoY</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Fallback Metrics Card (HTML marker) ── */}
      {!hasSchemaMetrics && metricsHtml && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6 md:p-8">
            <div
              className="prose prose-lg max-w-none text-foreground font-medium
                [&_strong]:text-primary [&_strong]:text-2xl [&_strong]:font-bold"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(metricsHtml) }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Body ── */}
      {(hasSchemaMetrics ? body : restHtml) && (
        <div
          className="prose prose-lg max-w-none prose-headings:tracking-tight"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(hasSchemaMetrics ? body : restHtml) }}
        />
      )}

      {/* ── Neighborhoods (schema-driven) ── */}
      {schema.neighborhoods && schema.neighborhoods.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center mb-8">
            Rent by Neighborhood
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
                      View Details <ChevronRight size={12} />
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

      {/* ── Rent Analyzer Embed ── */}
      <ToolEmbed tool="rent-analyzer" city={page.city} state={page.state} />

      {/* ── Market Demand Embed ── */}
      <ToolEmbed tool="market-demand" city={page.city} state={page.state} />

      {/* ── Mid-Content CTA ── */}
      <MidContentCTA variant="tenant" city={page.city} state={page.state} />

      {/* ── Single Bottom CTA ── */}
      <SEOPageCTA
        templateType="rent_data"
        city={page.city}
        state={page.state}
        pageUrl={pageUrl}
        variant="bottom"
      />
    </article>
  );
};

export default RentDataTemplate;
