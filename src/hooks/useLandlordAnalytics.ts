
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { useEffect, useRef } from 'react';

export interface PortfolioOverview {
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  availability_rate: number;
  available_units: number;
  vacancy_rate: number;
  gross_rent: number;
  collected_rent: number;
  collection_rate: number;
  net_operating_income: number;
  avg_time_on_market: number;
}

export interface LeasePipeline {
  expiring_soon: number;
  expired_leases: number;
  renewal_pending: number;
  applications_pending: number;
  expiring_30_days: number;
  expiring_60_days: number;
  expiring_90_days: number;
  renewal_rate: number;
  avg_days_to_lease: number;
}

export interface MaintenanceEfficiency {
  open_requests: number;
  avg_resolution_time: number;
  urgent_requests: number;
  completed_this_month: number;
  open_requests_count: number;
  avg_request_age_days: number;
  avg_resolution_days: number;
  maintenance_cost_per_unit: number;
}

export interface RentDelinquency {
  total_delinquent: number;
  delinquent_amount: number;
  notices_sent: number;
  evictions_pending: number;
  on_time_payment_rate: number;
  late_payment_rate: number;
  total_delinquency_balance: number;
  late_payment_count: number;
}

export interface TopLatePayer {
  tenant_name: string;
  amount_owed: number;
  days_late: number;
  property_address: string;
  tenant_id: string;
  overdue_amount: number;
}

