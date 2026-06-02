import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Home,
  User,
  Send,
  Plus,
  Building2,
  DollarSign,
  Bed,
  Bath,
  Square,
  MapPin,
  X,
} from 'lucide-react';
import { FinderTenant } from '@/hooks/usePropertyFinder';
import { useQuickPropertyImport } from '@/hooks/useQuickPropertyImport';
import { propertyScraperApi, ScrapedPropertyData } from '@/lib/api/propertyScraperApi';
import { AMENITIES_LIST, AMENITIES_BY_CATEGORY, AMENITY_CATEGORIES } from '@/constants/amenities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QuickImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: FinderTenant;
  adminUserId: string;
}

type PropertyType = 'house' | 'apartment' | 'townhouse' | 'mobile_home';

interface FormData {
  // URL
  url: string;
  
  // Property details
  address: string;
  city: string;
  state: string;
  zipCode: string;
  rent: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  description: string;
  propertyType: PropertyType;
  amenities: string[];
  petFriendly: boolean;
  petDeposit: string;
  photos: string[];
  
  // Client
  clientMode: 'existing' | 'new';
  portfolioId: string;
  newClientName: string;
  newClientEmail: string;
  newClientPhone: string;
  
  // Options
  listOnMarketplace: boolean;
  pushToTenant: boolean;
}

const initialFormData: FormData = {
  url: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  rent: '',
  bedrooms: '',
  bathrooms: '',
  squareFeet: '',
  description: '',
  propertyType: 'apartment',
  amenities: [],
  petFriendly: false,
  petDeposit: '',
  photos: [],
  clientMode: 'new',
  portfolioId: '',
  newClientName: '',
  newClientEmail: '',
  newClientPhone: '',
  listOnMarketplace: true,
  pushToTenant: true,
};

