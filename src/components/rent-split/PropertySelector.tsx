import { Building2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface Property {
  id: string;
  address: string;
  monthly_rent?: number;
  portfolio_id?: string;
  portfolio_name?: string;
  rent_splits?: Array<{
    total_rent: number;
    pha_portion: number;
    tenant_portion: number;
    voucher_type: string;
  }>;
}

interface PropertySelectorProps {
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property) => void;
}

export const PropertySelector = ({
  properties,
  selectedProperty,
  onPropertySelect,
}: PropertySelectorProps) => {
  if (properties.length === 0) {
    return (
      <div className="w-80 border-r border-border bg-muted/30 p-4 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No properties found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border bg-muted/30">
      <div className="p-4 border-b border-border">
        <h3 className="font-medium text-foreground">Select Property</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {properties.length} properties available
        </p>
      </div>
      
      <ScrollArea className="h-80">
        <div className="p-2 space-y-1">
          {properties.map((property) => {
            const rentSplit = property.rent_splits?.[0];
            const hasRentSplit = rentSplit && rentSplit.total_rent > 0;
            const isSelected = selectedProperty?.id === property.id;
            
            return (
              <Button
                key={property.id}
                variant="ghost"
                className={cn(
                  "w-full p-3 h-auto justify-start text-left hover:bg-background/80",
                  isSelected && "bg-background border border-border shadow-sm"
                )}
                onClick={() => onPropertySelect(property)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {property.address}
                      </p>
                      {property.portfolio_name && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {property.portfolio_name}
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        {property.monthly_rent && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-primary" />
                            <span className="text-xs text-foreground font-medium">
                              <CurrencyDisplay amount={property.monthly_rent} />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};