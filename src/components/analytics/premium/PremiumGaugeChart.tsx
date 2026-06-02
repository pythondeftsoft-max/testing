import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { motion } from 'framer-motion';
import { useAdvancedHealthStore } from '@/stores/advancedHealthStore';

interface PremiumGaugeChartProps {
  value: number;
  max?: number;
  size?: number;
  showCelebration?: boolean;
  className?: string;
}

const PremiumGaugeChart: React.FC<PremiumGaugeChartProps> = ({
  value,
  max = 100,
  size = 220,
  showCelebration = true,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCelebrationAnim, setShowCelebrationAnim] = useState(false);
  
  const { getHealthColor, needsAttention, setAnimating } = useAdvancedHealthStore();
  
  // Calculate dimensions
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - 40) / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 3/4 circle
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  // Get status-based styling
  const getStatus = (percent: number) => {
    if (percent >= 85) return 'excellent';
    if (percent >= 70) return 'good';
    return 'needs-attention';
  };
  
  const status = getStatus(percentage);
  const healthColor = getHealthColor() || '#10b981'; // fallback to green if undefined
  
  useEffect(() => {
    if (!progressRef.current || !svgRef.current) return;
    
    setAnimating(true);
    
    // GSAP Timeline for complex animations
    const tl = gsap.timeline({
      onComplete: () => {
        setAnimating(false);
        // Trigger celebration for excellent scores
        if (showCelebration && percentage >= 85) {
          setShowCelebrationAnim(true);
          setTimeout(() => setShowCelebrationAnim(false), 3000);
        }
      }
    });
    
    // Initial state
    gsap.set(progressRef.current, {
      strokeDasharray: circumference,
      strokeDashoffset: circumference,
      stroke: healthColor,
    });
    
    // Container entrance
    tl.from(containerRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.6,
      ease: "back.out(1.7)",
    })
    
    // Gauge fill animation with custom easing
    .to(progressRef.current, {
      strokeDashoffset: circumference - (circumference * percentage) / 100,
      duration: 1.5,
      ease: "power2.inOut",
    }, "-=0.3")
    
    // Color transition animation
    .to(progressRef.current, {
      stroke: healthColor,
      duration: 0.5,
    }, "-=1.0");
    
    // Add pulsing glow for attention-needed status
    if (needsAttention() && glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0.6,
        scale: 1.1,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
    }
    
    return () => {
      tl.kill();
      gsap.killTweensOf([progressRef.current, glowRef.current, containerRef.current]);
    };
  }, [value, healthColor, percentage, needsAttention, setAnimating, circumference, showCelebration]);

  // Format value for display
  const formatValue = (val: number): string => {
    return val.toFixed(0);
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative flex flex-col items-center ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Main Gauge */}
      <div className="relative glass border border-white/20 rounded-full backdrop-blur-xl bg-white/5 p-8 shadow-2xl">
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 filter drop-shadow-lg"
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: healthColor, stopOpacity: 0.9 }} />
              <stop offset="50%" style={{ stopColor: healthColor, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: healthColor, stopOpacity: 0.8 }} />
            </linearGradient>
            
            <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: healthColor, stopOpacity: 0.6 }} />
              <stop offset="100%" style={{ stopColor: healthColor, stopOpacity: 0.2 }} />
            </linearGradient>
            
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor={healthColor} floodOpacity="0.3"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background track */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            opacity="0.2"
          />
          
          {/* Glow effect for attention needed */}
          {needsAttention() && (
            <circle
              ref={glowRef}
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="url(#glowGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * 0.25}
              filter="url(#glow)"
              opacity="0"
            />
          )}
          
          {/* Progress track */}
          <circle
            ref={progressRef}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            filter="url(#glow)"
          />
        </svg>
        
        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            {formatValue(value)}%
          </motion.div>
          
          <motion.div
            className={`text-sm font-semibold mt-2 px-3 py-1 rounded-full backdrop-blur-sm ${
              status === 'excellent' ? 'text-health-excellent bg-health-excellent/10 border border-health-excellent/20' :
              status === 'good' ? 'text-health-good bg-health-good/10 border border-health-good/20' :
              'text-health-attention bg-health-attention/10 border border-health-attention/20'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.4 }}
          >
            {status === 'excellent' ? 'Excellent' :
             status === 'good' ? 'Good' :
             'Needs Attention'}
          </motion.div>
        </div>
      </div>
      
      {/* CSS-based Celebration Animation for Excellent Scores */}
      {showCelebrationAnim && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            {/* Sparkle particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-health-excellent to-health-perfect rounded-full"
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI * 2) / 8) * 60,
                  y: Math.sin((i * Math.PI * 2) / 8) * 60,
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
              />
            ))}
            
            {/* Central glow */}
            <motion.div
              className="absolute w-32 h-32 bg-gradient-radial from-health-excellent/30 to-transparent rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0, 1.5, 2] }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </motion.div>
        </div>
      )}
      
      {/* Status Indicator */}
      <motion.div
        className={`mt-6 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border ${
          status === 'excellent' ? 'bg-health-excellent/10 text-health-excellent border-health-excellent/30' :
          status === 'good' ? 'bg-health-good/10 text-health-good border-health-good/30' :
          'bg-health-attention/10 text-health-attention border-health-attention/30'
        } ${needsAttention() ? 'animate-pulse' : ''}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.6, duration: 0.4 }}
      >
        Portfolio Health Score
      </motion.div>
    </motion.div>
  );
};

export default PremiumGaugeChart;