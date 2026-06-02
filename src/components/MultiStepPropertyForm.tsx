import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePmMode } from '@/hooks/usePmMode';
import { usePropertyCreation } from '@/hooks/usePropertyCreation';
import { DuplicateResolutionDialog } from './DuplicateResolutionDialog';
import { DuplicateCheckResult } from '@/utils/duplicateDetection';
import { supabase } from '@/integrations/supabase/client';
import { propertyScraperApi } from '@/lib/api/propertyScraperApi';
import { LISTING_AMENITIES } from '@/constants/listingAmenities';

// Import the sophisticated step components
import { PropertyBasicInfo } from './property-steps/PropertyBasicInfo';
import { PropertyUnits } from './property-steps/PropertyUnits';
import { PropertyAmenities } from './property-steps/PropertyAmenities';
import { PropertyFinances } from './property-steps/PropertyFinances';

interface MultiStepPropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId?: string;
  onPropertyAdded?: () => void;
}

const TAB_VALUES = {
  'basic-info': 'Basic Info',
  'units': 'Units', 
  'amenities': 'Amenities & Features',
  'finances': 'Finances & Status'
} as const;

const PM_STEP_LABELS = ['Basic Info', 'Units', 'Amenities & Features', 'Finances & Status'];
const LISTING_STEP_LABELS = ['Basic Info', 'Units', 'Amenities & Features'];

const PM_TAB_ORDER = ['basic-info', 'units', 'amenities', 'finances'];
const LISTING_TAB_ORDER = ['basic-info', 'units', 'amenities'];

