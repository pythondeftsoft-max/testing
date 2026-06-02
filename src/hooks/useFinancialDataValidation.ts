import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialDataValidation {
  totalProperties: number;
  propertiesWithCompleteData: number;
  propertiesMissingData: number;
  completionPercentage: number;
  missingDataByField: {
    ending_cash_balance: number;
    tenant_security_deposits_held: number;
    property_reserve: number;
    monthly_rent: number;
  };
  isValid: boolean;
}

export const useFinancialDataValidation = (
  userId: string, 
  portfolioId?: string,
  propertyIds?: string[]
) => {
  return useQuery({
    queryKey: ['financial-data-validation', userId, portfolioId, propertyIds],
    queryFn: async (): Promise<FinancialDataValidation> => {
      if (!userId) {
        return {
          totalProperties: 0,
          propertiesWithCompleteData: 0,
          propertiesMissingData: 0,
          completionPercentage: 0,
          missingDataByField: {
            ending_cash_balance: 0,
            tenant_security_deposits_held: 0,
            property_reserve: 0,
            monthly_rent: 0,
          },
          isValid: false,
        };
      }

      // Build query
      let query = supabase
        .from('properties')
        .select('id, ending_cash_balance, tenant_security_deposits_held, property_reserve, monthly_rent')
        .eq('owner_id', userId)
        .is('deleted_at', null);

      // Apply portfolio filter if specified
      if (portfolioId && portfolioId !== 'everything' && portfolioId !== 'all') {
        query = query.eq('portfolio_id', portfolioId);
      }

      // Apply property filter if specified
      if (propertyIds && propertyIds.length > 0) {
        query = query.in('id', propertyIds);
      }

      const { data: properties, error } = await query;

      if (error) throw error;

      if (!properties || properties.length === 0) {
        return {
          totalProperties: 0,
          propertiesWithCompleteData: 0,
          propertiesMissingData: 0,
          completionPercentage: 100, // No properties = valid
          missingDataByField: {
            ending_cash_balance: 0,
            tenant_security_deposits_held: 0,
            property_reserve: 0,
            monthly_rent: 0,
          },
          isValid: true,
        };
      }

      // Count properties with missing data
      let missingEndingCash = 0;
      let missingDeposits = 0;
      let missingReserve = 0;
      let missingRent = 0;
      let propertiesWithCompleteData = 0;

      properties.forEach(property => {
        let isComplete = true;

        if (property.ending_cash_balance === null || property.ending_cash_balance === undefined) {
          missingEndingCash++;
          isComplete = false;
        }
        if (property.tenant_security_deposits_held === null || property.tenant_security_deposits_held === undefined) {
          missingDeposits++;
          isComplete = false;
        }
        if (property.property_reserve === null || property.property_reserve === undefined) {
          missingReserve++;
          isComplete = false;
        }
        if (property.monthly_rent === null || property.monthly_rent === undefined) {
          missingRent++;
          isComplete = false;
        }

        if (isComplete) {
          propertiesWithCompleteData++;
        }
      });

      const totalProperties = properties.length;
      const propertiesMissingData = totalProperties - propertiesWithCompleteData;
      const completionPercentage = totalProperties > 0 
        ? Math.round((propertiesWithCompleteData / totalProperties) * 100)
        : 100;

      return {
        totalProperties,
        propertiesWithCompleteData,
        propertiesMissingData,
        completionPercentage,
        missingDataByField: {
          ending_cash_balance: missingEndingCash,
          tenant_security_deposits_held: missingDeposits,
          property_reserve: missingReserve,
          monthly_rent: missingRent,
        },
        isValid: propertiesMissingData === 0,
      };
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
};
