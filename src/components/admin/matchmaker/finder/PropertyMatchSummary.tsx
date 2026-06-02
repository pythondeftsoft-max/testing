import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Home, DollarSign, Bath } from 'lucide-react';
import { FinderProperty } from './PropertyFinderList';

interface PropertyMatchSummaryProps {
  property: FinderProperty;
}

export const PropertyMatchSummary: React.FC<PropertyMatchSummaryProps> = ({ property }) => {
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{property.address}</h3>
              <p className="text-sm text-muted-foreground">
                {property.unit_number && `Unit ${property.unit_number} · `}
                {property.city}, {property.state} {property.zipcode}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Home className="w-3 h-3" />
              {property.bedrooms} BR
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Bath className="w-3 h-3" />
              {property.bathrooms} BA
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${property.monthly_rent.toLocaleString()}/mo
            </Badge>
            <Badge variant="outline" className="capitalize">{property.status}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
