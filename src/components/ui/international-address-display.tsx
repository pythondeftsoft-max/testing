
import React from 'react';
import { formatInternationalAddress } from '@/lib/enhancedDatabaseUtils';
import type { InternationalAddress } from '@/types/countries';

interface InternationalAddressDisplayProps {
  address: InternationalAddress | {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  countryCode?: string;
  variant?: 'full' | 'compact' | 'single-line';
  className?: string;
  fallback?: string;
}

export const InternationalAddressDisplay: React.FC<InternationalAddressDisplayProps> = ({
  address,
  countryCode = 'US',
  variant = 'full',
  className = '',
  fallback = 'Address not available'
}) => {
  const [formattedAddress, setFormattedAddress] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const formatAddress = async () => {
      try {
        setIsLoading(true);
        const result = await formatInternationalAddress(address, countryCode);
        setFormattedAddress(result.formatted || fallback);
      } catch (error) {
        console.warn('Error formatting address:', error);
        // Create basic fallback formatting with flexible property mapping
        const addressTyped = address as any;
        const parts = [
          addressTyped.street || addressTyped.street_1,
          addressTyped.street_2,
          addressTyped.city,
          addressTyped.state || addressTyped.state_province,
          addressTyped.postal_code
        ].filter(Boolean);
        setFormattedAddress(parts.join(', ') || fallback);
      } finally {
        setIsLoading(false);
      }
    };

    formatAddress();
  }, [address, countryCode, fallback]);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4"></div>
        {variant === 'full' && (
          <div className="h-4 bg-muted rounded w-1/2 mt-1"></div>
        )}
      </div>
    );
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'text-sm text-muted-foreground truncate';
      case 'single-line':
        return 'text-sm truncate';
      default:
        return 'text-sm';
    }
  };

  if (variant === 'single-line') {
    return (
      <span className={`${getVariantClasses()} ${className}`}>
        {formattedAddress}
      </span>
    );
  }

  // Split address into lines for better display
  const addressLines = formattedAddress.split('\n').filter(Boolean);

  return (
    <div className={`${getVariantClasses()} ${className}`}>
      {addressLines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
};
