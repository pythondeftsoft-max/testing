import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateCSV, generatePDF } from '@/utils/portfolioExportUtils';

interface PortfolioProperty {
  id: string;
  address: string;
  unit_count: number;
  bedrooms: number | null;
  bathrooms: number | null;
  monthly_rent: number;
  status: string;
  occupancy_status?: string;
  lease_start_date: string | null;
  lease_end_date: string | null;
  city: string;
  state: string;
  zipcode: string;
  amenities: string[];
  owner_id: string;
  latitude?: number;
  longitude?: number;
  // Required fields to match LandlordPropertyDetailsModal expectations
  desired_rent: number;
  street_address: string;
  photos: string[];
  tenant_request_count: number;
  created_at: string;
  updated_at: string;
  description: string;
  insurance_cost: number;
  mortgage_cost: number;
  management_fee: number;
  repair_costs: number;
  // For sale fields
  for_sale_status?: string;
  marketing_price?: number;
  // Tenant fields for actions
  tenant_id?: string;
  default_tenant_type?: string;
  on_market?: boolean;
  property_units?: any[];
  // Portfolio fields
  portfolio_id?: string;
  portfolio_name?: string;
}

interface RentSplit {
  property_id: string;
  total_rent: number;
  pha_portion: number;
  tenant_portion: number;
}

interface ExportData {
  propertyId: string;
  propertyAddress: string;
  unitIdentifier: string;
  occupancy: string;
  occupancyStatus: string;
  bedrooms: number | null;
  bathrooms: number | null;
  totalRent: number;
  voucherPayment: number;
  tenantPayment: number;
  leaseStartDate: string;
  leaseEndDate: string;
  status: string;
  forSaleStatus: string;
  marketingPrice: number | null;
}

interface Summary {
  totalProperties: number;
  totalRent: number;
  totalVoucherPayments: number;
  totalTenantPayments: number;
  activeLeases: number;
}

export const usePortfolioExport = (userId: string, portfolioId?: string) => {
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [rentSplits, setRentSplits] = useState<RentSplit[]>([]);
  const [unitSummaries, setUnitSummaries] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Helper function to calculate property-level totals from units
  const calculatePropertyTotals = useCallback((property: PortfolioProperty) => {
    if (property.unit_count <= 1) {
      // Single unit property - only show rent if actually occupied
      
      // Check rent_splits first (accurate for Section 8 properties)
      const rentSplit = rentSplits.find(rs => rs.property_id === property.id);
      if (rentSplit && rentSplit.total_rent > 0 && property.occupancy_status === 'occupied') {
        return {
          totalRent: rentSplit.total_rent,
          voucherPayment: rentSplit.pha_portion || 0,
          tenantPayment: rentSplit.tenant_portion || 0,
        };
      }
      
      // Fall back to monthly_rent ONLY if property is occupied
      if (property.occupancy_status === 'occupied' && property.monthly_rent && property.monthly_rent > 0) {
        return {
          totalRent: property.monthly_rent,
          voucherPayment: 0,
          tenantPayment: property.monthly_rent,
        };
      }
      
      // Property is vacant - show $0
      return {
        totalRent: 0,
        voucherPayment: 0,
        tenantPayment: 0,
      };
    }
    
    // Multi-unit property - sum from OCCUPIED units only
    const units = property.property_units || [];
    const totalRent = units.reduce((sum: number, unit: any) => {
      if (unit.status === 'occupied') {
        return sum + (Number(unit.monthly_rent) || 0);
      }
      return sum;
    }, 0);
    const voucherPayment = units.reduce((sum: number, unit: any) => {
      if (unit.status === 'occupied') {
        return sum + (Number(unit.pha_portion) || 0);
      }
      return sum;
    }, 0);
    const tenantPayment = units.reduce((sum: number, unit: any) => {
      if (unit.status === 'occupied') {
        return sum + (Number(unit.tenant_portion) || 0);
      }
      return sum;
    }, 0);
    
    return { totalRent, voucherPayment, tenantPayment };
  }, [rentSplits]);

  // Memoized export data transformation
  const exportData = useMemo((): ExportData[] => {
    return properties.map(property => {
      // Calculate occupancy
      let occupancy = 'N/A';
      if (property.unit_count > 1) {
        const summary = unitSummaries[property.id];
        if (summary) {
          const occupancyRate = summary.total_units > 0 
            ? ((summary.occupied_units / summary.total_units) * 100).toFixed(0)
            : '0';
          occupancy = `${summary.occupied_units}/${summary.total_units} (${occupancyRate}%)`;
        }
      } else {
        // Single unit property - use occupancy_status field
        occupancy = property.occupancy_status === 'occupied' ? '1/1 (100%)' : '0/1 (0%)';
      }
      
      // Calculate totals from units for multi-unit properties
      const { totalRent, voucherPayment, tenantPayment } = calculatePropertyTotals(property);
      
      return {
        propertyId: property.id,
        propertyAddress: property.address,
        unitIdentifier: property.unit_count > 1 ? `${property.unit_count} units` : '1',
        occupancy,
        occupancyStatus: property.occupancy_status || 'vacant',
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        totalRent,
        voucherPayment,
        tenantPayment,
        leaseStartDate: property.lease_start_date || '',
        leaseEndDate: property.lease_end_date || '',
        status: property.status,
        forSaleStatus: property.for_sale_status === 'active' ? 'For Sale' : 'Not For Sale',
        marketingPrice: property.marketing_price,
      };
    });
  }, [properties, rentSplits, unitSummaries, calculatePropertyTotals]);

  // Calculate summary statistics
  const calculateSummary = useCallback((): Summary => {
    return {
      totalProperties: properties.length,
      totalRent: exportData.reduce((sum, row) => sum + row.totalRent, 0),
      totalVoucherPayments: exportData.reduce((sum, row) => sum + row.voucherPayment, 0),
      totalTenantPayments: exportData.reduce((sum, row) => sum + row.tenantPayment, 0),
      activeLeases: exportData.filter(row => row.leaseStartDate && row.leaseEndDate).length,
    };
  }, [properties, exportData]);

  // Fetch data from database
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('usePortfolioExport: Starting data fetch for userId:', userId, 'portfolioId:', portfolioId);

      // Build query with portfolio filter
      let query = supabase
        .from('properties')
        .select(`
          *,
          portfolio:portfolios(id, client_name),
          property_units(*),
          properties_for_sale!properties_for_sale_property_id_fkey(
            id,
            status,
            marketing_price
          )
        `)
        .eq('owner_id', userId)
        .is('deleted_at', null);

      // Apply portfolio filter if specified
      if (portfolioId && portfolioId !== 'everything') {
        console.log('usePortfolioExport: Applying portfolio filter:', portfolioId);
        query = query.eq('portfolio_id', portfolioId);
      } else {
        console.log('usePortfolioExport: No portfolio filter applied (showing everything)');
      }

      const { data: propertiesData, error: propertiesError } = await query.order('created_at', { ascending: false });

      console.log('usePortfolioExport: Properties query result:', { 
        count: propertiesData?.length,
        error: propertiesError 
      });

      if (propertiesError) {
        console.error('usePortfolioExport: Properties error:', propertiesError);
        throw propertiesError;
      }

      // Fetch additional data if properties exist
      if (propertiesData && propertiesData.length > 0) {
        const propertyIds = propertiesData.map(p => p.id);
        
        // Fetch rent splits
        console.log('usePortfolioExport: Fetching rent splits for properties:', propertyIds.length);
        const { data: rentSplitsData, error: rentSplitsError } = await supabase
          .from('rent_splits')
          .select('*')
          .in('property_id', propertyIds);

        if (rentSplitsError) {
          console.error('usePortfolioExport: Rent splits error:', rentSplitsError);
          throw rentSplitsError;
        }
        setRentSplits(rentSplitsData || []);
        
        // Fetch unit summaries for multi-unit properties
        const multiUnitProperties = propertiesData.filter(p => p.unit_count > 1);
        if (multiUnitProperties.length > 0) {
          const summaries: Record<string, any> = {};
          for (const property of multiUnitProperties) {
            try {
              const { data: summary } = await supabase
                .rpc('get_property_vacancy_summary', { property_id_param: property.id });
              if (summary && summary.length > 0) {
                summaries[property.id] = summary[0];
              }
            } catch (error) {
              console.error('Error fetching vacancy summary for property:', property.id, error);
            }
          }
          setUnitSummaries(summaries);
        }
      } else {
        console.log('usePortfolioExport: No properties found, resetting state');
        setRentSplits([]);
        setUnitSummaries({});
      }

      // Transform the data to match our interface with default values
      const transformedProperties = (propertiesData || []).map(property => {
        // Get the active for sale record
        const forSaleRecord = property.properties_for_sale?.find((sale: any) => sale.status === 'active');
        
        return {
          ...property,
          desired_rent: property.desired_rent || property.monthly_rent || 0,
          street_address: property.street_address || property.address || '',
          photos: property.photos || [],
          tenant_request_count: property.tenant_request_count || 0,
          created_at: property.created_at || new Date().toISOString(),
          updated_at: property.updated_at || new Date().toISOString(),
          description: property.description || '',
          insurance_cost: property.insurance_cost || 0,
          mortgage_cost: property.mortgage_cost || 0,
          management_fee: property.management_fee || 0,
          repair_costs: property.repair_costs || 0,
          zipcode: property.zipcode || '',
          city: property.city || '',
          state: property.state || '',
          amenities: property.amenities || [],
          for_sale_status: forSaleRecord?.status || 'not_for_sale',
          marketing_price: forSaleRecord?.marketing_price || null,
          property_units: property.property_units || [],
          portfolio_id: property.portfolio_id,
          portfolio_name: property.portfolio?.client_name || null,
        };
      });

      setProperties(transformedProperties);
      console.log('usePortfolioExport: Data fetch completed successfully');
    } catch (error) {
      console.error('usePortfolioExport: Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch portfolio data",
        variant: "destructive"
      });
      // Set empty arrays to prevent infinite loading
      setProperties([]);
      setRentSplits([]);
    } finally {
      setLoading(false);
    }
  }, [userId, portfolioId, toast]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, portfolioId, fetchData]);

  // Export as CSV
  const exportCSV = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure we have fresh data
      await fetchData();
      
      if (exportData.length === 0) {
        toast({
          title: "No Data",
          description: "No properties available to export",
          variant: "destructive"
        });
        return;
      }

      const summary = calculateSummary();
      const timestamp = new Date().toISOString();
      
      generateCSV(exportData, summary, timestamp);
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} properties to CSV`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export portfolio data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [exportData, calculateSummary, fetchData, toast]);

  // Export as PDF
  const exportPDF = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure we have fresh data
      await fetchData();
      
      if (exportData.length === 0) {
        toast({
          title: "No Data",
          description: "No properties available to export",
          variant: "destructive"
        });
        return;
      }

      const summary = calculateSummary();
      const timestamp = new Date().toISOString();
      
      await generatePDF(exportData, summary, timestamp);
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} properties to PDF`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export portfolio data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [exportData, calculateSummary, fetchData, toast]);

  return {
    properties,
    setProperties, // Expose setter for optimistic updates
    exportData,
    loading,
    exportCSV,
    exportPDF,
    refetch: fetchData,
    calculateSummary,
  };
};
