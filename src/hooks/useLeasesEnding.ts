import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';

export interface LeaseEndingInfo {
  id: string;
  propertyAddress: string;
  unit: string;
  tenantName: string;
  email?: string;
  phone?: string;
  rent: number;
  nonRent: number;
  credits: number;
  leaseStart: string | null;
  leaseEnd: string | null;
  leaseStatus: string;
  nextLease: string;
  whenLeaseEnds: string;
  daysUntilExpiry: number;
}

export interface LeasesEndingData {
  leases: LeaseEndingInfo[];
  totalCount: number;
  expiringWithin30Days: number;
  expiringWithin60Days: number;
  expiringWithin90Days: number;
}

export const useLeasesEnding = () => {
  const [data, setData] = useState<LeasesEndingData>({
    leases: [],
    totalCount: 0,
    expiringWithin30Days: 0,
    expiringWithin60Days: 0,
    expiringWithin90Days: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const fetchLeasesEnding = async (
    portfolioId?: string,
    selectedUnitIds?: string[],
    fromDate?: string,
    toDate?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      const startDate = fromDate || new Date().toISOString().split('T')[0];
      const endDate = toDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Enhanced debugging
      const debugData: any = {
        inputs: {
          portfolioId,
          selectedUnitIds,
          fromDate,
          toDate,
          calculatedStartDate: startDate,
          calculatedEndDate: endDate
        },
        responses: {
          allProperties: null,
          propertiesWithLeases: null,
          propertiesInDateRange: null,
          approvedApplications: null,
          mainQuery: null,
          mainQueryError: null
        },
        queries: {
          main: null
        },
        processing: {},
        finalResults: {}
      };

      debugLog('useLeasesEnding', '🚀 Starting fetchLeasesEnding', debugData.inputs);
      console.log('🚀 [LEASES DEBUG] Function called with params:', debugData.inputs);
      
      // First, let's check if we have any properties at all
      console.log('🔍 [LEASES DEBUG] Step 1: Checking all properties...');
      const { data: allProperties, error: allPropsError } = await supabase
        .from('properties')
        .select('id, address, lease_end_date, portfolio_id, status');

      if (allPropsError) {
        console.error('❌ [LEASES DEBUG] Error fetching all properties:', allPropsError);
      } else {
        console.log('📊 [LEASES DEBUG] Total properties in database:', allProperties?.length || 0);
        debugData.responses.allProperties = { count: allProperties?.length || 0, sample: allProperties?.slice(0, 3) };
      }

      // Check properties with lease end dates
      const propertiesWithLeases = allProperties?.filter(p => p.lease_end_date) || [];
      console.log('📊 [LEASES DEBUG] Properties with lease end dates:', propertiesWithLeases.length);
      debugData.responses.propertiesWithLeases = { 
        count: propertiesWithLeases.length, 
        sample: propertiesWithLeases.slice(0, 3).map(p => ({ 
          id: p.id, 
          address: p.address, 
          lease_end_date: p.lease_end_date 
        }))
      };

      // Check date range filtering
      const propertiesInDateRange = propertiesWithLeases.filter(p => 
        p.lease_end_date && 
        p.lease_end_date >= startDate && 
        p.lease_end_date <= endDate
      );
      console.log('📊 [LEASES DEBUG] Properties with leases in date range:', propertiesInDateRange.length);
      debugData.responses.propertiesInDateRange = { count: propertiesInDateRange.length };

      // Now let's check applications
      console.log('🔍 [LEASES DEBUG] Step 2: Checking applications...');
      const { data: allApplications, error: appsError } = await supabase
        .from('property_applications')
        .select('id, property_id, status, tenant_id')
        .eq('status', 'approved');

      if (appsError) {
        console.error('❌ [LEASES DEBUG] Error fetching applications:', appsError);
      } else {
        console.log('📊 [LEASES DEBUG] Total approved applications:', allApplications?.length || 0);
        debugData.responses.approvedApplications = { count: allApplications?.length || 0 };
      }

      // Get properties with their units and lease information
      console.log('🔍 [LEASES DEBUG] Step 3: Main query construction...');
      debugData.queries.main = {
        portfolioFilter: portfolioId && portfolioId !== 'everything' ? portfolioId : 'none',
        dateRange: { startDate, endDate },
        unitFilter: selectedUnitIds
      };

      let propertiesQuery = supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          lease_start_date,
          lease_end_date,
          portfolio_id,
          status,
          property_units (
            id,
            unit_number,
            monthly_rent,
            lease_start_date,
            lease_end_date,
            status
          ),
          property_applications (
            id,
            tenant_id,
            status,
            profiles (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          ),
          recurring_charges (
            id,
            charge_name,
            amount,
            charge_type,
            is_active
          )
        `);

      // Apply portfolio filter
      if (portfolioId && portfolioId !== 'everything') {
        console.log('🔍 [LEASES DEBUG] Applying portfolio filter:', portfolioId);
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      // Filter for properties with lease end dates in range
      console.log('🔍 [LEASES DEBUG] Applying filters - date range');
      propertiesQuery = propertiesQuery
        .gte('lease_end_date', startDate)
        .lte('lease_end_date', endDate)
        .not('lease_end_date', 'is', null);

      console.log('🔍 [LEASES DEBUG] Executing main query...');
      const { data: properties, error: propertiesError } = await propertiesQuery;

      if (propertiesError) {
        console.error('❌ [LEASES DEBUG] Error fetching main properties:', propertiesError);
        debugData.responses.mainQueryError = propertiesError;
        setDebugInfo(debugData);
        throw propertiesError;
      }

      console.log('✅ [LEASES DEBUG] Main query successful. Properties found:', properties?.length || 0);
      debugData.responses.mainQuery = { 
        count: properties?.length || 0, 
        sample: properties?.slice(0, 2).map(p => ({
          id: p.id,
          address: p.address,
          lease_end_date: p.lease_end_date,
          applications: p.property_applications?.length || 0,
          units: p.property_units?.length || 0
        }))
      };

      if (!properties || properties.length === 0) {
        console.log('⚠️ [LEASES DEBUG] No properties found with the applied filters');
        debugData.finalResults = { reason: 'No properties found after filtering' };
        setDebugInfo(debugData);
        setData({
          leases: [],
          totalCount: 0,
          expiringWithin30Days: 0,
          expiringWithin60Days: 0,
          expiringWithin90Days: 0
        });
        return;
      }

      // Process the data to create lease ending information
      console.log('🔍 [LEASES DEBUG] Step 4: Processing lease data...');
      const processedLeases: LeaseEndingInfo[] = [];
      const currentDate = new Date();
      let processedPropertyCount = 0;
      let processedUnitCount = 0;

      properties.forEach((property: any) => {
        processedPropertyCount++;
        console.log(`🔍 [LEASES DEBUG] Processing property ${processedPropertyCount}:`, property.address);
        
        // For properties with units, process each unit separately
        if (property.property_units && property.property_units.length > 0) {
          console.log(`  📦 Property has ${property.property_units.length} units`);
          property.property_units.forEach((unit: any) => {
            processedUnitCount++;
            console.log(`    🏠 Processing unit ${unit.unit_number}:`, {
              id: unit.id,
              lease_end_date: unit.lease_end_date,
              selectedForFilter: !selectedUnitIds || selectedUnitIds.length === 0 || selectedUnitIds.includes(unit.id)
            });
            
            // Skip unit if specific units are selected and this isn't one of them
            // Note: If selectedUnitIds is undefined, show all units (All Properties mode)
            if (selectedUnitIds && selectedUnitIds.length > 0 && !selectedUnitIds.includes(unit.id)) {
              console.log(`    ⏭️ Skipping unit ${unit.unit_number} - not in selected units`);
              return;
            }
            
            if (unit.lease_end_date) {
              const leaseEndDate = new Date(unit.lease_end_date);
              const daysUntilExpiry = Math.ceil((leaseEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
              
              console.log(`    📅 Unit ${unit.unit_number} lease analysis:`, {
                lease_end_date: unit.lease_end_date,
                daysUntilExpiry,
                inDateRange: new Date(unit.lease_end_date) >= new Date(startDate) && new Date(unit.lease_end_date) <= new Date(endDate)
              });
              
              if (daysUntilExpiry >= 0 && new Date(unit.lease_end_date) >= new Date(startDate) && new Date(unit.lease_end_date) <= new Date(endDate)) {
                const approvedApplication = property.property_applications?.find((app: any) => app.status === 'approved');
                const tenant = approvedApplication?.profiles;
                const nonRentCharges = property.recurring_charges
                  ?.filter((charge: any) => charge.is_active && charge.charge_type !== 'rent')
                  ?.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0) || 0;

                const credits = property.recurring_charges
                  ?.filter((charge: any) => charge.is_active && charge.charge_type === 'credit')
                  ?.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0) || 0;

                const leaseStatus = daysUntilExpiry <= 0 ? 'Expired' : 
                                 daysUntilExpiry <= 30 ? 'Expiring Soon' : 
                                 daysUntilExpiry <= 60 ? 'Expiring' : 'Active';

                const whenLeaseEnds = daysUntilExpiry <= 0 ? 'Already expired' :
                                    daysUntilExpiry <= 30 ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}` :
                                    daysUntilExpiry <= 90 ? `Expires in ${daysUntilExpiry} days` :
                                    'More than 90 days';

                const nextLease = 'Not determined'; // This would come from renewal tracking system

                const leaseInfo = {
                  id: `${property.id}-${unit.id}`,
                  propertyAddress: property.address || 'N/A',
                  unit: unit.unit_number || 'N/A',
                  tenantName: tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : 'No Tenant',
                  email: tenant?.email,
                  phone: tenant?.phone,
                  rent: unit.monthly_rent || 0,
                  nonRent: nonRentCharges,
                  credits: credits,
                  leaseStart: unit.lease_start_date,
                  leaseEnd: unit.lease_end_date,
                  leaseStatus,
                  nextLease,
                  whenLeaseEnds,
                  daysUntilExpiry
                };
                
                console.log(`    ✅ Adding unit ${unit.unit_number} to results:`, {
                  tenant: leaseInfo.tenantName,
                  rent: leaseInfo.rent,
                  daysUntilExpiry: leaseInfo.daysUntilExpiry
                });
                
                processedLeases.push(leaseInfo);
              } else {
                console.log(`    ❌ Unit ${unit.unit_number} excluded - outside date range or negative days`);
              }
            } else {
              console.log(`    ⚠️ Unit ${unit.unit_number} has no lease_end_date`);
            }
          });
        } else {
          // For properties without units
          console.log(`  🏢 Property has no units, processing as single property`);
          
          // Skip property if specific units are selected (since this property has no units)
          // Note: If selectedUnitIds is undefined, show all properties (All Properties mode)
          if (selectedUnitIds && selectedUnitIds.length > 0) {
            console.log(`  ⏭️ Skipping property - units selected but property has no units`);
            return;
          }
          
          if (property.lease_end_date) {
            const leaseEndDate = new Date(property.lease_end_date);
            const daysUntilExpiry = Math.ceil((leaseEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            
            console.log(`  📅 Property lease analysis:`, {
              lease_end_date: property.lease_end_date,
              daysUntilExpiry,
              inDateRange: new Date(property.lease_end_date) >= new Date(startDate) && new Date(property.lease_end_date) <= new Date(endDate)
            });
            
            if (daysUntilExpiry >= 0 && new Date(property.lease_end_date) >= new Date(startDate) && new Date(property.lease_end_date) <= new Date(endDate)) {
              const approvedApplication = property.property_applications?.find((app: any) => app.status === 'approved');
              const tenant = approvedApplication?.profiles;
              const nonRentCharges = property.recurring_charges
                ?.filter((charge: any) => charge.is_active && charge.charge_type !== 'rent')
                ?.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0) || 0;

              const credits = property.recurring_charges
                ?.filter((charge: any) => charge.is_active && charge.charge_type === 'credit')
                ?.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0) || 0;

              const leaseStatus = daysUntilExpiry <= 0 ? 'Expired' : 
                               daysUntilExpiry <= 30 ? 'Expiring Soon' : 
                               daysUntilExpiry <= 60 ? 'Expiring' : 'Active';

              const whenLeaseEnds = daysUntilExpiry <= 0 ? 'Already expired' :
                                  daysUntilExpiry <= 30 ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}` :
                                  daysUntilExpiry <= 90 ? `Expires in ${daysUntilExpiry} days` :
                                  'More than 90 days';

              const nextLease = 'Not determined'; // This would come from renewal tracking system

              const leaseInfo = {
                id: property.id,
                propertyAddress: property.address || 'N/A',
                unit: property.address?.split(',')[0] || 'Main',
                tenantName: tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : 'No Tenant',
                email: tenant?.email,
                phone: tenant?.phone,
                rent: property.monthly_rent || 0,
                nonRent: nonRentCharges,
                credits: credits,
                leaseStart: property.lease_start_date,
                leaseEnd: property.lease_end_date,
                leaseStatus,
                nextLease,
                whenLeaseEnds,
                daysUntilExpiry
              };
              
              console.log(`  ✅ Adding property to results:`, {
                tenant: leaseInfo.tenantName,
                rent: leaseInfo.rent,
                daysUntilExpiry: leaseInfo.daysUntilExpiry
              });
              
              processedLeases.push(leaseInfo);
            } else {
              console.log(`  ❌ Property excluded - outside date range or negative days`);
            }
          } else {
            console.log(`  ⚠️ Property has no lease_end_date`);
          }
        }
      });

      console.log('📊 [LEASES DEBUG] Processing complete:', {
        propertiesProcessed: processedPropertyCount,
        unitsProcessed: processedUnitCount,
        finalLeases: processedLeases.length
      });

      debugData.processing = {
        propertiesProcessed: processedPropertyCount,
        unitsProcessed: processedUnitCount,
        finalLeases: processedLeases.length
      };

      // Sort by days until expiry (ascending - closest to expiring first)
      processedLeases.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      // Calculate summary statistics
      const expiringWithin30Days = processedLeases.filter(lease => lease.daysUntilExpiry <= 30).length;
      const expiringWithin60Days = processedLeases.filter(lease => lease.daysUntilExpiry <= 60).length;
      const expiringWithin90Days = processedLeases.filter(lease => lease.daysUntilExpiry <= 90).length;

      debugData.finalResults = {
        totalLeases: processedLeases.length,
        expiringWithin30Days,
        expiringWithin60Days,
        expiringWithin90Days,
        sampleLeases: processedLeases.slice(0, 3).map(l => ({
          property: l.propertyAddress,
          unit: l.unit,
          tenant: l.tenantName,
          daysUntilExpiry: l.daysUntilExpiry
        }))
      };

      console.log('✅ [LEASES DEBUG] Final results:', debugData.finalResults);
      setDebugInfo(debugData);

      setData({
        leases: processedLeases,
        totalCount: processedLeases.length,
        expiringWithin30Days,
        expiringWithin60Days,
        expiringWithin90Days
      });

    } catch (err) {
      console.error('❌ [LEASES DEBUG] Error in fetchLeasesEnding:', err);
      debugLog('useLeasesEnding', 'Error occurred', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leases ending data');
      setDebugInfo({ error: err, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchLeasesEnding,
    debugInfo
  };
};