import { motion } from 'framer-motion';
import { FileText, Shield, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

export default function Section8Simplified() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-sm font-semibold tracking-widest text-success uppercase">
              {t('commandCenter.section8.label')}
            </span>
            <Badge variant="secondary" className="text-xs font-medium">
              🇺🇸 US Landlords
            </Badge>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {t('commandCenter.section8.header')}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            {t('commandCenter.section8.body')}
          </p>
        </motion.div>

        {/* HAP Payment Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card border border-border rounded-3xl p-8 md:p-12"
        >
          {/* Month Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => (
              <button
                key={month}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  index === 2
                    ? 'bg-openkey-blue text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {month}
              </button>
            ))}
          </div>

          {/* Payment Split Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Payment Split</span>
              <span className="text-sm font-medium text-foreground">$1,850 Total</span>
            </div>
            <div className="h-8 rounded-full overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '80%' }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
                className="bg-success flex items-center justify-center text-white text-sm font-medium"
              >
                HAP 80%
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '20%' }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-openkey-blue flex items-center justify-center text-white text-sm font-medium"
              >
                20%
              </motion.div>
            </div>
          </div>

          {/* Feature Icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="p-3 rounded-lg bg-success/10">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-foreground">HAP Tracking</p>
                <p className="text-sm text-muted-foreground">Auto-split payments</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="p-3 rounded-lg bg-openkey-blue/10">
                <FileText className="h-6 w-6 text-openkey-blue" />
              </div>
              <div>
                <p className="font-semibold text-foreground">HUD Documents</p>
                <p className="text-sm text-muted-foreground">Secure storage</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="p-3 rounded-lg bg-openkey-gold/10">
                <Shield className="h-6 w-6 text-openkey-gold" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Voucher Status</p>
                <p className="text-sm text-muted-foreground">Real-time updates</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
