import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllPropertiesWithUnits } from "@/hooks/useAllPropertiesWithUnits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, Users, Building2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PropertyWithOwner {
  id: string;
  address: string;
  monthly_rent?: number;
  owner_id?: string;
  ownerName?: string;
  ownerEmail?: string;
  defaultBankAccountId?: string;
  bankAccountCount?: number;
}

interface QuickAddPropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  portfolioId?: string;
  onAddProperties: (properties: PropertyWithOwner[]) => void;
}

export const QuickAddPropertiesDialog = ({
  open,
  onOpenChange,
  userId,
  portfolioId,
  onAddProperties
}: QuickAddPropertiesDialogProps) => {
  const [selectedPortfolioFilter, setSelectedPortfolioFilter] = useState<string>(portfolioId || "");
  const { data: allProperties, isLoading: isLoadingAll } = useAllPropertiesWithUnits(userId, undefined);
  const { data: userPortfolios } = useQuery({
    queryKey: ['user-portfolios', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolios')
        .select('id, client_name')
        .eq('manager_id', userId);
      return data || [];
    },
    enabled: !!userId
  });

  // Filter properties by selected portfolio
  const properties = selectedPortfolioFilter
    ? allProperties?.filter(p => p.portfolio_id === selectedPortfolioFilter)
    : allProperties;
  const isLoading = isLoadingAll;
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());

  // Fetch owner details and bank account info for all properties
  const { data: enrichedProperties, isLoading: isLoadingEnriched } = useQuery<PropertyWithOwner[]>({
    queryKey: ['properties-with-owners', properties?.map(p => p.id)],
    queryFn: async () => {
      if (!properties || properties.length === 0) return [];
      
      // First fetch full property data with owner_id
      const { data: fullProperties, error: propError } = await supabase
        .from('properties')
        .select('id, owner_id')
        .in('id', properties.map(p => p.id));
      
      if (propError) throw propError;
      
      const ownerIds = [...new Set(fullProperties?.map(p => p.owner_id).filter(Boolean) || [])];
      
      if (ownerIds.length === 0) {
        return properties.map(prop => ({
          ...prop,
          bankAccountCount: 0
        }));
      }
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', ownerIds);
      
      // Fetch bank accounts
      const { data: bankAccounts } = await supabase
        .from('user_bank_accounts')
        .select('user_id, id, is_default_for_payouts')
        .in('user_id', ownerIds)
        .eq('status', 'active');
      
      // Create lookup maps
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
      
      // Create owner lookup
      const ownerMap = new Map(fullProperties?.map(p => [p.id, p.owner_id]) || []);
      
      return properties.map(prop => {
        const ownerId = ownerMap.get(prop.id);
        const profile = ownerId ? profileMap.get(ownerId) : null;
        const bankInfo = ownerId ? bankAccountMap.get(ownerId) : null;
        
        return {
          ...prop,
          owner_id: ownerId,
          ownerName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : undefined,
          ownerEmail: profile?.email,
          defaultBankAccountId: bankInfo?.defaultId,
          bankAccountCount: bankInfo?.count || 0
        } as PropertyWithOwner;
      });
    },
    enabled: !!properties && properties.length > 0 && open
  });

  const handleToggle = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  const handleSelectAll = () => {
    if (enrichedProperties) {
      setSelectedProperties(new Set(enrichedProperties.map(p => p.id)));
    }
  };

  const handleClearAll = () => {
    setSelectedProperties(new Set());
  };

  const handleAdd = () => {
    if (enrichedProperties) {
      const selected = enrichedProperties.filter(p => selectedProperties.has(p.id));
      onAddProperties(selected);
      setSelectedProperties(new Set());
      onOpenChange(false);
    }
  };

  const displayProperties = enrichedProperties || properties;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick Add from Properties</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Select properties to quickly add payouts. You can edit amounts and details after adding.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear
              </Button>
            </div>
          </div>

          {/* Portfolio Filter */}
          {userPortfolios && userPortfolios.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Filter by Portfolio:</Label>
              <Select value={selectedPortfolioFilter} onValueChange={setSelectedPortfolioFilter}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All portfolios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All portfolios</SelectItem>
                  {userPortfolios.map((portfolio: any) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {isLoading || isLoadingEnriched ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading properties...</p>
              ) : displayProperties?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No properties found</p>
              ) : (
                displayProperties?.map((property) => {
                  const hasUnits = property.property_units?.length > 0;
                  const monthlyRent = hasUnits 
                    ? property.property_units.reduce((sum: number, unit: any) => sum + (unit.monthly_rent || 0), 0)
                    : 0;
                  const hasBankAccount = (property.bankAccountCount || 0) > 0;

                  return (
                    <div
                      key={property.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleToggle(property.id)}
                    >
                      <Checkbox
                        checked={selectedProperties.has(property.id)}
                        onCheckedChange={() => handleToggle(property.id)}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{property.address}</span>
                          {hasUnits && (
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" />
                              {property.property_units.length} units
                            </Badge>
                          )}
                        </div>
                        
                        {property.ownerName && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{property.ownerName}</span>
                            {property.ownerEmail && (
                              <span className="text-xs">({property.ownerEmail})</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          {monthlyRent > 0 && (
                            <span className="text-sm text-muted-foreground">
                              ${monthlyRent.toFixed(2)}/mo
                            </span>
                          )}
                          
                          {hasBankAccount ? (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {property.bankAccountCount} account{property.bankAccountCount !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              No bank account
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedProperties.size} properties selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAdd}
                disabled={selectedProperties.size === 0}
              >
                Add {selectedProperties.size} Properties
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
