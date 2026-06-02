import { CreditCard, MessageSquare, BarChart3, Map, ShieldCheck, Rocket } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FeatureHighlights() {
  const { t } = useLanguage();
  
  const features = [
    {
      icon: Rocket,
      title: t('features.fastOnboarding'),
      desc: t('features.fastOnboardingDesc'),
    },
    {
      icon: ShieldCheck,
      title: t('features.trustSafety'),
      desc: t('features.trustSafetyDesc'),
    },
    {
      icon: BarChart3,
      title: t('features.smartInsights'),
      desc: t('features.smartInsightsDesc'),
    },
    { 
      icon: MessageSquare, 
      title: t('features.builtInMessaging'), 
      desc: t('features.builtInMessagingDesc') 
    },
    { 
      icon: Map, 
      title: t('features.neighborhoodView'), 
      desc: t('features.neighborhoodViewDesc') 
    },
    { 
      icon: CreditCard, 
      title: t('features.paymentsReady'), 
      desc: t('features.paymentsReadyDesc') 
    },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t('features.whyOpenKey')}</h2>
          <p className="text-muted-foreground mt-2">{t('features.subtitle')}</p>
        </header>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="group glass-card rounded-xl p-6 border border-border hover-scale card-hover-gold"
            >
              <div className="w-11 h-11 rounded-lg bg-gradient-blue flex items-center justify-center shadow-inner mb-4">
                <f.icon className="w-5 h-5 text-openkey-gold" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
