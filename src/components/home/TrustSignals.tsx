import { motion } from 'framer-motion';
import { Gift, PhoneOff, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TrustSignals() {
  const { t } = useLanguage();

  const signals = [
    {
      icon: Gift,
      text: t('commandCenter.trust.freeForever'),
      color: 'text-success',
    },
    {
      icon: PhoneOff,
      text: t('commandCenter.trust.noSalesCalls'),
      color: 'text-openkey-blue',
    },
    {
      icon: Globe,
      text: t('commandCenter.trust.borderless'),
      color: 'text-openkey-gold',
    },
  ];

  return (
    <section className="py-12 px-6 bg-muted/50 border-y border-border">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16"
        >
          {signals.map((signal, index) => (
            <motion.div
              key={signal.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <signal.icon className={`h-6 w-6 ${signal.color}`} />
              <span className="font-semibold text-foreground">{signal.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