export const QuickImportModal: React.FC<QuickImportModalProps> = ({
  open,
  onOpenChange,
  tenant,
  adminUserId,
}) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [scrapeError, setScrapeError] = useState<string>('');
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const importMutation = useQuickPropertyImport();

  // Fetch existing portfolios/clients (only admin-created ones)
  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios-for-import'],
    queryFn: async () => {
      // First, get all admin user IDs
      const { data: adminProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'admin');
      
      if (profileError) throw profileError;
      
      const adminIds = (adminProfiles || []).map(p => p.id);
      
      if (adminIds.length === 0) return [];
      
      // Then, get portfolios managed by admins
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, client_name, client_email')
        .in('manager_id', adminIds)
        .order('client_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setScrapeStatus('idle');
      setScrapeError('');
    }
  }, [open]);

  const handleScrape = async () => {
    if (!formData.url.trim()) return;

    setScrapeStatus('loading');
    setScrapeError('');

    try {
      const result = await propertyScraperApi.scrapeListingUrl(formData.url);

      if (!result.success || !result.data) {
        setScrapeStatus('error');
        setScrapeError(result.error || 'Failed to scrape listing');
        return;
      }

      const data = result.data;

      // Auto-fill form with scraped data
      setFormData(prev => ({
        ...prev,
        address: data.address.street || prev.address,
        city: data.address.city || prev.city,
        state: data.address.state || prev.state,
        zipCode: data.address.zip || prev.zipCode,
        rent: data.rent?.toString() || prev.rent,
        bedrooms: data.bedrooms?.toString() || prev.bedrooms,
        bathrooms: data.bathrooms?.toString() || prev.bathrooms,
        squareFeet: data.squareFeet?.toString() || prev.squareFeet,
        description: data.description || prev.description,
        propertyType: data.propertyType || prev.propertyType,
        amenities: data.amenities.length > 0 ? data.amenities : prev.amenities,
        petFriendly: data.petPolicy.allowed || prev.petFriendly,
        petDeposit: data.petPolicy.deposit?.toString() || prev.petDeposit,
        photos: data.images || prev.photos,
        // Pre-fill client info from scraped contact
        newClientName: data.contactInfo.name || prev.newClientName,
        newClientEmail: data.contactInfo.email || prev.newClientEmail,
        newClientPhone: data.contactInfo.phone || prev.newClientPhone,
      }));

      setScrapeStatus('success');
    } catch (err) {
      setScrapeStatus('error');
      setScrapeError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleAmenityToggle = (key: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter(a => a !== key)
        : [...prev.amenities, key],
    }));
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.address.trim()) {
      setScrapeError('Address is required');
      return;
    }
    if (!formData.city.trim()) {
      setScrapeError('City is required');
      return;
    }
    if (!formData.rent || parseFloat(formData.rent) <= 0) {
      setScrapeError('Valid rent amount is required');
      return;
    }
    if (formData.clientMode === 'new' && !formData.newClientName.trim()) {
      setScrapeError('Client name is required');
      return;
    }
    if (formData.clientMode === 'existing' && !formData.portfolioId) {
      setScrapeError('Please select a client');
      return;
    }

    setScrapeError('');

    await importMutation.mutateAsync({
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      rent: parseFloat(formData.rent),
      bedrooms: parseInt(formData.bedrooms) || 1,
      bathrooms: parseFloat(formData.bathrooms) || 1,
      squareFeet: formData.squareFeet ? parseInt(formData.squareFeet) : undefined,
      description: formData.description,
      propertyType: formData.propertyType,
      amenities: formData.amenities,
      petFriendly: formData.petFriendly,
      petDeposit: formData.petDeposit ? parseFloat(formData.petDeposit) : undefined,
      photos: formData.photos,
      sourceUrl: formData.url || undefined,
      portfolioId: formData.clientMode === 'existing' ? formData.portfolioId : undefined,
      newClient: formData.clientMode === 'new' ? {
        name: formData.newClientName,
        email: formData.newClientEmail || undefined,
        phone: formData.newClientPhone || undefined,
      } : undefined,
      listOnMarketplace: formData.listOnMarketplace,
      pushToTenant: formData.pushToTenant ? {
        tenantId: tenant.user_id,
        tenantName: tenant.full_name,
      } : undefined,
      adminUserId,
    });

    onOpenChange(false);
  };

  const displayedAmenities = showAllAmenities 
    ? AMENITIES_LIST 
    : AMENITIES_LIST.slice(0, 12);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] overflow-hidden !flex !flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Quick Import Property
          </DialogTitle>
          <DialogDescription>
            Importing for: <span className="font-medium text-foreground">{tenant.full_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-6 pb-4">
            {/* URL Scrape Section */}
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4" />
                  Paste Listing URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.zillow.com/homedetails/..."
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    disabled={scrapeStatus === 'loading'}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleScrape}
                    disabled={scrapeStatus === 'loading' || !formData.url.trim()}
                  >
                    {scrapeStatus === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Import'
                    )}
                  </Button>
                </div>
                {scrapeStatus === 'error' && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {scrapeError}
                  </p>
                )}
                {scrapeStatus === 'success' && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Listing imported! Review and edit details below.
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Home className="w-4 h-4" />
                Property Details
              </h3>

              <div className="grid gap-4">
                {/* Address */}
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="TX"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="75001"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Rent, Beds, Baths, SqFt */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="rent" className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Rent *
                    </Label>
                    <Input
                      id="rent"
                      type="number"
                      placeholder="1500"
                      value={formData.rent}
                      onChange={(e) => setFormData(prev => ({ ...prev, rent: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bedrooms" className="flex items-center gap-1">
                      <Bed className="w-3 h-3" /> Beds
                    </Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      placeholder="2"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms" className="flex items-center gap-1">
                      <Bath className="w-3 h-3" /> Baths
                    </Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      step="0.5"
                      placeholder="1"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="squareFeet" className="flex items-center gap-1">
                      <Square className="w-3 h-3" /> Sq Ft
                    </Label>
                    <Input
                      id="squareFeet"
                      type="number"
                      placeholder="1200"
                      value={formData.squareFeet}
                      onChange={(e) => setFormData(prev => ({ ...prev, squareFeet: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <Label>Property Type</Label>
                  <Select
                    value={formData.propertyType}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, propertyType: v as PropertyType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="mobile_home">Mobile Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Property description..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={6}
                    className="resize-y min-h-[120px]"
                  />
                  {formData.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.description.length} characters
                    </p>
                  )}
                </div>

                {/* Amenities */}
                <div>
                  <Label className="mb-2 block">Amenities</Label>
                  <div className="flex flex-wrap gap-2">
                    {displayedAmenities.map((amenity) => (
                      <Badge
                        key={amenity.key}
                        variant={formData.amenities.includes(amenity.key) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleAmenityToggle(amenity.key)}
                      >
                        {amenity.label}
                      </Badge>
                    ))}
                    {!showAllAmenities && AMENITIES_LIST.length > 12 && (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setShowAllAmenities(true)}
                      >
                        +{AMENITIES_LIST.length - 12} more
                      </Badge>
                    )}
                  </div>
                  {formData.amenities.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.amenities.length} selected
                    </p>
                  )}
                </div>

                {/* Pet Policy */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="petFriendly"
                      checked={formData.petFriendly}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, petFriendly: checked === true }))
                      }
                    />
                    <Label htmlFor="petFriendly" className="cursor-pointer">Pet Friendly</Label>
                  </div>
                  {formData.petFriendly && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="petDeposit" className="text-sm">Pet Deposit: $</Label>
                      <Input
                        id="petDeposit"
                        type="number"
                        placeholder="300"
                        value={formData.petDeposit}
                        onChange={(e) => setFormData(prev => ({ ...prev, petDeposit: e.target.value }))}
                        className="w-24"
                      />
                    </div>
                  )}
                </div>

                {/* Photos Preview - Show ALL photos in scrollable grid */}
                {formData.photos.length > 0 && (
                  <div>
                    <Label className="mb-2 flex items-center justify-between">
                      <span>Scraped Photos</span>
                      <Badge variant="secondary">{formData.photos.length} photos</Badge>
                    </Label>
                    <ScrollArea className="h-48 rounded border p-2">
                      <div className="grid grid-cols-4 gap-2">
                        {formData.photos.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`Property ${idx + 1}`}
                              className="w-full aspect-square object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Client/Portfolio Section */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Client / Landlord
              </h3>

              <div className="flex gap-4">
                <Button
                  variant={formData.clientMode === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, clientMode: 'new' }))}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Client
                </Button>
                <Button
                  variant={formData.clientMode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, clientMode: 'existing' }))}
                  disabled={portfolios.length === 0}
                >
                  <Building2 className="w-4 h-4 mr-1" />
                  Existing ({portfolios.length})
                </Button>
              </div>

              {formData.clientMode === 'new' ? (
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="newClientName">Client Name *</Label>
                    <Input
                      id="newClientName"
                      placeholder="John Smith"
                      value={formData.newClientName}
                      onChange={(e) => setFormData(prev => ({ ...prev, newClientName: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="newClientEmail">Email</Label>
                      <Input
                        id="newClientEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.newClientEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, newClientEmail: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newClientPhone">Phone</Label>
                      <Input
                        id="newClientPhone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.newClientPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, newClientPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Select Client</Label>
                  <Select
                    value={formData.portfolioId}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, portfolioId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.client_name}
                          {p.client_email && <span className="text-muted-foreground ml-2">({p.client_email})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Import Options */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Send className="w-4 h-4" />
                Import Options
              </h3>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="listOnMarketplace"
                  checked={formData.listOnMarketplace}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, listOnMarketplace: checked === true }))
                  }
                />
                <Label htmlFor="listOnMarketplace" className="cursor-pointer">
                  List on marketplace immediately
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="pushToTenant"
                  checked={formData.pushToTenant}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, pushToTenant: checked === true }))
                  }
                />
                <Label htmlFor="pushToTenant" className="cursor-pointer">
                  Push to <span className="font-medium">{tenant.full_name}</span>
                </Label>
                {formData.pushToTenant && (
                  <Badge variant="secondary" className="ml-auto">
                    Will notify tenant
                  </Badge>
                )}
              </div>
            </div>

            {/* Error Display */}
            {scrapeError && scrapeStatus !== 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
                <AlertCircle className="w-4 h-4" />
                {scrapeError}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Import Property
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
