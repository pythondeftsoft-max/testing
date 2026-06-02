import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, DollarSign, Bed, X, MapPin, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MatchPropertyToTenantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  propertyId: string;
  propertyAddress: string;
}

export const MatchPropertyToTenantDialog: React.FC<MatchPropertyToTenantDialogProps> = ({
  isOpen,
  onClose,
  unitId,
  propertyId,
  propertyAddress,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantToConfirm, setTenantToConfirm] = useState<any | null>(null);
  const queryClient = useQueryClient();

  // Filter states
  const [cityFilter, setCityFilter] = useState('all');
  const [zipCodeFilter, setZipCodeFilter] = useState('all');
  const [bedroomFilter, setBedroomFilter] = useState('all');
  const [voucherFilter, setVoucherFilter] = useState('all');
  const [maxRentFilter, setMaxRentFilter] = useState('all');

  // Fetch available tenants seeking housing
  const { data: availableTenants, isLoading } = useQuery({
    queryKey: ['available-tenants-for-matching'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          housing_status,
          tenant_profiles (
            monthly_income,
            max_rent,
            voucher_holder,
            voucher_amount,
            move_in_window,
            city,
            zip_code,
            bedrooms_approved
          )
        `)
        .eq('user_type', 'tenant')
        .eq('housing_status', 'seeking')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      console.log('Available seeking tenants:', data?.length, data);

      return data || [];
    },
    enabled: isOpen,
    refetchOnMount: 'always',
  });

  // Fetch property unit details for display
  const { data: propertyUnit } = useQuery({
    queryKey: ['property-unit-for-match', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_units')
        .select(`
          id,
          monthly_rent,
          bedrooms,
          bathrooms,
          unit_number,
          unit_name
        `)
        .eq('id', unitId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!unitId,
  });

  // Push mutation - creates property_push record
  const pushToTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if this unit already has 3 active pushes (max concurrent)
      const { count: unitPushCount, error: countError } = await supabase
        .from('property_pushes')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', unitId)
        .neq('status', 'denied')
        .gt('expires_at', new Date().toISOString());

      if (countError) throw countError;

      if ((unitPushCount || 0) >= 3) {
        throw new Error('This unit already has 3 active pushes. Wait for a tenant to respond or unsend a push.');
      }

      // Check if this tenant already has an active push
      const { data: existingTenantPush } = await supabase
        .from('property_pushes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'push_sent')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingTenantPush) {
        throw new Error('This tenant already has a pending push. Wait for them to respond or the push to expire.');
      }

      // Create property push record with both property_id and unit_id
      const { error: pushError } = await supabase
        .from('property_pushes')
        .insert({
          property_id: propertyId,
          unit_id: unitId,
          tenant_id: tenantId,
          admin_id: user.id,
          quota_bypass: true,
          status: 'push_sent',
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (pushError) throw pushError;

      // Create notification for tenant
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: tenantId,
        title: 'New Property Match!',
          description: `We found a property for you at ${propertyAddress}. Tap to review!`,
          type: 'property_match',
          category: 'Property',
          metadata: { 
            property_id: propertyId,
            unit_id: unitId, 
            quota_bypass: true,
            admin_push: true,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          },
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      // Send email via edge function
      try {
        await supabase.functions.invoke('send-property-match-email', {
          body: {
            tenantId: tenantId,
            templateSlug: 'tenant_property_match',
            propertyContext: {
              property_address: propertyAddress,
              property_rent: propertyUnit?.monthly_rent?.toString() || '0',
              property_url: `${window.location.origin}/dashboard?tab=My%20Matches&internal=true`,
            },
            isAdminPush: true,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }

      return { tenantId };
    },
    onSuccess: () => {
      setTenantToConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['available-tenants-for-matching'] });
      queryClient.invalidateQueries({ queryKey: ['property-pushes'] });
      queryClient.invalidateQueries({ queryKey: ['push-status'] });
      toast({
        title: "Property Pushed",
        description: "The tenant will receive a notification about this property.",
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error('Push error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to push property to tenant",
        variant: "destructive"
      });
    }
  });

  // Extract unique cities and zip codes for filter dropdowns
  const { uniqueCities, uniqueZipCodes } = useMemo(() => {
    const cities = new Set<string>();
    const zipCodes = new Set<string>();
    
    availableTenants?.forEach(tenant => {
      const city = tenant.tenant_profiles?.city;
      const zip = tenant.tenant_profiles?.zip_code;
      if (city) cities.add(city);
      if (zip) zipCodes.add(zip);
    });
    
    return {
      uniqueCities: Array.from(cities).sort(),
      uniqueZipCodes: Array.from(zipCodes).sort(),
    };
  }, [availableTenants]);

  // Count active filters
  const activeFilterCount = [cityFilter, zipCodeFilter, bedroomFilter, voucherFilter, maxRentFilter].filter(v => v && v !== 'all').length;

  // Clear all filters
  const clearFilters = () => {
    setCityFilter('all');
    setZipCodeFilter('all');
    setBedroomFilter('all');
    setVoucherFilter('all');
    setMaxRentFilter('all');
  };

  const filteredTenants = availableTenants?.filter(tenant => {
    // Name/email search
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.toLowerCase();
    if (searchTerm && !fullName.includes(searchLower) && !tenant.email?.toLowerCase().includes(searchLower)) {
      return false;
    }

    // City filter
    if (cityFilter && cityFilter !== 'all' && tenant.tenant_profiles?.city !== cityFilter) {
      return false;
    }

    // Zip code filter
    if (zipCodeFilter && zipCodeFilter !== 'all' && tenant.tenant_profiles?.zip_code !== zipCodeFilter) {
      return false;
    }

    // Bedroom filter - check if filter bedroom is in tenant's approved list
    if (bedroomFilter && bedroomFilter !== 'all') {
      const approvedBedrooms = tenant.tenant_profiles?.bedrooms_approved || [];
      if (!approvedBedrooms.includes(bedroomFilter)) {
        return false;
      }
    }

    // Voucher filter
    if (voucherFilter === 'yes' && !tenant.tenant_profiles?.voucher_holder) {
      return false;
    }
    if (voucherFilter === 'no' && tenant.tenant_profiles?.voucher_holder) {
      return false;
    }

    // Max rent filter
    if (maxRentFilter && maxRentFilter !== 'all') {
      const tenantMaxRent = tenant.tenant_profiles?.max_rent || 0;
      if (maxRentFilter === 'under1000' && tenantMaxRent >= 1000) return false;
      if (maxRentFilter === '1000-1500' && (tenantMaxRent < 1000 || tenantMaxRent > 1500)) return false;
      if (maxRentFilter === '1500-2000' && (tenantMaxRent < 1500 || tenantMaxRent > 2000)) return false;
      if (maxRentFilter === '2000-2500' && (tenantMaxRent < 2000 || tenantMaxRent > 2500)) return false;
      if (maxRentFilter === 'over2500' && tenantMaxRent < 2500) return false;
    }

    return true;
  });

  const handlePushToTenant = (tenant: any) => {
    pushToTenant.mutate(tenant.id);
  };

  const handleClose = () => {
    setSearchTerm('');
    setCityFilter('all');
    setZipCodeFilter('all');
    setBedroomFilter('all');
    setVoucherFilter('all');
    setMaxRentFilter('all');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Push Unit to Tenant</DialogTitle>
          <DialogDescription>
            Send this unit to a tenant. They will receive a notification and email about {propertyAddress}.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar and filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Section */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* City Filter */}
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Zip Code Filter */}
            <Select value={zipCodeFilter} onValueChange={setZipCodeFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Zip Codes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zip Codes</SelectItem>
                {uniqueZipCodes.map(zip => (
                  <SelectItem key={zip} value={zip}>{zip}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bedrooms Filter */}
            <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
              <SelectTrigger className="h-8 text-xs w-[100px]">
                <SelectValue placeholder="Beds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Beds</SelectItem>
                <SelectItem value="0">Studio</SelectItem>
                <SelectItem value="1">1 Bed</SelectItem>
                <SelectItem value="2">2 Beds</SelectItem>
                <SelectItem value="3">3 Beds</SelectItem>
                <SelectItem value="4">4+ Beds</SelectItem>
              </SelectContent>
            </Select>

            {/* Voucher Holder Filter */}
            <Select value={voucherFilter} onValueChange={setVoucherFilter}>
              <SelectTrigger className="h-8 text-xs w-[100px]">
                <SelectValue placeholder="Voucher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>

            {/* Max Rent Filter */}
            <Select value={maxRentFilter} onValueChange={setMaxRentFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Max Rent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Rent</SelectItem>
                <SelectItem value="under1000">Under $1,000</SelectItem>
                <SelectItem value="1000-1500">$1,000 - $1,500</SelectItem>
                <SelectItem value="1500-2000">$1,500 - $2,000</SelectItem>
                <SelectItem value="2000-2500">$2,000 - $2,500</SelectItem>
                <SelectItem value="over2500">Over $2,500</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear All Button */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground">
            {filteredTenants?.length || 0} tenants available
          </p>
        </div>

        {/* Available tenants list */}
        <ScrollArea className="h-[500px] mt-2 pr-4">
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : filteredTenants && filteredTenants.length > 0 ? (
              filteredTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Primary: Tenant Name */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <UserCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-semibold text-sm truncate">
                          {tenant.first_name} {tenant.last_name}
                        </h4>
                        {tenant.tenant_profiles?.voucher_holder && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <DollarSign className="h-3 w-3" />
                            Voucher
                          </Badge>
                        )}
                      </div>

                      {/* Secondary: Contact Info */}
                      <p className="text-xs text-muted-foreground mb-2 truncate">
                        {tenant.email}
                        {tenant.phone && ` • ${tenant.phone}`}
                      </p>

                      {/* Details: Icon + Value pairs */}
                      <div className="flex flex-wrap gap-3 text-xs">
                        {(tenant.tenant_profiles?.city || tenant.tenant_profiles?.zip_code) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                              {[tenant.tenant_profiles?.city, tenant.tenant_profiles?.zip_code].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        {tenant.tenant_profiles?.bedrooms_approved?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{tenant.tenant_profiles.bedrooms_approved.join(', ')} bed</span>
                          </div>
                        )}
                        {tenant.tenant_profiles?.max_rent && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Up to ${tenant.tenant_profiles.max_rent}</span>
                          </div>
                        )}
                        {tenant.tenant_profiles?.voucher_amount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Voucher: ${tenant.tenant_profiles.voucher_amount}</span>
                          </div>
                        )}
                        {tenant.tenant_profiles?.move_in_window && (
                          <div className="flex items-center gap-1">
                            <span>Move-in: {tenant.tenant_profiles.move_in_window}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Push button */}
                    <Button 
                      size="sm"
                      onClick={() => setTenantToConfirm(tenant)}
                      disabled={pushToTenant.isPending}
                      className="flex-shrink-0 gap-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Push
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tenants found matching your search</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!tenantToConfirm} onOpenChange={(open) => !open && setTenantToConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Push</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to push this property to {tenantToConfirm?.first_name} {tenantToConfirm?.last_name}?
                <br /><br />
                They will receive a notification and email about <strong>{propertyAddress}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handlePushToTenant(tenantToConfirm)}>
                Send
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
