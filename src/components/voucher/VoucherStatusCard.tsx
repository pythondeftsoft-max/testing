
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';

interface VoucherStatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'gold' | 'blue' | 'default';
  badge?: string;
  className?: string;
}

export const VoucherStatusCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  variant = 'default',
  badge,
  className 
}: VoucherStatusCardProps) => {
  const variantClasses = {
    gold: 'border-[#1e3a5f] bg-[#f0f4f8]',
    blue: 'border-[#1e3a5f] bg-[#f0f4f8]',
    default: 'border-[#1e3a5f] bg-[#f0f4f8]'
  };

  const iconClasses = {
    gold: 'text-[#bf9000]',
    blue: 'text-[#bf9000]',
    default: 'text-[#bf9000]'
  };

  const valueClasses = {
    gold: 'text-[#1e3a5f]',
    blue: 'text-[#1e3a5f]',
    default: 'text-[#1e3a5f]'
  };

  const badgeClasses = {
    gold: 'bg-[#fff8e1] text-[#bf9000] border-[#e6a800]',
    blue: 'bg-[#fff8e1] text-[#bf9000] border-[#e6a800]',
    default: 'bg-[#fff8e1] text-[#bf9000] border-[#e6a800]'
  };

  return (
    <CardEnhanced 
      variant="elevated" 
      hover={true}
      animate={true}
      className={cn('card-hover-gold', variantClasses[variant], 'border-2', className)}
    >
      <CardEnhancedHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardEnhancedTitle className="text-sm font-medium text-[#1e3a5f] flex items-center gap-2">
            {icon && <span className={iconClasses[variant]}>{icon}</span>}
            {title}
          </CardEnhancedTitle>
          {badge && (
            <Badge variant="outline" className={cn('text-xs', badgeClasses[variant])}>
              {badge}
            </Badge>
          )}
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent className="pt-0">
        <div className={cn('text-2xl font-bold', valueClasses[variant])}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-[#2d5a87] mt-1">
            {subtitle}
          </p>
        )}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};
