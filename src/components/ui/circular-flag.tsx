import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';
import { cn } from '@/lib/utils';

interface CircularFlagProps {
  countryCode: string;
  size?: number;
  className?: string;
}

export const CircularFlag: React.FC<CircularFlagProps> = ({ 
  countryCode, 
  size = 20,
  className 
}) => {
  // Get the flag component dynamically using the country code as key
  const FlagComponent = Flags[countryCode as keyof typeof Flags];
  
  if (!FlagComponent) {
    // Fallback for unknown country codes - show a neutral circle
    return (
      <div 
        className={cn(
          "rounded-full bg-muted flex items-center justify-center flex-shrink-0",
          className
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-muted-foreground" style={{ fontSize: size * 0.5 }}>?</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "rounded-full overflow-hidden flex-shrink-0 border border-border/50",
        className
      )}
      style={{ width: size, height: size }}
    >
      <FlagComponent 
        className="w-full h-full object-cover"
        style={{ 
          transform: 'scale(1.5)',
          transformOrigin: 'center center'
        }}
      />
    </div>
  );
};

export default CircularFlag;
