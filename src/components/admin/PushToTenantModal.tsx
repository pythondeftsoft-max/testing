import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  User, 
  MapPin,
  DollarSign,
  Send,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PropertyData {
  id: string;
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  bedrooms?: number;
  bathrooms?: number;
  monthly_rent: number;
  desired_rent?: number;
  unit_count: number;
  status: string;
  description?: string;
  amenities?: string[];
  has_voucher?: boolean;
  voucher_type?: string;
  created_at: string;
  owner_id: string;
  owner_name: string;
}

interface TenantData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  voucher_holder: boolean;
  voucher_amount: number;
  max_rent: number;
  city: string;
  employment_status: string;
}

interface PushToTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyData | null;
}

const PushToTenantModal = ({ isOpen, onClose, property }: PushToTenantModalProps) => {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<TenantData[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && property) {
      fetchUnplacedTenants();
    }
  }, [isOpen, property]);

  useEffect(() => {
    filterTenants();
  }, [tenants, searchTerm]);

  const fetchUnplacedTenants = async () => {
    setLoading(true);
    try {
      // Get tenant profiles without current housing
      const { data: tenantProfiles, error } = await supabase
        .from('tenant_profiles')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email
          )
        `);

      if (error) {
        console.error('Error fetching tenants:', error);
        return;
      }

      // Get housed tenants (those with approved applications)  
      const { data: housedTenantsData, error: housedError } = await supabase
        .from('property_applications')
        .select('tenant_id')
        .eq('status', 'approved');

      if (housedError) {
        console.error('Error fetching housed tenants:', housedError);
      }

      // Create a set of housed tenant IDs for efficient lookup
      const housedTenantIds = new Set(housedTenantsData?.map(app => app.tenant_id) || []);

      // Transform the data and filter out housed tenants
      const transformedTenants = tenantProfiles
        ?.filter(profile => !housedTenantIds.has(profile.user_id))
        ?.map(profile => ({
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.profiles 
            ? `${profile.profiles.first_name || ''} ${profile.profiles.last_name || ''}`.trim()
            : `Tenant ${profile.user_id.slice(0, 8)}`,
          email: profile.profiles?.email || '',
          voucher_holder: profile.voucher_holder || false,
          voucher_amount: profile.voucher_amount || 0,
          max_rent: profile.max_rent || 0,
          city: profile.city || 'N/A',
          employment_status: profile.employment_status || 'N/A'
        })) || [];

      const excludedCount = (tenantProfiles?.length || 0) - transformedTenants.length;
      
      setTenants(transformedTenants);

      // Show toast about filtering
      if (excludedCount > 0) {
        toast({
          title: "Filtered Results", 
          description: `Showing ${transformedTenants.length} unhoused tenants. ${excludedCount} tenants excluded (already housed).`,
        });
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant list",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTenants = () => {
    let filtered = tenants;

    if (searchTerm) {
      filtered = filtered.filter(tenant =>
        tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTenants(filtered);
  };

  const handleSelectTenant = (tenantId: string, checked: boolean) => {
    if (checked) {
      setSelectedTenants(prev => [...prev, tenantId]);
    } else {
      setSelectedTenants(prev => prev.filter(id => id !== tenantId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTenants(filteredTenants.map(tenant => tenant.user_id));
    } else {
      setSelectedTenants([]);
    }
  };

  const handleSendMatches = async () => {
    if (selectedTenants.length === 0) {
      toast({
        title: "No tenants selected",
        description: "Please select tenants to send property matches to",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      // Create notifications for selected tenants
      const notifications = selectedTenants.map(tenantId => ({
        user_id: tenantId,
        type: 'property_match',
        title: 'New Property Match',
        description: `A new property has been recommended for you: ${property?.address}`,
        metadata: {
          property_id: property?.id,
          property_address: property?.address,
          property_rent: property?.monthly_rent
        }
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        throw notificationError;
      }

      // Create email queue entries for selected tenants
      const emailEntries = selectedTenants.map(tenantId => {
        const tenant = tenants.find(t => t.user_id === tenantId);
        return {
          user_id: tenantId,
          to_email: tenant?.email || '',
          subject: 'New Property Match Available',
          body: `Hi ${tenant?.full_name || 'there'},\n\nWe found a property that matches your criteria:\n\n${property?.address}\nRent: $${property?.monthly_rent}\nBedrooms: ${property?.bedrooms}\nBathrooms: ${property?.bathrooms}\n\nLog in to view more details and apply!`,
          link: `/marketplace/${property?.id}`
        };
      });

      const { error: emailError } = await supabase
        .from('email_queue')
        .insert(emailEntries);

      if (emailError) {
        console.error('Email queue error:', emailError);
        // Don't fail the operation for email errors
      }

      toast({
        title: "Property matches sent!",
        description: `Successfully sent property to ${selectedTenants.length} unhoused tenants`,
      });

      setSelectedTenants([]);
      onClose();
    } catch (error) {
      console.error('Error sending matches:', error);
      toast({
        title: "Error",
        description: "Failed to send property matches",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedTenants([]);
    onClose();
  };

  if (!property) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Push Property to Unhoused Tenants
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Send "{property.address}" to unhoused tenants only
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{property.address}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {property.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${property.monthly_rent.toLocaleString()}
                  </span>
                  <span>{property.bedrooms}bd/{property.bathrooms}ba</span>
                </div>
              </div>
              <Badge variant="outline">{property.status}</Badge>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search tenants by name, email, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bulk Selection */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedTenants.length === filteredTenants.length && filteredTenants.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">
                {selectedTenants.length > 0 
                  ? `${selectedTenants.length} tenants selected` 
                  : 'Select all tenants'
                }
              </span>
            </div>
            <Button
              onClick={handleSendMatches}
              disabled={selectedTenants.length === 0 || sending}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : `Send to ${selectedTenants.length} tenants`}
            </Button>
          </div>

          {/* Tenants List */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <Search className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="text-gray-600">No tenants found</div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredTenants.map((tenant) => (
                    <div
                      key={tenant.user_id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selectedTenants.includes(tenant.user_id)}
                        onCheckedChange={(checked) => handleSelectTenant(tenant.user_id, checked as boolean)}
                      />
                      
                      <User className="h-8 w-8 text-gray-400" />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{tenant.full_name}</h4>
                          {tenant.voucher_holder && (
                            <Badge variant="outline" className="text-xs">
                              Voucher: ${tenant.voucher_amount}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {tenant.email} • {tenant.city} • Max rent: ${tenant.max_rent}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tenant.employment_status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PushToTenantModal;