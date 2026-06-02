import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

import PremiumD3Gauge from './PremiumD3Gauge';
import InteractiveMetricCard from './InteractiveMetricCard';

import ComparativeAnalysisPanel from './ComparativeAnalysisPanel';
import RealPredictiveInsightsPanel from './RealPredictiveInsightsPanel';

import { useAdvancedHealthStore } from '@/stores/advancedHealthStore';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, HelpCircle, Home, DollarSign, Wrench, Users, Building, CheckCircle, AlertTriangle } from 'lucide-react';
import type { HealthMetric } from '@/types/analytics';
interface PremiumPortfolioHealthDashboardProps {
  occupancyRate?: number;
  collectionRate?: number;
  averageMaintenanceResolutionDays?: number;
  onTimePaymentRate?: number;
  openMaintenanceRequests?: number;
  totalUnits?: number;
  landlordId: string;
  portfolioId?: string;
  className?: string;
  title?: string;
}

const PremiumPortfolioHealthDashboard: React.FC<PremiumPortfolioHealthDashboardProps> = ({
  occupancyRate = 0,
  collectionRate = 0,
  averageMaintenanceResolutionDays = 0,
  onTimePaymentRate = 0,
  openMaintenanceRequests = 0,
  totalUnits = 0,
  landlordId,
  portfolioId,
  className = '',
  title = 'Portfolio Health'
}) => {
  const { 
    initializeRealTimeStreams,
    disconnectStreams,
    generateInsights,
    getMetricWithBreakdown,
    insights,
    comparativeMode,
    timeRange,
  } = useAdvancedHealthStore();
  
  

  const computedMetrics = useMemo<HealthMetric[]>(() => {
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    const maintScore = clamp(100 - (averageMaintenanceResolutionDays * 10));
    return [
      {
        label: 'Occupancy',
        value: clamp(occupancyRate),
        status: (occupancyRate >= 90 ? 'excellent' : occupancyRate >= 80 ? 'good' : 'needs-attention') as 'excellent' | 'good' | 'needs-attention',
        color: occupancyRate >= 90 ? 'hsl(var(--health-excellent))' : occupancyRate >= 80 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
        trend: 0,
        icon: 'home'
      },
      {
        label: 'Financial',
        value: clamp(collectionRate),
        status: (collectionRate >= 95 ? 'excellent' : collectionRate >= 85 ? 'good' : 'needs-attention') as 'excellent' | 'good' | 'needs-attention',
        color: collectionRate >= 95 ? 'hsl(var(--health-excellent))' : collectionRate >= 85 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
        trend: 0,
        icon: 'dollar-sign'
      },
      {
        label: 'Maintenance',
        value: maintScore,
        status: (averageMaintenanceResolutionDays <= 2 ? 'excellent' : averageMaintenanceResolutionDays <= 5 ? 'good' : 'needs-attention') as 'excellent' | 'good' | 'needs-attention',
        color: averageMaintenanceResolutionDays <= 2 ? 'hsl(var(--health-excellent))' : averageMaintenanceResolutionDays <= 5 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
        trend: 0,
        icon: 'wrench'
      },
      {
        label: 'Tenant Relations',
        value: clamp(onTimePaymentRate),
        status: (onTimePaymentRate >= 95 ? 'excellent' : onTimePaymentRate >= 85 ? 'good' : 'needs-attention') as 'excellent' | 'good' | 'needs-attention',
        color: onTimePaymentRate >= 95 ? 'hsl(var(--health-excellent))' : onTimePaymentRate >= 85 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
        trend: 0,
        icon: 'users'
      }
    ];
  }, [occupancyRate, collectionRate, averageMaintenanceResolutionDays, onTimePaymentRate]);

  const computedScore = useMemo(() => {
    const weights = [0.3, 0.3, 0.2, 0.2];
    return Math.round(computedMetrics.reduce((acc, m, i) => acc + m.value * weights[i], 0));
  }, [computedMetrics]);

  // Using data from props (Supabase) - no demo stream initialization

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };


  // Generate comparative data for Phase 3
  const comparativeData = computedMetrics.map(metric => ({
    label: metric.label,
    current: metric.value,
    previous: metric.value * (1 - (metric.trend || 0) / 100),
    benchmark: metric.value * 1.05,
    trend: metric.trend || 0,
    status: metric.status as 'excellent' | 'good' | 'needs-attention'
  }));

  return (
    <motion.div
      className={`space-y-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
        <CardEnhancedHeader>
          <motion.div 
            className="flex items-center justify-between"
            variants={itemVariants}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-openkey-blue to-openkey-gold">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <CardEnhancedTitle className="text-2xl">{title}</CardEnhancedTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Real-time portfolio analytics with interactive visualizations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Data source: Supabase</Badge>
            </div>
          </motion.div>
        </CardEnhancedHeader>

        <CardEnhancedContent>

        {/* Premium Gauge Chart */}
        <motion.div 
          className="flex justify-center mb-8"
          variants={itemVariants}
        >
          <PremiumD3Gauge
            value={computedScore}
            max={100}
            size={280}
            showCelebration={true}
            className="filter drop-shadow-2xl"
            interactive={false}
            showTooltip={false}
          />

        </motion.div>

        {/* Interactive Metric Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={itemVariants}
        >
          {computedMetrics.map((metric, index) => (
            <InteractiveMetricCard 
              key={metric.label}
              metric={metric}
              index={index}
              showTrend={true}
              expandable={true}
            />
          ))}
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={itemVariants}
        >
          <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
            <motion.div 
              className="text-center p-4"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center mb-3">
                <Building className="w-5 h-5 text-openkey-blue mr-2" />
                <div className="text-3xl font-bold text-foreground">
                  {totalUnits.toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Total Units</div>
              <div className="mt-2 text-xs text-muted-foreground">From database</div>
            </motion.div>
          </CardEnhanced>

          <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
            <motion.div 
              className="text-center p-4"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center mb-3">
                <Wrench className={`w-5 h-5 mr-2 ${openMaintenanceRequests > 10 ? 'text-red-500' : 'text-openkey-blue'}`} />
                <div className={`text-3xl font-bold ${openMaintenanceRequests > 10 ? 'text-red-500' : 'text-foreground'}`}>
                  {openMaintenanceRequests}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Open Requests</div>
              <div className={`mt-2 text-xs ${openMaintenanceRequests > 10 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {openMaintenanceRequests > 10 ? 'High Priority' : 'Normal'}
              </div>
            </motion.div>
          </CardEnhanced>
        </motion.div>
        </CardEnhancedContent>


        {/* Phase 3: Comparative Analysis */}
        <motion.div variants={itemVariants}>
          <ComparativeAnalysisPanel
            landlordId={landlordId}
            portfolioId={portfolioId}
            timeRange={timeRange as 'previous_month' | 'previous_quarter' | 'previous_year'}
          />
        </motion.div>

        {/* Phase 3: AI-Powered Insights */}
        <motion.div variants={itemVariants} className="mt-8">
          <RealPredictiveInsightsPanel
            portfolioId={portfolioId || 'everything'}
          />
        </motion.div>
      </CardEnhanced>

    </motion.div>
  );
};

export default PremiumPortfolioHealthDashboard;