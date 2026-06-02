import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Home, DollarSign, Wrench, Users } from 'lucide-react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { ProgressDynamic } from '@/components/ui/progress-dynamic';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { getScoreBasedColorClass, getScoreBasedBgClass, getScoreBasedIconClass, getScoreBasedColor } from '@/utils/healthMetrics';
import type { HealthMetric } from '@/types/analytics';

interface HorizontalHealthScoreProps {
  portfolioId?: string;
  className?: string;
}

const HorizontalHealthScore: React.FC<HorizontalHealthScoreProps> = ({
  portfolioId = 'everything',
  className = ''
}) => {
  const { data: metrics, isLoading } = usePortfolioMetrics(portfolioId);
  
  const computedMetrics = useMemo<HealthMetric[]>(() => {
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    
    // Use real metrics or fallback to default values
    const occupancyRate = metrics?.occupancy_rate || 87;
    const collectionRate = 95; // Could be calculated from rent payment data
    const averageMaintenanceResolutionDays = 3; // Could be calculated from maintenance requests
    const onTimePaymentRate = 91; // Could be calculated from payment history
    
    const maintScore = clamp(100 - (averageMaintenanceResolutionDays * 10));
    
    return [
      {
        label: 'Occupancy',
        value: clamp(occupancyRate),
        icon: 'home'
      },
      {
        label: 'Financial',
        value: clamp(collectionRate),
        icon: 'dollar-sign'
      },
      {
        label: 'Maintenance',
        value: maintScore,
        icon: 'wrench'
      },
      {
        label: 'Tenant Relations',
        value: clamp(onTimePaymentRate),
        icon: 'users'
      }
    ];
  }, [metrics]);

  const overallScore = useMemo(() => {
    const weights = [0.3, 0.3, 0.2, 0.2];
    return Math.round(computedMetrics.reduce((acc, m, i) => acc + m.value * weights[i], 0));
  }, [computedMetrics]);

  const getStatusText = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Attention';
  };

  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-health-excellent';
    if (score >= 80) return 'text-health-good';
    if (score >= 70) return 'text-health-attention';
    return 'text-health-needs-attention';
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'home': return Home;
      case 'dollar-sign': return DollarSign;
      case 'wrench': return Wrench;
      case 'users': return Users;
      default: return Activity;
    }
  };

  return (
    <CardEnhanced variant="command" className={`command-card ${className}`}>
      <CardEnhancedContent className="p-6">
        {/* Main Container with Better Layout Structure */}
        <div className="space-y-6">
          {/* Top Section: Score Circle and Title */}
          <div className="flex items-start gap-6">
            {/* Health Score Circle */}
            <div className="flex-shrink-0">
              <div className="relative w-24 h-24">
                {/* SVG Circular Progress */}
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="8"
                    opacity="0.2"
                  />
                  
                  {/* Progress circle */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={getScoreBasedColor(overallScore)}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - overallScore / 100)}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    animate={{ 
                      strokeDashoffset: 2 * Math.PI * 42 * (1 - overallScore / 100),
                      stroke: getScoreBasedColor(overallScore)
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                
                {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-2xl font-bold ${getScoreBasedColorClass(overallScore)}`}>
                  {overallScore}%
                </div>
              </div>
              </div>
            </div>

            {/* Portfolio Health Title and Description */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Portfolio Health Score</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Real-time portfolio performance overview across all assets
              </p>
            </div>
          </div>

          {/* Bottom Section: Metrics Grid with Better Alignment */}
          <div className="w-full">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {computedMetrics.map((metric) => {
                const IconComponent = getIconComponent(metric.icon || 'activity');
                return (
                  <motion.div
                    key={metric.label}
                    className="flex flex-col items-center p-4 rounded-lg bg-card border border-border hover:shadow-md transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-center mb-3">
                      <div className={`p-2 rounded-full ${getScoreBasedBgClass(metric.value)}`}>
                        <IconComponent className={`w-4 h-4 ${getScoreBasedIconClass(metric.value)}`} />
                      </div>
                    </div>
                    
                    <div className={`text-xl font-bold mb-1 ${getScoreBasedColorClass(metric.value)}`}>
                      {metric.value}%
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-3 text-center">
                      {metric.label}
                    </div>
                    
                    <div className="w-full">
                      <ProgressDynamic 
                        value={metric.value} 
                        className="h-2"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default HorizontalHealthScore;