export function MultiStepPropertyForm({ 
  isOpen, 
  onClose, 
  portfolioId,
  onPropertyAdded 
}: MultiStepPropertyFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { pmEnabled } = usePmMode();
  const { checkDuplicates, createProperty, isCreating } = usePropertyCreation();
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('basic-info');
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [scrapeError, setScrapeError] = useState('');
  const [autoListOnSubmit, setAutoListOnSubmit] = useState(false);

  // Listing-mode landlords don't need to fill in operating expenses,
  // capital structure, balance sheet, or performance metrics — that's PM territory.
  const tabOrder = useMemo(() => (pmEnabled ? PM_TAB_ORDER : LISTING_TAB_ORDER), [pmEnabled]);
  const stepLabels = useMemo(() => (pmEnabled ? PM_STEP_LABELS : LISTING_STEP_LABELS), [pmEnabled]);
  const getStepFromTab = (tab: string): number => tabOrder.indexOf(tab);
  const lastTab = tabOrder[tabOrder.length - 1];

  // Comprehensive form data state
  const [formData, setFormData] = useState({
    // Basic Info
    images: [],
    portfolioId: portfolioId || '',
    selectedPortfolio: portfolioId === 'everything' ? '' : (portfolioId || ''),
    country: 'US',
    streetAddress: '',
    city: '',
    state: '',
    zipcode: '',
    latitude: null as number | null,
    longitude: null as number | null,
    bedrooms: '',
    bathrooms: '',
    propertyType: '',
    squareFeet: '',
    yearBuilt: '',
    
    // Units
    unitCount: 1,
    units: [{ 
      id: '1', 
      name: 'Unit 1', 
      bedrooms: '', 
      bathrooms: '', 
      squareFeet: '' 
    }],
    
    // Amenities
    amenities: {},
    
    // Finances
    status: 'vacant',
    tenantType: 'market_rate',
    monthly_rent: '',
    securityDepositAmount: '',
    applicationFee: '',
    late_fee_amount: '',
    pet_deposit: '',
    petFeeMonthly: '',
    otherIncomeSources: '',
    parking_income: '',
    storage_income: '',
    laundry_income: '',
    otherIncomeDescription: '',
    insurance_cost: '',
    mortgage_cost: '',
    management_fee: '',
    repair_costs: '',
    propertyTaxes: '',
    utilityWater: '',
    utilityElectric: '',
    utilityGas: '',
    utilityTrash: '',
    landscapingCost: '',
    advertisingCost: '',
    legalProfessionalFees: '',
    propertyManagementSoftware: '',
    capitalImprovements: '',
    turnoverCosts: '',
    tenantScreeningCosts: '',
    hoa_fees: '',
    accounting_fees: '',
    
    // Balance Sheet fields
    outstanding_mortgage_balance: '',
    cash_reserves: '',
    accounts_payable: '',
    prepaid_expenses: '',
    accumulated_depreciation: '',
    
    // Property Statement fields
    beginning_cash_balance: '',
    ending_cash_balance: '',
    owner_contributions: '',
    owner_draws: '',
    property_reserve: '',
    tenant_security_deposits_held: '',
    other_additions: '',
    other_subtractions: '',
    other_expenses: '',
    purchasePrice: '',
    currentMarketValue: '',
    purchaseDate: '',
    downPaymentAmount: '',
    loanAmount: '',
    interestRate: '',
    loan_term: '',
    closing_costs: '',
    renovation_costs: '',
    annual_property_tax: '',
    depreciation_method: '',
    depreciation_period: '',
    tax_deductions: '',
    leaseRenewalRate: '',
    averageRentIncrease: '',
    targetNoi: '',
    targetCapRate: '',
    expectedAnnualAppreciation: '',
    reserveFundTarget: '',
    vacancy_rate: '',
    occupancy_rate: ''
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAmenity = (amenity: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [amenity]: value
      }
    }));
  };

  const handleScrapeUrl = async (url: string) => {
    if (!url.trim()) return;
    
    setScrapeStatus('loading');
    setScrapeError('');
    
    try {
      const result = await propertyScraperApi.scrapeListingUrl(url);
      
      if (!result.success || !result.data) {
        setScrapeStatus('error');
        setScrapeError(result.error || 'Failed to import listing');
        return;
      }
      
      const data = result.data;
      
      // Map scraped amenities to our format
      const scrapedAmenities = data.amenities || [];
      const amenitiesMap: Record<string, boolean> = {};
      
      LISTING_AMENITIES.forEach(({ key }) => {
        if (scrapedAmenities.includes(key)) {
          amenitiesMap[key] = true;
        }
      });
      
      // Handle pet-friendly from pet policy
      if (data.petPolicy.allowed) {
        amenitiesMap['petFriendly'] = true;
      }
      
      // Update form data with scraped values
      setFormData(prev => ({
        ...prev,
        // Address
        streetAddress: data.address.street || prev.streetAddress,
        city: data.address.city || prev.city,
        state: data.address.state || prev.state,
        zipcode: data.address.zip || prev.zipcode,
        // Property details
        bedrooms: data.bedrooms?.toString() || prev.bedrooms,
        bathrooms: data.bathrooms?.toString() || prev.bathrooms,
        squareFeet: data.squareFeet?.toString() || prev.squareFeet,
        yearBuilt: data.yearBuilt?.toString() || prev.yearBuilt,
        propertyType: data.propertyType || prev.propertyType,
        // Finances
        monthly_rent: data.rent?.toString() || prev.monthly_rent,
        // Images
        images: data.images.length > 0 ? data.images : prev.images,
        // Amenities
        amenities: {
          ...prev.amenities,
          ...amenitiesMap,
        },
      }));
      
      setScrapeStatus('success');
      setAutoListOnSubmit(true); // Enable auto-list by default when URL imported
      
      toast({
        title: "Details imported!",
        description: "Review and adjust the imported information below.",
      });
    } catch (err) {
      console.error('Error scraping URL:', err);
      setScrapeStatus('error');
      setScrapeError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleNext = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex >= 0 && currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const validateForm = () => {
    // Validate portfolio selection when coming from "everything" view
    if (portfolioId === 'everything' && !formData.selectedPortfolio) {
      toast({
        title: "Portfolio Required",
        description: "Please select a client portfolio for this property.",
        variant: "destructive",
      });
      setActiveTab('basic-info'); // Go back to first tab
      return false;
    }
    
    if (!formData.streetAddress || !formData.city || !formData.state || !formData.zipcode) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required address fields.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!validateForm()) return;

    // Check for duplicates first
    const duplicates = await checkDuplicates({
      owner_id: user.id,
      address: formData.streetAddress,
      property_type: formData.propertyType
    });

    if (duplicates.hasDuplicates) {
      setDuplicateResult(duplicates);
      setShowDuplicateDialog(true);
      return;
    }

    await submitProperty();
  };

  const submitProperty = async () => {
    if (!user) return;

    try {
      const propertyData = {
        owner_id: user.id,
        portfolio_id: formData.selectedPortfolio || (formData.portfolioId === 'everything' ? null : (formData.portfolioId || null)),
        address: formData.streetAddress,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        country: formData.country || 'US',
        latitude: formData.latitude,
        longitude: formData.longitude,
        property_type: formData.propertyType || 'house',
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_feet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
        year_built: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
        status: formData.status || 'vacant',
        on_market: autoListOnSubmit,
        unit_count: formData.unitCount || 1,
        default_tenant_type: formData.tenantType || 'market_rate',
        units: formData.units, // Pass units array to create all units
        
        // Financial data
        security_deposit_amount: formData.securityDepositAmount ? parseFloat(formData.securityDepositAmount) : null,
        application_fee: formData.applicationFee ? parseFloat(formData.applicationFee) : null,
        late_fee_amount: formData.late_fee_amount ? parseFloat(formData.late_fee_amount) : null,
        pet_deposit: formData.pet_deposit ? parseFloat(formData.pet_deposit) : null,
        insurance_cost: formData.insurance_cost ? parseFloat(formData.insurance_cost) : null,
        mortgage_cost: formData.mortgage_cost ? parseFloat(formData.mortgage_cost) : null,
        property_taxes: formData.propertyTaxes ? parseFloat(formData.propertyTaxes) : null,
        hoa_fees: formData.hoa_fees ? parseFloat(formData.hoa_fees) : null,
        
        // Balance Sheet fields
        outstanding_mortgage_balance: formData.outstanding_mortgage_balance ? parseFloat(formData.outstanding_mortgage_balance) : null,
        cash_reserves: formData.cash_reserves ? parseFloat(formData.cash_reserves) : null,
        accounts_payable: formData.accounts_payable ? parseFloat(formData.accounts_payable) : null,
        prepaid_expenses: formData.prepaid_expenses ? parseFloat(formData.prepaid_expenses) : null,
        accumulated_depreciation: formData.accumulated_depreciation ? parseFloat(formData.accumulated_depreciation) : null,
        
        // Property Statement fields
        beginning_cash_balance: formData.beginning_cash_balance ? parseFloat(formData.beginning_cash_balance) : null,
        ending_cash_balance: formData.ending_cash_balance ? parseFloat(formData.ending_cash_balance) : null,
        owner_contributions: formData.owner_contributions ? parseFloat(formData.owner_contributions) : null,
        owner_draws: formData.owner_draws ? parseFloat(formData.owner_draws) : null,
        property_reserve: formData.property_reserve ? parseFloat(formData.property_reserve) : null,
        tenant_security_deposits_held: formData.tenant_security_deposits_held ? parseFloat(formData.tenant_security_deposits_held) : null,
        other_additions: formData.other_additions ? parseFloat(formData.other_additions) : null,
        other_subtractions: formData.other_subtractions ? parseFloat(formData.other_subtractions) : null,
        other_income: formData.otherIncomeSources ? parseFloat(formData.otherIncomeSources) : null,
        other_expenses: formData.other_expenses ? parseFloat(formData.other_expenses) : null,
        
        // Amenities - convert object to array of selected amenity labels
        amenities: Object.entries(formData.amenities || {})
          .filter(([key, value]) => value === true)
          .map(([key]) => {
            // Map camelCase keys to human-readable labels
            const amenityLabels: Record<string, string> = {
              airConditioning: 'Air Conditioning',
              furnished: 'Furnished',
              inUnitLaundry: 'In-Unit Laundry',
              sharedLaundry: 'Shared Laundry',
              laundryHookups: 'Laundry Hookups',
              balconyPatio: 'Balcony/Patio',
              yardGarden: 'Yard/Garden',
              parkingAvailable: 'Parking Available',
              petFriendly: 'Pet-Friendly',
              dishwasher: 'Dishwasher',
              microwave: 'Microwave',
              refrigerator: 'Refrigerator',
              hardwoodFloors: 'Hardwood Floors',
              carpet: 'Carpet',
              tileFloors: 'Tile Floors',
              centralHeating: 'Central Heating',
              fireplace: 'Fireplace',
              walkinClosets: 'Walk-in Closets',
              storageUnit: 'Storage Unit',
              gymFitness: 'Gym/Fitness Center',
              pool: 'Pool',
              securitySystem: 'Security System'
            };
            return amenityLabels[key] || key;
          }),
        
        // Property photos
        photos: formData.images || []
      };

      const newProperty = await createProperty(propertyData);
      
      // Only geocode in background if coordinates weren't provided
      if (newProperty?.id && !formData.latitude && !formData.longitude) {
        const fullAddress = `${formData.streetAddress}, ${formData.city}, ${formData.state} ${formData.zipcode}`;
        supabase.functions.invoke('geocode-address', {
          body: {
            property_id: newProperty.id,
            address: fullAddress,
            country: formData.country || 'US'
          }
        })
          .then(() => console.log('Property geocoded successfully'))
          .catch((geocodeError) => console.error('Geocoding failed:', geocodeError));
      }
      
      // Immediately proceed with callback without waiting for geocoding
      if (onPropertyAdded) {
        await onPropertyAdded();
      }
      handleClose();
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create property.",
        variant: "destructive",
      });
    }
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
    setDuplicateResult(null);
  };

  const handleClose = () => {
    setFormData({
      images: [],
      portfolioId: portfolioId || '',
      selectedPortfolio: portfolioId === 'everything' ? '' : (portfolioId || ''),
      country: 'US',
      streetAddress: '',
      city: '',
      state: '',
      zipcode: '',
      latitude: null,
      longitude: null,
      bedrooms: '',
      bathrooms: '',
      propertyType: '',
      squareFeet: '',
      yearBuilt: '',
      unitCount: 1,
      units: [{ 
        id: '1', 
        name: 'Unit 1', 
        bedrooms: '', 
        bathrooms: '', 
        squareFeet: '' 
      }],
      amenities: {},
      status: 'vacant',
      tenantType: 'market_rate',
      monthly_rent: '',
      securityDepositAmount: '',
      applicationFee: '',
      late_fee_amount: '',
      pet_deposit: '',
      petFeeMonthly: '',
      otherIncomeSources: '',
      parking_income: '',
      storage_income: '',
      laundry_income: '',
      otherIncomeDescription: '',
      insurance_cost: '',
      mortgage_cost: '',
      management_fee: '',
      repair_costs: '',
      propertyTaxes: '',
      utilityWater: '',
      utilityElectric: '',
      utilityGas: '',
      utilityTrash: '',
      landscapingCost: '',
      advertisingCost: '',
      legalProfessionalFees: '',
      propertyManagementSoftware: '',
      capitalImprovements: '',
      turnoverCosts: '',
      tenantScreeningCosts: '',
      hoa_fees: '',
      accounting_fees: '',
      purchasePrice: '',
      currentMarketValue: '',
      purchaseDate: '',
      downPaymentAmount: '',
      loanAmount: '',
      interestRate: '',
      loan_term: '',
      closing_costs: '',
      renovation_costs: '',
      annual_property_tax: '',
      depreciation_method: '',
      depreciation_period: '',
      tax_deductions: '',
      leaseRenewalRate: '',
      averageRentIncrease: '',
      targetNoi: '',
      targetCapRate: '',
      expectedAnnualAppreciation: '',
      reserveFundTarget: '',
      vacancy_rate: '',
      occupancy_rate: '',
      
      // Balance Sheet fields
      outstanding_mortgage_balance: '',
      cash_reserves: '',
      accounts_payable: '',
      prepaid_expenses: '',
      accumulated_depreciation: '',
      
      // Property Statement fields
      beginning_cash_balance: '',
      ending_cash_balance: '',
      owner_contributions: '',
      owner_draws: '',
      property_reserve: '',
      tenant_security_deposits_held: '',
      other_additions: '',
      other_subtractions: '',
      other_expenses: ''
    });
    setActiveTab('basic-info');
    setShowDuplicateDialog(false);
    setDuplicateResult(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
          </DialogHeader>

          <div className="mb-6">
            <Stepper
              currentStep={getStepFromTab(activeTab)}
              steps={stepLabels}
              className="mb-6"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${pmEnabled ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
              <TabsTrigger value="units">Units</TabsTrigger>
              <TabsTrigger value="amenities">Amenities & Features</TabsTrigger>
              {pmEnabled && (
                <TabsTrigger value="finances">Finances & Status</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="basic-info" className="space-y-6">
              <PropertyBasicInfo
                formData={formData}
                updateFormData={updateFormData}
                userId={user?.id || ''}
                portfolioId={portfolioId}
                onScrapeUrl={handleScrapeUrl}
                scrapeStatus={scrapeStatus}
                scrapeError={scrapeError}
                autoListOnSubmit={autoListOnSubmit}
                onAutoListChange={setAutoListOnSubmit}
              />
            </TabsContent>

            <TabsContent value="units" className="space-y-6">
              <PropertyUnits
                formData={formData}
                updateFormData={updateFormData}
              />
            </TabsContent>

            <TabsContent value="amenities" className="space-y-6">
              <PropertyAmenities
                formData={formData}
                updateFormData={updateFormData}
                updateAmenity={updateAmenity}
              />
            </TabsContent>

            {pmEnabled && (
              <TabsContent value="finances" className="space-y-6">
                <PropertyFinances
                  formData={formData}
                  updateFormData={updateFormData}
                  property={{ unit_count: formData.unitCount }}
                />
              </TabsContent>
            )}

            <div className="flex justify-between pt-6">
              {/* Left side - Back or Cancel */}
              {activeTab === 'basic-info' ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}

              {/* Right side - Next or Submit */}
              {activeTab === lastTab ? (
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={isCreating}
                >
                  {isCreating ? 'Adding Property...' : 'Add Property'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {duplicateResult && (
        <DuplicateResolutionDialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          duplicateResult={duplicateResult}
          onProceedAnyway={() => {}} // Blocked - does nothing
          onCancel={handleCancelDuplicate}
          actionType="add"
        />
      )}
    </>
  );
}