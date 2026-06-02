import React from 'react';
import { motion } from 'framer-motion';

interface PremiumHeroSectionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Premium hero section with animated internal orbs.
 * Matches the homepage command center visual style.
 */
export const PremiumHeroSection: React.FC<PremiumHeroSectionProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-blue-gold ${className}`}>
      {/* Animated White Orb - Top Left */}
      <motion.div
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-[60px] pointer-events-none"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Animated Gold Orb - Bottom Right */}
      <motion.div
        className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-[80px] pointer-events-none"
        style={{ backgroundColor: 'hsl(45 85% 50% / 0.2)' }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Subtle Center Glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 rounded-full blur-[100px] pointer-events-none"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default PremiumHeroSection;
