import { useState, useMemo } from "react";
import { useUserPropertiesWithUnits } from "@/hooks/useUserPropertiesWithUnits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Home, Users, Search, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PropertyWithUnits {
  id: string;
  address: string;
  portfolio_id?: string;
  property_units: Array<{
    id: string;
    unit_number: string;
    monthly_rent?: number;
    status?: string;
  }>;
}

interface EnrichedProperty extends PropertyWithUnits {
  owner_id?: string;
  ownerName?: string;
  ownerEmail?: string;
  defaultBankAccountId?: string;
  bankAccountCount?: number;
  monthly_rent?: number;
  is_voucher_property?: boolean;
  voucher_type?: string;
  tenant_portion?: number;
  voucher_portion?: number;
}

interface MultiPropertySelectorProps {
  userId: string;
  portfolioId: string;
  selectedPropertyIds: string[];
  onChange: (propertyIds: string[], propertiesData: EnrichedProperty[]) => void;
  disabled?: boolean;
}

export const MultiPropertySelector = ({
  userId,
  portfolioId,
  selectedPropertyIds,
  onChange,
  disabled = false
}: MultiPropertySelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const { data: properties, isLoading } = useUserPropertiesWithUnits(userId, portfolioId);

  // Fetch owner details and bank account info
  const { data: enrichedProperties } = useQuery<EnrichedProperty[]>({
    queryKey: ['multi-properties-enriched', portfolioId, properties?.map(p => p.id)],
    queryFn: async () => {
      if (!properties || properties.length === 0) return [];
      
      const { data: fullProperties, error: propError } = await supabase
        .from('properties')
        .select('id, owner_id, monthly_rent, is_voucher_property, voucher_type, tenant_portion, voucher_portion')
        .in('id', properties.map(p => p.id));
      
      if (propError) throw propError;
      
      const ownerIds = [...new Set(fullProperties?.map(p => p.owner_id).filter(Boolean) || [])];
      
      if (ownerIds.length === 0) {
        return properties.map(prop => ({
          ...prop,
          bankAccountCount: 0
        }));
      }
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', ownerIds);
      
      const { data: bankAccounts } = await supabase
        .from('user_bank_accounts')
        .select('user_id, id, is_default_for_payouts')
        .in('user_id', ownerIds)
        .eq('status', 'active');
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const bankAccountMap = new Map<string, { count: number; defaultId?: string }>();
      
      bankAccounts?.forEach(ba => {
        const existing = bankAccountMap.get(ba.user_id) || { count: 0 };
        existing.count++;
        if (ba.is_default_for_payouts) {
          existing.defaultId = ba.id;
        }
        bankAccountMap.set(ba.user_id, existing);
      });
      
      const ownerMap = new Map(fullProperties?.map(p => [p.id, p.owner_id]) || []);
      
      return properties.map(prop => {
        const ownerId = ownerMap.get(prop.id);
        const profile = ownerId ? profileMap.get(ownerId) : null;
        const bankInfo = ownerId ? bankAccountMap.get(ownerId) : null;
        const fullProp = fullProperties?.find(fp => fp.id === prop.id);
        const monthlyRent = fullProp?.monthly_rent || prop.property_units?.reduce((sum, unit) => sum + (unit.monthly_rent || 0), 0) || 0;
        
        return {
          ...prop,
          owner_id: ownerId,
          ownerName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : undefined,
          ownerEmail: profile?.email,
          defaultBankAccountId: bankInfo?.defaultId,
          bankAccountCount: bankInfo?.count || 0,
          monthly_rent: monthlyRent,
          is_voucher_property: fullProp?.is_voucher_property || false,
          voucher_type: fullProp?.voucher_type,
          tenant_portion: fullProp?.tenant_portion,
          voucher_portion: fullProp?.voucher_portion
        };
      });
    },
    enabled: !!properties && properties.length > 0
  });

  const filteredProperties = useMemo(() => {
    if (!enrichedProperties) return [];
    if (!searchTerm) return enrichedProperties;
    
    const lower = searchTerm.toLowerCase();
    return enrichedProperties.filter(prop => 
      prop.address.toLowerCase().includes(lower) ||
      prop.ownerName?.toLowerCase().includes(lower)
    );
  }, [enrichedProperties, searchTerm]);

  const groupedByLandlord = useMemo(() => {
    const groups = new Map<string, EnrichedProperty[]>();
    filteredProperties.forEach(prop => {
      const key = prop.owner_id || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(prop);
    });
    return groups;
  }, [filteredProperties]);

  const handleToggle = (propertyId: string) => {
    const newSelected = selectedPropertyIds.includes(propertyId)
      ? selectedPropertyIds.filter(id => id !== propertyId)
      : [...selectedPropertyIds, propertyId];
    
    const selectedData = enrichedProperties?.filter(p => newSelected.includes(p.id)) || [];
    onChange(newSelected, selectedData);
  };

  const handleSelectAll = () => {
    const allIds = filteredProperties.map(p => p.id);
    onChange(allIds, filteredProperties);
  };

  const handleClearAll = () => {
    onChange([], []);
  };

  const uniqueLandlordsCount = useMemo(() => {
    return new Set(enrichedProperties?.filter(p => selectedPropertyIds.includes(p.id)).map(p => p.owner_id)).size;
  }, [enrichedProperties, selectedPropertyIds]);

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full justify-start font-normal" disabled>
        <span className="text-muted-foreground">Loading properties...</span>
      </Button>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <Button variant="outline" className="w-full justify-start font-normal" disabled>
        <span className="text-muted-foreground">No properties available</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto min-h-[40px] py-2"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {selectedPropertyIds.length === 0 ? (
              <span className="text-muted-foreground">Select properties</span>
            ) : (
              <>
                <span className="font-medium">
                  {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'property' : 'properties'} selected
                </span>
                {uniqueLandlordsCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {uniqueLandlordsCount} {uniqueLandlordsCount === 1 ? 'landlord' : 'landlords'}
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[500px] p-0" 
        align="start"
        side="bottom"
        avoidCollisions={false}
        sideOffset={4}
      >
        <div className="p-4 space-y-3">
          {/* Search and Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties or landlords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear
            </Button>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between text-sm border-b pb-2">
            <span className="text-muted-foreground">
              {selectedPropertyIds.length} of {filteredProperties.length} properties selected
            </span>
          </div>

          {/* Properties List */}
          <ScrollArea className="h-[320px]">
            <div className="space-y-2 pr-4">
              {Array.from(groupedByLandlord.entries()).map(([landlordId, props]) => {
                const landlord = props[0];
                const hasBankAccount = (landlord.bankAccountCount || 0) > 0;
                
                return (
                  <div key={landlordId} className="space-y-1">
                    {/* Landlord Header */}
                    {landlord.ownerName && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{landlord.ownerName}</span>
                        {hasBankAccount ? (
                          <Badge variant="outline" className="ml-auto gap-1 text-green-600 border-green-600 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Bank linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-auto gap-1 text-amber-600 border-amber-600 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            No bank account
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Properties under this landlord */}
                    {props.map(property => {
                      const hasUnits = property.property_units?.length > 0;
                      
                      return (
                        <div
                          key={property.id}
                          className="flex items-start gap-3 p-3 ml-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => handleToggle(property.id)}
                        >
                          <Checkbox
                            checked={selectedPropertyIds.includes(property.id)}
                            onCheckedChange={() => handleToggle(property.id)}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{property.address}</span>
                              {hasUnits && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  {property.property_units.length} units
                                </Badge>
                              )}
                              {property.is_voucher_property && (
                                <Badge variant="outline" className="gap-1 text-xs border-blue-500 text-blue-700 bg-blue-50">
                                  {property.voucher_type || 'Section 8'}
                                </Badge>
                              )}
                            </div>
                            
                            {property.monthly_rent && property.monthly_rent > 0 && (
                              <div className="text-sm text-muted-foreground">
                                ${property.monthly_rent.toFixed(2)}/month
                                {property.is_voucher_property && property.voucher_portion && (
                                  <span className="ml-2 text-blue-700">
                                    (HAP: ${property.voucher_portion.toFixed(2)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
