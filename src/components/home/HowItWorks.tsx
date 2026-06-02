import { motion } from 'framer-motion';
import { Link2, Activity, TrendingUp, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const steps = [
  {
    number: 1,
    icon: Link2,
    titleKey: 'commandCenter.howItWorks.step1.title',
    descKey: 'commandCenter.howItWorks.step1.description',
    color: 'text-openkey-blue',
    bgColor: 'bg-openkey-blue/10',
  },
  {
    number: 2,
    icon: Activity,
    titleKey: 'commandCenter.howItWorks.step2.title',
    descKey: 'commandCenter.howItWorks.step2.description',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    number: 3,
    icon: TrendingUp,
    titleKey: 'commandCenter.howItWorks.step3.title',
    descKey: 'commandCenter.howItWorks.step3.description',
    color: 'text-openkey-gold',
    bgColor: 'bg-openkey-gold/10',
  },
];

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold tracking-widest text-primary uppercase mb-4 block">
            {t('commandCenter.howItWorks.label')}
          </span>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection Lines (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0">
            <div className="flex items-center justify-center gap-0 px-16">
              <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-border to-border" />
              <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
              <div className="flex-1 h-0.5 bg-border" />
              <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
              <div className="flex-1 h-0.5 bg-gradient-to-r from-border via-border to-transparent" />
            </div>
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="relative z-10"
            >
              <div className="bg-card border border-border rounded-2xl p-8 text-center h-full hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                {/* Step Number Badge */}
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-6">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`inline-flex p-4 rounded-xl ${step.bgColor} mb-6`}>
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {t(step.titleKey)}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {t(step.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
