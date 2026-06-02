
import { useQuery } from '@tanstack/react-query';

export interface HousingApplication {
  id: string;
  property_address: string;
  landlord_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  application_date: string;
  rent_amount: number;
  notes?: string;
}

export interface CurrentHousing {
  id: string;
  property_address: string;
  landlord_name: string;
  landlord_contact: string;
  rent_amount: number;
  lease_start: string;
  lease_end: string;
  move_in_date: string;
  status: 'active' | 'ending' | 'ended';
}

export interface HousingVoucher {
  id: string;
  voucher_type: string;
  status: 'active' | 'pending' | 'expired';
  max_rent: number;
  issued_date: string;
  expiry_date: string;
  case_worker?: string;
}

export interface TenantHousingDetails {
  housing_status: 'housed' | 'searching' | 'transitioning';
  current_housing?: CurrentHousing;
  applications: HousingApplication[];
  vouchers: HousingVoucher[];
  housing_preferences: {
    max_rent: number;
    preferred_areas: string[];
    property_type: string[];
    accessibility_needs?: string[];
  };
  housing_history: {
    total_applications: number;
    successful_placements: number;
    average_search_time: number; // in days
  };
}

export const useTenantHousingDetails = (userId: string) => {
  return useQuery({
    queryKey: ['tenant-housing-details', userId],
    queryFn: async (): Promise<TenantHousingDetails> => {
      // Mock data for demonstration
      return {
        housing_status: 'housed',
        current_housing: {
          id: '1',
          property_address: '123 Oak Street, Apt 2B, Seattle, WA 98101',
          landlord_name: 'PropertyCorp Management',
          landlord_contact: 'contact@propertycorp.com',
          rent_amount: 1850,
          lease_start: '2024-01-01',
          lease_end: '2024-12-31',
          move_in_date: '2024-01-01',
          status: 'active'
        },
        applications: [
          {
            id: '1',
            property_address: '456 Pine Avenue, Unit 3A',
            landlord_name: 'Green Valley Properties',
            status: 'rejected',
            application_date: '2023-12-15',
            rent_amount: 1950,
            notes: 'Credit score below minimum requirement'
          },
          {
            id: '2',
            property_address: '789 Elm Drive, House',
            landlord_name: 'Independent Owner',
            status: 'withdrawn',
            application_date: '2023-12-20',
            rent_amount: 2200,
            notes: 'Found better option, withdrew application'
          },
          {
            id: '3',
            property_address: '123 Oak Street, Apt 2B',
            landlord_name: 'PropertyCorp Management',
            status: 'approved',
            application_date: '2023-12-22',
            rent_amount: 1850,
            notes: 'Successful application, lease signed'
          }
        ],
        vouchers: [
          {
            id: '1',
            voucher_type: 'Section 8 Housing Choice Voucher',
            status: 'active',
            max_rent: 2000,
            issued_date: '2023-11-01',
            expiry_date: '2024-11-01',
            case_worker: 'Jennifer Martinez'
          }
        ],
        housing_preferences: {
          max_rent: 2000,
          preferred_areas: ['Capitol Hill', 'Ballard', 'Fremont'],
          property_type: ['Apartment', 'Townhouse'],
          accessibility_needs: ['Wheelchair accessible entrance', 'First floor unit']
        },
        housing_history: {
          total_applications: 8,
          successful_placements: 2,
          average_search_time: 45
        }
      };
    },
    enabled: !!userId,
  });
};
