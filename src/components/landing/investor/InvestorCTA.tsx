import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Lock, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface InvestorCTAProps {
  headline?: string;
  subhead?: string;
  ctaText?: string;
  ctaLink?: string;
}

export default function InvestorCTA({
  headline = "Ready to See What's Really Happening at Your Properties?",
  subhead = "Free for property owners. No credit card required. Start in under 5 minutes.",
  ctaText = "Start Tracking Free",
  ctaLink = "/auth?mode=signup&type=landlord"
}: InvestorCTAProps) {
  const trustBadges = [
    { icon: Shield, label: 'Bank-Level Security' },
    { icon: Lock, label: 'SOC 2 Compliant' },
    { icon: Award, label: '99.9% Uptime' },
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(210_69%_6%)] via-[hsl(210_69%_11%)] to-transparent" />
      
      {/* Decorative Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[hsl(186_100%_50%/0.08)] blur-[120px] rounded-full" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="investor-glass-strong rounded-3xl p-12 md:p-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {headline}
          </h2>
          
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto">
            {subhead}
          </p>
          
          <Button 
            asChild 
            size="lg" 
            className="btn-electric-blue text-lg px-12 py-7 rounded-xl animate-investor-glow"
          >
            <Link to={ctaLink}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 pt-10 border-t border-white/10">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/40">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
