import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Scale, ThumbsUp, ThumbsDown, Award } from 'lucide-react';
import type { StructuredPage } from '@/hooks/useStructuredPages';
import SEOPageCTA from '@/components/seo/SEOPageCTA';
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
  competitors?: Array<{ name: string; pros: string[]; cons: string[] }>;
  verdict?: string;
  faq?: Array<{ question: string; answer: string }>;
}

const ComparisonTemplate: React.FC<Props> = ({ page }) => {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const schema = (page.schema_data || {}) as SchemaData;

  return (
    <article className="space-y-14">
      {/* ── Dark Hero ── */}
      <header className="relative rounded-2xl overflow-hidden bg-foreground py-16 px-6 md:px-14 text-center">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--background) / 0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative">
          <div className="mx-auto w-11 h-11 rounded-full bg-background/10 flex items-center justify-center text-background/70 mb-5 border border-background/10">
            <Scale size={22} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-background leading-tight tracking-tight max-w-3xl mx-auto">
            {page.h1 || page.title}
          </h1>
          <div className="w-12 h-px bg-background/20 mx-auto mt-6" />
          <p className="mt-5 text-background/60 text-lg max-w-xl mx-auto">
            An unbiased, feature-by-feature comparison to help you choose the right tool.
          </p>
        </div>
      </header>

      {/* ── Body (tables etc.) ── */}
      {page.body_content && (
        <div
          className="prose prose-lg max-w-none
            prose-table:w-full prose-table:border prose-table:border-border/50 prose-table:rounded-lg prose-table:overflow-hidden
            prose-th:bg-foreground/[0.03] prose-th:text-left prose-th:px-5 prose-th:py-3.5 prose-th:text-sm prose-th:font-semibold prose-th:text-foreground prose-th:border-b prose-th:border-border/50
            prose-td:px-5 prose-td:py-3.5 prose-td:border-b prose-td:border-border/30 prose-td:text-sm
            prose-tr:even:bg-muted/20"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body_content) }}
        />
      )}

      {/* ── Pros/Cons Cards (schema-driven) ── */}
      {schema.competitors && schema.competitors.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center mb-8">
            At a Glance
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schema.competitors.map((comp) => (
              <Card key={comp.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-bold tracking-tight text-card-foreground">{comp.name}</h3>
                  {comp.pros.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-600">
                        <ThumbsUp size={13} /> Pros
                      </div>
                      <ul className="space-y-1.5">
                        {comp.pros.map((p, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {comp.cons.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-600">
                        <ThumbsDown size={13} /> Cons
                      </div>
                      <ul className="space-y-1.5">
                        {comp.cons.map((c, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Verdict (schema-driven) ── */}
      {schema.verdict && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6 md:p-8 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-card-foreground mb-2">Our Verdict</h2>
              <p className="text-sm text-muted-foreground">{schema.verdict}</p>
            </div>
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

      {/* ── Single Bottom CTA ── */}
      <SEOPageCTA
        templateType="comparison"
        city={page.city}
        state={page.state}
        pageUrl={pageUrl}
        variant="bottom"
      />
    </article>
  );
};

export default ComparisonTemplate;
