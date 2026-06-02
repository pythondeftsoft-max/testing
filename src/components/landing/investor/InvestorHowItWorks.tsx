import { LucideIcon, UserPlus, BarChart3, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const defaultSteps: Step[] = [
  {
    icon: UserPlus,
    title: "Connect Your Portfolio",
    description: "Link your Section 8 properties and assets in minutes with our secure onboarding."
  },
  {
    icon: BarChart3,
    title: "Track Performance",
    description: "Monitor rent collection, occupancy rates, and compliance status in real-time."
  },
  {
    icon: ShieldCheck,
    title: "Verify Everything",
    description: "Independent data to validate what your property managers report."
  }
];

interface InvestorHowItWorksProps {
  title?: string;
  subtitle?: string;
  steps?: Step[];
}

export default function InvestorHowItWorks({ 
  title = "Get Started in 3 Steps",
  subtitle = "From signup to full portfolio visibility in under 10 minutes",
  steps = defaultSteps 
}: InvestorHowItWorksProps) {
  return (
    <section className="py-24 px-6 relative">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(210_69%_8%)] to-transparent opacity-50" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>
        
        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector Line - Desktop */}
          <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-[hsl(186_100%_50%/0.3)] to-transparent" />
          
          {steps.map((step, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              {/* Step Number Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[hsl(186_100%_50%)] text-[hsl(210_69%_11%)] flex items-center justify-center text-sm font-bold z-20 shadow-lg shadow-[hsl(186_100%_50%/0.3)]">
                {index + 1}
              </div>

              {/* Icon Container */}
              <div className="relative z-10 mx-auto w-32 h-32 rounded-2xl investor-glass-strong flex items-center justify-center mb-6 group">
                <step.icon className="h-12 w-12 text-[hsl(186_100%_50%)] transition-transform duration-300 group-hover:scale-110" />
                
                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 rounded-2xl bg-[hsl(186_100%_50%/0.1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">
                {step.title}
              </h3>
              
              <p className="text-white/50 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
