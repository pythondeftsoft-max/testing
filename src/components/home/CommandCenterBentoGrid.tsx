import { motion } from 'framer-motion';
import { TrendingUp, ArrowRightLeft, CheckCircle, Landmark, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

// Mini Sparkline Component
function Sparkline() {
  const points = [40, 35, 50, 45, 60, 55, 70, 65, 80, 75, 85];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min;
  
  const pathData = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((p - min) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-8" preserveAspectRatio="none">
      <path
        d={pathData}
        fill="none"
        stroke="hsl(142 71% 45%)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CommandCenterBentoGrid() {
  const { t } = useLanguage();
  const [isEUR, setIsEUR] = useState(true);

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('commandCenter.bentoTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('commandCenter.bentoSubtitle')}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: The Everything Card (spans 2 columns) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 command-bento-card bg-card p-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(186_100%_50%/0.05)] to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-gradient-blue-gold">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {t('commandCenter.everythingCard.title')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('commandCenter.everythingCard.netWorth')}</p>
                  <p className="text-3xl font-bold text-foreground">$1,247,850</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('commandCenter.everythingCard.monthlyNOI')}</p>
                  <p className="text-3xl font-bold text-openkey-gold">$8,420</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('commandCenter.everythingCard.performance')}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-success">+12.4%</p>
                    <Sparkline />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: The Global Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="command-bento-card bg-card p-8 relative overflow-hidden cursor-pointer"
            onClick={() => setIsEUR(!isEUR)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(45_85%_50%/0.05)] to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-openkey-gold">
                  <ArrowRightLeft className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {t('commandCenter.globalToggle.title')}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Berlin Warehouse</span>
                  </div>
                  <span className="text-sm px-2 py-1 rounded bg-muted">🇩🇪</span>
                </div>

                <motion.div
                  key={isEUR ? 'eur' : 'usd'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-4"
                >
                  <p className="text-3xl font-bold text-foreground">
                    {isEUR ? '€450,000' : '$487,350'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isEUR ? 'EUR' : 'USD'} • {t('commandCenter.globalToggle.converted')}
                  </p>
                </motion.div>

                <div className="flex items-center justify-center gap-2">
                  <span className={`text-sm font-medium ${isEUR ? 'text-foreground' : 'text-muted-foreground'}`}>EUR</span>
                  <div 
                    className="w-12 h-6 bg-muted rounded-full relative cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setIsEUR(!isEUR); }}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-openkey-blue rounded-full"
                      animate={{ left: isEUR ? 4 : 28 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${!isEUR ? 'text-foreground' : 'text-muted-foreground'}`}>USD</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: The Section 8 Split */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="command-bento-card bg-card p-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(142_71%_45%/0.05)] to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-success">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {t('commandCenter.section8Split.title')}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('commandCenter.section8Split.totalRent')}</span>
                  <span className="font-bold text-foreground">$1,850/mo</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{t('commandCenter.section8Split.hapPortion')}</span>
                  <span className="font-bold text-success bg-success/10 px-3 py-1 rounded-full">$1,480</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{t('commandCenter.section8Split.tenantPortion')}</span>
                  <span className="font-bold text-openkey-blue bg-openkey-blue/10 px-3 py-1 rounded-full">$370</span>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-success font-medium">{t('commandCenter.section8Split.received')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
