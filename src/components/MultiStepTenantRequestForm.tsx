import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressTracker } from '@/components/enhanced/ProgressTracker';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { retryDatabaseOperation } from '@/lib/storageUtils';
import { useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '@/hooks/useProperties';
import { Loader2, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { TenantRequestBasics } from './tenant-request-steps/TenantRequestBasics';
import { TenantRequestAmenities } from './tenant-request-steps/TenantRequestAmenities';
import { TenantRequestReview } from './tenant-request-steps/TenantRequestReview';
import PlacementAgreementModal from './PlacementAgreementModal';
import { LISTING_AMENITIES } from '@/constants/listingAmenities';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { propertyScraperApi } from '@/lib/api/propertyScraperApi';

interface MultiStepTenantRequestFormProps {
  propertyId: string;
  propertyAddress: string;
  onRequestSent: () => void;
  onCancel: () => void;
  onDocumentAdded?: () => void;
  unitId?: string;
  unitNumber?: string;
  onRefresh?: () => void;
  isEditMode?: boolean;
}

export const MultiStepTenantRequestForm = ({
  propertyId,
  propertyAddress,
  onRequestSent,
  onCancel,
  onDocumentAdded,
  unitId,
  unitNumber,
  onRefresh,
  isEditMode = false
}: MultiStepTenantRequestFormProps) => {
  const [currentStep, setCurrentStep] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [clientAgreementSigned, setClientAgreementSigned] = useState(false);
  const [contractData, setContractData] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [unit, setUnit] = useState<any>(null); // Unit data for the modal
  const [landlordProfile, setLandlordProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [originalRent, setOriginalRent] = useState<string>(''); // Track original rent for edit mode
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [scrapeError, setScrapeError] = useState('');
  
  // Secure admin check via RPC
  const { data: isSystemAdmin } = useAdminCheck();
  const [formData, setFormData] = useState({
    desiredRent: '',
    preferredMoveInDate: '',
    additionalRequirements: '',
    images: [],
    videoTourUrl: '',
    amenities: {
      airConditioning: false,
      furnished: false,
      inUnitLaundry: false,
      sharedLaundry: false,
      laundryHookups: false,
      balconyPatio: false,
      yardGarden: false,
      parkingAvailable: false,
      petFriendly: false,
      dishwasher: false,
      microwave: false,
      refrigerator: false,
      hardwoodFloors: false,
      carpet: false,
      tileFloors: false,
      centralHeating: false,
      fireplace: false,
      walkinClosets: false,
      storageUnit: false,
      gymFitness: false,
      pool: false,
      securitySystem: false
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    fetchUserAndPropertyDetails();
  }, [propertyId, isEditMode]);

  const fetchUserAndPropertyDetails = async () => {
    try {
      setUserLoading(true);
      
      // Get authenticated user first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({
          title: "Authentication required",
          description: "Please log in to continue.",
          variant: "destructive",
        });
        return;
      }
      
      setUser(authUser);

      // Fetch property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propertyError) throw propertyError;
      setProperty(propertyData);

      // Fetch landlord profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) throw profileError;
      setLandlordProfile(profileData);

      // Admin status is now determined by useAdminCheck hook (isSystemAdmin)

      // Pre-populate form data when in edit mode
      if (isEditMode && propertyData) {
        if (unitId) {
          // For unit-level editing, fetch unit data
          const { data: unitData } = await supabase
            .from('property_units')
            .select('*')
            .eq('id', unitId)
            .single();

          if (unitData) {
            // Store unit data for the Placement Agreement Modal
            setUnit({
              id: unitData.id,
              unit_number: unitData.unit_number,
              monthly_rent: unitData.monthly_rent,
              bedrooms: unitData.bedrooms,
              bathrooms: unitData.bathrooms
            });
            const unitAmenities = unitData.unit_amenities || [];
            const rentValue = unitData.monthly_rent?.toString() || '';
            setOriginalRent(rentValue);
            setFormData({
              desiredRent: rentValue,
              preferredMoveInDate: unitData.move_in_date || '',
              additionalRequirements: unitData.description || '',
              images: unitData.photos || [],
              videoTourUrl: unitData.video_tour_url || '',
              amenities: {
                airConditioning: unitAmenities.includes('airConditioning'),
                furnished: unitAmenities.includes('furnished'),
                inUnitLaundry: unitAmenities.includes('inUnitLaundry'),
                sharedLaundry: unitAmenities.includes('sharedLaundry'),
                laundryHookups: unitAmenities.includes('laundryHookups'),
                balconyPatio: unitAmenities.includes('balconyPatio'),
                yardGarden: unitAmenities.includes('yardGarden'),
                parkingAvailable: unitAmenities.includes('parkingAvailable'),
                petFriendly: unitAmenities.includes('petFriendly'),
                dishwasher: unitAmenities.includes('dishwasher'),
                microwave: unitAmenities.includes('microwave'),
                refrigerator: unitAmenities.includes('refrigerator'),
                hardwoodFloors: unitAmenities.includes('hardwoodFloors'),
                carpet: unitAmenities.includes('carpet'),
                tileFloors: unitAmenities.includes('tileFloors'),
                centralHeating: unitAmenities.includes('centralHeating'),
                fireplace: unitAmenities.includes('fireplace'),
                walkinClosets: unitAmenities.includes('walkinClosets'),
                storageUnit: unitAmenities.includes('storageUnit'),
                gymFitness: unitAmenities.includes('gymFitness'),
                pool: unitAmenities.includes('pool'),
                securitySystem: unitAmenities.includes('securitySystem')
              }
            });
          }
        } else {
          // Property-level editing - check if single-unit property and fetch from Unit 1
          if (propertyData.unit_count === 1) {
            // Fetch Unit 1 data for single-family homes
            const { data: unitData } = await supabase
              .from('property_units')
              .select('*')
              .eq('property_id', propertyId)
              .limit(1)
              .single();

            if (unitData) {
              // Store unit data for the Placement Agreement Modal
              setUnit({
                id: unitData.id,
                unit_number: unitData.unit_number,
                monthly_rent: unitData.monthly_rent,
                bedrooms: unitData.bedrooms,
                bathrooms: unitData.bathrooms
              });
              const unitAmenities = unitData.unit_amenities || [];
              const rentValue = unitData.monthly_rent?.toString() || propertyData.desired_rent?.toString() || '';
              setOriginalRent(rentValue);
              setFormData({
                desiredRent: rentValue,
                preferredMoveInDate: unitData.move_in_date || propertyData.move_in_date || '',
                additionalRequirements: unitData.description || propertyData.description || '',
                images: unitData.photos || propertyData.photos || [],
                videoTourUrl: unitData.video_tour_url || propertyData.video_tour_url || '',
                amenities: {
                  airConditioning: unitAmenities.includes('airConditioning') || propertyData.air_conditioning || false,
                  furnished: unitAmenities.includes('furnished') || propertyData.furnished || false,
                  inUnitLaundry: unitAmenities.includes('inUnitLaundry') || propertyData.in_unit_laundry || false,
                  sharedLaundry: unitAmenities.includes('sharedLaundry') || propertyData.shared_laundry || false,
                  laundryHookups: unitAmenities.includes('laundryHookups') || propertyData.laundry_hookups || false,
                  balconyPatio: unitAmenities.includes('balconyPatio') || propertyData.balcony_patio || false,
                  yardGarden: unitAmenities.includes('yardGarden') || propertyData.yard_garden || false,
                  parkingAvailable: unitAmenities.includes('parkingAvailable') || propertyData.parking_available || false,
                  petFriendly: unitAmenities.includes('petFriendly') || propertyData.pet_friendly || false,
                  dishwasher: unitAmenities.includes('dishwasher') || propertyData.dishwasher || false,
                  microwave: unitAmenities.includes('microwave') || propertyData.microwave || false,
                  refrigerator: unitAmenities.includes('refrigerator') || propertyData.refrigerator || false,
                  hardwoodFloors: unitAmenities.includes('hardwoodFloors') || propertyData.hardwood_floors || false,
                  carpet: unitAmenities.includes('carpet') || propertyData.carpet || false,
                  tileFloors: unitAmenities.includes('tileFloors') || propertyData.tile_floors || false,
                  centralHeating: unitAmenities.includes('centralHeating') || propertyData.central_heating || false,
                  fireplace: unitAmenities.includes('fireplace') || propertyData.fireplace || false,
                  walkinClosets: unitAmenities.includes('walkinClosets') || propertyData.walkin_closets || false,
                  storageUnit: unitAmenities.includes('storageUnit') || propertyData.storage_unit || false,
                  gymFitness: unitAmenities.includes('gymFitness') || propertyData.gym_fitness || false,
                  pool: unitAmenities.includes('pool') || propertyData.pool || false,
                  securitySystem: unitAmenities.includes('securitySystem') || propertyData.security_system || false
                }
              });
            }
          } else {
            // Multi-unit property - use property-level data
            const rentValue = propertyData.desired_rent?.toString() || propertyData.monthly_rent?.toString() || '';
            setOriginalRent(rentValue);
            setFormData({
              desiredRent: rentValue,
              preferredMoveInDate: propertyData.move_in_date || '',
              additionalRequirements: propertyData.description || '',
              images: propertyData.photos || [],
              videoTourUrl: propertyData.video_tour_url || '',
              amenities: {
                airConditioning: propertyData.air_conditioning || false,
                furnished: propertyData.furnished || false,
                inUnitLaundry: propertyData.in_unit_laundry || false,
                sharedLaundry: propertyData.shared_laundry || false,
                laundryHookups: propertyData.laundry_hookups || false,
                balconyPatio: propertyData.balcony_patio || false,
                yardGarden: propertyData.yard_garden || false,
                parkingAvailable: propertyData.parking_available || false,
                petFriendly: propertyData.pet_friendly || false,
                dishwasher: propertyData.dishwasher || false,
                microwave: propertyData.microwave || false,
                refrigerator: propertyData.refrigerator || false,
                hardwoodFloors: propertyData.hardwood_floors || false,
                carpet: propertyData.carpet || false,
                tileFloors: propertyData.tile_floors || false,
                centralHeating: propertyData.central_heating || false,
                fireplace: propertyData.fireplace || false,
                walkinClosets: propertyData.walkin_closets || false,
                storageUnit: propertyData.storage_unit || false,
                gymFitness: propertyData.gym_fitness || false,
                pool: propertyData.pool || false,
                securitySystem: propertyData.security_system || false
              }
            });
          }
        }
      } else if (unitId) {
        // Non-edit mode: still need to fetch unit data for the Placement Agreement Modal
        const { data: unitData } = await supabase
          .from('property_units')
          .select('id, unit_number, monthly_rent, bedrooms, bathrooms')
          .eq('id', unitId)
          .single();
        
        if (unitData) {
          setUnit({
            id: unitData.id,
            unit_number: unitData.unit_number,
            monthly_rent: unitData.monthly_rent,
            bedrooms: unitData.bedrooms,
            bathrooms: unitData.bathrooms
          });
        }
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load user and property information.",
        variant: "destructive",
      });
    } finally {
      setUserLoading(false);
    }
  };

  const validateStep = (step: string) => {
    switch (step) {
      case '1':
        return !!(formData.desiredRent);
      case '2':
        return true; // Amenities are optional for progression
      case '3':
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  const getStepProgress = () => {
    const steps = [
      {
        id: '1',
        label: 'Property Details',
        status: validateStep('1') ? 'completed' as const : (currentStep === '1' ? 'current' as const : 'pending' as const)
      },
      {
        id: '2',
        label: 'Amenities',
        status: currentStep === '2' ? 'current' as const : (parseInt(currentStep) > 2 ? 'completed' as const : 'pending' as const)
      },
      {
        id: '3',
        label: 'Review & Submit',
        status: currentStep === '3' ? 'current' as const : 'pending' as const
      }
    ];
    return steps;
  };

  const handleNext = () => {
    if (currentStep === '1' && validateStep('1')) {
      setCurrentStep('2');
    } else if (currentStep === '2') {
      setCurrentStep('3');
    } else if (currentStep === '1' && !validateStep('1')) {
      toast({
        title: "Please complete required fields",
        description: "Desired rent is required to continue.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (currentStep === '2') {
      setCurrentStep('1');
    } else if (currentStep === '3') {
      setCurrentStep('2');
      setTermsAgreed(false); // Reset terms agreement when going back
    }
  };

  const handleSubmit = async () => {
    // Edit mode - check if rent changed
    if (isEditMode) {
      const rentChanged = originalRent && formData.desiredRent !== originalRent && 
                          parseFloat(formData.desiredRent) !== parseFloat(originalRent);
      
      // If rent changed and not admin, require re-signing placement agreement
      if (rentChanged && !isSystemAdmin) {
        if (!agreementSigned) {
          setShowAgreement(true);
          return;
        }
      }
      
      // No rent change, admin, or already signed - proceed
      await processRequest();
      return;
    }

    // Admins skip placement agreement entirely
    if (isSystemAdmin) {
      await processRequest();
      return;
    }

    // Check if placement agreement is signed for regular landlords
    if (!agreementSigned) {
      setShowAgreement(true);
      return;
    }

    await processRequest();
  };

  const handleAgreementSigned = async (contractDataFromModal: any) => {
    setAgreementSigned(true);
    setContractData(contractDataFromModal);
    setShowAgreement(false);
    await processRequest(contractDataFromModal);
  };

  // Convert amenities object to array format for database storage
  const convertAmenitiesToArray = (amenitiesObj: any): string[] => {
    return Object.keys(amenitiesObj)
      .filter(key => amenitiesObj[key] === true);
  };

  // Handle URL import from listing sites
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
      
      // Pet-friendly from pet policy
      if (data.petPolicy?.allowed) {
        amenitiesMap['petFriendly'] = true;
      }
      
      // Update form data with scraped values
      setFormData(prev => ({
        ...prev,
        desiredRent: data.rent?.toString() || prev.desiredRent,
        additionalRequirements: data.description || prev.additionalRequirements,
        images: data.images.length > 0 ? data.images : prev.images,
        amenities: {
          ...prev.amenities,
          ...amenitiesMap,
        },
      }));
      
      setScrapeStatus('success');
      
      toast({
        title: "Details imported!",
        description: "Review and adjust the imported information below.",
      });
    } catch (err) {
      setScrapeStatus('error');
      setScrapeError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const processRequest = async (savedContractData?: any) => {
    setLoading(true);

    try {
      if (!user) throw new Error('User not authenticated');

      if (unitId) {
        // Build amenities array from selected amenities
        const selectedAmenities = LISTING_AMENITIES
          .filter(({ key }) => formData.amenities[key])
          .map(({ label }) => label);

        // For unit-level requests, update the unit and create unit-specific tenant request
        const { error: unitError } = await retryDatabaseOperation(
          async () => supabase
            .from('property_units')
            .update({ 
              monthly_rent: parseFloat(formData.desiredRent),
              status: 'available',
              on_market: true,
              listed_date: new Date().toISOString(),
              photos: formData.images,
              video_tour_url: formData.videoTourUrl,
              description: formData.additionalRequirements,
              move_in_date: formData.preferredMoveInDate || null,
              unit_amenities: convertAmenitiesToArray(formData.amenities),
              amenities: JSON.stringify(selectedAmenities)
            })
            .eq('id', unitId),
          'Unit listing update'
        );

        if (unitError) throw unitError;

        // Check if single-unit property and sync photos to property level
        const { data: propertyData } = await supabase
          .from('properties')
          .select('id, unit_count')
          .eq('id', propertyId)
          .single();

        if (propertyData?.unit_count === 1) {
          await supabase
            .from('properties')
            .update({ photos: formData.images })
            .eq('id', propertyId);
        }

        // Create a unit-level tenant request with listing history (skip in edit mode)
        // NOTE: Only set unit_id (not property_id) to satisfy chk_property_or_unit_id constraint
        let tenantRequestData: any = null;
        if (!isEditMode) {
          const { data, error: tenantRequestError } = await retryDatabaseOperation(
            async () => supabase
              .from('property_tenant_requests')
              .insert({
                unit_id: unitId,
                requested_by: user.id,
                status: 'active',
                listing_event_type: 'initial_listing',
                notes: `Unit marketed with ${formData.images.length} images${formData.videoTourUrl ? ' and video tour' : ''}`
              })
              .select()
              .single(),
            'Create tenant request'
          );

          if (tenantRequestError) throw tenantRequestError;
          tenantRequestData = data;

          // Update property's on_market status for unit listings
          const { error: propertyMarketError } = await supabase
            .from('properties')
            .update({ on_market: true })
            .eq('id', propertyId);

          if (propertyMarketError) throw propertyMarketError;
        }

        // Save the signed housing services agreement if available (skip in edit mode)
        if (!isEditMode && agreementSigned && (savedContractData || contractData)) {
          const dataToSave = savedContractData || contractData;
          const { error: contractError } = await supabase
            .from('property_listing_contracts')
            .insert({
              property_id: propertyId,
              unit_id: unitId || null,
              listing_request_id: tenantRequestData?.id,
              contract_type: 'housing_services_agreement',
              contract_text: dataToSave.contractText,
              signed_by: user.id,
              signer_name: dataToSave.signerName,
              signer_role: dataToSave.signerRole,
              digital_signature: dataToSave.signature,
              signature_date: dataToSave.signatureDate,
              listing_date: new Date().toISOString(),
              property_address: unitNumber 
                ? `${propertyAddress} - Unit ${unitNumber}`
                : propertyAddress,
              ip_address: dataToSave.ipAddress,
              user_agent: dataToSave.userAgent,
              contract_version: '1.0',
              contract_status: 'active'
            });
            
          if (contractError) {
            console.error('Failed to save contract:', contractError);
            // Don't fail the entire request, just log it
          }
        }

        // Check if property needs geocoding
        const { data: updatedProperty } = await supabase
          .from('properties')
          .select('latitude, longitude, street_address, city, state, zipcode')
          .eq('id', propertyId)
          .single();

        if (updatedProperty && (!updatedProperty.latitude || !updatedProperty.longitude)) {
          try {
            const fullAddress = `${updatedProperty.street_address}, ${updatedProperty.city}, ${updatedProperty.state} ${updatedProperty.zipcode}`;
            await supabase.functions.invoke('geocode-address', {
              body: {
                property_id: propertyId,
                address: fullAddress,
                country: 'US'
              }
            });
            toast({
              title: "Property geocoded",
              description: "Property coordinates updated for map display",
            });
          } catch (geocodeError) {
            console.error('Geocoding error:', geocodeError);
            // Don't block listing workflow if geocoding fails
          }
        }

        toast({
          title: isEditMode ? "Unit listing updated!" : "Unit marketing updated!",
          description: isEditMode 
            ? `Your unit listing has been updated with ${formData.images.length} images.`
            : `Your unit is now listed for $${formData.desiredRent}/month with ${formData.images.length} images and is available for tenant browsing.`,
        });
      } else {
        // For property-level requests, update the property
        // Build amenities array from selected amenities
        const selectedAmenities = LISTING_AMENITIES
          .filter(({ key }) => formData.amenities[key])
          .map(({ label }) => label);

        const { error: propertyError } = await retryDatabaseOperation(
          async () => supabase
            .from('properties')
            .update({ 
              desired_rent: parseFloat(formData.desiredRent),
              status: 'available',
              on_market: true,
              photos: formData.images,
              video_tour_url: formData.videoTourUrl,
              description: formData.additionalRequirements,
              amenities: selectedAmenities,
              air_conditioning: formData.amenities.airConditioning,
              furnished: formData.amenities.furnished,
              in_unit_laundry: formData.amenities.inUnitLaundry,
              shared_laundry: formData.amenities.sharedLaundry,
              laundry_hookups: formData.amenities.laundryHookups,
              balcony_patio: formData.amenities.balconyPatio,
              yard_garden: formData.amenities.yardGarden,
              parking_available: formData.amenities.parkingAvailable,
              pet_friendly: formData.amenities.petFriendly,
              dishwasher: formData.amenities.dishwasher,
              microwave: formData.amenities.microwave,
              refrigerator: formData.amenities.refrigerator,
              hardwood_floors: formData.amenities.hardwoodFloors,
              carpet: formData.amenities.carpet,
              tile_floors: formData.amenities.tileFloors,
              central_heating: formData.amenities.centralHeating,
              fireplace: formData.amenities.fireplace,
              walkin_closets: formData.amenities.walkinClosets,
              storage_unit: formData.amenities.storageUnit,
              gym_fitness: formData.amenities.gymFitness,
              pool: formData.amenities.pool,
              security_system: formData.amenities.securitySystem,
              move_in_date: formData.preferredMoveInDate || null
            })
            .eq('id', propertyId),
          'Property listing update'
        );

        if (propertyError) throw propertyError;

        // Save the signed housing services agreement if available (skip in edit mode)
        if (!isEditMode && agreementSigned && (savedContractData || contractData)) {
          const dataToSave = savedContractData || contractData;
          
          // First, get the listing request ID
          const { data: listingData } = await supabase
            .from('property_tenant_requests')
            .select('id')
            .eq('property_id', propertyId)
            .eq('status', 'active')
            .is('unit_id', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          const { error: contractError } = await supabase
            .from('property_listing_contracts')
            .insert({
              property_id: propertyId,
              unit_id: null,
              listing_request_id: listingData?.id,
              contract_type: 'housing_services_agreement',
              contract_text: dataToSave.contractText,
              signed_by: user.id,
              signer_name: dataToSave.signerName,
              signer_role: dataToSave.signerRole,
              digital_signature: dataToSave.signature,
              signature_date: dataToSave.signatureDate,
              listing_date: new Date().toISOString(),
              property_address: propertyAddress,
              ip_address: dataToSave.ipAddress,
              user_agent: dataToSave.userAgent,
              contract_version: '1.0',
              contract_status: 'active'
            });
            
          if (contractError) {
            console.error('Failed to save contract:', contractError);
            // Don't fail the entire request, just log it
          }
        }

        // Check if property needs geocoding
        const { data: updatedProperty } = await supabase
          .from('properties')
          .select('latitude, longitude, street_address, city, state, zipcode')
          .eq('id', propertyId)
          .single();

        if (updatedProperty && (!updatedProperty.latitude || !updatedProperty.longitude)) {
          try {
            const fullAddress = `${updatedProperty.street_address}, ${updatedProperty.city}, ${updatedProperty.state} ${updatedProperty.zipcode}`;
            await supabase.functions.invoke('geocode-address', {
              body: {
                property_id: propertyId,
                address: fullAddress,
                country: 'US'
              }
            });
            toast({
              title: "Property geocoded",
              description: "Property coordinates updated for map display",
            });
          } catch (geocodeError) {
            console.error('Geocoding error:', geocodeError);
            // Don't block listing workflow if geocoding fails
          }
        }

        // Create a property-level tenant request with listing history (skip in edit mode)
        if (!isEditMode) {
          const { error: tenantRequestError } = await supabase
            .from('property_tenant_requests')
            .insert({
              property_id: propertyId,
              requested_by: user.id,
              status: 'active',
              listing_event_type: 'initial_listing',
              notes: `Property marketed with ${formData.images.length} images${formData.videoTourUrl ? ' and video tour' : ''}`
            });

          if (tenantRequestError) throw tenantRequestError;
        }

        toast({
          title: isEditMode ? "Property listing updated!" : "Property marketing updated!",
          description: isEditMode
            ? `Your property listing has been updated with ${formData.images.length} images.`
            : `Your property is now listed for $${formData.desiredRent}/month with ${formData.images.length} images and is available for tenant browsing.`,
        });
      }

      // Invalidate property queries for real-time updates
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: propertyKeys.byOwner(user.id) });
        queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      }

      // Dispatch properties-changed event to refresh LandlordDashboard
      window.dispatchEvent(new CustomEvent('properties-changed', { 
        detail: { eventType: 'UPDATE' }
      }));

      onRefresh?.();
      onRequestSent();
    } catch (error: any) {
      toast({
        title: "Error updating property",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Authentication required</p>
        <Button onClick={onCancel} variant="outline">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2 pb-4 border-b">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Property Listing' : 'List Property for Rent'}
        </h2>
        <p className="text-gray-600">
          {isEditMode 
            ? 'Update your property listing details' 
            : 'Set up your property listing to attract qualified tenants'}
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-sm font-medium">
            {unitNumber && property?.unit_count !== 1 && <span className="font-bold">{unitNumber} - </span>}
            📍 {propertyAddress}
          </p>
        </div>
      </div>

      {/* Progress Tracker */}
      <ProgressTracker 
        steps={getStepProgress()}
        orientation="horizontal"
        className="mb-6"
      />

      <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="1">Property Marketing</TabsTrigger>
          <TabsTrigger value="2">Amenities</TabsTrigger>
          <TabsTrigger value="3">Review & Submit</TabsTrigger>
        </TabsList>

        <TabsContent value="1" className="space-y-4">
          <TenantRequestBasics 
            formData={formData} 
            updateFormData={updateFormData}
            propertyAddress={propertyAddress}
            unitNumber={property?.unit_count !== 1 ? unitNumber : undefined}
            userId={user.id}
            propertyId={propertyId}
            // URL import temporarily disabled
            // onScrapeUrl={handleScrapeUrl}
            // scrapeStatus={scrapeStatus}
            // scrapeError={scrapeError}
          />
        </TabsContent>

        <TabsContent value="2" className="space-y-4">
          <TenantRequestAmenities 
            formData={formData} 
            updateFormData={updateFormData}
            updateAmenity={updateAmenity}
          />
        </TabsContent>

        <TabsContent value="3" className="space-y-4">
          <TenantRequestReview 
            formData={formData} 
            propertyAddress={propertyAddress}
            unitNumber={unitNumber}
            termsAgreed={termsAgreed}
            onTermsAgreed={setTermsAgreed}
            isAdminListing={!!isSystemAdmin}
            clientAgreementSigned={clientAgreementSigned}
            onClientAgreementSigned={setClientAgreementSigned}
          />
        </TabsContent>
      </Tabs>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex space-x-2">
          {currentStep !== '1' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          
          {currentStep !== '3' ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={currentStep === '1' && !validateStep('1')}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {!isEditMode && !isSystemAdmin && !termsAgreed && (
                <p className="text-xs text-amber-600 font-medium">
                  Please review and agree to the terms and conditions above
                </p>
              )}
              {!isEditMode && isSystemAdmin && !clientAgreementSigned && (
                <p className="text-xs text-blue-600 font-medium">
                  Please confirm client agreement verification above
                </p>
              )}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (!isSystemAdmin && !termsAgreed && !isEditMode) || (isSystemAdmin && !clientAgreementSigned && !isEditMode)}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                {loading 
                  ? (isEditMode ? 'Updating...' : 'Sending Request...') 
                  : (isEditMode ? 'Update Listing' : 'Send Request')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Placement Agreement Modal */}
      {property && landlordProfile && (
        <PlacementAgreementModal
          isOpen={showAgreement}
          onClose={() => {
            setShowAgreement(false);
            setLoading(false);
          }}
          onAgreementSigned={handleAgreementSigned}
          property={property}
          unit={unit}
          overrideRent={formData.desiredRent ? parseFloat(formData.desiredRent) : undefined}
          landlordProfile={landlordProfile}
          onDocumentAdded={onDocumentAdded}
        />
      )}
    </div>
  );
};
