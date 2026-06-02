import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bed, Bath, DollarSign, Building2 } from 'lucide-react';
import { ApplicationLimitBadge } from './ApplicationLimitBadge';
import { PrimaryApplicantBadge } from './PrimaryApplicantBadge';

interface Property {
  id: string;
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  monthly_rent: number;
  desired_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  status: string;
  owner_id: string;
  unit_count: number;
  square_feet?: number;
}

interface PropertyListItemProps {
  property: Property;
  onClick: (property: Property) => void;
  isSelected?: boolean;
  hideStatus?: boolean;
  primaryApplicant?: { id: string; name: string };
  applicationLimit?: {
    currentCount: number;
    maxAllowed: number;
    isAtLimit: boolean;
  };
}

const PropertyListItem: React.FC<PropertyListItemProps> = ({ 
  property, 
  onClick, 
  isSelected = false,
  hideStatus = false,
  primaryApplicant,
  applicationLimit
}) => {
  const formatAddress = () => {
    if (property.street_address) {
      return [property.street_address, property.city, property.state]
        .filter(Boolean)
        .join(', ');
    }
    return property.address;
  };

  const displayRent = (property as any).rent || property.desired_rent || property.monthly_rent;
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'occupied':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'vacant':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'maintenance':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'available':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div 
      className={`p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={() => onClick(property)}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Address and details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {formatAddress()}
            </h4>
            {primaryApplicant && (
              <PrimaryApplicantBadge className="text-xs" showIcon={false} />
            )}
            {!hideStatus && (
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-0.5 ${getStatusColor(property.status)}`}
              >
                {property.status}
              </Badge>
            )}
            {applicationLimit && (
              <ApplicationLimitBadge
                currentCount={applicationLimit.currentCount}
                maxAllowed={applicationLimit.maxAllowed}
                className="text-xs"
              />
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
            {(property as any).isMultiUnit ? (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{(property as any).availableUnitCount} units available</span>
              </div>
            ) : (
              <>
                {property.bedrooms && (
                  <div className="flex items-center gap-1">
                    <Bed className="w-3 h-3" />
                    <span>{property.bedrooms}bd</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-1">
                    <Bath className="w-3 h-3" />
                    <span>{property.bathrooms}ba</span>
                  </div>
                )}
                {property.square_feet && (
                  <span>{property.square_feet.toLocaleString()} sq ft</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right side - Rent */}
        <div className="flex items-center gap-1 text-right">
          {(property as any).isMultiUnit ? (
            <>
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-600">
                ${(property as any).minRent.toLocaleString()} - ${(property as any).maxRent.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">/mo</span>
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-600">
                ${displayRent?.toLocaleString() || 'N/A'}
              </span>
              <span className="text-xs text-gray-500">/mo</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyListItem;
