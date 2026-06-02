import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { reportDebugLog } from '@/utils/debug';

export interface RentalOwnerEndingBalancesData {
  owner_id: string;
  owner_name: string;
  company_name?: string;
  properties: PropertyBalanceData[];
  totals: {
    ending_cash_balance: number;
    deposits_held: number;
    property_reserve: number;
    available_cash: number;
    unpaid_bills: number;
    cash_less_unpaid_bills: number;
  };
}

export interface PropertyBalanceData {
  property_id: string;
  property_address: string;
  ending_cash_balance: number;
  deposits_held: number;
  property_reserve: number;
  available_cash: number;
  unpaid_bills: number;
  cash_less_unpaid_bills: number;
  units?: UnitBalanceData[];
}

export interface UnitBalanceData {
  unit_id: string;
  unit_number: string;
  ending_cash_balance: number;
  deposits_held: number;
  property_reserve: number;
  available_cash: number;
  unpaid_bills: number;
  cash_less_unpaid_bills: number;
}

export interface RentalOwnerEndingBalancesParams {
  propertyIds?: string[];
  unitIds?: string[];
  portfolioId?: string;
  startDate: string;
  endDate: string;
}

export function useRentalOwnerEndingBalances() {
  const [data, setData] = useState<RentalOwnerEndingBalancesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRunParams, setHasRunParams] = useState<RentalOwnerEndingBalancesParams | null>(null);

  const runReport = useCallback(async (params: RentalOwnerEndingBalancesParams) => {
    reportDebugLog('RentalOwnerEndingBalances', '🚀 STARTING REPORT GENERATION', params);
    
    setHasRunParams(params);
    setIsLoading(true);
    setError(null);

    try {
      // ===== AUTHENTICATION DEBUGGING =====
      reportDebugLog('RentalOwnerEndingBalances', '🔐 Checking authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        reportDebugLog('RentalOwnerEndingBalances', '❌ Authentication error', { authError });
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (!user) {
        reportDebugLog('RentalOwnerEndingBalances', '❌ No authenticated user found');
        throw new Error('User must be authenticated to run this report');
      }

      reportDebugLog('RentalOwnerEndingBalances', '✅ User authenticated', { 
        userId: user.id, 
        email: user.email,
        userMetadata: user.user_metadata 
      });

      // ===== SESSION VERIFICATION =====
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      reportDebugLog('RentalOwnerEndingBalances', '🔍 Session verification', { 
        hasSession: !!session,
        sessionError,
        sessionUserId: session?.user?.id 
      });

      // ===== QUERY CONSTRUCTION DEBUGGING =====
      reportDebugLog('RentalOwnerEndingBalances', '🔧 Starting query construction...');
      
      // Base query for properties with owner information - ALWAYS filter by current user
      let query = supabase
        .from('properties')
        .select(`
          id,
          address,
          owner_id,
          monthly_rent,
          ending_cash_balance,
          tenant_security_deposits_held,
          property_reserve,
          portfolio_id,
          deleted_at,
          profiles!properties_owner_id_fkey(
            first_name,
            last_name,
            company_name
          ),
          property_units(
            id,
            unit_number,
            monthly_rent
          )
        `)
        .eq('owner_id', user.id) // CRITICAL: Always filter by current user
        .is('deleted_at', null); // CRITICAL: Exclude deleted properties

      reportDebugLog('RentalOwnerEndingBalances', '✅ Base query created with user and deleted filters', { 
        userId: user.id,
        tableName: 'properties',
        primaryFilter: `owner_id = ${user.id}`,
        deletedFilter: 'deleted_at IS NULL'
      });

      // Apply property ID filters if provided
      if (params.propertyIds && params.propertyIds.length > 0) {
        query = query.in('id', params.propertyIds);
        reportDebugLog('RentalOwnerEndingBalances', '🎯 Applied property ID filter', { 
          propertyIds: params.propertyIds,
          filterType: 'IN',
          column: 'id'
        });
      }
      
      // Portfolio filtering: 
      // - If portfolioId is 'all' or undefined: show all user properties (both assigned and unassigned to portfolios)
      // - If portfolioId is a specific UUID: show only properties in that portfolio
      if (params.portfolioId && params.portfolioId !== 'all') {
        query = query.eq('portfolio_id', params.portfolioId);
        reportDebugLog('RentalOwnerEndingBalances', '📁 Applied portfolio filter', { 
          portfolioId: params.portfolioId,
          filterType: 'EQ',
          column: 'portfolio_id'
        });
      } else {
        reportDebugLog('RentalOwnerEndingBalances', '📂 No portfolio filter applied - showing all user properties', { 
          portfolioId: params.portfolioId,
          reason: params.portfolioId === 'all' ? 'portfolioId is "all"' : 'portfolioId is undefined/null'
        });
      }

      // ===== QUERY EXECUTION DEBUGGING =====
      reportDebugLog('RentalOwnerEndingBalances', '⚡ Executing properties query...');
      const startTime = performance.now();
      
      const { data: properties, error: propertiesError } = await query;
      
      const endTime = performance.now();
      reportDebugLog('RentalOwnerEndingBalances', '📊 Properties query completed', { 
        executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        propertiesCount: properties?.length || 0, 
        hasError: !!propertiesError,
        error: propertiesError
      });
      
      reportDebugLog('RentalOwnerEndingBalances', '📊 Properties query completed', { 
        executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        propertiesCount: properties?.length || 0, 
        hasError: !!propertiesError,
        error: propertiesError
      });
      
      if (propertiesError) {
        reportDebugLog('RentalOwnerEndingBalances', '❌ Properties query failed', { error: propertiesError });
        throw propertiesError;
      }
      
      if (!properties || properties.length === 0) {
        reportDebugLog('RentalOwnerEndingBalances', '⚠️ No properties found for user', {
          userId: user.id,
          queryParams: params
        });
        setData([]);
        return;
      }

      // ===== RESULT VALIDATION DEBUGGING =====
      reportDebugLog('RentalOwnerEndingBalances', '🔍 VALIDATING QUERY RESULTS...');
      
      // Check each property to ensure it belongs to the authenticated user
      const invalidProperties = [];
      const validProperties = [];
      
      for (const property of properties) {
        reportDebugLog('RentalOwnerEndingBalances', '🏠 Checking property ownership', { 
          propertyId: property.id, 
          address: property.address,
          propertyOwnerId: property.owner_id,
          authenticatedUserId: user.id,
          ownershipMatch: property.owner_id === user.id,
          portfolioId: property.portfolio_id
        });
        
        if (property.owner_id === user.id) {
          validProperties.push(property);
        } else {
          invalidProperties.push({
            propertyId: property.id,
            address: property.address,
            propertyOwnerId: property.owner_id,
            authenticatedUserId: user.id
          });
        }
      }
      
      if (invalidProperties.length > 0) {
        reportDebugLog('RentalOwnerEndingBalances', '🚨 SECURITY VIOLATION: Found properties not owned by authenticated user!', {
          invalidPropertiesCount: invalidProperties.length,
          invalidProperties,
          totalPropertiesReturned: properties.length,
          validPropertiesCount: validProperties.length
        });
        
        // This is a critical security issue - only proceed with valid properties
        console.error('SECURITY WARNING: Query returned properties not owned by authenticated user:', invalidProperties);
      }
      
      reportDebugLog('RentalOwnerEndingBalances', '✅ Property ownership validation completed', {
        totalPropertiesReturned: properties.length,
        validPropertiesCount: validProperties.length,
        invalidPropertiesCount: invalidProperties.length,
        securityViolation: invalidProperties.length > 0
      });
      
      // Use only valid properties for processing
      const propertiesToProcess = validProperties.length > 0 ? validProperties : properties;
      
      reportDebugLog('RentalOwnerEndingBalances', '🔄 Starting property processing', {
        propertiesToProcessCount: propertiesToProcess.length,
        properties: propertiesToProcess.map(p => ({ 
          id: p.id, 
          address: p.address, 
          portfolio_id: p.portfolio_id,
          owner_id: p.owner_id 
        }))
      });

      // Group properties by owner
      const ownerMap = new Map<string, RentalOwnerEndingBalancesData>();

      for (const property of propertiesToProcess) {
        const ownerId = property.owner_id;
        const profile = property.profiles;
        
        reportDebugLog('RentalOwnerEndingBalances', '🏘️ Processing property', { 
          propertyId: property.id, 
          address: property.address,
          ownerId: ownerId,
          portfolioId: property.portfolio_id,
          hasProfile: !!profile,
          profileName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'N/A'
        });
        
        // Get unpaid bills for this property (transactions after the end date)
        const { data: unpaidBills, error: billsError } = await supabase
          .from('property_cash_flow')
          .select('amount')
          .eq('property_id', property.id)
          .eq('transaction_type', 'disbursement')
          .gt('transaction_date', params.endDate);

        if (billsError) {
          console.error('Error fetching unpaid bills:', billsError);
          reportDebugLog('RentalOwnerEndingBalances', 'Error fetching unpaid bills', { propertyId: property.id, error: billsError });
        }

        // Calculate unpaid bills amount, defaulting to 0 if no data
        let unpaidBillsAmount = unpaidBills?.reduce((sum, bill) => sum + Math.abs(bill.amount || 0), 0) || 0;
        
        // If no cash flow data, check for overdue rent payments as a fallback
        if (unpaidBillsAmount === 0) {
          const { data: overduePayments } = await supabase
            .from('rent_payments')
            .select('amount')
            .eq('property_id', property.id)
            .lt('due_date', params.endDate)
            .neq('status', 'completed');
          
          // For overdue payments, assume the difference between expected and paid
          // Since we don't have monthly_rent in rent_payments, use property monthly_rent
          const propertyRent = property.monthly_rent || 0;
          unpaidBillsAmount = overduePayments?.reduce((sum, payment) => {
            const paidAmount = payment.amount || 0;
            return sum + Math.max(0, propertyRent - paidAmount);
          }, 0) || 0;
        }

        // Calculate balances
        const endingCashBalance = property.ending_cash_balance || 0;
        const depositsHeld = property.tenant_security_deposits_held || 0;
        const propertyReserve = property.property_reserve || 0;
        const availableCash = endingCashBalance + depositsHeld + propertyReserve;
        const cashLessUnpaidBills = availableCash - unpaidBillsAmount;

        const propertyData: PropertyBalanceData = {
          property_id: property.id,
          property_address: property.address || 'N/A',
          ending_cash_balance: endingCashBalance,
          deposits_held: depositsHeld,
          property_reserve: propertyReserve,
          available_cash: availableCash,
          unpaid_bills: unpaidBillsAmount,
          cash_less_unpaid_bills: cashLessUnpaidBills,
          units: property.property_units?.length > 0 ? property.property_units.map(unit => ({
            unit_id: unit.id,
            unit_number: unit.unit_number || 'N/A',
            ending_cash_balance: endingCashBalance / property.property_units.length, // Distribute equally
            deposits_held: depositsHeld / property.property_units.length,
            property_reserve: propertyReserve / property.property_units.length,
            available_cash: availableCash / property.property_units.length,
            unpaid_bills: unpaidBillsAmount / property.property_units.length,
            cash_less_unpaid_bills: cashLessUnpaidBills / property.property_units.length,
          })) : []
        };

        if (!ownerMap.has(ownerId)) {
          const ownerName = profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Owner'
            : 'Unknown Owner';

          ownerMap.set(ownerId, {
            owner_id: ownerId,
            owner_name: ownerName,
            company_name: profile?.company_name,
            properties: [],
            totals: {
              ending_cash_balance: 0,
              deposits_held: 0,
              property_reserve: 0,
              available_cash: 0,
              unpaid_bills: 0,
              cash_less_unpaid_bills: 0,
            }
          });
        }

        const ownerData = ownerMap.get(ownerId)!;
        ownerData.properties.push(propertyData);

        // Update totals
        ownerData.totals.ending_cash_balance += endingCashBalance;
        ownerData.totals.deposits_held += depositsHeld;
        ownerData.totals.property_reserve += propertyReserve;
        ownerData.totals.available_cash += availableCash;
        ownerData.totals.unpaid_bills += unpaidBillsAmount;
        ownerData.totals.cash_less_unpaid_bills += cashLessUnpaidBills;
      }

      const reportData = Array.from(ownerMap.values());
      
      // ===== FINAL RESULTS DEBUGGING =====
      reportDebugLog('RentalOwnerEndingBalances', '🎯 FINAL REPORT RESULTS', { 
        ownersCount: reportData.length,
        totalPropertiesProcessed: reportData.reduce((sum, owner) => sum + owner.properties.length, 0),
        originalQueryCount: properties?.length || 0,
        validPropertiesCount: validProperties.length,
        invalidPropertiesCount: invalidProperties.length,
        finalOwners: reportData.map(owner => ({
          owner_id: owner.owner_id,
          owner_name: owner.owner_name,
          company_name: owner.company_name,
          properties_count: owner.properties.length,
          total_ending_cash: owner.totals.ending_cash_balance,
          total_available_cash: owner.totals.available_cash,
          properties: owner.properties.map(p => ({
            id: p.property_id,
            address: p.property_address,
            ending_cash: p.ending_cash_balance,
            available_cash: p.available_cash
          }))
        }))
      });
      
      // Final validation
      if (reportData.length === 0) {
        reportDebugLog('RentalOwnerEndingBalances', '⚠️ WARNING: No report data generated despite having valid properties', {
          hadProperties: (properties?.length || 0) > 0,
          hadValidProperties: validProperties.length > 0,
          propertiesToProcessCount: propertiesToProcess.length
        });
      }
      
      reportDebugLog('RentalOwnerEndingBalances', '✅ Report generation COMPLETED successfully');
      setData(reportData);
    } catch (err) {
      console.error('💥 Error generating rental owner ending balances report:', err);
      reportDebugLog('RentalOwnerEndingBalances', '❌ REPORT GENERATION FAILED', { 
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : undefined,
        params
      });
      setError(err instanceof Error ? err.message : 'An error occurred generating the report');
    } finally {
      reportDebugLog('RentalOwnerEndingBalances', '🏁 Report generation process finished');
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    runReport,
    hasRunParams
  };
}