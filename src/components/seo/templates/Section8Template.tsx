import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { MapPin, Phone, Building2, Clock, UserPlus, Handshake, FileCheck, ChevronRight, MapPinned } from 'lucide-react';
import type { StructuredPage } from '@/hooks/useStructuredPages';
import SEOPageCTA from '@/components/seo/SEOPageCTA';
import MidContentCTA from '@/components/seo/MidContentCTA';
import ToolEmbed from '@/components/seo/ToolEmbed';
import { Badge } from '@/components/ui/badge';
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
  housing_authority?: {
    name?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  waitlist_status?: {
    is_open?: boolean;
    closed_since?: string;
    notes?: string;
  };
  neighborhoods?: Array<{
    name: string;
    icon?: string;
    bullets: string[];
    link?: string;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
}

const HOW_IT_WORKS = [
  { icon: UserPlus, title: 'Create Your Profile', desc: 'Tell us your needs, budget, and preferred areas.' },
  { icon: Handshake, title: 'Get Matched', desc: 'We connect you directly with landlords who accept vouchers.' },
  { icon: FileCheck, title: 'Apply Directly', desc: 'Skip the waitlist and apply to available units.' },
];

const Section8Template: React.FC<Props> = ({ page }) => {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const cityState = [page.city, page.state].filter(Boolean).join(', ');
  const schema = (page.schema_data || {}) as SchemaData;
  const hasSchema = !!(schema.housing_authority || schema.waitlist_status || schema.neighborhoods?.length || schema.faq?.length);

  // Fallback: parse body_content for pages without schema_data
  const body = page.body_content || '';
  let introHtml = '';
  let fallbackHtml = '';

  if (!hasSchema) {
    const h2Index = body.search(/<h2[\s>]/i);
    if (h2Index > 0) {
      introHtml = body.substring(0, h2Index);
      fallbackHtml = body.substring(h2Index);
    } else {
      fallbackHtml = body;
    }
  } else {
    // With schema, use body as intro
    introHtml = body;
  }

  return (
    <article className="space-y-14">
      {/* ── Hero ── */}
      <header className="relative rounded-2xl overflow-hidden py-16 px-6 md:px-14 text-center bg-foreground">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--background) / 0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {cityState && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-background/70 bg-background/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-background/10">
                <MapPin size={13} />
                {cityState}
              </div>
            )}
            {schema.waitlist_status && (
              <Badge
                variant={schema.waitlist_status.is_open ? 'success' : 'danger'}
                className="text-xs uppercase tracking-widest"
              >
                {schema.waitlist_status.is_open ? 'Waitlist Open' : 'Waitlist Closed'}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-background leading-tight tracking-tight max-w-3xl mx-auto">
            {page.h1 || page.title}
          </h1>
          {introHtml && (
            <div
              className="prose prose-lg max-w-2xl mx-auto mt-2 text-background/80 prose-headings:text-background prose-p:text-background/80 prose-a:text-background/90 prose-strong:text-background"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(introHtml) }}
            />
          )}
        </div>
      </header>

      {/* ── Info Cards (schema-driven) ── */}
      {(schema.housing_authority || schema.waitlist_status) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schema.housing_authority && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 size={20} />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-card-foreground">Housing Authority</h2>
                </div>
                <dl className="space-y-2 text-sm text-muted-foreground">
                  {schema.housing_authority.name && (
                    <div><dt className="sr-only">Name</dt><dd className="font-medium text-card-foreground">{schema.housing_authority.name}</dd></div>
                  )}
                  {schema.housing_authority.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-primary" />
                      <dd><a href={`tel:${schema.housing_authority.phone}`} className="hover:text-primary transition-colors">{schema.housing_authority.phone}</a></dd>
                    </div>
                  )}
                  {schema.housing_authority.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-primary mt-0.5" />
                      <dd>{schema.housing_authority.address}</dd>
                    </div>
                  )}
                  {schema.housing_authority.website && (
                    <div>
                      <a href={schema.housing_authority.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 text-xs font-medium transition-colors">
                        Visit Website →
                      </a>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {schema.waitlist_status && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Clock size={20} />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-card-foreground">Waitlist Status</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${schema.waitlist_status.is_open ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium text-card-foreground">
                      {schema.waitlist_status.is_open ? 'Currently Open' : 'Currently Closed'}
                    </span>
                  </div>
                  {schema.waitlist_status.closed_since && (
                    <p className="text-muted-foreground">Closed since {schema.waitlist_status.closed_since}</p>
                  )}
                  {schema.waitlist_status.notes && (
                    <p className="text-muted-foreground">{schema.waitlist_status.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── How It Works ── */}
      <section className="py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center mb-8">
          How OpenKey Works
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4">
          {HOW_IT_WORKS.map((step, i) => (
            <React.Fragment key={step.title}>
              {i > 0 && (
                <ChevronRight size={20} className="hidden md:block text-muted-foreground/40 flex-shrink-0" />
              )}
              <div className="flex flex-col items-center text-center max-w-[200px]">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 border-2 border-primary/20">
                  <step.icon size={26} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Step {i + 1}</span>
                <h3 className="text-sm font-bold tracking-tight text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── Fallback body for marker-less content ── */}
      {fallbackHtml && (
        <section className="rounded-xl border border-border/50 bg-card shadow-sm p-6 md:p-10">
          <div
            className="prose prose-lg max-w-none text-card-foreground prose-headings:text-card-foreground prose-headings:tracking-tight"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(fallbackHtml) }}
          />
        </section>
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

      {/* ── Mid-Content CTA ── */}
      <MidContentCTA variant="tenant" city={page.city} state={page.state} />

      {/* ── Eligibility Calculator Embed ── */}
      <ToolEmbed tool="eligibility" city={page.city} state={page.state} />

      {/* ── Single Bottom CTA ── */}
      <SEOPageCTA
        templateType="section_8"
        city={page.city}
        state={page.state}
        pageUrl={pageUrl}
        variant="bottom"
      />
    </article>
  );
};

export default Section8Template;
