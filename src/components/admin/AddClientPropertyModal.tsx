import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePropertyGeocoding } from '@/hooks/usePropertyGeocoding';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { PropertyBasicInfo } from '@/components/property-steps/PropertyBasicInfo';
import { PropertyUnits } from '@/components/property-steps/PropertyUnits';
import { PropertyAmenities } from '@/components/property-steps/PropertyAmenities';
import { Loader2, Home, Building2, ArrowLeft, ArrowRight, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { propertyScraperApi } from '@/lib/api/propertyScraperApi';

interface AddClientPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  adminUserId: string;
}

type PropertyType = 'residential' | 'commercial';

export const AddClientPropertyModal: React.FC<AddClientPropertyModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  adminUserId,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [existingPortfolios, setExistingPortfolios] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedRent, setScrapedRent] = useState<number | null>(null);
  const [wasQuickImported, setWasQuickImported] = useState(false);
  const { toast } = useToast();
  const { geocodeProperty: geocodePropertyWithRetry } = usePropertyGeocoding();

  // Form data state
  const [formData, setFormData] = useState<any>({
    images: [],
    streetAddress: '',
    city: '',
    state: '',
    zipcode: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: '',
    squareFeet: '',
    yearBuilt: '',
    unitCount: 1,
    units: [],
    description: '',
    amenities: {
      air_conditioning: false,
      heating: false,
      furnished: false,
      in_unit_laundry: false,
      shared_laundry: false,
      laundry_hookups: false,
      balcony_patio: false,
      yard_garden: false,
      parking: false,
      garage: false,
      pet_friendly: false,
      dishwasher: false,
      microwave: false,
      refrigerator: false,
      stove_oven: false,
      garbage_disposal: false,
      washer: false,
      dryer: false,
      hardwood_floors: false,
      carpet: false,
      tile_floors: false,
      fireplace: false,
      walk_in_closets: false,
      storage_unit: false,
      ceiling_fans: false,
      gym_fitness: false,
      pool: false,
      security_system: false,
      wheelchair_accessible: false,
      smoking_allowed: false,
    },
  });

  useEffect(() => {
    if (open) {
      fetchExistingPortfolios();
      // Reset form state when modal opens
      setCurrentStep(0);
      setPropertyType(null);
      setSelectedClient('');
      setScrapeUrl('');
      setScrapeStatus('idle');
      setScrapeError('');
      setScrapedRent(null);
      setWasQuickImported(false);
      setFormData({
        images: [],
        streetAddress: '',
        city: '',
        state: '',
        zipcode: '',
        bedrooms: '',
        bathrooms: '',
        propertyType: '',
        squareFeet: '',
        yearBuilt: '',
        unitCount: 1,
        units: [],
        description: '',
        amenities: {
          air_conditioning: false,
          heating: false,
          furnished: false,
          in_unit_laundry: false,
          shared_laundry: false,
          laundry_hookups: false,
          balcony_patio: false,
          yard_garden: false,
          parking: false,
          garage: false,
          pet_friendly: false,
          dishwasher: false,
          microwave: false,
          refrigerator: false,
          stove_oven: false,
          garbage_disposal: false,
          washer: false,
          dryer: false,
          hardwood_floors: false,
          carpet: false,
          tile_floors: false,
          fireplace: false,
          walk_in_closets: false,
          storage_unit: false,
          ceiling_fans: false,
          gym_fitness: false,
          pool: false,
          security_system: false,
          wheelchair_accessible: false,
          smoking_allowed: false,
        },
      });
    }
  }, [open]);

  const fetchExistingPortfolios = async () => {
    const { data, error } = await supabase
      .from('portfolios')
      .select('id, client_name, client_email, client_phone')
      .or('client_email.not.is.null,client_phone.not.is.null,client_notes.not.is.null')
      .order('client_name');

    if (!error && data) {
      setExistingPortfolios(data);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateAmenity = (amenity: string, value: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      amenities: { ...prev.amenities, [amenity]: value },
    }));
  };

  const handlePropertyTypeSelect = (type: PropertyType) => {
    setPropertyType(type);
    setCurrentStep(1); // Move to client selection
  };

  const mapScrapedAmenities = (scrapedAmenities: string[]) => {
    const result = { ...formData.amenities };
    scrapedAmenities.forEach(key => {
      if (key in result) {
        result[key as keyof typeof result] = true;
      }
    });
    return result;
  };

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    
    setScrapeStatus('loading');
    setScrapeError('');
    
    try {
      const result = await propertyScraperApi.scrapeListingUrl(scrapeUrl);
      
      if (!result.success || !result.data) {
        setScrapeStatus('error');
        setScrapeError(result.error || 'Failed to scrape listing');
        return;
      }
      
      const data = result.data;
      
      // Capture rent from scraped data for on-market listing
      setScrapedRent(data.rent || null);
      setWasQuickImported(true);
      
      // Auto-fill form with scraped data
      setFormData((prev: any) => ({
        ...prev,
        images: data.images || prev.images,
        streetAddress: data.address.street || prev.streetAddress,
        city: data.address.city || prev.city,
        state: data.address.state || prev.state,
        zipcode: data.address.zip || prev.zipcode,
        bedrooms: data.bedrooms?.toString() || prev.bedrooms,
        bathrooms: data.bathrooms?.toString() || prev.bathrooms,
        squareFeet: data.squareFeet?.toString() || prev.squareFeet,
        propertyType: data.propertyType || prev.propertyType,
        description: data.description || prev.description,
        amenities: mapScrapedAmenities(data.amenities),
      }));
      
      setScrapeStatus('success');
    } catch (err) {
      setScrapeStatus('error');
      setScrapeError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // Go back to property type selection
      setPropertyType(null);
      setCurrentStep(0);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    // Validation for client selection step
    if (currentStep === 1 && !selectedClient) {
      toast({
        title: 'Client Required',
        description: 'Please select a client before continuing.',
        variant: 'destructive',
      });
      return;
    }

    // Validation for basic info step
    if (currentStep === 2) {
      if (!formData.streetAddress || !formData.city || !formData.state || !formData.zipcode) {
        toast({
          title: 'Required Fields Missing',
          description: 'Please fill in all required address fields.',
          variant: 'destructive',
        });
        return;
      }
    }

    setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Upload images first if any
      const uploadedImageUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        for (const image of formData.images) {
          if (typeof image === 'string') {
            uploadedImageUrls.push(image);
          }
        }
      }

      // Prepare property data - on_market if Quick Imported from listing URL
      const propertyData: any = {
        address: formData.streetAddress,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        property_type: formData.propertyType || null,
        square_feet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
        year_built: formData.yearBuilt || null,
        unit_count: formData.unitCount || 1,
        portfolio_id: selectedClient,
        owner_id: adminUserId,
        status: 'vacant',
        on_market: wasQuickImported, // ON-MARKET if imported from listing URL
        admin_listed: wasQuickImported, // Flag for admin-created marketplace listings
        default_tenant_type: 'market_rate',
        photos: uploadedImageUrls,
        // Amenities - convert to array of selected amenities
        amenities: Object.keys(formData.amenities).filter(key => formData.amenities[key]),
      };

      // Insert property
      const { data: newProperty, error: propertyError } = await supabase
        .from('properties')
        .insert(propertyData)
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Geocode the property immediately after creation with retry logic
      const fullAddress = `${formData.streetAddress}, ${formData.city}, ${formData.state} ${formData.zipcode}`;
      
      toast({
        title: "Geocoding Address",
        description: "Adding property location to map...",
      });

      const geocodeResult = await geocodePropertyWithRetry(newProperty.id, fullAddress);
      
      if (!geocodeResult.success) {
        // Show warning but don't block property creation
        toast({
          title: "Property Created",
          description: "Property was created successfully but geocoding failed. You can retry geocoding from the property actions menu.",
          variant: "default",
        });
      }

      // Always create at least Unit 1
      let unitsData: any[] = [];

      if (formData.units && formData.units.length > 0 && formData.unitCount > 1) {
        // Multi-unit: use the units from the form
        unitsData = formData.units.map((unit: any) => ({
          property_id: newProperty.id,
          unit_number: unit.name || unit.id,
          unit_name: unit.name,
          bedrooms: unit.bedrooms || null,
          bathrooms: unit.bathrooms || null,
          square_feet: unit.squareFeet || null,
          monthly_rent: null,
          status: 'vacant',
        }));
      } else {
        // Single-unit: auto-create Unit 1 with property's full bed/bath
        unitsData = [{
          property_id: newProperty.id,
          unit_number: '1',
          unit_name: 'Unit 1',
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          square_feet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
          monthly_rent: scrapedRent, // Use scraped rent for marketplace
          description: formData.description || null, // Use scraped description
          status: 'vacant',
          on_market: wasQuickImported, // ON-MARKET if imported from listing URL
          photos: uploadedImageUrls, // Photos on unit for marketplace display
        }];
      }

      // Insert unit(s)
      const { error: unitsError } = await supabase
        .from('property_units')
        .insert(unitsData);

      if (unitsError) throw unitsError;

      toast({
        title: 'Success',
        description: wasQuickImported 
          ? `Client property added and listed on marketplace${scrapedRent ? ` at $${scrapedRent.toLocaleString()}/mo` : ''}!`
          : 'Client property added successfully (Off Market)',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding client property:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add property. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Property Type', 'Select Client', 'Basic Info', 'Units', 'Amenities'];

  // Step 0: Property Type Selection
  if (!propertyType) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Client Property</DialogTitle>
            <DialogDescription>
              Choose between residential or commercial property types
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 py-6">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
              onClick={() => handlePropertyTypeSelect('residential')}
            >
              <CardContent className="p-6 text-center">
                <Home className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="mb-2">Residential Property</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Single family homes, condos, apartments, and other residential properties
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
              onClick={() => handlePropertyTypeSelect('commercial')}
            >
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="mb-2">Commercial Property</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Office buildings, retail spaces, warehouses, and other commercial properties
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Steps 1-4: Multi-step form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Client Property - {propertyType === 'residential' ? 'Residential' : 'Commercial'}</DialogTitle>
          <DialogDescription>
            Complete the following steps to add a property for your client
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Stepper currentStep={currentStep - 1} steps={steps.slice(1)} />
        </div>

        <div className="space-y-6">
          {/* Step 1: Client Selection */}
          {currentStep === 1 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Select Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingPortfolios.map((portfolio) => (
                          <SelectItem key={portfolio.id} value={portfolio.id}>
                            {portfolio.client_name}
                            {portfolio.client_email && ` (${portfolio.client_email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Don't see your client? Use the "Add Client" button first to create a new client portfolio.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Import Section */}
              {selectedClient && (
                <Card className="border-dashed border-muted/50 bg-muted/5">
                  <CardContent className="pt-4">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Link2 className="w-4 h-4" />
                      Quick Import from Listing URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://www.zillow.com/homedetails/..."
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        disabled={scrapeStatus === 'loading'}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleScrape}
                        disabled={scrapeStatus === 'loading' || !scrapeUrl.trim()}
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
              )}
            </>
          )}

          {/* Step 2: Basic Info */}
          {currentStep === 2 && (
            <PropertyBasicInfo
              formData={formData}
              updateFormData={updateFormData}
              userId={adminUserId}
              portfolioId={selectedClient}
            />
          )}

          {/* Step 3: Units */}
          {currentStep === 3 && (
            <PropertyUnits formData={formData} updateFormData={updateFormData} />
          )}

          {/* Step 4: Amenities */}
          {currentStep === 4 && (
            <PropertyAmenities
              formData={formData}
              updateFormData={updateFormData}
              updateAmenity={updateAmenity}
            />
          )}
        </div>

        <div className="flex justify-between gap-3 pt-6 border-t">
          <Button variant="outline" onClick={handleBack} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Property
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
