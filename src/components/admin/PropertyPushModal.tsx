import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, DollarSign, CreditCard, Send, Search, Filter, X, AlertCircle, Lock } from 'lucide-react';
import { usePropertyPushStatus } from '@/hooks/usePropertyPushStatus';
import { PushStatusBadge } from '@/components/admin/matchmaker/SubStageBadge';

interface UnhousedTenant {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  voucher_holder: boolean;
  voucher_amount: number;
  monthly_income: string | number;
  max_rent: number;
  credit_score: number;
  employment_status: string;
  city: string;
  zip_code: string;
  email: string;
}

interface Property {
  id: string;
  address: string;
  monthly_rent: number;
  bedrooms: number;
  bathrooms: number;
}

interface PropertyPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
}

const PropertyPushModal = ({ isOpen, onClose, property }: PropertyPushModalProps) => {
  const [unhousedTenants, setUnhousedTenants] = useState<UnhousedTenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<UnhousedTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null); // Changed to single select
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [creditScoreFilter, setCreditScoreFilter] = useState('');
  const [zipCodeFilter, setZipCodeFilter] = useState('');
  const [maxRentFilter, setMaxRentFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  
  // Check if property already has an active push
  const { hasActivePush, activePush, loading: pushLoading } = usePropertyPushStatus(property?.id);

  useEffect(() => {
    if (isOpen) {
      fetchUnhousedTenants();
      setSelectedTenant(null);
      setSearchTerm('');
      setCityFilter('');
      setVoucherFilter('');
      setEmploymentFilter('');
      setCreditScoreFilter('');
      setZipCodeFilter('');
      setMaxRentFilter('');
      setShowFilters(false);
    }
  }, [isOpen]);

  // Filter tenants based on search and filters
  useEffect(() => {
    let filtered = unhousedTenants;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tenant =>
        tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.phone.includes(searchTerm) ||
        tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter(tenant => tenant.city === cityFilter);
    }

    // Voucher filter
    if (voucherFilter) {
      if (voucherFilter === 'yes') {
        filtered = filtered.filter(tenant => tenant.voucher_holder);
      } else if (voucherFilter === 'no') {
        filtered = filtered.filter(tenant => !tenant.voucher_holder);
      }
    }

    // Employment filter
    if (employmentFilter) {
      filtered = filtered.filter(tenant => tenant.employment_status === employmentFilter);
    }

    // Credit score filter
    if (creditScoreFilter) {
      if (creditScoreFilter === 'excellent') {
        filtered = filtered.filter(tenant => tenant.credit_score >= 750);
      } else if (creditScoreFilter === 'good') {
        filtered = filtered.filter(tenant => tenant.credit_score >= 670 && tenant.credit_score < 750);
      } else if (creditScoreFilter === 'fair') {
        filtered = filtered.filter(tenant => tenant.credit_score >= 580 && tenant.credit_score < 670);
      } else if (creditScoreFilter === 'poor') {
        filtered = filtered.filter(tenant => tenant.credit_score > 0 && tenant.credit_score < 580);
      }
    }

    // Zip code filter
    if (zipCodeFilter) {
      filtered = filtered.filter(tenant => tenant.zip_code === zipCodeFilter);
    }

    // Max rent filter
    if (maxRentFilter) {
      if (maxRentFilter === 'under1000') {
        filtered = filtered.filter(tenant => tenant.max_rent < 1000);
      } else if (maxRentFilter === '1000to1500') {
        filtered = filtered.filter(tenant => tenant.max_rent >= 1000 && tenant.max_rent <= 1500);
      } else if (maxRentFilter === '1500to2000') {
        filtered = filtered.filter(tenant => tenant.max_rent >= 1500 && tenant.max_rent <= 2000);
      } else if (maxRentFilter === 'over2000') {
        filtered = filtered.filter(tenant => tenant.max_rent > 2000);
      }
    }

    setFilteredTenants(filtered);
  }, [unhousedTenants, searchTerm, cityFilter, voucherFilter, employmentFilter, creditScoreFilter, zipCodeFilter, maxRentFilter]);

  const fetchUnhousedTenants = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching tenant profiles...');
      
      // Get tenant profiles with their profile information
      const { data: tenantProfilesData, error } = await supabase
        .from('tenant_profiles')
        .select(`
          *,
          profiles!tenant_profiles_user_id_fkey (
            first_name,
            last_name,
            phone
          )
        `);

      console.log('📊 Raw tenant profiles data:', tenantProfilesData);
      console.log('❌ Tenant profiles error:', error);

      if (error) {
        console.error('Error fetching tenant profiles:', error);
        toast({
          title: "Database Error",
          description: `Failed to fetch tenant profiles: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!tenantProfilesData || tenantProfilesData.length === 0) {
        console.log('⚠️ No tenant profiles found');
        setUnhousedTenants([]);
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
      console.log('🏠 Found', housedTenantIds.size, 'housed tenants to exclude');

      // Transform the data and filter out housed tenants
      const transformedData = tenantProfilesData
        ?.filter(tenant => !housedTenantIds.has(tenant.user_id))
        ?.map(tenant => {
          // Get the actual first and last name from profiles
          const firstName = tenant.profiles?.first_name || '';
          const lastName = tenant.profiles?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          return {
            id: tenant.id,
            user_id: tenant.user_id,
            full_name: fullName || `Tenant ${tenant.id.slice(0, 8)}`, // Fallback to ID if no name
            phone: tenant.profiles?.phone || 'N/A',
            voucher_holder: tenant.voucher_holder || false,
            voucher_amount: tenant.voucher_amount || 0,
            monthly_income: tenant.monthly_income || '0',
            max_rent: tenant.max_rent || 1200,
            credit_score: tenant.credit_score || 0,
            employment_status: tenant.employment_status || 'N/A',
            city: tenant.city || 'N/A',
            zip_code: tenant.zip_code || 'N/A',
            email: `${firstName?.toLowerCase() || 'tenant'}@demo.com`,
          };
        }) || [];

      const excludedCount = (tenantProfilesData?.length || 0) - transformedData.length;

      console.log('🔄 Transformed unhoused tenant data:', transformedData);
      console.log(`🚫 Excluded ${excludedCount} housed tenants`);
      console.log('🏠 Property for filtering:', property);

      // Filter tenants who might be interested in this property (based on max rent)
      // Be more lenient with filtering - show most tenants unless clearly incompatible
      const interestedTenants = transformedData.filter(tenant => {
        const isEligible = !property || property.monthly_rent === 0 || !tenant.max_rent || tenant.max_rent === 0 || tenant.max_rent >= property.monthly_rent * 0.6;
        console.log(`🎯 Tenant ${tenant.full_name} eligible: ${isEligible} (max_rent: ${tenant.max_rent}, property_rent: ${property?.monthly_rent})`);
        return isEligible;
      });

      console.log('✅ Final interested unhoused tenants:', interestedTenants);
      setUnhousedTenants(interestedTenants);

      // Show toast about filtering
      if (excludedCount > 0) {
        toast({
          title: "Filtered Results",
          description: `Showing ${interestedTenants.length} unhoused tenants. ${excludedCount} tenants excluded (already housed).`,
        });
      }
    } catch (error) {
      console.error('Error fetching unhoused tenants:', error);
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenant(tenantId === selectedTenant ? null : tenantId);
  };

  const handleSendMatches = async () => {
    if (!selectedTenant || !property) {
      toast({
        title: "No Tenant Selected",
        description: "Please select a tenant to send the property match.",
        variant: "destructive",
      });
      return;
    }

    // Check if property already has active push
    if (hasActivePush) {
      toast({
        title: "Property Already Pushed",
        description: "This property already has an active push. Wait for a response or denial before pushing again.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Re-check tenant housing status before sending to prevent race conditions
      const { data: currentHousedTenants } = await supabase
        .from('property_applications')
        .select('tenant_id')
        .eq('status', 'approved')
        .eq('tenant_id', selectedTenant);

      if (currentHousedTenants && currentHousedTenants.length > 0) {
        toast({
          title: "Tenant is now housed",
          description: "Please refresh and select a different tenant",
          variant: "destructive"
        });
        setSending(false);
        return;
      }

      // Create property push for single tenant
      const { error: pushError } = await supabase
        .from('property_pushes')
        .insert({
          property_id: property.id,
          tenant_id: selectedTenant,
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
          user_id: selectedTenant,
          title: 'New Property Match!',
          description: `We found a property for you at ${property.address}. Tap to review!`,
          type: 'property_match',
          category: 'Property',
          metadata: { 
            property_id: property.id, 
            quota_bypass: true,
            admin_push: true,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          },
        });

      if (notificationError) throw notificationError;

      // Send email via edge function
      const tenantData = unhousedTenants.find(t => t.user_id === selectedTenant);
      if (tenantData) {
        try {
          await supabase.functions.invoke('send-property-match-email', {
            body: {
              tenantId: selectedTenant,
              templateSlug: 'tenant_property_match',
              propertyContext: {
                property_address: property.address,
                property_rent: property.monthly_rent?.toString() || '',
                property_url: `${window.location.origin}/dashboard?tab=My%20Matches&internal=true`,
              },
              isAdminPush: true,
            },
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          toast({
            title: "Note",
            description: "Property pushed but email notification may have failed.",
          });
        }
      }

      toast({
        title: "Property Pushed Successfully!",
        description: `Property pushed to tenant. They will receive an in-app notification and email.`,
      });

      onClose();
    } catch (error) {
      console.error('Error sending matches:', error);
      toast({
        title: "Error Sending Matches",
        description: "Failed to send property matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Get unique values for filter dropdowns
  const uniqueCities = [...new Set(unhousedTenants.map(t => t.city).filter(city => city !== 'N/A'))];
  const uniqueEmploymentStatus = [...new Set(unhousedTenants.map(t => t.employment_status).filter(status => status !== 'N/A'))];
  const uniqueZipCodes = [...new Set(unhousedTenants.map(t => t.zip_code).filter(zip => zip !== 'N/A'))];

  const clearFilters = () => {
    setSearchTerm('');
    setCityFilter('');
    setVoucherFilter('');
    setEmploymentFilter('');
    setCreditScoreFilter('');
    setZipCodeFilter('');
    setMaxRentFilter('');
  };

  if (!property) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">{/* Fixed height for better scrolling */}
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Send className="h-6 w-6 text-primary" />
            Push Property to Tenants
          </DialogTitle>
          
          {/* Property Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="font-semibold text-lg text-gray-900">{property.address}</div>
            <div className="flex items-center gap-6 mt-2 text-sm text-gray-700">
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${property.monthly_rent.toLocaleString()}/month
              </span>
              {property.bedrooms && property.bathrooms && (
                <span>{property.bedrooms} bed, {property.bathrooms} bath</span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Available Unhoused Tenants</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {selectedTenant ? '1' : '0'} of {filteredTenants.length} selected
              </Badge>
              <Badge variant="outline" className="text-sm text-muted-foreground">
                Excluding housed tenants
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg border">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
                <Select value={cityFilter} onValueChange={(value) => setCityFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Zip Code</label>
                <Select value={zipCodeFilter} onValueChange={(value) => setZipCodeFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All zip codes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All zip codes</SelectItem>
                    {uniqueZipCodes.map(zip => (
                      <SelectItem key={zip} value={zip}>{zip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Voucher Status</label>
                <Select value={voucherFilter} onValueChange={(value) => setVoucherFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="yes">Has Voucher</SelectItem>
                    <SelectItem value="no">No Voucher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Employment</label>
                <Select value={employmentFilter} onValueChange={(value) => setEmploymentFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All employment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employment</SelectItem>
                    {uniqueEmploymentStatus.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Credit Score</label>
                <Select value={creditScoreFilter} onValueChange={(value) => setCreditScoreFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All scores</SelectItem>
                    <SelectItem value="excellent">Excellent (750+)</SelectItem>
                    <SelectItem value="good">Good (670-749)</SelectItem>
                    <SelectItem value="fair">Fair (580-669)</SelectItem>
                    <SelectItem value="poor">Poor (&lt;580)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Max Rent</label>
                <Select value={maxRentFilter} onValueChange={(value) => setMaxRentFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All ranges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ranges</SelectItem>
                    <SelectItem value="under1000">Under $1,000</SelectItem>
                    <SelectItem value="1000to1500">$1,000 - $1,500</SelectItem>
                    <SelectItem value="1500to2000">$1,500 - $2,000</SelectItem>
                    <SelectItem value="over2000">Over $2,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3 lg:col-span-6 mt-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Tenant List - Scrollable Area */}
        <div className="flex-1 min-h-0"> {/* min-h-0 is crucial for flex child to scroll */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-gray-600">Loading tenants...</span>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full border rounded-lg">
              <div className="p-4 space-y-3 min-h-full">{/* Ensure content can scroll */}
                {filteredTenants.map((tenant) => (
                  <div
                    key={tenant.user_id}
                    className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
                      selectedTenant === tenant.user_id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTenantSelect(tenant.user_id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                        selectedTenant === tenant.user_id 
                          ? 'border-primary bg-primary' 
                          : 'border-gray-300'
                      }`}>
                        {selectedTenant === tenant.user_id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-12 gap-4">
                        {/* Name & Contact */}
                        <div className="col-span-4">
                          <h4 className="font-semibold text-gray-900">{tenant.full_name}</h4>
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{tenant.employment_status}</div>
                        </div>

                        {/* Financial Info */}
                        <div className="col-span-3">
                          <div className="flex items-center gap-1 text-sm font-medium text-green-700">
                            <DollarSign className="h-3 w-3" />
                            ${tenant.monthly_income.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Monthly Income
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Max Rent: ${tenant.max_rent.toLocaleString()}
                          </div>
                        </div>

                        {/* Credit & Employment */}
                        <div className="col-span-2">
                          {tenant.credit_score > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <CreditCard className="h-3 w-3 text-blue-600" />
                              <span className="font-medium">{tenant.credit_score}</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">Credit Score</div>
                        </div>

                        {/* Location & Voucher */}
                        <div className="col-span-3">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium">{tenant.city}</div>
                              <div className="text-xs text-gray-500">{tenant.zip_code}</div>
                            </div>
                          </div>
                          {tenant.voucher_holder && (
                            <Badge variant="secondary" className="text-xs mt-2">
                              Voucher: ${tenant.voucher_amount.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTenants.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-2">
                      <Search className="h-12 w-12 mx-auto" />
                    </div>
                    <div className="text-gray-600 font-medium">No tenants found</div>
                    <div className="text-gray-500 text-sm">
                      {searchTerm || cityFilter || voucherFilter || employmentFilter || creditScoreFilter || zipCodeFilter || maxRentFilter
                        ? 'Try adjusting your filters'
                        : 'No suitable tenants found for this property'
                      }
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {filteredTenants.length > 0 && (
              <span>Showing {filteredTenants.length} of {unhousedTenants.length} tenants</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMatches}
              disabled={!selectedTenant || sending || hasActivePush}
              className="bg-primary hover:bg-primary/90"
            >
              {sending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </div>
              ) : hasActivePush ? (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Already Pushed
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Push to Tenant
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyPushModal;