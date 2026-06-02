
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface EnhancedLeaseRenewalCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor: string;
  description?: string;
  trend?: number;
  isActive?: boolean;
  onClick?: () => void;
  subtitle?: string;
}

export const EnhancedLeaseRenewalCard: React.FC<EnhancedLeaseRenewalCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  description,
  trend,
  isActive = false,
  onClick,
  subtitle
}) => {
  const getVariant = () => {
    if (isActive) return 'premium';
    return 'elevated';
  };

  return (
    <CardEnhanced 
      variant={getVariant()}
      className={`
        relative cursor-pointer transition-all duration-300 animate-fade-in-up card-hover-gold
        ${onClick ? 'transform hover:scale-105' : ''}
      `}
      onClick={onClick}
    >
      <CardEnhancedHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardEnhancedTitle>
          <div className={`p-2 rounded-lg ${iconColor} shadow-sm`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">
              {value}
            </span>
            {trend !== undefined && (
              <Badge 
                variant={trend > 0 ? "default" : trend < 0 ? "destructive" : "secondary"}
                className="text-xs"
              >
                {trend > 0 ? '+' : ''}{trend}%
              </Badge>
            )}
          </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
          
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        
        {isActive && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-openkey-gold rounded-full animate-pulse" />
          </div>
        )}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};
