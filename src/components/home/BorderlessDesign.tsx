import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

const locations = [
  { city: 'Miami', currency: 'USD', x: 25, y: 45, flag: '🇺🇸' },
  { city: 'Berlin', currency: 'EUR', x: 55, y: 30, flag: '🇩🇪' },
  { city: 'London', currency: 'GBP', x: 48, y: 28, flag: '🇬🇧' },
  { city: 'Tokyo', currency: 'JPY', x: 85, y: 40, flag: '🇯🇵' },
];

export default function BorderlessDesign() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Globe Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative h-80 lg:h-96 bg-gradient-to-br from-openkey-blue/5 to-openkey-gold/5 rounded-3xl border border-border overflow-hidden"
          >
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.line
                x1="25" y1="45" x2="55" y2="30"
                stroke="hsl(var(--openkey-blue))"
                strokeWidth="0.3"
                strokeDasharray="2 2"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <motion.line
                x1="48" y1="28" x2="55" y2="30"
                stroke="hsl(var(--openkey-gold))"
                strokeWidth="0.3"
                strokeDasharray="2 2"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.7 }}
              />
              <motion.line
                x1="55" y1="30" x2="85" y2="40"
                stroke="hsl(186 100% 50%)"
                strokeWidth="0.3"
                strokeDasharray="2 2"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.9 }}
              />
            </svg>

            {/* Location Pins */}
            {locations.map((loc, index) => (
              <motion.div
                key={loc.city}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.15 }}
                className="absolute flex flex-col items-center"
                style={{ left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <motion.div
                  className="w-10 h-10 rounded-full bg-card border-2 border-primary flex items-center justify-center text-lg shadow-lg"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                >
                  {loc.flag}
                </motion.div>
                <div className="mt-2 bg-card px-2 py-1 rounded-md text-xs font-medium text-foreground shadow-sm border border-border">
                  {loc.city} • {loc.currency}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-sm font-semibold tracking-widest text-openkey-gold uppercase mb-4 block">
              {t('commandCenter.borderless.label')}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              {t('commandCenter.borderless.header')}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('commandCenter.borderless.body')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
