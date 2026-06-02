import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  delay?: number;
}

/**
 * Wrapper component for staggered fade-in animations on cards.
 * Used to create the premium entrance effect on dashboard metric cards.
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  index = 0,
  className = '',
  delay,
}) => {
  const calculatedDelay = delay !== undefined ? delay : index * 0.1;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay: calculatedDelay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Animation variants for staggered children
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

export default AnimatedCard;
