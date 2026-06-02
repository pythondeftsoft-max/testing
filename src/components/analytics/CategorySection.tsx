import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface CategorySectionProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  className?: string;
  headerActions?: React.ReactNode;
  infoText?: string;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  children,
  isLoading = false,
  error = null,
  defaultExpanded = true,
  collapsible = true,
  className = '',
  headerActions,
  infoText
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  if (error) {
    return (
      <CardEnhanced variant="elevated" className={`bg-card border-destructive/20 ${className}`}>
        <CardEnhancedContent className="py-8">
          <div className="text-center">
            <div className="text-red-600 mb-2">
              <Info className="h-8 w-8 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading {title}</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" className={`bg-card border-openkey-blue/20 ${className}`}>
      <CardEnhancedHeader 
        className={`${collapsible ? 'cursor-pointer' : ''} transition-colors hover:bg-muted/50`}
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
              {Icon && <Icon className="h-5 w-5" />}
              {title}
              {infoText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-openkey-blue transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>{infoText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardEnhancedTitle>
            {badge && (
              <Badge variant={badge.variant || 'secondary'} className="ml-2">
                {badge.text}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {headerActions}
            {collapsible && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-openkey-blue hover:bg-openkey-blue/10"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardEnhancedHeader>
      
      {isExpanded && (
        <CardEnhancedContent className="transition-all duration-200">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            children
          )}
        </CardEnhancedContent>
      )}
    </CardEnhanced>
  );
};

export default CategorySection;