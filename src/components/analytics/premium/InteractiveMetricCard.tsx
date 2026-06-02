import React, { useState, useRef, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Info } from 'lucide-react';
import { useAdvancedHealthStore } from '@/stores/advancedHealthStore';
import { getHealthColorClass, formatMetricValue } from '@/utils/healthMetrics';
import type { HealthMetric } from '@/types/analytics';

interface InteractiveMetricCardProps {
  metric: HealthMetric;
  index: number;
  onClick?: (metric: HealthMetric) => void;
  showTrend?: boolean;
  expandable?: boolean;
  className?: string;
}

const InteractiveMetricCard: React.FC<InteractiveMetricCardProps> = ({
  metric,
  index,
  onClick,
  showTrend = true,
  expandable = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const { getTrendDirection, historicalData } = useAdvancedHealthStore();

  // Simplified hover behavior (no parallax tilt for performance)

  // Counter animation for value
  const animatedValue = useSpring(0, { stiffness: 100, damping: 30 });

  useEffect(() => {
    animatedValue.set(metric.value);
  }, [metric.value, animatedValue]);


  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
    // Removed onClick callback to disable popout functionality
  };

  // Get trend icon and color
  const getTrendIcon = () => {
    const direction = getTrendDirection(metric.label);
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendText = () => {
    if (Math.abs(metric.trend) < 0.1) return 'No change';
    const direction = metric.trend > 0 ? 'up' : 'down';
    return `${Math.abs(metric.trend).toFixed(1)}% ${direction}`;
  };

  // Get recent historical data for sparkline
  const getSparklineData = () => {
    if (!historicalData.length) return [];
    
    return historicalData.slice(-10).map(point => {
      switch (metric.label) {
        case 'Occupancy':
          return point.occupancyRate;
        case 'Financial':
          return point.collectionRate;
        case 'Maintenance':
          return 100 - (point.averageMaintenanceResolutionDays * 10);
        case 'Tenant Relations':
          return point.onTimePaymentRate;
        default:
          return 0;
      }
    });
  };

  const sparklineData = getSparklineData();

  return (
    <motion.div
      ref={cardRef}
      className={`group relative cursor-pointer transform-gpu will-change-transform ${className}`}
      style={{
        contain: 'paint',
        backfaceVisibility: 'hidden'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.6,
        ease: "easeOut"
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Main Card */}
      <div className="relative h-full p-6 glass-card border border-white/20 rounded-xl backdrop-blur-lg bg-white/10 overflow-hidden">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 opacity-20 transition-opacity duration-300 group-hover:opacity-30"
          style={{
            background: `linear-gradient(135deg, ${metric.color}22, ${metric.color}11)`
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
              {metric.label}
            </h3>
            <div className="flex items-center space-x-2">
              {showTrend && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  {getTrendIcon()}
                </motion.div>
              )}
              {expandable && (
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Value */}
          <div className="mb-2">
            <motion.div 
              className={`text-2xl font-bold ${getHealthColorClass(metric.status)}`}
            >
              {formatMetricValue(Math.round(animatedValue.get()), metric.label)}
            </motion.div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${metric.status === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                metric.status === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
            >
              <div 
                className={`w-2 h-2 rounded-full mr-2 ${
                  metric.status === 'needs-attention' ? 'animate-pulse' : ''
                }`}
                style={{ backgroundColor: metric.color }}
              />
              {metric.status === 'excellent' ? 'Excellent' : 
               metric.status === 'good' ? 'Good' : 'Needs Attention'}
            </div>

            {showTrend && (
              <span className="text-xs text-muted-foreground">
                {getTrendText()}
              </span>
            )}
          </div>

          {/* Mini Sparkline */}
          {sparklineData.length > 0 && (
            <div className="mt-3 h-8">
              <svg width="100%" height="100%" className="overflow-visible">
                <motion.path
                  d={generateInlineSparklinePath(sparklineData, 100, 30)}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        <motion.div
          initial={false}
          animate={{ 
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="pt-4 border-t border-white/10 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Month</span>
                <span className="font-medium">{Math.round(metric.value)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Previous Month</span>
                <span className="font-medium">{Math.round(metric.value - metric.trend)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change</span>
                <span className={`font-medium ${metric.trend > 0 ? 'text-green-600' : metric.trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hover Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${metric.color}15, transparent)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>

    </motion.div>
  );
};

// Helper function to generate SVG path for sparkline
function generateInlineSparklinePath(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
}

export default InteractiveMetricCard;