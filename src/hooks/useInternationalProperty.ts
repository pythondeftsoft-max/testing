
import { useState, useEffect } from 'react';
import { processPropertyWithContext, createInternationalContext, detectUserContext } from '@/lib/internationalUtils';
import type { InternationalProperty, InternationalContext } from '@/lib/internationalUtils';

interface UseInternationalPropertyOptions {
  targetCountry?: string;
  targetCurrency?: string;
  autoDetectContext?: boolean;
}

export const useInternationalProperty = (
  property: InternationalProperty,
  options: UseInternationalPropertyOptions = {}
) => {
  const [processedProperty, setProcessedProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetContext, setTargetContext] = useState<InternationalContext | null>(null);

  useEffect(() => {
    const processProperty = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let context: InternationalContext | undefined;

        if (options.targetCountry) {
          context = await createInternationalContext(options.targetCountry);
        } else if (options.autoDetectContext) {
          context = await detectUserContext();
        }

        setTargetContext(context || null);

        const result = await processPropertyWithContext(property, context);
        setProcessedProperty(result);
      } catch (err) {
        console.error('Error processing international property:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to basic property data
        setProcessedProperty({
          property,
          formattedAddress: property.address.street_1 || 'Address not available',
          formattedRent: property.rent ? `$${property.rent}` : 'Contact for price',
          formattedValue: property.value ? `$${property.value}` : 'N/A',
          context: null
        });
      } finally {
        setIsLoading(false);
      }
    };

    processProperty();
  }, [property, options.targetCountry, options.autoDetectContext]);

  const refreshContext = async (newCountry?: string) => {
    if (newCountry) {
      const newContext = await createInternationalContext(newCountry);
      setTargetContext(newContext);
      // Re-process with new context
      const result = await processPropertyWithContext(property, newContext);
      setProcessedProperty(result);
    }
  };

  return {
    processedProperty,
    targetContext,
    isLoading,
    error,
    refreshContext
  };
};

export const useInternationalProperties = (
  properties: InternationalProperty[],
  options: UseInternationalPropertyOptions = {}
) => {
  const [processedProperties, setProcessedProperties] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processProperties = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let context: InternationalContext | undefined;

        if (options.targetCountry) {
          context = await createInternationalContext(options.targetCountry);
        } else if (options.autoDetectContext) {
          context = await detectUserContext();
        }

        const { processBatchProperties } = await import('@/lib/internationalUtils');
        const results = await processBatchProperties(properties, context);
        setProcessedProperties(results);
      } catch (err) {
        console.error('Error processing international properties:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (properties.length > 0) {
      processProperties();
    }
  }, [properties, options.targetCountry, options.autoDetectContext]);

  return {
    processedProperties,
    isLoading,
    error
  };
};
