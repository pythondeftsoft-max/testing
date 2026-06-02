import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RentRollUnit {
  id: string;
  unit_number: string;
  property_id: string;
  property_address: string;
  tenant_names: string;
  lease_start_date?: string;
  lease_end_date?: string;
  bedrooms?: number;
  bathrooms?: number;
  rent_cycle: string;
  monthly_rent?: number;
  recurring_charges_total: number;
  recurring_credits_total: number;
  deposits_held: number;
  prepayments_balance: number;
  balance_due: number;
  total_amount: number;
  lease_status: string;
}

export interface BedBathSummary {
  bed_bath_config: string;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate: number;
  market_rent: number;
  actual_rent: number;
  avg_rent_per_unit: number;
}

export interface PropertySummary {
  property_address: string;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate: number;
  market_rent: number;
  actual_rent: number;
  avg_rent_per_unit: number;
}

export interface RentRollSummary {
  total_market_rent: number;
  total_actual_rent: number;
  total_recurring_charges: number;
  total_recurring_credits: number;
  total_deposits: number;
  total_prepayments: number;
  total_balance_due: number;
  occupied_units: number;
  total_units: number;
  occupancy_rate: number;
  bedBathSummary: BedBathSummary[];
  propertySummary: PropertySummary[];
}

export interface RentRollFilters {
  portfolioId?: string;
  propertyIds?: string[]; // Changed from propertyId to propertyIds array
  unitIds?: string[]; // Added for hierarchical property selector
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  leaseStatus?: string[];
  balanceFilter?: string[]; // Changed to array to support multi-select
}

