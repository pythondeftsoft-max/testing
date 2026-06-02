import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';

export interface RentPaidDataItem {
  unit: string;
  unitId?: string;
  tenant: string;
  tenantId?: string;
  leaseStart: string | null;
  leaseEnd: string | null;
  recurringChargesRent: number;
  recurringChargesNonRent: number;
  recurringChargesTotal: number;
  amountPaidRent: number;
  amountPaidNonRent: number;
  amountPaidTotal: number;
  previousBalance: number;
  balanceDue: number;
  property: string;
  propertyId: string;
}

export interface RentPaidSummaryItem {
  property: string;
  propertyId: string;
  recurringChargesRent: number;
  recurringChargesNonRent: number;
  recurringChargesTotal: number;
  amountPaidRent: number;
  amountPaidNonRent: number;
  amountPaidTotal: number;
  previousBalance: number;
  balanceDue: number;
}

export interface RentPaidData {
  details: RentPaidDataItem[];
  summary: RentPaidSummaryItem[];
  totals: {
    recurringChargesRent: number;
    recurringChargesNonRent: number;
    recurringChargesTotal: number;
    amountPaidRent: number;
    amountPaidNonRent: number;
    amountPaidTotal: number;
    previousBalance: number;
    balanceDue: number;
  };
}

export const useRentPaidData = () => {
  const [data, setData] = useState<RentPaidData>({
    details: [],
    summary: [],
    totals: {
      recurringChargesRent: 0,
      recurringChargesNonRent: 0,
      recurringChargesTotal: 0,
      amountPaidRent: 0,
      amountPaidNonRent: 0,
      amountPaidTotal: 0,
      previousBalance: 0,
      balanceDue: 0,
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchRentPaidData = async (
    portfolioId?: string,
    selectedProperties?: string[],
    selectedUnits?: string[],
    startDate?: string,
    endDate?: string,
    debugMode = false
  ) => {
    console.log('🔍 [useRentPaidData] ========== STARTING COMPREHENSIVE DEBUG FETCH ==========');
    console.log('🔍 [useRentPaidData] Parameters received:', {
      portfolioId,
      selectedProperties,
      selectedUnits,
      startDate,
      endDate,
      debugMode
    });

    // ENHANCED: Validate input parameters
    if (!startDate || !endDate) {
      console.error('🔍 [useRentPaidData] ❌ CRITICAL: Missing required date parameters', { startDate, endDate });
      throw new Error('Start date and end date are required');
    }

    // ENHANCED: Check date range validity
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      console.error('🔍 [useRentPaidData] ❌ CRITICAL: Invalid date range - start date is after end date', { startDate, endDate });
      throw new Error('Invalid date range: start date must be before end date');
    }

    console.log('🔍 [useRentPaidData] ✅ Input validation passed');
    
    setIsLoading(true);
    try {
      // PHASE 1: Enhanced User Authentication Debugging
      console.log('🔍 [useRentPaidData] Step 1: Getting authenticated user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('🔍 [useRentPaidData] ❌ User auth error:', userError);
        throw userError;
      }
      if (!user) {
        console.error('🔍 [useRentPaidData] ❌ No authenticated user found');
        throw new Error('User not authenticated');
      }
      
      console.log('🔍 [useRentPaidData] ✅ Step 1 Complete - User authenticated:', user.id);
      
      // PHASE 2: Check User Properties First
      console.log('🔍 [useRentPaidData] Step 2: Checking user properties...');
      const { data: userProperties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, address, portfolio_id, owner_id, monthly_rent')
        .eq('owner_id', user.id);
      
      if (propertiesError) {
        console.error('🔍 [useRentPaidData] ❌ Properties query error:', propertiesError);
        throw propertiesError;
      }
      
      console.log('🔍 [useRentPaidData] ✅ Step 2 Complete - User properties found:', userProperties?.length || 0);
      console.log('🔍 [useRentPaidData] Properties details:', userProperties?.map(p => ({
        id: p.id,
        address: p.address,
        portfolio_id: p.portfolio_id,
        owner_id: p.owner_id
      })));
      
      if (!userProperties || userProperties.length === 0) {
        console.log('🔍 [useRentPaidData] ⚠️ User has no properties - returning empty data');
        setData({
          details: [],
          summary: [],
          totals: {
            recurringChargesRent: 0,
            recurringChargesNonRent: 0,
            recurringChargesTotal: 0,
            amountPaidRent: 0,
            amountPaidNonRent: 0,
            amountPaidTotal: 0,
            previousBalance: 0,
            balanceDue: 0,
          }
        });
        return;
      }
      
      // PHASE 3: Enhanced Data Availability Analysis
      console.log('🔍 [useRentPaidData] Step 3: COMPREHENSIVE DATA AVAILABILITY CHECK');
      const userPropertyIds = userProperties.map(p => p.id);
      console.log('🔍 [useRentPaidData] User property IDs:', userPropertyIds);
      
      // Check ALL rent payments for user's properties (no filters)
      const { data: allRawPayments, error: allRawPaymentsError } = await supabase
        .from('rent_payments')
        .select('id, property_id, tenant_id, amount, payment_date, status, payment_type')
        .in('property_id', userPropertyIds);
      
      if (allRawPaymentsError) {
        console.error('🔍 [useRentPaidData] ❌ All raw payments query error:', allRawPaymentsError);
      } else {
        console.log('🔍 [useRentPaidData] ✅ ALL user payments found:', allRawPayments?.length || 0);
        
        if (allRawPayments && allRawPayments.length > 0) {
          // Analyze payments by property
          const paymentsByProperty = allRawPayments.reduce((acc, p) => {
            if (!acc[p.property_id]) {
              acc[p.property_id] = { count: 0, dates: [], amounts: [] };
            }
            acc[p.property_id].count++;
            acc[p.property_id].dates.push(p.payment_date);
            acc[p.property_id].amounts.push(p.amount);
            return acc;
          }, {} as { [key: string]: { count: number, dates: string[], amounts: number[] } });

          console.log('🔍 [useRentPaidData] PAYMENT AVAILABILITY ANALYSIS:');
          Object.entries(paymentsByProperty).forEach(([propertyId, data]) => {
            const property = userProperties.find(p => p.id === propertyId);
            const earliestDate = Math.min(...data.dates.map(d => new Date(d).getTime()));
            const latestDate = Math.max(...data.dates.map(d => new Date(d).getTime()));
            
            console.log(`🔍   Property ${property?.address || propertyId}:`, {
              paymentCount: data.count,
              dateRange: `${new Date(earliestDate).toISOString().split('T')[0]} to ${new Date(latestDate).toISOString().split('T')[0]}`,
              totalAmount: data.amounts.reduce((sum, amt) => sum + amt, 0)
            });
          });

          // CRITICAL: Check payments in requested date range
          const paymentsInRange = allRawPayments.filter(p => {
            const paymentDate = new Date(p.payment_date);
            return paymentDate >= start && paymentDate <= end;
          });
          
          console.log('🔍 [useRentPaidData] PAYMENTS IN REQUESTED DATE RANGE:', {
            requestedRange: `${startDate} to ${endDate}`,
            totalPayments: allRawPayments.length,
            paymentsInRange: paymentsInRange.length,
            paymentsByPropertyInRange: paymentsInRange.reduce((acc, p) => {
              acc[p.property_id] = (acc[p.property_id] || 0) + 1;
              return acc;
            }, {} as { [key: string]: number })
          });

          // Check filter conflicts
          if (selectedProperties && selectedProperties.length > 0) {
            const filteredPayments = paymentsInRange.filter(p => selectedProperties.includes(p.property_id));
            console.log('🔍 [useRentPaidData] FILTER CONFLICT CHECK:', {
              selectedProperties,
              paymentsInRangeForSelectedProperties: filteredPayments.length,
              propertiesWithPaymentsInRange: Object.keys(paymentsInRange.reduce((acc, p) => {
                acc[p.property_id] = true;
                return acc;
              }, {} as { [key: string]: boolean })),
              filterConflict: filteredPayments.length === 0 && paymentsInRange.length > 0
            });
          }
        }
      }
      
      // PHASE 4: RLS Policy Debugging with JOIN Query
      console.log('🔍 [useRentPaidData] Step 4: Testing RLS with JOIN query approach...');
      // HYBRID APPROACH: Query rent_payments first, then LEFT JOIN with units/properties
      console.log('🔍 [useRentPaidData] Building payments query with hybrid approach...');
      
      let paymentsQuery = supabase
        .from('rent_payments')
        .select(`
          *,
          properties!inner (
            id,
            address,
            monthly_rent,
            owner_id,
            portfolio_id,
            lease_start_date,
            lease_end_date
          ),
          property_units (
            id,
            unit_number,
            unit_name,
            monthly_rent,
            status,
            tenant_id,
            lease_start_date,
            lease_end_date,
            profiles (
              id,
              first_name,
              last_name
            )
          )
        `);

      // CRITICAL: Add owner filter - users can only see their own data
      console.log('🔍 [useRentPaidData] Applying owner filter for user:', user.id);
      paymentsQuery = paymentsQuery.eq('properties.owner_id', user.id);

      // FIXED: Simplified query with direct tenant name JOIN
      console.log('🔍 [useRentPaidData] Step 4a: Building optimized query with direct tenant JOIN...');
      let joinQuery = supabase
        .from('rent_payments')
        .select(`
          id,
          property_id,
          tenant_id,
          amount,
          payment_date,
          payment_type,
          status,
          due_date,
          properties!inner (
            id,
            address,
            monthly_rent,
            owner_id,
            portfolio_id,
            lease_start_date,
            lease_end_date
          ),
          tenant_profiles:profiles!rent_payments_tenant_id_fkey (
            id,
            first_name,
            last_name
          ),
          property_units (
            id,
            unit_number,
            unit_name,
            monthly_rent,
            status,
            tenant_id,
            lease_start_date,
            lease_end_date
          )
        `);

      // CRITICAL: Add owner filter - users can only see their own data
      console.log('🔍 [useRentPaidData] Step 4b: Applying owner filter for user:', user.id);
      joinQuery = joinQuery.eq('properties.owner_id', user.id);

      // Apply date filters
      if (startDate && endDate) {
        console.log('🔍 [useRentPaidData] Step 4c: Applying date filter:', { startDate, endDate });
        joinQuery = joinQuery
          .gte('payment_date', startDate)
          .lte('payment_date', endDate);
      }

      // Apply portfolio filter to properties
      if (portfolioId && portfolioId !== 'everything') {
        console.log('🔍 [useRentPaidData] Step 4d: Applying portfolio filter:', portfolioId);
        joinQuery = joinQuery.eq('properties.portfolio_id', portfolioId);
      } else if (portfolioId === 'everything') {
        console.log('🔍 [useRentPaidData] Step 4d: Portfolio set to "everything" - no portfolio filter applied');
      }

      // Apply property filter directly to rent_payments
      if (selectedProperties && selectedProperties.length > 0) {
        console.log('🔍 [useRentPaidData] Step 4e: Applying property filter:', selectedProperties);
        joinQuery = joinQuery.in('property_id', selectedProperties);
      }

      // Apply unit filter if specified (only when unit data exists)
      if (selectedUnits && selectedUnits.length > 0) {
        console.log('🔍 [useRentPaidData] Step 4f: Applying unit filter:', selectedUnits);
        joinQuery = joinQuery.in('property_units.id', selectedUnits);
      }

      console.log('🔍 [useRentPaidData] Step 4g: Executing JOIN query...');
      const { data: joinPayments, error: paymentsError } = await joinQuery;

      let payments = joinPayments;

      if (paymentsError) {
        console.error('🔍 [useRentPaidData] ❌ JOIN query ERROR:', paymentsError);
        console.error('🔍 [useRentPaidData] Error details:', {
          message: paymentsError.message,
          code: paymentsError.code,
          details: paymentsError.details,
          hint: paymentsError.hint
        });
        
        // STRATEGY 2: Fallback to direct property ID approach
        console.log('🔍 [useRentPaidData] Step 5: Trying fallback strategy - direct property ID filtering...');
        
        let fallbackQuery = supabase
          .from('rent_payments')
          .select(`
            *,
            properties (
              id,
              address,
              monthly_rent,
              owner_id,
              portfolio_id,
              lease_start_date,
              lease_end_date
            ),
            property_units (
              id,
              unit_number,
              unit_name,
              monthly_rent,
              status,
              tenant_id,
              lease_start_date,
              lease_end_date,
              profiles (
                id,
                first_name,
                last_name
              )
            )
          `)
          .in('property_id', userPropertyIds);

        // Apply same filters to fallback query
        if (startDate && endDate) {
          fallbackQuery = fallbackQuery
            .gte('payment_date', startDate)
            .lte('payment_date', endDate);
        }

        if (selectedProperties && selectedProperties.length > 0) {
          fallbackQuery = fallbackQuery.in('property_id', selectedProperties);
        }

        const { data: fallbackPayments, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) {
          console.error('🔍 [useRentPaidData] ❌ Fallback query ALSO failed:', fallbackError);
          throw new Error(`Both JOIN and fallback queries failed. JOIN error: ${paymentsError.message}. Fallback error: ${fallbackError.message}`);
        }
        
        console.log('🔍 [useRentPaidData] ✅ Fallback query succeeded! Payments found:', fallbackPayments?.length || 0);
        payments = fallbackPayments as any; // Cast to handle different query structures
      } else {
        console.log('🔍 [useRentPaidData] ✅ Step 4g Complete - JOIN query succeeded! Payments found:', payments?.length || 0);
      }

      // Cast to any to handle different query structures
      const processedPayments: any[] = payments || [];

      console.log('🔍 [useRentPaidData] Payments query results:', {
        'payments.length': processedPayments?.length || 0,
        'first 3 payments': processedPayments?.slice(0, 3)?.map(p => ({
          id: p.id,
          property_id: p.property_id,
          tenant_id: p.tenant_id,
          amount: p.amount,
          payment_date: p.payment_date,
          property_address: p.properties?.address,
          tenant_name: p.tenant_profiles ? `${p.tenant_profiles.first_name} ${p.tenant_profiles.last_name}` : 'Unknown',
          unit_data: p.property_units ? 'available' : 'missing'
        }))
      });

      if (!processedPayments || processedPayments.length === 0) {
        console.log('🔍 [useRentPaidData] ⚠️  NO PAYMENTS FOUND - Setting empty data');
        setData({
          details: [],
          summary: [],
          totals: {
            recurringChargesRent: 0,
            recurringChargesNonRent: 0,
            recurringChargesTotal: 0,
            amountPaidRent: 0,
            amountPaidNonRent: 0,
            amountPaidTotal: 0,
            previousBalance: 0,
            balanceDue: 0,
          }
        });
        return;
      }

      // Extract property IDs and tenant IDs from payments for additional queries
      const propertyIds = [...new Set(processedPayments.map(p => p.property_id))];
      const tenantIds = [...new Set(processedPayments.map(p => p.tenant_id).filter(Boolean))];

      console.log('🔍 [useRentPaidData] Extracted IDs for additional queries:', {
        propertyIds: propertyIds.length,
        tenantIds: tenantIds.length
      });

      // ADDED: If tenant_profiles not available, fetch them separately for better names
      if (processedPayments.length > 0 && !processedPayments[0]?.tenant_profiles && tenantIds.length > 0) {
        console.log('🔍 [useRentPaidData] Fetching tenant profiles separately...');
        const { data: tenantProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', tenantIds);
        
        if (!profilesError && tenantProfiles) {
          // Add tenant profiles to payments
          processedPayments.forEach(payment => {
            const profile = tenantProfiles.find(p => p.id === payment.tenant_id);
            if (profile) {
              payment.tenant_profiles = profile;
            }
          });
          console.log('🔍 [useRentPaidData] ✅ Added', tenantProfiles.length, 'tenant profiles to payments');
        }
      }

      // Fetch recurring charges
      let chargesQuery = supabase
        .from('recurring_charges')
        .select('*')
        .in('property_id', propertyIds)
        .eq('is_active', true);

      const { data: charges, error: chargesError } = await chargesQuery;
      if (chargesError) throw chargesError;

      // Fetch tenant balances
      let balancesQuery = supabase
        .from('tenant_balances')
        .select('*')
        .in('property_id', propertyIds);

      if (startDate) {
        balancesQuery = balancesQuery.lte('as_of_date', startDate);
      }

      const { data: balances, error: balancesError } = await balancesQuery;
      if (balancesError) throw balancesError;

      // Debug logging
      console.log('🔍 [useRentPaidData] Data fetching complete:', {
        'payments_fetched': processedPayments?.length || 0,
        'charges_fetched': charges?.length || 0,
        'balances_fetched': balances?.length || 0,
        'date_range': { startDate, endDate }
      });
      
      // Debug sample data
      if (processedPayments?.length > 0) {
        console.log('🔍 [useRentPaidData] Sample payment data:', processedPayments[0]);
      }
      if (charges?.length > 0) {
        console.log('🔍 [useRentPaidData] Sample charge data:', charges[0]);
      }

      // FIXED: Process data with duplicate detection and accurate tenant info
      const details: RentPaidDataItem[] = [];
      const summaryMap: { [key: string]: RentPaidSummaryItem } = {};
      const processedCombinations = new Set<string>();
      
      // STEP 1: Remove duplicate payments
      const uniquePayments = removeDuplicatePayments(processedPayments);
      console.log('🔍 [useRentPaidData] Duplicate detection:', {
        originalPayments: processedPayments.length,
        uniquePayments: uniquePayments.length,
        duplicatesRemoved: processedPayments.length - uniquePayments.length
      });

      for (const payment of uniquePayments) {
        const property = payment.properties;
        if (!property) continue;

        // FIXED: Get tenant info from direct JOIN or fallback to fetching separately
        let tenant = payment.tenant_profiles;
        let tenantName = 'Unknown Tenant';
        
        // If tenant_profiles not available (fallback query), fetch tenant info separately
        if (!tenant && payment.tenant_id) {
          // For now, use tenant ID as fallback - we'll enhance this if needed
          tenantName = `Tenant ID: ${payment.tenant_id}`;
        } else if (tenant) {
          tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Unknown Tenant';
        }
        
        // Create unique identifier for property-tenant combination
        const combinationKey = `${payment.property_id}-${payment.tenant_id || 'no-tenant'}`;
        
        // Skip if we already processed this combination
        if (processedCombinations.has(combinationKey)) {
          continue;
        }
        processedCombinations.add(combinationKey);
        
        // Get unit info if available
        const unit = payment.property_units?.find(u => u.tenant_id === payment.tenant_id) || payment.property_units?.[0];
        const unitDisplay = unit?.unit_number || unit?.unit_name || 'Main Unit';
        const unitId = unit?.id;
        const tenantId = payment.tenant_id;

        // Calculate recurring charges
        const rentCharge = unit?.monthly_rent || property.monthly_rent || 0;
        const nonRentCharges = charges
          ?.filter(c => c.property_id === payment.property_id && c.tenant_id === payment.tenant_id && c.charge_type !== 'rent')
          ?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;

        // FIXED: Calculate payments using unique payments only
        const relevantPayments = uniquePayments.filter(p => 
          p.property_id === payment.property_id && 
          p.tenant_id === payment.tenant_id
        );
        
        const rentPayments = relevantPayments
          .filter(p => p.payment_type === 'rent')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const nonRentPayments = relevantPayments
          .filter(p => p.payment_type !== 'rent')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        // Get previous balance
        const balance = balances?.find(b => 
          b.property_id === payment.property_id && b.tenant_id === payment.tenant_id
        );
        const previousBalance = balance?.previous_balance || 0;

        // Calculate balance due
        const totalCharges = rentCharge + nonRentCharges;
        const totalPayments = rentPayments + nonRentPayments;
        const balanceDue = previousBalance + totalCharges - totalPayments;

        const detailItem: RentPaidDataItem = {
          unit: `${property.address} - Unit ${unitDisplay}`,
          unitId: unitId,
          tenant: tenantName,
          tenantId: tenantId,
          leaseStart: unit?.lease_start_date || property.lease_start_date || null,
          leaseEnd: unit?.lease_end_date || property.lease_end_date || null,
          recurringChargesRent: rentCharge,
          recurringChargesNonRent: nonRentCharges,
          recurringChargesTotal: totalCharges,
          amountPaidRent: rentPayments,
          amountPaidNonRent: nonRentPayments,
          amountPaidTotal: totalPayments,
          previousBalance: Number(previousBalance),
          balanceDue: balanceDue,
          property: property.address,
          propertyId: payment.property_id
        };

        details.push(detailItem);

        // Add to summary
        if (!summaryMap[payment.property_id]) {
          summaryMap[payment.property_id] = {
            property: property.address,
            propertyId: payment.property_id,
            recurringChargesRent: 0,
            recurringChargesNonRent: 0,
            recurringChargesTotal: 0,
            amountPaidRent: 0,
            amountPaidNonRent: 0,
            amountPaidTotal: 0,
            previousBalance: 0,
            balanceDue: 0,
          };
        }

        const summary = summaryMap[payment.property_id];
        summary.recurringChargesRent += rentCharge;
        summary.recurringChargesNonRent += nonRentCharges;
        summary.recurringChargesTotal += totalCharges;
        summary.amountPaidRent += rentPayments;
        summary.amountPaidNonRent += nonRentPayments;
        summary.amountPaidTotal += totalPayments;
        summary.previousBalance += Number(previousBalance);
        summary.balanceDue += balanceDue;
      }

      // Calculate totals
      const totals = details.reduce((acc, item) => ({
        recurringChargesRent: acc.recurringChargesRent + item.recurringChargesRent,
        recurringChargesNonRent: acc.recurringChargesNonRent + item.recurringChargesNonRent,
        recurringChargesTotal: acc.recurringChargesTotal + item.recurringChargesTotal,
        amountPaidRent: acc.amountPaidRent + item.amountPaidRent,
        amountPaidNonRent: acc.amountPaidNonRent + item.amountPaidNonRent,
        amountPaidTotal: acc.amountPaidTotal + item.amountPaidTotal,
        previousBalance: acc.previousBalance + item.previousBalance,
        balanceDue: acc.balanceDue + item.balanceDue,
      }), {
        recurringChargesRent: 0,
        recurringChargesNonRent: 0,
        recurringChargesTotal: 0,
        amountPaidRent: 0,
        amountPaidNonRent: 0,
        amountPaidTotal: 0,
        previousBalance: 0,
        balanceDue: 0,
      });

      console.log('🔍 [useRentPaidData] Final processed data:', {
        'details_count': details.length,
        'summary_count': Object.values(summaryMap).length,
        'totals': totals,
        'sample_detail': details[0]
      });

      setData({
        details: details.sort((a, b) => a.unit.localeCompare(b.unit)),
        summary: Object.values(summaryMap).sort((a, b) => a.property.localeCompare(b.property)),
        totals
      });
      
      console.log('🔍 [useRentPaidData] ✅ SUCCESS - Data set in state');

    } catch (error) {
      console.log('🔍 [useRentPaidData] ❌ ERROR occurred:', error);
      console.error('Error fetching rent paid data:', error);
      setData({
        details: [],
        summary: [],
        totals: {
          recurringChargesRent: 0,
          recurringChargesNonRent: 0,
          recurringChargesTotal: 0,
          amountPaidRent: 0,
          amountPaidNonRent: 0,
          amountPaidTotal: 0,
          previousBalance: 0,
          balanceDue: 0,
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    fetchRentPaidData,
  };
};

// ADDED: Duplicate payment detection helper
const removeDuplicatePayments = (payments: any[]) => {
  const uniquePayments: any[] = [];
  const paymentKeys = new Set<string>();
  
  for (const payment of payments) {
    // Create a unique key based on critical payment attributes
    const key = `${payment.property_id}-${payment.tenant_id}-${payment.amount}-${payment.payment_date}-${payment.payment_type || 'rent'}`;
    
    // Check for potential duplicates (same key or very similar)
    const isDuplicate = paymentKeys.has(key) || 
      uniquePayments.some(existing => 
        existing.property_id === payment.property_id &&
        existing.tenant_id === payment.tenant_id &&
        Math.abs(existing.amount - payment.amount) < 0.01 && // Same amount within 1 cent
        Math.abs(new Date(existing.payment_date).getTime() - new Date(payment.payment_date).getTime()) < 24 * 60 * 60 * 1000 && // Same day
        (existing.payment_type || 'rent') === (payment.payment_type || 'rent')
      );
    
    if (!isDuplicate) {
      uniquePayments.push(payment);
      paymentKeys.add(key);
    } else {
      console.log('🔍 [useRentPaidData] Duplicate payment detected and removed:', {
        id: payment.id,
        property_id: payment.property_id,
        tenant_id: payment.tenant_id,
        amount: payment.amount,
        payment_date: payment.payment_date
      });
    }
  }
  
  return uniquePayments;
};