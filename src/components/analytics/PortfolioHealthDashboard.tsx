import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import EnhancedGaugeChart from './charts/EnhancedGaugeChart';
import { Info, Activity, Home, DollarSign, Wrench, Users, Building, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PortfolioHealthDashboardProps {
  occupancyRate: number;
  collectionRate: number;
  averageMaintenanceResolutionDays: number;
  onTimePaymentRate: number;
  openMaintenanceRequests: number;
  totalUnits: number;
  className?: string;
  infoText?: string;
}

interface Metric {
  label: string;
  value: number;
  status: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PortfolioHealthDashboard: React.FC<PortfolioHealthDashboardProps> = ({
  occupancyRate,
  collectionRate,
  averageMaintenanceResolutionDays,
  onTimePaymentRate,
  openMaintenanceRequests,
  totalUnits,
  className,
  infoText = 
    "Portfolio Health score combines occupancy (30%), financial performance (30%), maintenance efficiency (20%), and tenant satisfaction (20%)."
}) => {
  // 1) Sanitize inputs
  const occ = Math.max(0, Math.min(100, occupancyRate || 0));
  const fin = Math.max(0, Math.min(100, collectionRate || 0));
  const maint = Math.max(0, Math.min(100,
                 100 - (averageMaintenanceResolutionDays || 0) * 5 - (openMaintenanceRequests || 0) * 2));
  const tenant = Math.max(0, Math.min(100,
                 (onTimePaymentRate || 0) * 0.6 + (100 - (averageMaintenanceResolutionDays || 0) * 10) * 0.4));
  const overall = occ * 0.3 + fin * 0.3 + maint * 0.2 + tenant * 0.2;

  // 2) Helpers for color + status
  const getColor = (n: number) =>
    n >= 85 ? 'hsl(var(--success))'
      : n >= 70 ? 'hsl(var(--warning))'
      : 'hsl(var(--destructive))';

  const getStatus = (n: number) =>
    n >= 85 ? 'Excellent'
      : n >= 70 ? 'Good'
      : 'Needs Attention';

  // 3) Build metric cards with icons
  const metrics: Metric[] = [
    { label: 'Occupancy', value: occ, status: getStatus(occ), color: getColor(occ), icon: Home },
    { label: 'Financial', value: fin, status: getStatus(fin), color: getColor(fin), icon: DollarSign },
    { label: 'Maintenance', value: maint, status: getStatus(maint), color: getColor(maint), icon: Wrench },
    { label: 'Tenant Relations', value: tenant, status: getStatus(tenant), color: getColor(tenant), icon: Users },
  ];

  // Helper function to get badge variant and icon based on status
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Excellent': return { variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500 text-white' };
      case 'Good': return { variant: 'default' as const, icon: CheckCircle, className: 'bg-openkey-blue text-white' };
      case 'Needs Attention': return { variant: 'default' as const, icon: AlertTriangle, className: 'bg-yellow-500 text-white' };
      default: return { variant: 'default' as const, icon: CheckCircle, className: 'bg-openkey-blue text-white' };
    }
  };

  return (
    <CardEnhanced 
      variant="elevated" 
      hover={true} 
      animate={true}
      className={cn("card-hover-gold", className)}
    >
      <CardEnhancedHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-openkey-blue to-openkey-gold text-white rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardEnhancedTitle className="flex items-center gap-2 text-xl">
                Portfolio Health Overview
                {infoText && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        sideOffset={8}
                        collisionPadding={16}
                        avoidCollisions={true}
                        className="max-w-sm bg-popover text-popover-foreground border-border px-4 py-3 shadow-lg z-[99999]"
                      >
                        <p className="text-sm leading-relaxed">{infoText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardEnhancedTitle>
            </div>
          </div>
          <Badge className="bg-openkey-blue text-white">
            Real-time Data
          </Badge>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent className="space-y-6">

        {/* 1) Hero Gauge */}
        <div className="flex flex-col items-center mb-8">
          <EnhancedGaugeChart
            value={overall}
            max={100}
            label=""
            unit="%"
            size={220}
            thickness={20}
            gradient={true}
          />
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold text-foreground">{overall.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground mt-1">{getStatus(overall)}</div>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(60) }} />
              0–70
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(75) }} />
              70–85
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(90) }} />
              85–100
            </span>
          </div>
        </div>

        {/* 2) Enhanced Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((m) => {
            const badgeInfo = getBadgeVariant(m.status);
            const IconComponent = m.icon;
            
            return (
              <CardEnhanced 
                key={m.label} 
                variant="elevated" 
                hover={true}
                className="card-hover-gold transition-all duration-300"
              >
                <CardEnhancedContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-openkey-blue" />
                      <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
                    </div>
                    <Badge className={badgeInfo.className}>
                      <badgeInfo.icon className="h-3 w-3 mr-1" />
                      {m.status}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-openkey-blue">
                    {m.value.toFixed(0)}%
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>
            );
          })}
        </div>

        {/* 3) Enhanced Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <CardEnhanced 
            variant="elevated" 
            hover={true}
            className="card-hover-gold"
          >
            <CardEnhancedContent className="text-center p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building className="h-5 w-5 text-openkey-blue" />
                <span className="text-sm text-muted-foreground">Total Units</span>
              </div>
              <div className="text-2xl font-bold text-openkey-blue">{totalUnits}</div>
            </CardEnhancedContent>
          </CardEnhanced>
          
          <CardEnhanced 
            variant="elevated" 
            hover={true}
            className="card-hover-gold"
          >
            <CardEnhancedContent className="text-center p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wrench className={cn(
                  "h-5 w-5",
                  openMaintenanceRequests > 10 ? "text-yellow-500" : "text-openkey-blue"
                )} />
                <span className="text-sm text-muted-foreground">Open Requests</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                openMaintenanceRequests > 10 ? "text-yellow-500" : "text-openkey-blue"
              )}>
                {openMaintenanceRequests}
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default PortfolioHealthDashboard;