import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface InvestorHeroProps {
  headline?: string;
  subhead?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export default function InvestorHero({
  headline = "Institutional-Grade Portfolio Intelligence",
  subhead = "Real-time asset monitoring. Independent verification. Institutional trust.",
  ctaText = "Start Tracking Your Portfolio",
  ctaLink = "/auth?mode=signup&type=landlord",
  secondaryCtaText = "See How It Works",
  secondaryCtaLink = "/resources"
}: InvestorHeroProps) {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[hsl(186_100%_50%/0.08)] blur-[100px] animate-float-orb" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(160_84%_39%/0.06)] blur-[80px] animate-float-orb-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[hsl(210_69%_20%/0.5)] blur-[120px] animate-float-orb-slow" />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center py-20">
        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full investor-glass mb-8"
        >
          <Shield className="h-4 w-4 text-[hsl(186_100%_50%)]" />
          <span className="text-sm font-medium text-white/80">
            Trusted by 320+ Institutional Investors
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
        >
          <span className="text-gradient-electric">{headline.split(' ').slice(0, 2).join(' ')}</span>
          <br />
          <span className="text-white">{headline.split(' ').slice(2).join(' ')}</span>
        </motion.h1>
        
        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl lg:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          {subhead}
        </motion.p>
        
        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            asChild 
            size="lg" 
            className="btn-electric-blue text-lg px-10 py-6 rounded-xl"
          >
            <Link to={ctaLink}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
          <Button 
            asChild 
            size="lg" 
            className="btn-investor-ghost text-lg px-10 py-6 rounded-xl"
          >
            <Link to={secondaryCtaLink}>
              <BarChart3 className="mr-2 h-5 w-5" />
              {secondaryCtaText}
            </Link>
          </Button>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4 mt-16"
        >
          {['Section 8 Verified', 'Real-Time Tracking', 'PM Oversight', 'Multi-State Coverage'].map((feature) => (
            <span 
              key={feature}
              className="px-4 py-2 rounded-full text-sm font-medium text-white/50 border border-white/10 bg-white/[0.02]"
            >
              {feature}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
