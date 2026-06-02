import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Factory, Anchor, TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AssetMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface AssetClassData {
  id: 'residential' | 'industrial' | 'specialty';
  icon: LucideIcon;
  name: string;
  description: string;
  gradient: string;
  metrics: AssetMetric[];
}

const assetClasses: AssetClassData[] = [
  {
    id: 'residential',
    icon: Home,
    name: 'Residential',
    description: 'Multi-family, Section 8, and SFR portfolios',
    gradient: 'from-[hsl(186_100%_50%/0.2)] to-transparent',
    metrics: [
      { label: 'Voucher Size', value: '$1,847/mo', trend: 'up' },
      { label: 'Occupancy Rate', value: '96.2%', trend: 'up' },
      { label: 'HAP Verified', value: '892 Units', trend: 'neutral' },
      { label: 'Avg Rent Growth', value: '+4.8% YoY', trend: 'up' }
    ]
  },
  {
    id: 'industrial',
    icon: Factory,
    name: 'Industrial',
    description: 'Warehouses, logistics, and manufacturing facilities',
    gradient: 'from-[hsl(160_84%_39%/0.2)] to-transparent',
    metrics: [
      { label: 'Loading Docks', value: '2,340', trend: 'neutral' },
      { label: 'Clear Height', value: '32ft avg', trend: 'neutral' },
      { label: 'NNN Lease Rate', value: '$8.45/sqft', trend: 'up' },
      { label: 'Vacancy Rate', value: '2.1%', trend: 'down' }
    ]
  },
  {
    id: 'specialty',
    icon: Anchor,
    name: 'Specialty',
    description: 'Marinas, golf courses, and unique assets',
    gradient: 'from-[hsl(45_85%_50%/0.2)] to-transparent',
    metrics: [
      { label: 'Wet Slips', value: '4,200+', trend: 'neutral' },
      { label: 'Avg Slip Rate', value: '$42/ft/mo', trend: 'up' },
      { label: 'Occupancy', value: '94.8%', trend: 'up' },
      { label: 'Revenue/Slip', value: '$18,400/yr', trend: 'up' }
    ]
  }
];

interface AssetClassExplorerProps {
  title?: string;
  subtitle?: string;
}

export default function AssetClassExplorer({
  title = "Explore Asset Classes",
  subtitle = "See how we track metrics across different property types"
}: AssetClassExplorerProps) {
  const [activeClass, setActiveClass] = useState<'residential' | 'industrial' | 'specialty'>('residential');
  
  const activeData = assetClasses.find(ac => ac.id === activeClass)!;
  const ActiveIcon = activeData.icon;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {title}
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Explorer Container */}
        <div className="flex flex-col md:flex-row gap-8 items-stretch">
          {/* Toggle Buttons */}
          <div className="flex md:flex-col gap-3 md:w-64 shrink-0">
            {assetClasses.map((asset) => {
              const Icon = asset.icon;
              const isActive = activeClass === asset.id;
              
              return (
                <button
                  key={asset.id}
                  onClick={() => setActiveClass(asset.id)}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl transition-all duration-300 text-left flex-1 md:flex-none
                    ${isActive 
                      ? 'investor-glass-strong border-l-[3px] border-l-[hsl(186_100%_50%)] bg-[rgba(0,217,255,0.05)] shadow-[0_0_20px_rgba(0,217,255,0.1)]' 
                      : 'investor-glass hover:bg-white/[0.03] border-l-[3px] border-l-transparent'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-all duration-300
                    ${isActive ? 'bg-[hsl(186_100%_50%/0.15)]' : 'bg-white/5'}
                  `}>
                    <Icon className={`h-5 w-5 transition-colors duration-300 ${isActive ? 'text-[hsl(186_100%_50%)]' : 'text-white/60'}`} />
                  </div>
                  <div className="hidden md:block">
                    <div className={`font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/70'}`}>
                      {asset.name}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5 line-clamp-1">
                      {asset.description}
                    </div>
                  </div>
                  <span className="md:hidden font-medium text-sm text-white/80">{asset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Preview Card */}
          <div className="flex-1 min-h-[320px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeClass}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="investor-glass-strong rounded-2xl p-8 h-full relative overflow-hidden"
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${activeData.gradient} opacity-50`} />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <motion.div 
                      initial={{ rotate: -10 }}
                      animate={{ rotate: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 rounded-xl bg-[hsl(186_100%_50%/0.1)] border border-[hsl(186_100%_50%/0.2)]"
                    >
                      <ActiveIcon className="h-8 w-8 text-[hsl(186_100%_50%)]" />
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{activeData.name}</h3>
                      <p className="text-white/50 text-sm">{activeData.description}</p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {activeData.metrics.map((metric, index) => (
                      <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="investor-glass rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/50 uppercase tracking-wide">
                            {metric.label}
                          </span>
                          {metric.trend && metric.trend !== 'neutral' && (
                            <span className={`flex items-center ${metric.trend === 'up' ? 'text-[hsl(160_84%_50%)]' : 'text-red-400'}`}>
                              {metric.trend === 'up' ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {metric.value}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Decorative Corner */}
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-white/[0.02] to-transparent rounded-tl-full" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
