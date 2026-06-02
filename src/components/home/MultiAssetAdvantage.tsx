import { motion } from 'framer-motion';
import { Building2, TrendingUp, Landmark, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

const assetTypes = [
  { icon: Building2, label: 'Real Estate', description: 'Track property values in real-time', color: 'text-openkey-blue' },
  { icon: TrendingUp, label: 'Stocks & ETFs', description: 'Monitor market performance live', color: 'text-success' },
  { icon: Landmark, label: 'CDs & Bonds', description: 'Track maturity dates & yields', color: 'text-openkey-gold' },
  { icon: Home, label: 'Section 8', description: 'Auto-split HAP payments', color: 'text-[hsl(186_100%_50%)]', badge: '🇺🇸 US' },
];

export default function MultiAssetAdvantage() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold tracking-widest text-[hsl(186_100%_50%)] uppercase mb-4 block">
              {t('commandCenter.multiAsset.label')}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              {t('commandCenter.multiAsset.header')}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('commandCenter.multiAsset.body')}
            </p>
          </motion.div>

          {/* Asset Icons Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-6"
          >
            {assetTypes.map((asset, index) => (
              <motion.div
                key={asset.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/20 transition-all duration-300 relative"
              >
                {asset.badge && (
                  <Badge variant="secondary" className="absolute top-3 right-3 text-xs">
                    {asset.badge}
                  </Badge>
                )}
                <div className={`inline-flex p-4 rounded-xl bg-muted mb-4 ${asset.color}`}>
                  <asset.icon className="h-8 w-8" />
                </div>
                <p className="font-semibold text-foreground mb-1">{asset.label}</p>
                <p className="text-sm text-muted-foreground">{asset.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
