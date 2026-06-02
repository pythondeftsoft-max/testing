import React from 'react';
import { motion } from 'framer-motion';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { useCountUp } from '@/hooks/useCountUp';
import { Building2, TrendingUp, DollarSign, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TheEverythingCardProps {
  totalUnits: number;
  occupiedUnits: number;
  monthlyRent: number;
  netOperatingIncome: number;
  className?: string;
}

/**
 * Premium "Everything Card" component matching the home page's
 * Billion Dollar SaaS aesthetic. Spans 2 columns in the bento grid.
 */
export const TheEverythingCard: React.FC<TheEverythingCardProps> = ({
  totalUnits,
  occupiedUnits,
  monthlyRent,
  netOperatingIncome,
  className,
}) => {
  // Animated count-up values
  const animatedUnits = useCountUp(totalUnits, 2000);
  const animatedOccupied = useCountUp(occupiedUnits, 2000);
  const animatedRent = useCountUp(monthlyRent, 2500);
  const animatedNOI = useCountUp(Math.abs(netOperatingIncome), 2500);
  
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const isPositiveNOI = netOperatingIncome >= 0;

  const features = ['Section 8 Tracked', 'Multi-Currency', 'Real-Time Sync'];

  return (
    <CardEnhanced 
      variant="command" 
      hover
      className={cn(
        "command-bento-card command-everything-card relative overflow-hidden",
        className
      )}
    >
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220_100%_50%/0.08)] via-transparent to-[hsl(45_85%_50%/0.05)] pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                          linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      <CardEnhancedContent className="relative z-10 p-8">
        {/* Section Label */}
        <motion.span 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="command-section-label"
        >
          Portfolio Overview
        </motion.span>
        
        {/* Main Value Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 mb-8"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="command-section-icon">
              <Building2 className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-medium text-muted-foreground">Total Portfolio Value</span>
          </div>
          
          <div className="flex items-end justify-between">
            <p className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-blue-gold">
              ${animatedRent.toLocaleString()}
              <span className="text-2xl text-muted-foreground font-normal ml-2">/mo</span>
            </p>
            <div className="hidden sm:block">
              <Sparkline positive={isPositiveNOI} width={120} height={48} />
            </div>
          </div>
        </motion.div>
        
        {/* Inner Metric Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
        >
          {/* Total Units */}
          <div className="command-inner-tile">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-openkey-blue" strokeWidth={1.5} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Units</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{animatedUnits}</p>
          </div>
          
          {/* Occupied */}
          <div className="command-inner-tile">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-success" strokeWidth={1.5} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Occupied</span>
            </div>
            <p className="text-2xl font-bold text-success">{animatedOccupied}</p>
          </div>
          
          {/* Occupancy Rate */}
          <div className="command-inner-tile">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-openkey-gold" strokeWidth={1.5} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rate</span>
            </div>
            <p className="text-2xl font-bold text-openkey-gold">{occupancyRate}%</p>
          </div>
          
          {/* NOI */}
          <div className="command-inner-tile">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={cn("w-4 h-4", isPositiveNOI ? "text-success" : "text-destructive")} strokeWidth={1.5} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NOI</span>
            </div>
            <p className={cn("text-2xl font-bold", isPositiveNOI ? "text-success" : "text-destructive")}>
              {isPositiveNOI ? '+' : '-'}${animatedNOI.toLocaleString()}
            </p>
          </div>
        </motion.div>
        
        {/* Feature Pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-2"
        >
          {features.map((feature, index) => (
            <motion.span
              key={feature}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="command-feature-pill"
            >
              {feature}
            </motion.span>
          ))}
        </motion.div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default TheEverythingCard;
