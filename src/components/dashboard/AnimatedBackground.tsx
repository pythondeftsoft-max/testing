import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
  showOrbs?: boolean;
  showGrid?: boolean;
}

/**
 * Premium animated background with floating orbs and grid pattern overlay.
 * Matches the homepage "billion dollar SaaS" visual style.
 */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  className = '',
  showOrbs = true,
  showGrid = true,
}) => {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-background ${className}`}>
      {/* Grid Pattern Overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(0,0,0,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px',
          }}
        />
      )}

      {/* Animated Blue Orb - Top Left */}
      {showOrbs && (
        <motion.div
          className="absolute top-20 left-[10%] w-64 h-64 rounded-full blur-[100px] pointer-events-none bg-primary/[0.08] dark:bg-primary/[0.04]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 1.5, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Animated Gold Orb - Bottom Right */}
      {showOrbs && (
        <motion.div
          className="absolute bottom-20 right-[10%] w-72 h-72 rounded-full blur-[100px] pointer-events-none bg-openkey-gold/[0.06] dark:bg-openkey-gold/[0.03]"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [1, 1.5, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Subtle Blue Orb - Center Right */}
      {showOrbs && (
        <motion.div
          className="absolute top-1/2 right-[5%] w-48 h-48 rounded-full blur-[80px] pointer-events-none bg-primary/[0.05] dark:bg-primary/[0.025]"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [1, 1.5, 1],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Content Layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AnimatedBackground;