export const useLandlordAnalytics = (landlordId: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  const previousPortfolioRef = useRef<string | undefined>();

  // Only invalidate cache when portfolio actually changes (not on every render)
  useEffect(() => {
    if (landlordId && previousPortfolioRef.current !== undefined && previousPortfolioRef.current !== portfolioId) {
      queryClient.invalidateQueries({ 
        queryKey: ['landlordAnalytics'],
        exact: false 
      });
    }
    previousPortfolioRef.current = portfolioId;
  }, [landlordId, portfolioId, queryClient]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['landlordAnalytics', landlordId, portfolioId],
    queryFn: async () => {
      // Build base query for properties WITH property_units for unit-level data
      let propertiesQuery = supabase
        .from('properties')
        .select('*, property_units(*)')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);

      // Apply portfolio filter if specified (portfolioId is already normalized)
      if (portfolioId) {
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;
      
      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
        throw propertiesError;
      }

      // Calculate unit-level metrics from property_units
      let totalUnits = 0;
      let occupiedUnits = 0;
      let vacantUnits = 0;
      let availableUnits = 0;
      let actualMonthlyRent = 0;

      properties?.forEach(property => {
        const units = property.property_units || [];
        if (units.length > 0) {
          // Use actual unit records
          totalUnits += units.length;
          units.forEach((unit: any) => {
            if (unit.status === 'occupied') {
              occupiedUnits++;
              actualMonthlyRent += unit.monthly_rent || 0;
            } else if (unit.status === 'available') {
              availableUnits++;
            } else if (unit.status === 'vacant') {
              vacantUnits++;
            }
          });
        } else {
          // Fallback for properties without unit records
          totalUnits += property.unit_count || 1;
          if (property.status === 'occupied') {
            occupiedUnits += property.unit_count || 1;
            actualMonthlyRent += property.monthly_rent || 0;
          } else if (property.status === 'available') {
            availableUnits += property.unit_count || 1;
          } else if (property.status === 'vacant') {
            vacantUnits += property.unit_count || 1;
          }
        }
      });
      
      // Calculate all operating expenses
      const totalExpenses = properties?.reduce((sum, p) => {
        const mortgage = p.mortgage_cost || 0;
        const insurance = p.insurance_cost || 0;
        const management = p.management_fee || 0;
        const repairs = p.repair_costs || 0;
        const taxes = p.property_taxes || 0;
        return sum + mortgage + insurance + management + repairs + taxes;
      }, 0) || 0;

      // Net Operating Income = Monthly Rent - All Monthly Expenses (no collection rate deduction)
      const netOperatingIncome = actualMonthlyRent - totalExpenses;

      const portfolioOverview: PortfolioOverview = {
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        vacant_units: vacantUnits,
        vacancy_rate: totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0,
        available_units: availableUnits,
        availability_rate: totalUnits > 0 ? (availableUnits / totalUnits) * 100 : 0,
        gross_rent: actualMonthlyRent,
        collected_rent: actualMonthlyRent, // No 95% deduction - show actual rent
        collection_rate: 100, // Will be calculated from actual payments later
        net_operating_income: netOperatingIncome,
        avg_time_on_market: 0
      };

      // Fetch real data using existing database functions - pass portfolio_id to avoid overload errors
      const [
        { data: leasePipelineData, error: leasePipelineError },
        { data: maintenanceEfficiencyData, error: maintenanceEfficiencyError },
        { data: rentDelinquencyData, error: rentDelinquencyError },
        { data: topLatePayersData, error: topLatePayersError }
      ] = await Promise.all([
        supabase.rpc('get_landlord_lease_pipeline', { 
          landlord_id: landlordId, 
          portfolio_id: portfolioId || null 
        }),
        supabase.rpc('get_landlord_maintenance_efficiency', { 
          landlord_id: landlordId, 
          portfolio_id: portfolioId || null 
        }),
        supabase.rpc('get_landlord_rent_delinquency', { 
          landlord_id: landlordId, 
          portfolio_id: portfolioId || null 
        }),
        supabase.rpc('get_landlord_top_late_payers', { 
          landlord_id: landlordId, 
          portfolio_id: portfolioId || null,
          limit_count: 5 
        })
      ]);

      // Handle errors gracefully - use defaults if functions fail
      const leasePipeline: LeasePipeline = leasePipelineError ? {
        expiring_soon: 0,
        expired_leases: 0,
        renewal_pending: 0,
        applications_pending: 0,
        expiring_30_days: 0,
        expiring_60_days: 0,
        expiring_90_days: 0,
        renewal_rate: 0,
        avg_days_to_lease: 0
      } : {
        expiring_soon: (leasePipelineData?.[0]?.expiring_30_days || 0),
        expired_leases: 0,
        renewal_pending: 0,
        applications_pending: 0,  
        expiring_30_days: leasePipelineData?.[0]?.expiring_30_days || 0,
        expiring_60_days: leasePipelineData?.[0]?.expiring_60_days || 0,
        expiring_90_days: leasePipelineData?.[0]?.expiring_90_days || 0,
        renewal_rate: leasePipelineData?.[0]?.renewal_rate || 0,
        avg_days_to_lease: leasePipelineData?.[0]?.avg_days_to_lease || 0
      };

      const maintenanceEfficiency: MaintenanceEfficiency = maintenanceEfficiencyError ? {
        open_requests: 0,
        avg_resolution_time: 0,
        urgent_requests: 0,
        completed_this_month: 0,
        open_requests_count: 0,
        avg_request_age_days: 0,
        avg_resolution_days: 0,
        maintenance_cost_per_unit: 0
      } : {
        open_requests: maintenanceEfficiencyData?.[0]?.open_requests_count || 0,
        avg_resolution_time: maintenanceEfficiencyData?.[0]?.avg_resolution_days || 0,
        urgent_requests: 0,
        completed_this_month: 0,
        open_requests_count: maintenanceEfficiencyData?.[0]?.open_requests_count || 0,
        avg_request_age_days: maintenanceEfficiencyData?.[0]?.avg_request_age_days || 0,
        avg_resolution_days: maintenanceEfficiencyData?.[0]?.avg_resolution_days || 0,
        maintenance_cost_per_unit: maintenanceEfficiencyData?.[0]?.maintenance_cost_per_unit || 0
      };

      const rentDelinquency: RentDelinquency = rentDelinquencyError ? {
        total_delinquent: 0,
        delinquent_amount: 0,
        notices_sent: 0,
        evictions_pending: 0,
        on_time_payment_rate: 0,
        late_payment_rate: 0,
        total_delinquency_balance: 0,
        late_payment_count: 0
      } : {
        total_delinquent: rentDelinquencyData?.[0]?.late_payment_count || 0,
        delinquent_amount: rentDelinquencyData?.[0]?.total_delinquency_balance || 0,
        notices_sent: 0,
        evictions_pending: 0,
        on_time_payment_rate: rentDelinquencyData?.[0]?.on_time_payment_rate || 0,
        late_payment_rate: rentDelinquencyData?.[0]?.late_payment_rate || 0,
        total_delinquency_balance: rentDelinquencyData?.[0]?.total_delinquency_balance || 0,
        late_payment_count: rentDelinquencyData?.[0]?.late_payment_count || 0
      };

      const topLatePayers: TopLatePayer[] = topLatePayersError || !topLatePayersData ? [] : 
        topLatePayersData.map(payer => ({
          tenant_name: payer.tenant_name || 'Unknown',
          amount_owed: payer.overdue_amount || 0,
          days_late: payer.days_late || 0,
          property_address: payer.property_address || 'Unknown',
          tenant_id: payer.tenant_id || '',
          overdue_amount: payer.overdue_amount || 0
        }));

      return {
        portfolioOverview,
        leasePipeline,
        maintenanceEfficiency,
        rentDelinquency,
        topLatePayers,
        loading: false,
        error: null
      };
    },
    enabled: !!landlordId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      if ((error as any)?.code === 'PGRST203') return false;
      if ((error as any)?.code === '42703') return false;
      if ((error as any)?.code === '22P02') return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  return {
    portfolioOverview: data?.portfolioOverview || null,
    leasePipeline: data?.leasePipeline || null,
    maintenanceEfficiency: data?.maintenanceEfficiency || null,
    rentDelinquency: data?.rentDelinquency || null,
    topLatePayers: data?.topLatePayers || [],
    loading: isLoading,
    error: error?.message || null,
    refetch
  };
};
