import { LucideIcon, Home, Factory, Anchor, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface BentoItem {
  icon: LucideIcon;
  title: string;
  description: string;
  stats: string;
  gradient: string;
  span?: 'default' | 'wide';
}

const defaultItems: BentoItem[] = [
  {
    icon: Home,
    title: 'Residential',
    description: 'Multi-family, Section 8, and SFR portfolios with tenant-level tracking and rent verification.',
    stats: '890+ Properties',
    gradient: 'from-[hsl(186_100%_50%/0.2)] to-transparent',
    span: 'default'
  },
  {
    icon: Factory,
    title: 'Industrial',
    description: 'Warehouses, logistics centers, and manufacturing facilities with lease analytics.',
    stats: '245+ Facilities',
    gradient: 'from-[hsl(160_84%_39%/0.2)] to-transparent',
    span: 'default'
  },
  {
    icon: Anchor,
    title: 'Specialty Assets',
    description: 'Marinas, golf courses, hospitality, and unique investment properties with custom KPI dashboards.',
    stats: '78+ Unique Assets',
    gradient: 'from-[hsl(45_85%_50%/0.15)] to-transparent',
    span: 'wide'
  }
];

interface BentoGridProps {
  title?: string;
  subtitle?: string;
  items?: BentoItem[];
}

export default function BentoGrid({ 
  title = "Track Every Asset Class",
  subtitle = "Purpose-built intelligence for diverse portfolios",
  items = defaultItems 
}: BentoGridProps) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`
                bento-card investor-glass-strong rounded-2xl p-8 relative overflow-hidden
                ${item.span === 'wide' ? 'md:col-span-2' : ''}
              `}
            >
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-50`} />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <item.icon className="h-7 w-7 text-[hsl(186_100%_50%)]" />
                  </div>
                  <div className="flex items-center gap-2 text-[hsl(160_84%_50%)]">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">{item.stats}</span>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                
                <p className="text-white/60 leading-relaxed">
                  {item.description}
                </p>

                {/* Decorative Corner */}
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-white/[0.02] to-transparent rounded-tl-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
