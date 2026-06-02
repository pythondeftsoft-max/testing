import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { reportDebugLog } from '@/utils/debug';

export interface DelinquentTenant {
  id: string;
  unit: string;
  tenantName: string;
  email?: string;
  phone?: string;
  lastPayment: string | null;
  totalBalance: number;
  daysLate: number;
  propertyAddress: string;
  agingBucket: string;
  breakdown: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days90Plus: number;
  };
}

export interface DelinquentTenantsData {
  tenants: DelinquentTenant[];
  totalCount: number;
  totalOutstanding: number;
  averageDelinquency: number;
  agingBreakdown: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days90Plus: number;
  };
}

export const useDelinquentTenants = () => {
  const [data, setData] = useState<DelinquentTenantsData>({
    tenants: [],
    totalCount: 0,
    totalOutstanding: 0,
    averageDelinquency: 0,
    agingBreakdown: {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days90Plus: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDelinquentTenants = async (
    portfolioId?: string,
    propertyIds?: string[],
    asOfDate?: string,
    tenantStatus?: string[]
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Debug: Log input parameters
      reportDebugLog('useDelinquentTenants', 'Starting fetchDelinquentTenants with parameters', {
        portfolioId,
        propertyIds: propertyIds?.length || 0,
        propertyIdsArray: propertyIds,
        asOfDate,
        tenantStatus,
        timestamp: new Date().toISOString()
      });

      const queryDate = asOfDate ? new Date(asOfDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      reportDebugLog('useDelinquentTenants', 'Query date processed', {
        inputDate: asOfDate,
        processedDate: queryDate
      });
      
      // First get all properties that match our filters
      let propertiesQuery = supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          portfolio_id,
          property_units (
            id,
            unit_number,
            monthly_rent
          )
        `);

      // Apply portfolio filter
      if (portfolioId && portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
        reportDebugLog('useDelinquentTenants', 'Applied portfolio filter', { portfolioId });
      } else {
        reportDebugLog('useDelinquentTenants', 'No portfolio filter applied', { portfolioId });
      }

      // Apply property filter
      if (propertyIds && propertyIds.length > 0) {
        propertiesQuery = propertiesQuery.in('id', propertyIds);
        reportDebugLog('useDelinquentTenants', 'Applied property filter', { 
          propertyCount: propertyIds.length,
          propertyIds: propertyIds.slice(0, 5) + (propertyIds.length > 5 ? '...' : '')
        });
      } else {
        reportDebugLog('useDelinquentTenants', 'No property filter applied - will fetch ALL properties', {
          propertyIds,
          propertyIdsLength: propertyIds?.length
        });
      }

      reportDebugLog('useDelinquentTenants', 'Executing properties query...');
      const { data: properties, error: propertiesError } = await propertiesQuery;
      
      reportDebugLog('useDelinquentTenants', 'Properties query result', {
        propertiesCount: properties?.length || 0,
        propertiesError: propertiesError?.message,
        sampleProperties: properties?.slice(0, 3).map(p => ({
          id: p.id,
          address: p.address,
          portfolio_id: p.portfolio_id,
          units_count: p.property_units?.length || 0
        }))
      });

      if (propertiesError) {
        reportDebugLog('useDelinquentTenants', 'ERROR: Properties query failed', propertiesError);
        console.error('Error fetching properties:', propertiesError);
        throw propertiesError;
      }

      if (!properties || properties.length === 0) {
        reportDebugLog('useDelinquentTenants', 'WARNING: No properties found - returning empty result', {
          properties,
          propertiesLength: properties?.length,
          filters: { portfolioId, propertyIds }
        });
        setData({
          tenants: [],
          totalCount: 0,
          totalOutstanding: 0,
          averageDelinquency: 0,
          agingBreakdown: {
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            days90Plus: 0
          }
        });
        return;
      }

      const propertyIdsFromQuery = properties.map(p => p.id);
      
      reportDebugLog('useDelinquentTenants', 'Property IDs for rent payments query', {
        propertyIdsCount: propertyIdsFromQuery.length,
        samplePropertyIds: propertyIdsFromQuery.slice(0, 5)
      });

      // Now get rent payments for these properties that are overdue
      reportDebugLog('useDelinquentTenants', 'Building rent payments query', {
        propertyIdsFromQuery: propertyIdsFromQuery.length,
        queryDate,
        filters: {
          due_date_lte: queryDate,
          status_neq: 'completed'
        }
      });

      const { data: rentPayments, error: rentError } = await supabase
        .from('rent_payments')
        .select(`
          id,
          property_id,
          tenant_id,
          amount,
          due_date,
          payment_date,
          late_fee_amount,
          days_late,
          status,
          profiles!rent_payments_tenant_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .in('property_id', propertyIdsFromQuery)
        .lte('due_date', queryDate)
        .neq('status', 'completed');
        
      reportDebugLog('useDelinquentTenants', 'Rent payments query result', {
        rentPaymentsCount: rentPayments?.length || 0,
        rentError: rentError?.message,
        samplePayments: rentPayments?.slice(0, 3).map(p => ({
          id: p.id,
          property_id: p.property_id,
          tenant_id: p.tenant_id,
          amount: p.amount,
          due_date: p.due_date,
          status: p.status,
          tenant_name: p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : 'N/A'
        }))
      });

      if (rentError) {
        reportDebugLog('useDelinquentTenants', 'ERROR: Rent payments query failed', rentError);
        console.error('Error fetching rent payments:', rentError);
        throw rentError;
      }

      // Process the data to calculate delinquency
      const processedTenants: DelinquentTenant[] = [];
      const propertiesMap = new Map(properties.map(p => [p.id, p]));

      reportDebugLog('useDelinquentTenants', 'Starting rent payments processing', {
        rentPaymentsCount: rentPayments?.length || 0,
        propertiesMapSize: propertiesMap.size,
        tenantStatusFilter: tenantStatus
      });

      if (rentPayments && rentPayments.length > 0) {
        let processedCount = 0;
        let skippedCount = 0;
        let filteredOutCount = 0;
        
        rentPayments.forEach((payment: any, index: number) => {
          const property = propertiesMap.get(payment.property_id);
          const tenant = payment.profiles;
          
          if (!property || !tenant) {
            skippedCount++;
            if (index < 3) {
              reportDebugLog('useDelinquentTenants', `Skipping payment ${index + 1} - missing property or tenant`, {
                payment_id: payment.id,
                property_found: !!property,
                tenant_found: !!tenant,
                property_id: payment.property_id
              });
            }
            return;
          }
          
          const dueDate = new Date(payment.due_date);
          const today = new Date(queryDate);
          const daysLate = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Only include if payment is actually overdue (status not completed and due date passed)
          if (payment.status === 'completed' || daysLate <= 0) {
            filteredOutCount++;
            if (index < 3) {
              reportDebugLog('useDelinquentTenants', `Filtering out payment ${index + 1} - not overdue`, {
                payment_id: payment.id,
                status: payment.status,
                daysLate,
                due_date: payment.due_date,
                queryDate
              });
            }
            return;
          }

          // Apply tenant status filter if provided
          if (tenantStatus && tenantStatus.length > 0) {
            // TODO: Implement proper tenant status mapping based on lease dates
            // For now, we'll assume all overdue payments are from 'active' tenants
            // This will be enhanced when lease data is available to determine actual tenant status
            reportDebugLog('useDelinquentTenants', `Tenant status filter applied`, {
              payment_id: payment.id,
              tenantStatus,
              note: 'Currently treating all overdue payments as active tenant payments'
            });
          }
          
          const outstandingAmount = (payment.amount || 0) + (payment.late_fee_amount || 0);
          
          // Calculate aging bucket based on days late
          let agingBucket = 'days30'; // Default for 1-30 days
          if (daysLate > 90) agingBucket = 'days90Plus';
          else if (daysLate > 60) agingBucket = 'days90';
          else if (daysLate > 30) agingBucket = 'days60';

          const delinquentTenant: DelinquentTenant = {
            id: payment.id,
            unit: property.property_units?.[0]?.unit_number || property.address?.split(',')[0] || 'N/A',
            tenantName: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Unknown',
            email: tenant.email,
            phone: tenant.phone,
            lastPayment: payment.payment_date,
            totalBalance: outstandingAmount,
            daysLate,
            propertyAddress: property.address || 'N/A',
            agingBucket,
            breakdown: {
              current: agingBucket === 'current' ? outstandingAmount : 0,
              days30: agingBucket === 'days30' ? outstandingAmount : 0,
              days60: agingBucket === 'days60' ? outstandingAmount : 0,
              days90: agingBucket === 'days90' ? outstandingAmount : 0,
              days90Plus: agingBucket === 'days90Plus' ? outstandingAmount : 0
            }
          };

          processedTenants.push(delinquentTenant);
          processedCount++;
          
          if (index < 3) {
            reportDebugLog('useDelinquentTenants', `Processed tenant ${index + 1}`, {
              tenant_name: delinquentTenant.tenantName,
              property: delinquentTenant.propertyAddress,
              totalBalance: delinquentTenant.totalBalance,
              daysLate: delinquentTenant.daysLate,
              agingBucket: delinquentTenant.agingBucket
            });
          }
        });
        
        reportDebugLog('useDelinquentTenants', 'Rent payments processing completed', {
          totalPayments: rentPayments.length,
          processedCount,
          skippedCount,
          filteredOutCount,
          finalTenantsCount: processedTenants.length
        });
      }

      // Sort by days late descending
      processedTenants.sort((a, b) => b.daysLate - a.daysLate);

      // Calculate summary statistics
      const totalOutstanding = processedTenants.reduce((sum, tenant) => sum + tenant.totalBalance, 0);
      const averageDelinquency = processedTenants.length > 0 ? totalOutstanding / processedTenants.length : 0;
      
      const agingBreakdown = processedTenants.reduce((acc, tenant) => ({
        current: acc.current + tenant.breakdown.current,
        days30: acc.days30 + tenant.breakdown.days30,
        days60: acc.days60 + tenant.breakdown.days60,
        days90: acc.days90 + tenant.breakdown.days90,
        days90Plus: acc.days90Plus + tenant.breakdown.days90Plus
      }), {
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        days90Plus: 0
      });

      const finalResult = {
        tenants: processedTenants,
        totalCount: processedTenants.length,
        totalOutstanding,
        averageDelinquency,
        agingBreakdown
      };

      reportDebugLog('useDelinquentTenants', 'Final result summary', {
        tenantsCount: finalResult.totalCount,
        totalOutstanding: finalResult.totalOutstanding,
        averageDelinquency: finalResult.averageDelinquency,
        agingBreakdown: finalResult.agingBreakdown,
        sampleTenants: processedTenants.slice(0, 3).map(t => ({
          name: t.tenantName,
          balance: t.totalBalance,
          daysLate: t.daysLate
        }))
      });

      setData(finalResult);

    } catch (err) {
      reportDebugLog('useDelinquentTenants', 'CRITICAL ERROR in fetchDelinquentTenants', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        parameters: { portfolioId, propertyIds, asOfDate, tenantStatus }
      });
      console.error('Error in fetchDelinquentTenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch delinquent tenants data');
    } finally {
      setLoading(false);
      reportDebugLog('useDelinquentTenants', 'fetchDelinquentTenants completed');
    }
  };

  return {
    data,
    loading,
    error,
    fetchDelinquentTenants
  };
};