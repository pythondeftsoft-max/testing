import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { MapPin, Settings, Users, BarChart3, ClipboardList, Zap, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { StructuredPage } from '@/hooks/useStructuredPages';
import SEOPageCTA from '@/components/seo/SEOPageCTA';
import MidContentCTA from '@/components/seo/MidContentCTA';
import ToolEmbed from '@/components/seo/ToolEmbed';
import { ArrowRight } from 'lucide-react';
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
  benefits?: Array<{ title: string; desc: string }>;
  features?: string[];
  faq?: Array<{ question: string; answer: string }>;
  neighborhoods?: Array<{ name: string; description?: string; bullets?: string[] }>;
  stats?: Array<{ label: string; value: string }>;
}

const VALUE_PROPS = [
  { icon: Settings, title: 'Automated Management', desc: 'Streamline rent collection, maintenance, and tenant communication.' },
  { icon: Users, title: 'Section 8 Expertise', desc: 'Navigate voucher programs, inspections, and housing authority requirements.' },
  { icon: BarChart3, title: 'Market Intelligence', desc: 'Real-time rent data, vacancy rates, and FMR comparisons.' },
];

const HOW_IT_WORKS = [
  { icon: ClipboardList, title: 'List Properties', desc: 'Add your portfolio and set rent prices based on FMR data.' },
  { icon: Zap, title: 'Automate Operations', desc: 'Set up rent collection, maintenance requests, and tenant screening.' },
  { icon: ShieldCheck, title: 'Grow Revenue', desc: 'Fill vacancies faster with voucher-ready tenants and guaranteed payments.' },
];

const PropertyManagementTemplate: React.FC<Props> = ({ page }) => {
  const navigate = useNavigate();
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const cityState = [page.city, page.state].filter(Boolean).join(', ');
  const schema = (page.schema_data || {}) as SchemaData;

  return (
    <article className="space-y-14">
      {/* ── Dark Hero ── */}
      <header className="relative rounded-2xl overflow-hidden bg-foreground py-20 px-6 md:px-14 text-center text-background">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--background) / 0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative">
          {cityState && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] mb-5 bg-background/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-background/10">
              <MapPin size={13} />
              {cityState}
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-background/60 mb-3">Property Management</p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl mx-auto">
            {page.h1 || page.title}
          </h1>
          {(page as any).excerpt && (
            <p className="mt-4 text-lg text-background/70 max-w-2xl mx-auto">{(page as any).excerpt}</p>
          )}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              variant="gradient"
              className="text-lg px-10 py-6 h-auto gap-2"
              onClick={() => navigate(`/auth?mode=signup&type=landlord&city=${page.city || ''}`)}
            >
              Get Started Free
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Stats ── */}
      {schema.stats && schema.stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {schema.stats.map((stat, i) => (
            <Card key={i} className="text-center">
              <CardContent className="p-5">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Value Props ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {VALUE_PROPS.map((vp) => (
          <Card key={vp.title} className="text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-6 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <vp.icon size={24} />
              </div>
              <h3 className="font-semibold tracking-tight text-card-foreground">{vp.title}</h3>
              <p className="text-sm text-muted-foreground">{vp.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── How It Works ── */}
      <section className="py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center mb-8">
          How It Works
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

      {/* ── Body ── */}
      {page.body_content && (
        <div
          className="prose prose-lg max-w-none prose-headings:tracking-tight prose-h2:border-b prose-h2:pb-2 prose-h2:border-border/30 prose-table:rounded-lg prose-table:overflow-hidden prose-th:bg-muted prose-th:p-3 prose-td:p-3"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body_content) }}
        />
      )}

      {/* ── Mid-Content CTA ── */}
      <MidContentCTA variant="landlord" city={page.city} state={page.state} />

      {/* ── Rent Analyzer Embed ── */}
      <ToolEmbed tool="rent-analyzer" city={page.city} state={page.state} />

      {/* ── Market Demand Embed ── */}
      <ToolEmbed tool="market-demand" city={page.city} state={page.state} />

      {/* ── Neighborhoods (schema-driven) ── */}
      {schema.neighborhoods && schema.neighborhoods.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Top Neighborhoods for Property Management
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schema.neighborhoods.map((n, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold text-card-foreground">{n.name}</h3>
                  {n.description && <p className="text-sm text-muted-foreground">{n.description}</p>}
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

      {/* ── Bottom CTA ── */}
      <SEOPageCTA
        templateType="landlord_voucher"
        city={page.city}
        state={page.state}
        pageUrl={pageUrl}
        variant="bottom"
      />
    </article>
  );
};

export default PropertyManagementTemplate;
