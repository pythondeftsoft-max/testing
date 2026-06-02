import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { PermissionProvider } from '@/providers/PermissionProvider';
import { usePropertyGeocoding } from '@/hooks/usePropertyGeocoding';

// Import the sophisticated step components
import { PropertyBasicInfo } from './property-steps/PropertyBasicInfo';
import { PropertyUnits } from './property-steps/PropertyUnits';
import { PropertyAmenities } from './property-steps/PropertyAmenities';
import { PropertyFinances } from './property-steps/PropertyFinances';

interface MultiStepEditPropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingProperty?: any;
  userId: string;
  portfolioId?: string;
}

const STEP_LABELS = ['Basic Info', 'Units', 'Amenities & Features', 'Finances & Status'];

const getStepFromTab = (tab: string): number => {
  const tabOrder = ['basic-info', 'units', 'amenities', 'finances'];
  return tabOrder.indexOf(tab);
};

export function MultiStepEditPropertyForm({ 
  isOpen, 
  onClose, 
  onSave,
  editingProperty,
  userId,
  portfolioId 
}: MultiStepEditPropertyFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { geocodeProperty } = usePropertyGeocoding();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('basic-info');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Comprehensive form data state
  const [formData, setFormData] = useState({
    // Basic Info
    images: [],
    portfolioId: portfolioId || '',
    streetAddress: '',
    city: '',
    state: '',
    zipcode: '',
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
    occupancy_rate: '',
    description: '',
    has_voucher: false,
    min_voucher_amount: '',
    max_voucher_amount: ''
  });

  // Pre-fill form data when editingProperty changes
  useEffect(() => {
    if (editingProperty) {
      setFormData({
        images: editingProperty.images || [],
        portfolioId: editingProperty.portfolio_id || portfolioId || '',
        streetAddress: editingProperty.street_address || editingProperty.address || '',
        city: editingProperty.city || '',
        state: editingProperty.state || '',
        zipcode: editingProperty.zipcode || '',
        bedrooms: editingProperty.bedrooms ? String(editingProperty.bedrooms) : '',
        bathrooms: editingProperty.bathrooms ? String(editingProperty.bathrooms) : '',
        propertyType: editingProperty.property_type || '',
        squareFeet: editingProperty.square_feet ? String(editingProperty.square_feet) : '',
        yearBuilt: editingProperty.year_built ? String(editingProperty.year_built) : '',
        
        unitCount: editingProperty.property_units?.length || editingProperty.unit_count || 1,
        units: editingProperty.property_units && editingProperty.property_units.length > 0
          ? editingProperty.property_units.map(unit => ({
              id: unit.id,
              name: unit.unit_name || unit.unit_number || 'Unit',
              bedrooms: unit.bedrooms ? String(unit.bedrooms) : '',
              bathrooms: unit.bathrooms ? String(unit.bathrooms) : '',
              squareFeet: unit.square_feet || unit.unit_square_feet ? String(unit.square_feet || unit.unit_square_feet) : '',
              monthlyRent: unit.monthly_rent ? String(unit.monthly_rent) : ''
            }))
          : [{ 
              id: '1', 
              name: 'Unit 1', 
              bedrooms: editingProperty.bedrooms ? String(editingProperty.bedrooms) : '', 
              bathrooms: editingProperty.bathrooms ? String(editingProperty.bathrooms) : '', 
              squareFeet: editingProperty.square_feet ? String(editingProperty.square_feet) : '',
              monthlyRent: editingProperty.monthly_rent ? String(editingProperty.monthly_rent) : ''
            }],
        
        amenities: editingProperty.amenities 
          ? (Array.isArray(editingProperty.amenities) 
              ? editingProperty.amenities.reduce((acc, amenity) => ({ ...acc, [amenity]: true }), {})
              : editingProperty.amenities)
          : {},
        
        status: editingProperty.status || 'vacant',
        tenantType: editingProperty.default_tenant_type || 'market_rate',
        monthly_rent: editingProperty.monthly_rent ? String(editingProperty.monthly_rent) : '',
        securityDepositAmount: editingProperty.security_deposit_amount ? String(editingProperty.security_deposit_amount) : '',
        applicationFee: editingProperty.application_fee ? String(editingProperty.application_fee) : '',
        late_fee_amount: editingProperty.late_fee_amount ? String(editingProperty.late_fee_amount) : '',
        pet_deposit: editingProperty.pet_deposit ? String(editingProperty.pet_deposit) : '',
        petFeeMonthly: '',
        otherIncomeSources: '',
        parking_income: '',
        storage_income: '',
        laundry_income: '',
        otherIncomeDescription: '',
        insurance_cost: editingProperty.insurance_cost ? String(editingProperty.insurance_cost) : '',
        mortgage_cost: editingProperty.mortgage_cost ? String(editingProperty.mortgage_cost) : '',
        management_fee: '',
        repair_costs: '',
        propertyTaxes: editingProperty.property_taxes ? String(editingProperty.property_taxes) : '',
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
        hoa_fees: editingProperty.hoa_fees ? String(editingProperty.hoa_fees) : '',
        accounting_fees: '',
        outstanding_mortgage_balance: editingProperty.outstanding_mortgage_balance ? String(editingProperty.outstanding_mortgage_balance) : '',
        cash_reserves: editingProperty.cash_reserves ? String(editingProperty.cash_reserves) : '',
        accounts_payable: editingProperty.accounts_payable ? String(editingProperty.accounts_payable) : '',
        prepaid_expenses: editingProperty.prepaid_expenses ? String(editingProperty.prepaid_expenses) : '',
        accumulated_depreciation: editingProperty.accumulated_depreciation ? String(editingProperty.accumulated_depreciation) : '',
        
        // Property Statement fields
        beginning_cash_balance: editingProperty.beginning_cash_balance ? String(editingProperty.beginning_cash_balance) : '',
        ending_cash_balance: editingProperty.ending_cash_balance ? String(editingProperty.ending_cash_balance) : '',
        owner_contributions: editingProperty.owner_contributions ? String(editingProperty.owner_contributions) : '',
        owner_draws: editingProperty.owner_draws ? String(editingProperty.owner_draws) : '',
        property_reserve: editingProperty.property_reserve ? String(editingProperty.property_reserve) : '',
        tenant_security_deposits_held: editingProperty.tenant_security_deposits_held ? String(editingProperty.tenant_security_deposits_held) : '',
        other_additions: editingProperty.other_additions ? String(editingProperty.other_additions) : '',
        other_subtractions: editingProperty.other_subtractions ? String(editingProperty.other_subtractions) : '',
        other_expenses: editingProperty.other_expenses ? String(editingProperty.other_expenses) : '',
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
        description: editingProperty.description || '',
        has_voucher: editingProperty.has_voucher || false,
        min_voucher_amount: editingProperty.min_voucher_amount ? String(editingProperty.min_voucher_amount) : '',
        max_voucher_amount: editingProperty.max_voucher_amount ? String(editingProperty.max_voucher_amount) : ''
      });
    }
  }, [editingProperty, portfolioId]);

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

  const handleManualGeocode = async () => {
    if (!editingProperty?.id) return;
    
    setIsGeocoding(true);
    const fullAddress = `${formData.streetAddress}, ${formData.city}, ${formData.state} ${formData.zipcode}`;
    
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          property_id: editingProperty.id,
          address: fullAddress,
          country: 'US'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property location updated successfully. Map will refresh on next load.",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', editingProperty.id] });
      
    } catch (error) {
      console.error('Manual geocoding failed:', error);
      toast({
        title: "Geocoding Failed",
        description: "Failed to update property location. Please verify the address is correct.",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const validateForm = () => {
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
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Map the form data to match database schema
      const propertyData = {
        address: `${formData.streetAddress}, ${formData.city}, ${formData.state} ${formData.zipcode}`,
        street_address: formData.streetAddress,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_feet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
        year_built: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        status: formData.status,
        default_tenant_type: formData.tenantType,
        unit_count: formData.unitCount,
        property_type: formData.propertyType as 'house' | 'apartment' | 'townhouse' | 'mobile_home',
        has_voucher: formData.has_voucher,
        min_voucher_amount: formData.min_voucher_amount ? parseFloat(formData.min_voucher_amount) : null,
        max_voucher_amount: formData.max_voucher_amount ? parseFloat(formData.max_voucher_amount) : null,
        description: formData.description,
        owner_id: userId,
        portfolio_id: formData.portfolioId === 'everything' ? null : (formData.portfolioId || null),
        
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
        
        // Amenities - convert object to array of selected amenities
        amenities: Object.keys(formData.amenities || {}).filter(key => formData.amenities[key]),
        
        // Photos - save photos when editing
        photos: formData.images || [],
        
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', editingProperty.id);

      if (error) throw error;

      // Check if address changed and re-geocode if needed
      const addressChanged = 
        editingProperty.street_address !== formData.streetAddress ||
        editingProperty.city !== formData.city ||
        editingProperty.state !== formData.state ||
        editingProperty.zipcode !== formData.zipcode;

      if (addressChanged) {
        const fullAddress = `${formData.streetAddress}, ${formData.city}, ${formData.state} ${formData.zipcode}`;
        
        toast({
          title: "Address Updated",
          description: "Updating map location...",
          duration: 2000,
        });
        
        // Non-blocking geocoding with retries
        geocodeProperty(editingProperty.id, fullAddress, {
          maxRetries: 3,
          retryDelay: 1000
        }).then(result => {
          if (result.success) {
            console.log('Property re-geocoded successfully');
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.invalidateQueries({ queryKey: ['property', editingProperty.id] });
          }
        });
      }

      toast({
        title: "Success",
        description: "Property updated successfully.",
      });

      // Invalidate relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      if (portfolioId && portfolioId !== 'everything') {
        queryClient.invalidateQueries({ queryKey: ['properties', 'portfolio', portfolioId] });
        queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
      }
      queryClient.invalidateQueries({ queryKey: ['properties', 'owner', userId] });

      onSave();
      handleClose();

    } catch (error: any) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab('basic-info');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <Stepper
            currentStep={getStepFromTab(activeTab)}
            steps={STEP_LABELS}
            className="mb-6"
          />
        </div>

        {/* Wrap content in nested PermissionProvider when editing existing property */}
        {editingProperty?.portfolio_id && portfolioId === 'everything' ? (
          <PermissionProvider portfolioId={editingProperty.portfolio_id}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
                <TabsTrigger value="units">Units</TabsTrigger>
                <TabsTrigger value="amenities">Amenities & Features</TabsTrigger>
                <TabsTrigger value="finances">Finances & Status</TabsTrigger>
              </TabsList>

          <TabsContent value="basic-info" className="space-y-6">
            <PropertyBasicInfo
              formData={formData}
              updateFormData={updateFormData}
              userId={userId}
              portfolioId={editingProperty?.portfolio_id || portfolioId}
              propertyId={editingProperty?.id}
              onManualGeocode={editingProperty?.id ? handleManualGeocode : undefined}
              isGeocoding={isGeocoding}
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

              <TabsContent value="finances" className="space-y-6">
                <PropertyFinances
                  formData={formData}
                  updateFormData={updateFormData}
                  property={{ unit_count: formData.unitCount }}
                />
              </TabsContent>

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>

                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Updating Property...' : 'Update Property'}
                </Button>
              </div>
            </Tabs>
          </PermissionProvider>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
              <TabsTrigger value="units">Units</TabsTrigger>
              <TabsTrigger value="amenities">Amenities & Features</TabsTrigger>
              <TabsTrigger value="finances">Finances & Status</TabsTrigger>
            </TabsList>

            <TabsContent value="basic-info" className="space-y-6">
              <PropertyBasicInfo
                formData={formData}
                updateFormData={updateFormData}
                userId={userId}
                portfolioId={editingProperty?.portfolio_id || portfolioId}
                propertyId={editingProperty?.id}
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

            <TabsContent value="finances" className="space-y-6">
              <PropertyFinances
                formData={formData}
                updateFormData={updateFormData}
                property={{ unit_count: formData.unitCount }}
              />
            </TabsContent>

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>

              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Updating Property...' : 'Update Property'}
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}