
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RentSplitVisualizationProps {
  totalRent: number;
  phaPortion: number;
  tenantPortion: number;
  voucherType?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RentSplitVisualization = ({ 
  totalRent, 
  phaPortion, 
  tenantPortion, 
  voucherType,
  size = 'md'
}: RentSplitVisualizationProps) => {
  const phaPercentage = (phaPortion / totalRent) * 100;
  const tenantPercentage = (tenantPortion / totalRent) * 100;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="space-y-4">
      {/* Total Rent Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#1e3a5f]" />
          <span className={cn('font-semibold text-foreground', sizeClasses[size])}>
            Total Rent: ${totalRent.toLocaleString()}
          </span>
        </div>
        {voucherType && (
          <Badge variant="outline" className="text-[#1e3a5f] border-[#bf9000] bg-[#fff8e1] text-xs">
            {voucherType}
          </Badge>
        )}
      </div>

      {/* Rent Split Details with Fuel Gauge */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#bf9000]"></div>
              <span className={cn('font-medium text-[#bf9000]', sizeClasses[size])}>
                HAP
              </span>
            </div>
            <span className={cn('font-semibold tabular-nums text-[#bf9000]', sizeClasses[size])}>
              ${phaPortion.toLocaleString()} ({phaPercentage.toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#1e3a5f] rounded-full"></div>
              <span className={cn('text-[#1e3a5f] font-medium', sizeClasses[size])}>
                Tenant
              </span>
            </div>
            <span className={cn('text-[#1e3a5f] font-semibold tabular-nums', sizeClasses[size])}>
              ${tenantPortion.toLocaleString()} ({tenantPercentage.toFixed(0)}%)
            </span>
          </div>
        </div>
        
        <div className="w-20 h-12 ml-4 flex-shrink-0 relative">
          <div className="relative w-full h-full">
            <svg
              className="w-full h-full"
              viewBox="0 0 80 48"
            >
              {/* Background gauge arc */}
              <path
                d="M 8 40 A 32 32 0 0 1 72 40"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="8"
                strokeLinecap="round"
              />
              
              {/* HAP (rustic gold) portion */}
              <path
                d="M 8 40 A 32 32 0 0 1 72 40"
                fill="none"
                stroke="#bf9000"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(phaPercentage / 100) * 100.53} 100.53`}
                strokeDashoffset="0"
                className="transition-all duration-1000 ease-out"
              />
              
              {/* Tenant (navy blue) portion */}
              <path
                d="M 8 40 A 32 32 0 0 1 72 40"
                fill="none"
                stroke="#1e3a5f"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(tenantPercentage / 100) * 100.53} 100.53`}
                strokeDashoffset={`-${(phaPercentage / 100) * 100.53}`}
                className="transition-all duration-1000 ease-out"
              />
              
              {/* Gauge needle pointing to HAP/Tenant split */}
              <g>
                {(() => {
                  const needleAngle = Math.PI * (1 - (phaPercentage / 100));
                  const needleLength = 22;
                  const needleEndX = 40 + needleLength * Math.cos(needleAngle);
                  const needleEndY = 40 - needleLength * Math.sin(needleAngle);
                  
                  return (
                    <>
                      {/* Needle shadow */}
                      <line
                        x1="41"
                        y1="41"
                        x2={needleEndX + 1}
                        y2={needleEndY + 1}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {/* Main needle */}
                      <line
                        x1="40"
                        y1="40"
                        x2={needleEndX}
                        y2={needleEndY}
                        stroke="#000"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      {/* Center dot */}
                      <circle
                        cx="40"
                        cy="40"
                        r="3"
                        fill="#000"
                        stroke="white"
                        strokeWidth="1"
                      />
                    </>
                  );
                })()}
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
