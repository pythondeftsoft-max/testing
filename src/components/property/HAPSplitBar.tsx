import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HAPSplitBarProps {
  hapPortion: number;
  tenantPortion: number;
  totalRent: number;
  showLabels?: boolean;
  animated?: boolean;
  className?: string;
}

/**
 * Visual progress bar showing HAP (Housing Authority Payment) vs Tenant portion
 * of rent payments. Matches the premium landing page style with Framer Motion animations.
 */
export const HAPSplitBar: React.FC<HAPSplitBarProps> = ({
  hapPortion,
  tenantPortion,
  totalRent,
  showLabels = true,
  animated = true,
  className,
}) => {
  // Calculate percentages, handling edge cases
  const hapPercent = totalRent > 0 ? (hapPortion / totalRent) * 100 : 0;
  const tenantPercent = totalRent > 0 ? (tenantPortion / totalRent) * 100 : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {showLabels && (
        <div className="flex justify-between text-xs">
          <span className="text-success font-medium">
            HAP: {formatCurrency(hapPortion)}
          </span>
          <span className="text-openkey-blue font-medium">
            Tenant: {formatCurrency(tenantPortion)}
          </span>
        </div>
      )}
      <div className={cn("hap-split-bar", animated && "hap-split-bar-animated")}>
        {animated ? (
          <>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${hapPercent}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="hap-portion"
              title={`HAP: ${formatCurrency(hapPortion)} (${hapPercent.toFixed(1)}%)`}
            />
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${tenantPercent}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              className="tenant-portion"
              title={`Tenant: ${formatCurrency(tenantPortion)} (${tenantPercent.toFixed(1)}%)`}
            />
          </>
        ) : (
          <>
            <div
              className="hap-portion"
              style={{ width: `${hapPercent}%` }}
              title={`HAP: ${formatCurrency(hapPortion)} (${hapPercent.toFixed(1)}%)`}
            />
            <div
              className="tenant-portion"
              style={{ width: `${tenantPercent}%` }}
              title={`Tenant: ${formatCurrency(tenantPortion)} (${tenantPercent.toFixed(1)}%)`}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default HAPSplitBar;
