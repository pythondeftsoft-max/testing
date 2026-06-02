import { motion } from "framer-motion";
import { Users, Home, Search, Sparkles, Shield, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HowItWorksTimeline() {
  const { t } = useLanguage();
  
  const stepsTenant = [
    { icon: Search, title: t('howItWorks.tenant.step1Title'), desc: t('howItWorks.tenant.step1Desc') },
    { icon: Home, title: t('howItWorks.tenant.step2Title'), desc: t('howItWorks.tenant.step2Desc') },
    { icon: CheckCircle2, title: t('howItWorks.tenant.step3Title'), desc: t('howItWorks.tenant.step3Desc') },
  ];

  const stepsLandlord = [
    { icon: Sparkles, title: t('howItWorks.landlord.step1Title'), desc: t('howItWorks.landlord.step1Desc') },
    { icon: Users, title: t('howItWorks.landlord.step2Title'), desc: t('howItWorks.landlord.step2Desc') },
    { icon: Shield, title: t('howItWorks.landlord.step3Title'), desc: t('howItWorks.landlord.step3Desc') },
  ];

  return (
    <section className="relative py-20 px-4">
      <div className="absolute inset-0 bg-gradient-subtle-blue opacity-40 pointer-events-none" />
      <div className="max-w-6xl mx-auto relative">
        <header className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t('howItWorks.title')}
          </h2>
          <p className="text-muted-foreground mt-2">{t('howItWorks.subtitle')}</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <Timeline title={t('howItWorks.forTenants')} colorClass="text-openkey-blue" steps={stepsTenant} />
          <Timeline title={t('howItWorks.forLandlords')} colorClass="text-openkey-gold" steps={stepsLandlord} />
        </div>
      </div>
    </section>
  );
}

function Timeline({ title, steps, colorClass }: { title: string; steps: any[]; colorClass: string }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className={`text-xl font-semibold mb-6 ${colorClass}`}>{title}</h3>
      <ol className="relative border-s border-border pl-6 space-y-6">
        {steps.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true, margin: "-50px" }}
            className="relative"
          >
            <span className="absolute -start-3 top-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
              <s.icon className={`w-3.5 h-3.5 ${colorClass}`} />
            </span>
            <div className="rounded-lg border border-border p-4 bg-card/60">
              <div className="font-semibold text-foreground">{s.title}</div>
              <div className="text-sm text-muted-foreground">{s.desc}</div>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
