import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { Card, CardContent } from '@/components/ui/card';
import { HealthMetric } from '@/stores/portfolioHealthStore';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnimatedMetricCardProps {
  metric: HealthMetric;
  index: number;
  isVisible?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  metric,
  index,
  isVisible = true,
  size = 'md',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  
  // Size configurations
  const sizeConfig = {
    sm: {
      card: 'p-3',
      sidebar: 'w-1',
      value: 'text-lg',
      label: 'text-xs',
      status: 'text-xs',
    },
    md: {
      card: 'p-4',
      sidebar: 'w-1',
      value: 'text-2xl',
      label: 'text-sm',
      status: 'text-sm',
    },
    lg: {
      card: 'p-6',
      sidebar: 'w-2',
      value: 'text-3xl',
      label: 'text-base',
      status: 'text-base',
    },
  };

  const config = sizeConfig[size];

  // Animation variants
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    hover: {
      y: shouldReduceMotion ? 0 : -4,
      scale: shouldReduceMotion ? 1 : 1.02,
    },
  };

  const cardTransition = {
    duration: shouldReduceMotion ? 0.1 : 0.6,
    delay: shouldReduceMotion ? 0 : index * 0.1,
  };

  // Counter animation effect
  useEffect(() => {
    if (!isVisible || shouldReduceMotion) {
      setDisplayValue(metric.value);
      return;
    }

    // GSAP counter animation
    const obj = { value: 0 };
    const tl = gsap.timeline({
      delay: index * 0.1 + 0.8, // Stagger after card animation
    });

    tl.to(obj, {
      value: metric.value,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setDisplayValue(Math.round(obj.value));
      },
    });

    // Sidebar color animation
    if (sidebarRef.current) {
      gsap.from(sidebarRef.current, {
        scaleY: 0,
        duration: 0.8,
        delay: index * 0.1 + 0.6,
        ease: "power2.out",
        transformOrigin: "bottom",
      });
    }

    return () => {
      tl.kill();
    };
  }, [metric.value, index, isVisible, shouldReduceMotion]);

  // Breathing animation for attention-needed status
  useEffect(() => {
    if (metric.status === 'needs-attention' && cardRef.current && !shouldReduceMotion) {
      gsap.to(cardRef.current, {
        boxShadow: `0 0 20px ${metric.color}40`,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
    }

    return () => {
      if (cardRef.current) {
        gsap.killTweensOf(cardRef.current);
      }
    };
  }, [metric.status, metric.color, shouldReduceMotion]);

  // Get trend icon
  const getTrendIcon = () => {
    if (!metric.trend) return null;
    
    const iconProps = {
      size: size === 'lg' ? 20 : size === 'md' ? 16 : 14,
      className: `${
        metric.trend.direction === 'up' ? 'text-health-excellent' :
        metric.trend.direction === 'down' ? 'text-health-attention' :
        'text-muted-foreground'
      }`,
    };

    switch (metric.trend.direction) {
      case 'up':
        return <TrendingUp {...iconProps} />;
      case 'down':
        return <TrendingDown {...iconProps} />;
      default:
        return <Minus {...iconProps} />;
    }
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      whileHover="hover"
      transition={cardTransition}
      className="relative"
    >
      <Card className={`
        glass-strong overflow-hidden rounded-xl shadow-lg border-0
        ${metric.status === 'needs-attention' ? 'animate-breathe' : ''}
        transition-all duration-300 hover:shadow-xl
      `}>
        {/* Colored sidebar */}
        <div
          ref={sidebarRef}
          className={`${config.sidebar} h-full absolute left-0 top-0`}
          style={{ backgroundColor: metric.color }}
        />
        
        <CardContent className={`${config.card} ml-3 flex-1`}>
          {/* Header with label and trend */}
          <div className="flex items-center justify-between mb-2">
            <div className={`font-medium text-muted-foreground ${config.label}`}>
              {metric.label}
            </div>
            {metric.trend && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={`${config.status} font-medium ${
                  metric.trend.direction === 'up' ? 'text-health-excellent' :
                  metric.trend.direction === 'down' ? 'text-health-attention' :
                  'text-muted-foreground'
                }`}>
                  {metric.trend.percentage}%
                </span>
              </div>
            )}
          </div>
          
          {/* Value and status */}
          <div className="flex items-baseline gap-3">
            <motion.span
              ref={valueRef}
              className={`font-semibold text-foreground ${config.value}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 1.0, duration: 0.4 }}
            >
              {displayValue}%
            </motion.span>
            
            <motion.span
              className={`${config.status} font-medium capitalize ${
                metric.status === 'excellent' ? 'text-health-excellent' :
                metric.status === 'good' ? 'text-health-good' :
                'text-health-attention'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 + 1.2, duration: 0.4 }}
            >
              {metric.status === 'needs-attention' ? 'Needs Attention' : metric.status}
            </motion.span>
          </div>
          
          {/* Status indicator dot */}
          <motion.div
            className="flex items-center gap-2 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 1.4, duration: 0.4 }}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                metric.status === 'needs-attention' ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: metric.color }}
            />
            <span className="text-xs text-muted-foreground">
              {metric.status === 'excellent' ? 'Performing well' :
               metric.status === 'good' ? 'On track' :
               'Requires attention'}
            </span>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnimatedMetricCard;