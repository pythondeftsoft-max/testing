import { useMemo } from 'react';
import { PropertyFilters } from '@/components/admin/PropertiesDirectoryFilters';

interface Property {
  id: string;
  owner_id: string;
  portfolio_id?: string;
  status: string;
  property_type?: string;
  commercial_type?: string;
  commercial_subtype?: string;
  monthly_rent?: number;
  city?: string;
  state?: string;
  created_at: string;
  street_1?: string;
  street_2?: string;
  zipcode?: string;
  on_market?: boolean;
  tenant_id?: string;
  occupancy_status?: string;
  // ... other property fields
}

interface Portfolio {
  id: string;
  client_name: string;
  client_email?: string | null;
}

interface Owner {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
}

export function useEnhancedPropertyFilters(
  properties: Property[],
  portfolios: Portfolio[],
  owners: Owner[]
) {
  const processedOwners = useMemo(() => {
    return owners.map(owner => ({
      id: owner.id,
      name: owner.company_name || `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Unknown Owner'
    }));
  }, [owners]);

  const uniqueLocations = useMemo(() => {
    const locationSet = new Set<string>();
    properties.forEach(property => {
      if (property.city && property.state) {
        locationSet.add(`${property.city}, ${property.state}`);
      }
    });
    return Array.from(locationSet).map(location => {
      const [city, state] = location.split(', ');
      return { city, state };
    }).sort((a, b) => a.city.localeCompare(b.city));
  }, [properties]);

  // Function to calculate counts for any set of properties
  const calculateCountsForProperties = (propertiesSubset: Property[]) => {
    const counts = {
      all: propertiesSubset.length,
      // Status counts
      available: 0,
      occupied: 0,
      vacant: 0,
      for_sale: 0,
      under_contract: 0,
      maintenance: 0,
      // Property type counts
      residential: 0,
      commercial: 0,
      specialty: 0,
      single_family: 0,
      apartment: 0,
      townhouse: 0,
      duplex: 0,
      office: 0,
      retail: 0,
      warehouse: 0,
      restaurant: 0,
      hotel: 0,
      mixed_use: 0,
      marina: 0,
      golf_course: 0,
      prison: 0,
      self_storage: 0,
      medical: 0,
      mobile_home: 0,
      // Portfolio counts
      independent: 0,
      large_portfolios: 0,
      medium_portfolios: 0,
      small_portfolios: 0,
      portfolios: {} as { [key: string]: number },
      // Other counts
      owners: {} as { [key: string]: number },
      rentRanges: {} as { [key: string]: number },
      locations: {} as { [key: string]: number },
      // Market and tenant status counts
      on_market: 0,
      off_market: 0,
      with_tenant: 0,
      without_tenant: 0,
    };

    // Calculate portfolio sizes from the full dataset for size classification
    const portfolioSizes = new Map<string, number>();
    properties.forEach(property => {
      if (property.portfolio_id) {
        portfolioSizes.set(
          property.portfolio_id,
          (portfolioSizes.get(property.portfolio_id) || 0) + 1
        );
      }
    });

    // Calculate portfolio counts from the filtered subset
    const subsetPortfolioSizes = new Map<string, number>();
    propertiesSubset.forEach(property => {
      if (property.portfolio_id) {
        subsetPortfolioSizes.set(
          property.portfolio_id,
          (subsetPortfolioSizes.get(property.portfolio_id) || 0) + 1
        );
      }
    });

    propertiesSubset.forEach(property => {
      // Status counts
      switch (property.status) {
        case 'available':
          counts.available++;
          break;
        case 'occupied':
          counts.occupied++;
          break;
        case 'vacant':
          counts.vacant++;
          break;
        case 'for_sale':
          counts.for_sale++;
          break;
        case 'under_contract':
          counts.under_contract++;
          break;
        case 'maintenance':
          counts.maintenance++;
          break;
      }

      // Property type counts
      if (property.property_type === 'residential') {
        counts.residential++;
        // Add specific residential type logic here
        counts.single_family++; // Placeholder - implement actual logic
      } else if (property.property_type === 'commercial') {
        counts.commercial++;
        // Commercial subcategory counts
        switch (property.commercial_type) {
          case 'office':
            counts.office++;
            break;
          case 'retail':
            counts.retail++;
            break;
          case 'warehouse':
            counts.warehouse++;
            break;
          case 'hospitality':
            counts.hotel++;
            break;
          case 'mixed_use':
            counts.mixed_use++;
            break;
        }
        
        // Commercial subtype counts
        switch (property.commercial_subtype) {
          case 'restaurant':
            counts.restaurant++;
            break;
          case 'marina':
            counts.marina++;
            break;
          case 'golf_course':
            counts.golf_course++;
            break;
          case 'prison':
            counts.prison++;
            break;
          case 'self_storage':
            counts.self_storage++;
            break;
          case 'medical':
            counts.medical++;
            break;
        }
      } else if (property.property_type === 'specialty') {
        counts.specialty++;
      }

      // Portfolio counts
      if (!property.portfolio_id) {
        counts.independent++;
      } else {
        // Use full dataset size for classification but subset count for display
        const portfolioSize = portfolioSizes.get(property.portfolio_id) || 0;
        const subsetCount = subsetPortfolioSizes.get(property.portfolio_id) || 0;
        
        if (portfolioSize >= 10) {
          counts.large_portfolios++;
        } else if (portfolioSize >= 5) {
          counts.medium_portfolios++;
        } else if (portfolioSize >= 1) {
          counts.small_portfolios++;
        }
        
        // Only include portfolios that have properties in the current subset
        if (subsetCount > 0) {
          counts.portfolios[property.portfolio_id] = subsetCount;
        }
      }

      // Owner counts
      counts.owners[property.owner_id] = (counts.owners[property.owner_id] || 0) + 1;

      // Rent range counts
      const rent = property.monthly_rent || 0;
      if (rent < 1000) {
        counts.rentRanges['under_1000'] = (counts.rentRanges['under_1000'] || 0) + 1;
      } else if (rent < 2000) {
        counts.rentRanges['1000_2000'] = (counts.rentRanges['1000_2000'] || 0) + 1;
      } else if (rent < 3000) {
        counts.rentRanges['2000_3000'] = (counts.rentRanges['2000_3000'] || 0) + 1;
      } else if (rent < 5000) {
        counts.rentRanges['3000_5000'] = (counts.rentRanges['3000_5000'] || 0) + 1;
      } else {
        counts.rentRanges['over_5000'] = (counts.rentRanges['over_5000'] || 0) + 1;
      }

      // Location counts
      if (property.city && property.state) {
        const location = `${property.city}, ${property.state}`;
        counts.locations[location] = (counts.locations[location] || 0) + 1;
      }

      // Market status counts
      if (property.on_market) {
        counts.on_market++;
      } else {
        counts.off_market++;
      }

      // Tenant status counts
      if (property.tenant_id || property.occupancy_status === 'occupied') {
        counts.with_tenant++;
      } else {
        counts.without_tenant++;
      }
    });

    return counts;
  };

  // Static filter counts (for initial load)
  const calculateFilterCounts = useMemo(() => {
    return calculateCountsForProperties(properties);
  }, [properties]);

  const filterProperties = (filters: PropertyFilters) => {
    return properties.filter(property => {
      // Status filter
      if (filters.status !== 'all' && property.status !== filters.status) {
        return false;
      }

      // Property type filter
      if (filters.propertyType !== 'all') {
        if (filters.propertyType === 'residential' && property.property_type !== 'residential') {
          return false;
        }
        if (filters.propertyType === 'commercial' && property.property_type !== 'commercial') {
          return false;
        }
        if (filters.propertyType === 'specialty' && property.property_type !== 'specialty') {
          return false;
        }
        // Add specific subtype filtering logic
        if (filters.propertyType === 'office' && property.commercial_type !== 'office') {
          return false;
        }
        // Add more specific filtering for other subtypes
      }

      // Portfolio filter
      if (filters.portfolio !== 'all') {
        if (filters.portfolio === 'independent' && property.portfolio_id) {
          return false;
        }
        if (filters.portfolio !== 'independent' && 
            !filters.portfolio.includes('portfolios') && 
            property.portfolio_id !== filters.portfolio) {
          return false;
        }
        // Handle portfolio size filters
        if (filters.portfolio.includes('portfolios')) {
          const portfolioSize = calculateFilterCounts.portfolios[property.portfolio_id || ''] || 0;
          if (filters.portfolio === 'large_portfolios' && portfolioSize < 10) {
            return false;
          }
          if (filters.portfolio === 'medium_portfolios' && (portfolioSize < 5 || portfolioSize >= 10)) {
            return false;
          }
          if (filters.portfolio === 'small_portfolios' && (portfolioSize < 1 || portfolioSize >= 5)) {
            return false;
          }
        }
      }

      // Owner filter
      if (filters.owner !== 'all' && property.owner_id !== filters.owner) {
        return false;
      }

      // Date added filter
      if (filters.dateAdded !== 'all') {
        const createdDate = new Date(property.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filters.dateAdded) {
          case '30_days':
            if (daysDiff > 30) return false;
            break;
          case 'this_month':
            if (createdDate.getMonth() !== now.getMonth() || createdDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
            break;
          case '3_months':
            if (daysDiff > 90) return false;
            break;
          case 'this_year':
            if (createdDate.getFullYear() !== now.getFullYear()) return false;
            break;
        }
      }

      // Rent range filter
      if (filters.rentRange !== 'all') {
        const rent = property.monthly_rent || 0;
        switch (filters.rentRange) {
          case 'under_1000':
            if (rent >= 1000) return false;
            break;
          case '1000_2000':
            if (rent < 1000 || rent >= 2000) return false;
            break;
          case '2000_3000':
            if (rent < 2000 || rent >= 3000) return false;
            break;
          case '3000_5000':
            if (rent < 3000 || rent >= 5000) return false;
            break;
          case 'over_5000':
            if (rent < 5000) return false;
            break;
        }
      }

      // Location filter
      if (filters.location !== 'all') {
        const propertyLocation = `${property.city}, ${property.state}`;
        if (propertyLocation !== filters.location) {
          return false;
        }
      }

      // Market status filter
      if (filters.marketStatus !== 'all') {
        if (filters.marketStatus === 'on_market' && !property.on_market) {
          return false;
        }
        if (filters.marketStatus === 'off_market' && property.on_market) {
          return false;
        }
      }

      // Tenant status filter
      if (filters.tenantStatus !== 'all') {
        const hasTenant = !!(property.tenant_id || property.occupancy_status === 'occupied');
        if (filters.tenantStatus === 'with_tenant' && !hasTenant) {
          return false;
        }
        if (filters.tenantStatus === 'without_tenant' && hasTenant) {
          return false;
        }
      }

      return true;
    });
  };

  // Dynamic filter counts based on current selection (excluding the filter being applied)
  const getDynamicFilterCounts = (currentFilters: PropertyFilters) => {
    // For each filter category, calculate what options would be available
    // if we applied all OTHER filters but not the current one
    
    const getFilteredPropertiesExcluding = (excludeFilter: keyof PropertyFilters) => {
      return properties.filter(property => {
        // Apply all filters except the excluded one
        if (excludeFilter !== 'status' && currentFilters.status !== 'all' && property.status !== currentFilters.status) {
          return false;
        }

        if (excludeFilter !== 'propertyType' && currentFilters.propertyType !== 'all') {
          if (currentFilters.propertyType === 'residential' && property.property_type !== 'residential') {
            return false;
          }
          if (currentFilters.propertyType === 'commercial' && property.property_type !== 'commercial') {
            return false;
          }
          if (currentFilters.propertyType === 'specialty' && property.property_type !== 'specialty') {
            return false;
          }
          if (currentFilters.propertyType === 'office' && property.commercial_type !== 'office') {
            return false;
          }
        }

        if (excludeFilter !== 'portfolio' && currentFilters.portfolio !== 'all') {
          if (currentFilters.portfolio === 'independent' && property.portfolio_id) {
            return false;
          }
          if (currentFilters.portfolio !== 'independent' && 
              !currentFilters.portfolio.includes('portfolios') && 
              property.portfolio_id !== currentFilters.portfolio) {
            return false;
          }
          if (currentFilters.portfolio.includes('portfolios')) {
            const portfolioSize = calculateFilterCounts.portfolios[property.portfolio_id || ''] || 0;
            if (currentFilters.portfolio === 'large_portfolios' && portfolioSize < 10) {
              return false;
            }
            if (currentFilters.portfolio === 'medium_portfolios' && (portfolioSize < 5 || portfolioSize >= 10)) {
              return false;
            }
            if (currentFilters.portfolio === 'small_portfolios' && (portfolioSize < 1 || portfolioSize >= 5)) {
              return false;
            }
          }
        }

        if (excludeFilter !== 'owner' && currentFilters.owner !== 'all' && property.owner_id !== currentFilters.owner) {
          return false;
        }

        if (excludeFilter !== 'dateAdded' && currentFilters.dateAdded !== 'all') {
          const createdDate = new Date(property.created_at);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          switch (currentFilters.dateAdded) {
            case '30_days':
              if (daysDiff > 30) return false;
              break;
            case 'this_month':
              if (createdDate.getMonth() !== now.getMonth() || createdDate.getFullYear() !== now.getFullYear()) {
                return false;
              }
              break;
            case '3_months':
              if (daysDiff > 90) return false;
              break;
            case 'this_year':
              if (createdDate.getFullYear() !== now.getFullYear()) return false;
              break;
          }
        }

        if (excludeFilter !== 'rentRange' && currentFilters.rentRange !== 'all') {
          const rent = property.monthly_rent || 0;
          switch (currentFilters.rentRange) {
            case 'under_1000':
              if (rent >= 1000) return false;
              break;
            case '1000_2000':
              if (rent < 1000 || rent >= 2000) return false;
              break;
            case '2000_3000':
              if (rent < 2000 || rent >= 3000) return false;
              break;
            case '3000_5000':
              if (rent < 3000 || rent >= 5000) return false;
              break;
            case 'over_5000':
              if (rent < 5000) return false;
              break;
          }
        }

        if (excludeFilter !== 'location' && currentFilters.location !== 'all') {
          const propertyLocation = `${property.city}, ${property.state}`;
          if (propertyLocation !== currentFilters.location) {
            return false;
          }
        }

        if (excludeFilter !== 'marketStatus' && currentFilters.marketStatus !== 'all') {
          if (currentFilters.marketStatus === 'on_market' && !property.on_market) {
            return false;
          }
          if (currentFilters.marketStatus === 'off_market' && property.on_market) {
            return false;
          }
        }

        if (excludeFilter !== 'tenantStatus' && currentFilters.tenantStatus !== 'all') {
          const hasTenant = !!(property.tenant_id || property.occupancy_status === 'occupied');
          if (currentFilters.tenantStatus === 'with_tenant' && !hasTenant) {
            return false;
          }
          if (currentFilters.tenantStatus === 'without_tenant' && hasTenant) {
            return false;
          }
        }

        return true;
      });
    };

    return {
      status: calculateCountsForProperties(getFilteredPropertiesExcluding('status')),
      propertyType: calculateCountsForProperties(getFilteredPropertiesExcluding('propertyType')),
      portfolio: calculateCountsForProperties(getFilteredPropertiesExcluding('portfolio')),
      owner: calculateCountsForProperties(getFilteredPropertiesExcluding('owner')),
      dateAdded: calculateCountsForProperties(getFilteredPropertiesExcluding('dateAdded')),
      rentRange: calculateCountsForProperties(getFilteredPropertiesExcluding('rentRange')),
      location: calculateCountsForProperties(getFilteredPropertiesExcluding('location')),
      marketStatus: calculateCountsForProperties(getFilteredPropertiesExcluding('marketStatus')),
      tenantStatus: calculateCountsForProperties(getFilteredPropertiesExcluding('tenantStatus')),
    };
  };

  return {
    filterCounts: calculateFilterCounts,
    getDynamicFilterCounts,
    filterProperties,
    owners: processedOwners,
    locations: uniqueLocations,
  };
}
