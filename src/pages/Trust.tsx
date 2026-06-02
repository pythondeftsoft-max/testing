import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Lock, Database, FileCheck, LifeBuoy, Building2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/components/DynamicThemeProvider';

interface RfpEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  short_answer: string | null;
  display_order: number;
}

const categoryMeta: Record<string, { label: string; icon: any; color: string }> = {
  security: { label: 'Security', icon: Shield, color: 'text-primary' },
  hud_compliance: { label: 'HUD Compliance', icon: FileCheck, color: 'text-primary' },
  architecture: { label: 'Architecture', icon: Database, color: 'text-primary' },
  data_handling: { label: 'Data Handling', icon: Lock, color: 'text-primary' },
  support: { label: 'Support & SLAs', icon: LifeBuoy, color: 'text-primary' },
  pricing: { label: 'Pricing', icon: Building2, color: 'text-primary' },
  other: { label: 'Other', icon: FileCheck, color: 'text-muted-foreground' },
};

const Trust: React.FC = () => {
  const { whiteLabelConfig, isWhiteLabeled } = useTheme();
  const [entries, setEntries] = useState<RfpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const brandName = isWhiteLabeled
    ? whiteLabelConfig?.company_name || 'Your Housing Authority'
    : 'OpenKey Housing';
  const brandLogo = isWhiteLabeled ? whiteLabelConfig?.company_logo_url : null;

  useEffect(() => {
    (async () => {
      let query = supabase
        .from('rfp_response_library')
        .select('id, category, question, answer, short_answer, display_order')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      // On agency subdomains, only show entries the agency has marked public-facing.
      if (isWhiteLabeled) {
        query = query.eq('public_facing', true);
      }

      const { data } = await query;
      setEntries((data as RfpEntry[]) || []);
      setLoading(false);
    })();
  }, [isWhiteLabeled]);

  const grouped = entries.reduce<Record<string, RfpEntry[]>>((acc, e) => {
    (acc[e.category] = acc[e.category] || []).push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Trust & Security | ${brandName}`}</title>
        <meta name="description" content={`${brandName}'s security, HUD compliance, architecture, and data-handling policies for Public Housing Authority procurement teams.`} />
        {!isWhiteLabeled && <link rel="canonical" href="https://openkeyhousing.com/trust" />}
      </Helmet>

      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-10 w-auto" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
            <h1 className="text-3xl font-bold">Trust & Security</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {isWhiteLabeled ? (
              <>Built for {brandName}. Below is the security, compliance, and data-handling posture for our housing operations.</>
            ) : (
              <>Built for Public Housing Authorities. Below is a complete reference of the controls, compliance posture, and architecture decisions that govern OpenKey Housing.</>
            )}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline">SOC 2 Roadmap</Badge>
            <Badge variant="outline">HUD-50058 Compliant</Badge>
            <Badge variant="outline">PostgreSQL RLS</Badge>
            <Badge variant="outline">AES-256 / TLS 1.3</Badge>
            <Badge variant="outline">90-day data destruction</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {isWhiteLabeled
                ? `${brandName} has not yet published any compliance details on this page.`
                : 'No published responses yet. Check back soon.'}
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const meta = categoryMeta[cat] || categoryMeta.other;
            const Icon = meta.icon;
            return (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                    {meta.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {items.map(e => (
                      <AccordionItem key={e.id} value={e.id}>
                        <AccordionTrigger className="text-left">{e.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">
                          {e.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })
        )}

        {!isWhiteLabeled && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-8 text-center space-y-4">
              <h3 className="text-xl font-semibold">Need an RFP packet for your procurement team?</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                We'll generate a tailored packet with the answers your team needs — security overview,
                HUD compliance attestation, and a SOC 2 questionnaire response.
              </p>
              <Button asChild size="lg">
                <Link to="/for-agencies#contact">Request RFP Packet</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Trust;
