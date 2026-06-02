import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { MapPin, ShieldCheck, Users, DollarSign, ClipboardList, Handshake, Wallet, ChevronRight, MapPinned } from 'lucide-react';
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
  benefits?: Array<{ icon?: string; title: string; desc: string }>;
  property_requirements?: string[];
  faq?: Array<{ question: string; answer: string }>;
}

const DEFAULT_BENEFITS = [
  { icon: DollarSign, title: 'Guaranteed Rent', desc: 'Payments backed by the housing authority — no missed checks.' },
  { icon: Users, title: 'Vetted Tenants', desc: 'Pre-screened applicants ready to move in.' },
  { icon: ShieldCheck, title: 'Free to List', desc: 'No fees, no commissions. List your property at zero cost.' },
];

const HOW_IT_WORKS = [
  { icon: ClipboardList, title: 'List Your Property', desc: 'Create a free listing with your property details.' },
  { icon: Handshake, title: 'Get Matched', desc: 'We connect you with vetted, voucher-holding tenants.' },
  { icon: Wallet, title: 'Collect Rent', desc: 'Receive guaranteed payments from the housing authority.' },
];

const LandlordTemplate: React.FC<Props> = ({ page }) => {
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
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl mx-auto">
            {page.h1 || page.title}
          </h1>
          <div className="mt-10">
            <Button
              size="lg"
              variant="gradient"
              className="text-lg px-10 py-6 h-auto gap-2"
              onClick={() => navigate(`/auth?mode=signup&type=landlord&city=${page.city || ''}`)}
            >
              List Your Property
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Value Props ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DEFAULT_BENEFITS.map((vp) => (
          <Card
            key={vp.title}
            className="text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
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
          className="prose prose-lg max-w-none prose-headings:tracking-tight"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body_content) }}
        />
      )}

      {/* ── Property Requirements (schema-driven) ── */}
      {schema.property_requirements && schema.property_requirements.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6 md:p-8 space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-card-foreground">Property Requirements</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {schema.property_requirements.map((req, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
      <MidContentCTA variant="landlord" city={page.city} state={page.state} />

      {/* ── Rent Analyzer Embed ── */}
      <ToolEmbed tool="rent-analyzer" city={page.city} state={page.state} />

      {/* ── Single Bottom CTA ── */}
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

export default LandlordTemplate;
