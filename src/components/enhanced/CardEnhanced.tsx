
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardEnhancedProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'premium' | 'gradient' | 'subtle' | 'command';
  hover?: boolean;
  animate?: boolean;
  onClick?: () => void;
}

export const CardEnhanced = ({ 
  children, 
  className, 
  variant = 'default',
  hover = true,
  animate = true,
  onClick
}: CardEnhancedProps) => {
  const variants = {
    default: 'border border-border bg-card shadow-sm',
    elevated: 'card-elevated border-0',
    outlined: 'border-2 border-openkey-blue/20 bg-card shadow-sm',
    premium: 'bg-gradient-subtle-blue border border-openkey-blue/20 shadow-md',
    gradient: 'bg-gradient-blue-gold border-0 text-white shadow-lg',
    subtle: 'bg-card border border-border shadow-sm',
    command: 'command-card'
  };

  const hoverEffects = hover ? 'card-hover' : '';
  const animationEffects = animate ? 'animate-fade-in-up' : '';

  return (
    <Card 
      className={cn(
        variants[variant],
        'rounded-lg',
        hoverEffects,
        animationEffects,
        onClick ? 'cursor-pointer' : '',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
};

export const CardEnhancedHeader = ({ children, className, ...props }: any) => (
  <CardHeader className={cn('pb-3', className)} {...props}>
    {children}
  </CardHeader>
);

export const CardEnhancedTitle = ({ children, className, gradient, ...props }: any & { gradient?: boolean }) => (
  <CardTitle className={cn(
    'text-lg font-semibold text-foreground',
    gradient && 'text-gradient-blue-gold',
    className
  )} {...props}>
    {children}
  </CardTitle>
);

export const CardEnhancedDescription = ({ children, className, ...props }: any) => (
  <CardDescription className={cn('text-sm text-muted-foreground', className)} {...props}>
    {children}
  </CardDescription>
);

export const CardEnhancedContent = ({ children, className, ...props }: any) => (
  <CardContent className={cn('pt-0', className)} {...props}>
    {children}
  </CardContent>
);
