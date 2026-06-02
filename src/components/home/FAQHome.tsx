import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FAQHome() {
  const { t } = useLanguage();
  
  const tenantFaqs = [
    { q: t('faq.tenant.q1'), a: t('faq.tenant.a1') },
    { q: t('faq.tenant.q2'), a: t('faq.tenant.a2') },
    { q: t('faq.tenant.q3'), a: t('faq.tenant.a3') },
    { q: t('faq.tenant.q4'), a: t('faq.tenant.a4') },
    { q: t('faq.tenant.q5'), a: t('faq.tenant.a5') },
    { q: t('faq.tenant.q6'), a: t('faq.tenant.a6') },
    { q: t('faq.tenant.q7'), a: t('faq.tenant.a7') },
  ];

  const landlordFaqs = [
    { q: t('faq.landlord.q1'), a: t('faq.landlord.a1') },
    { q: t('faq.landlord.q2'), a: t('faq.landlord.a2') },
    { q: t('faq.landlord.q3'), a: t('faq.landlord.a3') },
    { q: t('faq.landlord.q4'), a: t('faq.landlord.a4') },
    { q: t('faq.landlord.q5'), a: t('faq.landlord.a5') },
    { q: t('faq.landlord.q6'), a: t('faq.landlord.a6') },
    { q: t('faq.landlord.q7'), a: t('faq.landlord.a7') },
  ];

  const propertyManagerFaqs = [
    { q: t('faq.manager.q1'), a: t('faq.manager.a1') },
    { q: t('faq.manager.q2'), a: t('faq.manager.a2') },
    { q: t('faq.manager.q3'), a: t('faq.manager.a3') },
    { q: t('faq.manager.q4'), a: t('faq.manager.a4') },
    { q: t('faq.manager.q5'), a: t('faq.manager.a5') },
    { q: t('faq.manager.q6'), a: t('faq.manager.a6') },
    { q: t('faq.manager.q7'), a: t('faq.manager.a7') },
    { q: t('faq.manager.q8'), a: t('faq.manager.a8') },
  ];

  return (
    <section className="py-14 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{t('faq.title')}</h2>
        
        <Tabs defaultValue="tenants" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="tenants">{t('faq.forTenants')}</TabsTrigger>
            <TabsTrigger value="landlords">{t('faq.forLandlords')}</TabsTrigger>
            <TabsTrigger value="managers">{t('faq.propertyManagers')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tenants">
            <div className="space-y-3">
              {tenantFaqs.map((faq, i) => (
                <details key={i} className="rounded-lg border border-border bg-card/60 p-4">
                  <summary className="cursor-pointer font-medium text-foreground">{faq.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="landlords">
            <div className="space-y-3">
              {landlordFaqs.map((faq, i) => (
                <details key={i} className="rounded-lg border border-border bg-card/60 p-4">
                  <summary className="cursor-pointer font-medium text-foreground">{faq.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="managers">
            <div className="space-y-3">
              {propertyManagerFaqs.map((faq, i) => (
                <details key={i} className="rounded-lg border border-border bg-card/60 p-4">
                  <summary className="cursor-pointer font-medium text-foreground">{faq.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