export const useRentRollData = (filters: RentRollFilters | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['rent-roll-data', filters],
    queryFn: async () => {
      if (!filters) throw new Error('Filters are required');
      
      console.log('🔍 [useRentRollData] Received filters:', filters);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Handle portfolio filtering with proper access control
      let accessiblePortfolioIds: string[] = [];
      
      if (filters.portfolioId === 'everything') {
        // Get all portfolios the user has access to (owned + roles)
        const [ownedResult, roleBasedResult] = await Promise.all([
          // Portfolios owned/managed by the user
          supabase
            .from('portfolios')
            .select('id')
            .eq('manager_id', user.user.id),
          
          // Portfolios where user has an active role
          supabase
            .from('portfolio_roles')
            .select('portfolio_id')
            .eq('user_id', user.user.id)
            .eq('is_active', true)
        ]);

        const ownedPortfolios = (ownedResult.data || []).map(p => p.id);
        const rolePortfolios = (roleBasedResult.data || []).map(role => role.portfolio_id);
        
        // Combine and deduplicate
        accessiblePortfolioIds = [...new Set([...ownedPortfolios, ...rolePortfolios])];
        console.log('RentRoll: User has access to portfolios:', accessiblePortfolioIds);
      }

      // First build the base query on property_units with property and application joins
      let query = supabase
        .from('property_units')
        .select(`
          *,
          properties!inner (
            id,
            address,
            rent_cycle,
            bedrooms,
            bathrooms,
            prepayments_balance,
            security_deposit_held,
            current_balance_due,
            lease_start_date,
            lease_end_date,
            status,
            occupancy_status,
            owner_id,
            portfolio_id
          )
        `)
        .neq('properties.status', 'deleted');

      // Apply portfolio filtering with access control
      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        // Specific portfolio selected
        query = query
          .eq('properties.portfolio_id', filters.portfolioId)
          .eq('properties.owner_id', user.user.id);
      } else if (filters.portfolioId === 'everything') {
        // "Everything" - show only properties from accessible portfolios (no unassigned properties)
        if (accessiblePortfolioIds.length > 0) {
          query = query.in('properties.portfolio_id', accessiblePortfolioIds);
        } else {
          // User has no portfolio access, show no properties
          query = query.eq('properties.id', '00000000-0000-0000-0000-000000000000'); // UUID that will never match
        }
      } else {
        // No portfolio filter, show user's own properties
        query = query.eq('properties.owner_id', user.user.id);
      }

      // Apply property/unit filter - handle both property IDs and unit IDs
      const hasPropertyFilter = filters.propertyIds && filters.propertyIds.length > 0;
      const hasUnitFilter = filters.unitIds && filters.unitIds.length > 0;

      if (hasPropertyFilter || hasUnitFilter) {
        if (hasPropertyFilter && hasUnitFilter) {
          // Both property and unit filters - use OR logic
          query = query.or(`property_id.in.(${filters.propertyIds.join(',')}),id.in.(${filters.unitIds.join(',')})`);
        } else if (hasUnitFilter) {
          // Only unit filter - filter by specific unit IDs
          query = query.in('id', filters.unitIds);
        } else {
          // Only property filter - filter by property IDs (for properties without units)
          query = query.in('property_id', filters.propertyIds);
        }
        console.log('🔍 [useRentRollData] Applied property/unit filter:', { propertyIds: filters.propertyIds, unitIds: filters.unitIds });
      } else {
        console.log('🔍 [useRentRollData] No property/unit filter applied - showing all properties and units');
      }

      const { data: units, error } = await query;

      if (error) throw error;

      // Get detailed information for each unit
      const unitsWithDetails = await Promise.all(
        (units || []).map(async (unit) => {
          const property = unit.properties;
          
          // Get current tenant information for this specific unit
          const { data: applications } = await supabase
            .from('property_applications')
            .select(`
              tenant_id,
              status,
              created_at,
              profiles!property_applications_tenant_id_fkey(first_name, last_name)
            `)
            .eq('property_id', unit.property_id)
            .eq('unit_id', unit.id) // Link to specific unit
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1);

          // Get recurring charges for this unit (or property if unit-level not available)
          const { data: charges } = await supabase
            .from('recurring_charges')
            .select('amount, charge_name')
            .eq('property_id', unit.property_id)
            .eq('is_active', true);

          // Get recurring credits for this unit (or property if unit-level not available)
          const { data: credits } = await supabase
            .from('rent_credits')
            .select('credit_amount')
            .eq('property_id', unit.property_id)
            .eq('is_active', true);

          // Get rent payments for this unit (expanded date range to get all relevant payments)
          const { data: payments } = await supabase
            .from('rent_payments')
            .select('amount, due_date, payment_date, status, late_fee_amount, days_late')
            .eq('property_id', unit.property_id)
            .order('due_date', { ascending: false });

          // Calculate financial details
          const current_tenant = applications?.[0];
          const tenant_names = current_tenant 
            ? `${current_tenant.profiles.first_name} ${current_tenant.profiles.last_name}`
            : 'Vacant';

          const recurring_charges_total = charges?.reduce((sum, charge) => sum + (charge.amount || 0), 0) || 0;
          const recurring_credits_total = credits?.reduce((sum, credit) => sum + (credit.credit_amount || 0), 0) || 0;
          
          // Use unit-specific monthly rent if available, otherwise fall back to property rent
          const monthly_rent = unit.monthly_rent || 0;
          
          // Calculate balance due based on date range and payment status
          let filtered_balance = 0;
          let is_late = false;
          let days_late = 0;

          // Apply date range filter for payment calculations
          if (filters.dateRange.from && filters.dateRange.to) {
            const fromDate = new Date(filters.dateRange.from);
            const toDate = new Date(filters.dateRange.to);
            
            // Filter payments within the date range
            const dateFilteredPayments = payments?.filter(p => {
              const paymentDate = new Date(p.due_date);
              return paymentDate >= fromDate && paymentDate <= toDate;
            }) || [];
            
            // Calculate balance from unpaid payments in date range
            const unpaidPayments = dateFilteredPayments.filter(p => p.status !== 'completed');
            filtered_balance = unpaidPayments.reduce((sum, payment) => {
              const baseAmount = payment.amount || monthly_rent;
              const lateFee = payment.late_fee_amount || 0;
              return sum + baseAmount + lateFee;
            }, 0);
            
            // Check for late payments
            if (unpaidPayments.length > 0) {
              const oldestUnpaid = unpaidPayments.reduce((oldest, current) => 
                new Date(current.due_date) < new Date(oldest.due_date) ? current : oldest
              );
              is_late = new Date(oldestUnpaid.due_date) < new Date();
              days_late = Math.max(0, Math.floor((new Date().getTime() - new Date(oldestUnpaid.due_date).getTime()) / (1000 * 3600 * 24)));
            }

            // For occupied units with no payment records in date range, estimate monthly balance
            if (current_tenant && dateFilteredPayments.length === 0 && monthly_rent > 0) {
              // Calculate how many months are in the date range
              const monthsInRange = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24 * 30));
              filtered_balance = monthly_rent * Math.min(monthsInRange, 1); // At least show current month's rent
            }
          } else {
            // No date range filter - calculate current balance due
            const unpaidPayments = payments?.filter(p => p.status !== 'completed' && new Date(p.due_date) <= new Date()) || [];
            filtered_balance = unpaidPayments.reduce((sum, payment) => {
              const baseAmount = payment.amount || monthly_rent;
              const lateFee = payment.late_fee_amount || 0;
              return sum + baseAmount + lateFee;
            }, 0);
            
            if (unpaidPayments.length > 0) {
              const oldestUnpaid = unpaidPayments.reduce((oldest, current) => 
                new Date(current.due_date) < new Date(oldest.due_date) ? current : oldest
              );
              is_late = true;
              days_late = Math.max(0, Math.floor((new Date().getTime() - new Date(oldestUnpaid.due_date).getTime()) / (1000 * 3600 * 24)));
            } else if (current_tenant && monthly_rent > 0) {
              // If no payment records but has tenant, assume current month's rent is due
              filtered_balance = monthly_rent;
            }
          }

          // Determine lease status - be more inclusive to catch all cases
          let lease_status = 'Vacant';
          const now = new Date();
          
          // Check if unit is occupied
          const isOccupied = unit.status === 'occupied' || current_tenant || tenant_names !== 'Vacant';
          
          if (isOccupied) {
            const leaseEndDate = unit.lease_end_date || property.lease_end_date;
            if (leaseEndDate) {
              const endDate = new Date(leaseEndDate);
              const daysUntilExpiry = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
              
              if (daysUntilExpiry < 0) {
                lease_status = 'Expired';
              } else if (daysUntilExpiry <= 30) {
                lease_status = 'Expiring Soon';
              } else {
                lease_status = 'Current';
              }
            } else {
              // No lease end date but has tenant - assume current
              lease_status = 'Current';
            }
          }

          console.log(`Unit ${unit.unit_number} - Property: ${property.address}, Tenant: ${tenant_names}, Status: ${lease_status}, Balance: ${filtered_balance}, Monthly Rent: ${monthly_rent}`);

          // Use unit-specific deposits/prepayments if available, otherwise use property values
          const deposits_held = unit.security_deposit || property.security_deposit_held || 0;
          const prepayments_balance = unit.prepayments_balance || property.prepayments_balance || 0;
          const total_amount = filtered_balance + deposits_held + prepayments_balance;

          return {
            id: unit.id,
            unit_number: unit.unit_number || '1',
            property_id: unit.property_id,
            property_address: property.address,
            tenant_names,
            lease_start_date: unit.lease_start_date || property.lease_start_date,
            lease_end_date: unit.lease_end_date || property.lease_end_date,
            bedrooms: unit.bedrooms || property.bedrooms,
            bathrooms: unit.bathrooms || property.bathrooms,
            rent_cycle: unit.rent_cycle || property.rent_cycle || 'monthly',
            monthly_rent,
            recurring_charges_total,
            recurring_credits_total,
            deposits_held,
            prepayments_balance,
            balance_due: filtered_balance,
            total_amount,
            lease_status,
            days_late,
            is_late
          } as RentRollUnit & { days_late: number; is_late: boolean };
        })
      );

      console.log(`RentRoll: Processed ${unitsWithDetails.length} units total`);

      // Apply lease status filter - empty array means all statuses
      let filteredUnits = unitsWithDetails;
      if (filters.leaseStatus && filters.leaseStatus.length > 0) {
        console.log('🔍 [useRentRollData] Applying lease status filter:', filters.leaseStatus);
        filteredUnits = unitsWithDetails.filter(unit => 
          filters.leaseStatus?.includes(unit.lease_status) ||
          (filters.leaseStatus?.includes('Vacant') && unit.tenant_names === 'Vacant') ||
          (filters.leaseStatus?.includes('Current') && (unit.lease_status === 'Current' || unit.lease_status === 'Expiring Soon'))
        );
        console.log(`🔍 [useRentRollData] After lease status filter (${filters.leaseStatus.join(', ')}): ${filteredUnits.length} units`);
      } else {
        console.log('🔍 [useRentRollData] No lease status filter applied - showing all lease statuses');
      }

      // Apply balance filter - empty array means all balances
      if (filters.balanceFilter && filters.balanceFilter.length > 0) {
        console.log('🔍 [useRentRollData] Applying balance filter:', filters.balanceFilter);
        filteredUnits = filteredUnits.filter(unit => {
          return filters.balanceFilter!.some(filterType => {
            switch (filterType) {
              case 'outstanding':
                return unit.balance_due > 0;
              case 'zero':
                return unit.balance_due === 0;
              case 'credit':
                return unit.balance_due < 0;
              default:
                return true;
            }
          });
        });
        console.log(`🔍 [useRentRollData] After balance filter (${filters.balanceFilter.join(', ')}): ${filteredUnits.length} units`);
      } else {
        console.log('🔍 [useRentRollData] No balance filter applied - showing all balance types');
      }

      console.log(`RentRoll: Final filtered units: ${filteredUnits.length}`);

      // Calculate summary with accurate unit-based data
      const total_occupied = filteredUnits.filter(u => u.tenant_names !== 'Vacant').length;
      const total_units = filteredUnits.length;
      
      // Calculate bed/bath summary
      const bedBathMap = new Map<string, BedBathSummary>();
      filteredUnits.forEach(unit => {
        const key = `${unit.bedrooms || 0}/${unit.bathrooms || 0}`;
        const existing = bedBathMap.get(key) || {
          bed_bath_config: key,
          total_units: 0,
          occupied_units: 0,
          vacant_units: 0,
          occupancy_rate: 0,
          market_rent: 0,
          actual_rent: 0,
          avg_rent_per_unit: 0
        };
        
        existing.total_units++;
        existing.market_rent += unit.monthly_rent || 0;
        
        if (unit.tenant_names !== 'Vacant') {
          existing.occupied_units++;
          existing.actual_rent += unit.monthly_rent || 0;
        } else {
          existing.vacant_units++;
        }
        
        existing.occupancy_rate = existing.total_units > 0 ? (existing.occupied_units / existing.total_units) * 100 : 0;
        existing.avg_rent_per_unit = existing.total_units > 0 ? existing.market_rent / existing.total_units : 0;
        
        bedBathMap.set(key, existing);
      });
      
      // Calculate property summary
      const propertyMap = new Map<string, PropertySummary>();
      filteredUnits.forEach(unit => {
        const key = unit.property_address;
        const existing = propertyMap.get(key) || {
          property_address: key,
          total_units: 0,
          occupied_units: 0,
          vacant_units: 0,
          occupancy_rate: 0,
          market_rent: 0,
          actual_rent: 0,
          avg_rent_per_unit: 0
        };
        
        existing.total_units++;
        existing.market_rent += unit.monthly_rent || 0;
        
        if (unit.tenant_names !== 'Vacant') {
          existing.occupied_units++;
          existing.actual_rent += unit.monthly_rent || 0;
        } else {
          existing.vacant_units++;
        }
        
        existing.occupancy_rate = existing.total_units > 0 ? (existing.occupied_units / existing.total_units) * 100 : 0;
        existing.avg_rent_per_unit = existing.total_units > 0 ? existing.market_rent / existing.total_units : 0;
        
        propertyMap.set(key, existing);
      });

      const summary: RentRollSummary = {
        total_market_rent: filteredUnits.reduce((sum, unit) => sum + (unit.monthly_rent || 0), 0),
        total_actual_rent: filteredUnits
          .filter(u => u.tenant_names !== 'Vacant')
          .reduce((sum, unit) => sum + (unit.monthly_rent || 0), 0),
        total_recurring_charges: filteredUnits.reduce((sum, unit) => sum + unit.recurring_charges_total, 0),
        total_recurring_credits: filteredUnits.reduce((sum, unit) => sum + unit.recurring_credits_total, 0),
        total_deposits: filteredUnits.reduce((sum, unit) => sum + unit.deposits_held, 0),
        total_prepayments: filteredUnits.reduce((sum, unit) => sum + unit.prepayments_balance, 0),
        total_balance_due: filteredUnits.reduce((sum, unit) => sum + unit.balance_due, 0),
        occupied_units: total_occupied,
        total_units,
        occupancy_rate: total_units > 0 ? (total_occupied / total_units) * 100 : 0,
        bedBathSummary: Array.from(bedBathMap.values()),
        propertySummary: Array.from(propertyMap.values())
      };

      return {
        units: filteredUnits,
        summary
      };
    },
    enabled: (options?.enabled ?? true) && !!filters?.dateRange?.to && !!filters?.dateRange?.from
  });
};