
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  MapPin, 
  DollarSign, 
  Eye,
  Edit,
  TrendingUp,
  Square
} from 'lucide-react';
import { CommercialPropertyData } from '@/types/commercial';

interface CommercialProperty extends CommercialPropertyData {
  id: string;
  monthly_rent?: number;
}

interface CommercialPropertyCardProps {
  property: CommercialProperty;
  onView?: (property: CommercialProperty) => void;
  onEdit?: (property: CommercialProperty) => void;
}

export const CommercialPropertyCard = ({ 
  property, 
  onView, 
  onEdit 
}: CommercialPropertyCardProps) => {
  const getCommercialTypeIcon = (type: string) => {
    switch (type) {
      case 'office': return Building2;
      case 'retail': return Building2;
      case 'warehouse': return Building2;
      case 'hospitality': return Building2;
      default: return Building2;
    }
  };

  const Icon = getCommercialTypeIcon(property.commercial_type);

  const getSourceBadgeColor = (source?: string) => {
    switch (source) {
      case 'integration': return 'bg-green-100 text-green-800';
      case 'parsed': return 'bg-blue-100 text-blue-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatSquareFootage = (sqft?: number) => {
    if (!sqft) return 'N/A';
    return sqft.toLocaleString() + ' sq ft';
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">{property.address}</CardTitle>
              {property.city && property.state && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  {property.city}, {property.state}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {property.source_badge && (
              <Badge className={getSourceBadgeColor(property.source_badge)} variant="secondary">
                {property.source_badge}
              </Badge>
            )}
            <Badge variant="outline">
              {property.commercial_type}
            </Badge>
            {property.commercial_subtype && (
              <Badge variant="secondary">
                {property.commercial_subtype.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">
                  {formatSquareFootage(property.total_square_footage)}
                </div>
                <div className="text-xs text-muted-foreground">Total SF</div>
              </div>
            </div>

            {property.occupancy_rate && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{property.occupancy_rate}%</div>
                  <div className="text-xs text-muted-foreground">Occupied</div>
                </div>
              </div>
            )}

            {property.base_rent_psf && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">${property.base_rent_psf}/sf</div>
                  <div className="text-xs text-muted-foreground">Base Rent</div>
                </div>
              </div>
            )}

            {property.is_multi_tenant && property.tenant_count && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{property.tenant_count}</div>
                  <div className="text-xs text-muted-foreground">Tenants</div>
                </div>
              </div>
            )}
          </div>

          {/* Asset Tags */}
          {property.asset_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {property.asset_tags.slice(0, 4).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {property.asset_tags.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{property.asset_tags.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {/* Special Indicators */}
          <div className="flex gap-2">
            {property.is_owner_operated && (
              <Badge variant="secondary" className="text-xs">
                Owner Operated
              </Badge>
            )}
            {property.lease_type === 'triple_net' && (
              <Badge variant="outline" className="text-xs">
                Triple Net
              </Badge>
            )}
            {property.cam_recoverable && (
              <Badge variant="outline" className="text-xs">
                CAM Recoverable
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            {onView && (
              <Button variant="outline" size="sm" onClick={() => onView(property)}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(property)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
