import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedAdminActions } from '@/hooks/useEnhancedAdminActions';
import { Loader2, Trash2, ChevronDown, ChevronRight, MapPin, Home, DollarSign, TrendingUp, Shield, RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface Property {
  id: string;
  address: string;
  // Location
  street_address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  latitude?: number;
  longitude?: number;
  
  // Basic Property Info
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  lot_size?: number;
  year_built?: number;
  property_type?: string;
  stories?: number;
  garage_spaces?: number;
  
  // Financial Core
  monthly_rent: number;
  desired_rent?: number;
  unit_count: number;
  status: string;
  
  // Property Features
  amenities?: string[] | string;
  additional_features?: string[];
  appliances_included?: string[];
  community_amenities?: string[];
  security_features?: string[];
  accessibility_features?: string[];
  
  // Utilities & Amenities
  air_conditioning?: boolean;
  furnished?: boolean;
  heating_type?: string;
  flooring_type?: string;
  laundry_type?: string;
  parking_type?: string;
  outdoor_space_type?: string;
  outdoor_space_size?: number;
  utilities_included?: string[];
  
  // Rental Terms
  description?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  lease_terms?: string[];
  move_in_date?: string;
  rent_due_day?: number;
  late_fee_grace_days?: number;
  
  // Pet & Tenant Policies
  pet_policy?: string;
  max_pets?: number;
  credit_score_required?: number;
  eviction_policy?: string;
  default_tenant_type?: string;
  
  // Voucher Program
  has_voucher?: boolean;
  voucher_type?: string;
  voucher_programs_accepted?: string[];
  waives_fee_for_vouchers?: boolean;
  pha_payment_standard?: number;
  min_voucher_amount?: number;
  max_voucher_amount?: number;
  min_tenant_contribution?: number;
  pha_inspection_date?: string;
  next_inspection_date?: string;
  
  // School & Location Scores
  school_district?: string;
  walk_score?: number;
  bike_score?: number;
  transit_score?: number;
  
  // Income & Revenue
  other_income?: number;
  utility_reimbursements?: number;
  late_fee_income?: number;
  pet_deposit?: number;
  pet_monthly_fee?: number;
  parking_fee?: number;
  storage_fee?: number;
  laundry_income?: number;
  vending_income?: number;
  amenity_fees?: number;
  security_deposit_amount?: number;
  first_month_rent?: number;
  last_month_rent?: number;
  late_fee_amount?: number;
  application_fee?: number;
  
  // Operating Expenses
  water_cost?: number;
  electric_cost?: number;
  gas_cost?: number;
  trash_cost?: number;
  sewer_cost?: number;
  landscaping_cost?: number;
  cleaning_cost?: number;
  legal_fees?: number;
  accounting_fees?: number;
  marketing_cost?: number;
  office_expenses?: number;
  software_cost?: number;
  maintenance_supplies?: number;
  
  // Capital & Financing
  purchase_price?: number;
  down_payment?: number;
  loan_amount?: number;
  interest_rate?: number;
  loan_term_years?: number;
  loan_type?: string;
  lender_name?: string;
  loan_start_date?: string;
  closing_costs?: number;
  capital_improvements?: number;
  equipment_purchases?: number;
  estimated_monthly_payment?: number;
  mortgage_cost?: number;
  
  // Tax & Accounting
  annual_depreciation?: number;
  depreciation_method?: string;
  hoa_fees?: number;
  special_assessments?: number;
  improvement_costs?: number;
  property_taxes?: number;
  insurance_cost?: number;
  management_fee?: number;
  repair_costs?: number;
  sale_price?: number;
  
  // Performance & Analysis
  vacancy_allowance_percent?: number;
  target_cap_rate?: number;
  target_cash_on_cash?: number;
  
  // System Fields
  owner_id: string;
  portfolio_id?: string;
  photos?: string[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: string;
  deactivated_at?: string;
  for_sale?: boolean;
  tenant_request_count?: number;
}

interface EditPropertyModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onPropertyUpdated: () => void;
}

const EditPropertyModal = ({ property, isOpen, onClose, onPropertyUpdated }: EditPropertyModalProps) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showVacantConfirmation, setShowVacantConfirmation] = useState(false);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [isClientProperty, setIsClientProperty] = useState(false);
  const [checkingClientStatus, setCheckingClientStatus] = useState(true);
  
  // Collapsible section states
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [propertyFeaturesOpen, setPropertyFeaturesOpen] = useState(false);
  const [rentalTermsOpen, setRentalTermsOpen] = useState(false);
  const [voucherProgramOpen, setVoucherProgramOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [capitalOpen, setCapitalOpen] = useState(false);
  
  const [performanceOpen, setPerformanceOpen] = useState(false);
  
  // Amenities categories for checkbox-based editing
  const amenitiesCategories = {
    general: [
      { key: 'air_conditioning', label: 'Air Conditioning', icon: '❄️' },
      { key: 'heating', label: 'Heating', icon: '🔥' },
      { key: 'furnished', label: 'Furnished', icon: '🛋️' },
      { key: 'hardwood_floors', label: 'Hardwood Floors', icon: '🪵' },
      { key: 'carpet', label: 'Carpet', icon: '🧶' },
      { key: 'tile_floors', label: 'Tile Floors', icon: '⬜' },
      { key: 'balcony_patio', label: 'Balcony/Patio', icon: '🌿' },
      { key: 'yard_garden', label: 'Yard/Garden', icon: '🌳' },
      { key: 'fireplace', label: 'Fireplace', icon: '🔥' },
      { key: 'walk_in_closets', label: 'Walk-in Closets', icon: '👔' },
      { key: 'storage_unit', label: 'Storage Unit', icon: '📦' },
      { key: 'ceiling_fans', label: 'Ceiling Fans', icon: '🌀' },
    ],
    appliances: [
      { key: 'dishwasher', label: 'Dishwasher', icon: '🍽️' },
      { key: 'refrigerator', label: 'Refrigerator', icon: '🧊' },
      { key: 'stove_oven', label: 'Stove/Oven', icon: '🔥' },
      { key: 'microwave', label: 'Microwave', icon: '📡' },
      { key: 'garbage_disposal', label: 'Garbage Disposal', icon: '🗑️' },
      { key: 'washer', label: 'Washer', icon: '🧺' },
      { key: 'dryer', label: 'Dryer', icon: '🌀' },
    ],
    laundry: [
      { key: 'in_unit_laundry', label: 'In-Unit Laundry', icon: '🧺' },
      { key: 'shared_laundry', label: 'Shared Laundry', icon: '🏢' },
      { key: 'laundry_hookups', label: 'Laundry Hookups', icon: '🔌' },
    ],
    parking: [
      { key: 'garage', label: 'Garage', icon: '🏠' },
      { key: 'driveway', label: 'Driveway', icon: '🚗' },
      { key: 'street_parking', label: 'Street Parking', icon: '🅿️' },
      { key: 'covered_parking', label: 'Covered Parking', icon: '☂️' },
    ],
    community: [
      { key: 'pool', label: 'Pool', icon: '🏊' },
      { key: 'gym_fitness', label: 'Gym/Fitness Center', icon: '💪' },
      { key: 'clubhouse', label: 'Clubhouse', icon: '🏛️' },
      { key: 'playground', label: 'Playground', icon: '🎪' },
      { key: 'dog_park', label: 'Dog Park', icon: '🐕' },
      { key: 'business_center', label: 'Business Center', icon: '💼' },
    ],
    security: [
      { key: 'security_system', label: 'Security System', icon: '🔒' },
      { key: 'gated_community', label: 'Gated Community', icon: '🚧' },
      { key: 'doorman', label: 'Doorman/Concierge', icon: '👨' },
      { key: 'surveillance', label: 'Video Surveillance', icon: '📹' },
      { key: 'secure_entry', label: 'Secure Entry', icon: '🔐' },
    ],
    accessibility: [
      { key: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: '♿' },
      { key: 'elevator', label: 'Elevator', icon: '🛗' },
      { key: 'grab_bars', label: 'Grab Bars', icon: '🛁' },
      { key: 'ramp_access', label: 'Ramp Access', icon: '🚪' },
      { key: 'wide_doorways', label: 'Wide Doorways', icon: '🚪' },
    ],
    policies: [
      { key: 'pet_friendly', label: 'Pet-Friendly', icon: '🐕' },
      { key: 'smoking_allowed', label: 'Smoking Allowed', icon: '🚬' },
    ],
  };
  
  const [formData, setFormData] = useState<any>({
    // Location
    street_address: '',
    city: '',
    state: '',
    zipcode: '',
    latitude: '',
    longitude: '',
    
    // Basic Property Info
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    lot_size: '',
    year_built: '',
    property_type: '',
    stories: '',
    garage_spaces: '',
    
    // Financial Core
    monthly_rent: '',
    desired_rent: '',
    unit_count: '1',
    status: '',
    
    // Property Features
    amenities: '',
    additional_features: '',
    appliances_included: '',
    community_amenities: '',
    security_features: '',
    accessibility_features: '',
    
    // Utilities & Amenities
    air_conditioning: false,
    furnished: false,
    heating_type: '',
    flooring_type: '',
    laundry_type: '',
    parking_type: '',
    outdoor_space_type: '',
    outdoor_space_size: '',
    utilities_included: '',
    
    // Rental Terms
    description: '',
    lease_start_date: '',
    lease_end_date: '',
    lease_terms: '',
    move_in_date: '',
    rent_due_day: '1',
    late_fee_grace_days: '5',
    
    // Pet & Tenant Policies
    pet_policy: '',
    max_pets: '',
    credit_score_required: '',
    eviction_policy: '',
    default_tenant_type: '',
    
    // Voucher Program
    has_voucher: false,
    voucher_type: '',
    voucher_programs_accepted: '',
    waives_fee_for_vouchers: false,
    pha_payment_standard: '',
    min_voucher_amount: '',
    max_voucher_amount: '',
    min_tenant_contribution: '',
    pha_inspection_date: '',
    next_inspection_date: '',
    
    // School & Location Scores
    school_district: '',
    walk_score: '',
    bike_score: '',
    transit_score: '',
    
    // Income & Revenue
    other_income: '',
    utility_reimbursements: '',
    late_fee_income: '',
    pet_deposit: '',
    pet_monthly_fee: '',
    parking_fee: '',
    storage_fee: '',
    laundry_income: '',
    vending_income: '',
    amenity_fees: '',
    security_deposit_amount: '',
    first_month_rent: '',
    last_month_rent: '',
    late_fee_amount: '',
    application_fee: '',
    
    // Operating Expenses
    water_cost: '',
    electric_cost: '',
    gas_cost: '',
    trash_cost: '',
    sewer_cost: '',
    landscaping_cost: '',
    cleaning_cost: '',
    legal_fees: '',
    accounting_fees: '',
    marketing_cost: '',
    office_expenses: '',
    software_cost: '',
    maintenance_supplies: '',
    
    // Capital & Financing
    purchase_price: '',
    down_payment: '',
    loan_amount: '',
    interest_rate: '',
    loan_term_years: '',
    loan_type: '',
    lender_name: '',
    loan_start_date: '',
    closing_costs: '',
    capital_improvements: '',
    equipment_purchases: '',
    estimated_monthly_payment: '',
    mortgage_cost: '',
    
    // Tax & Accounting
    annual_depreciation: '',
    depreciation_method: 'straight_line',
    hoa_fees: '',
    special_assessments: '',
    improvement_costs: '',
    property_taxes: '',
    insurance_cost: '',
    management_fee: '',
    repair_costs: '',
    sale_price: '',
    
    // Performance & Analysis
    vacancy_allowance_percent: '5.0',
    target_cap_rate: '',
    target_cash_on_cash: '',
  });
  
  const { toast } = useToast();
  const { softDeleteProperty, restoreProperty, isLoading } = useEnhancedAdminActions();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleAmenityCheckboxChange = (amenityKey: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [amenityKey]: checked
    }));
  };

  const arrayToString = (value: string[] | string | null | undefined): string => {
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
  };

  const stringToArray = (value: string): string[] | null => {
    if (!value || value.trim() === '') return null;
    return value.split(',').map(item => item.trim()).filter(item => item !== '');
  };

  useEffect(() => {
    if (property) {
      setFormData({
        // Location
        street_address: property.street_address || '',
        city: property.city || '',
        state: property.state || '',
        zipcode: property.zipcode || '',
        latitude: property.latitude?.toString() || '',
        longitude: property.longitude?.toString() || '',
        
        // Basic Property Info
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        square_feet: property.square_feet?.toString() || '',
        lot_size: property.lot_size?.toString() || '',
        year_built: property.year_built?.toString() || '',
        property_type: property.property_type || '',
        stories: property.stories?.toString() || '',
        garage_spaces: property.garage_spaces?.toString() || '',
        
        // Financial Core
        monthly_rent: property.monthly_rent?.toString() || '',
        desired_rent: property.desired_rent?.toString() || '',
        unit_count: property.unit_count?.toString() || '1',
        status: property.status || '',
        
        // Property Features
        amenities: arrayToString(property.amenities),
        additional_features: arrayToString(property.additional_features),
        appliances_included: arrayToString(property.appliances_included),
        community_amenities: arrayToString(property.community_amenities),
        security_features: arrayToString(property.security_features),
        accessibility_features: arrayToString(property.accessibility_features),
        
        // Utilities & Amenities
        air_conditioning: property.air_conditioning || false,
        furnished: property.furnished || false,
        heating_type: property.heating_type || '',
        flooring_type: property.flooring_type || '',
        laundry_type: property.laundry_type || '',
        parking_type: property.parking_type || '',
        outdoor_space_type: property.outdoor_space_type || '',
        outdoor_space_size: property.outdoor_space_size?.toString() || '',
        utilities_included: arrayToString(property.utilities_included),
        
        // Rental Terms
        description: property.description || '',
        lease_start_date: property.lease_start_date || '',
        lease_end_date: property.lease_end_date || '',
        lease_terms: arrayToString(property.lease_terms),
        move_in_date: property.move_in_date || '',
        rent_due_day: property.rent_due_day?.toString() || '1',
        late_fee_grace_days: property.late_fee_grace_days?.toString() || '5',
        
        // Pet & Tenant Policies
        pet_policy: property.pet_policy || '',
        max_pets: property.max_pets?.toString() || '',
        credit_score_required: property.credit_score_required?.toString() || '',
        eviction_policy: property.eviction_policy || '',
        default_tenant_type: property.default_tenant_type || '',
        
        // Voucher Program
        has_voucher: property.has_voucher || false,
        voucher_type: property.voucher_type || '',
        voucher_programs_accepted: arrayToString(property.voucher_programs_accepted),
        waives_fee_for_vouchers: property.waives_fee_for_vouchers || false,
        pha_payment_standard: property.pha_payment_standard?.toString() || '',
        min_voucher_amount: property.min_voucher_amount?.toString() || '',
        max_voucher_amount: property.max_voucher_amount?.toString() || '',
        min_tenant_contribution: property.min_tenant_contribution?.toString() || '',
        pha_inspection_date: property.pha_inspection_date || '',
        next_inspection_date: property.next_inspection_date || '',
        
        // School & Location Scores
        school_district: property.school_district || '',
        walk_score: property.walk_score?.toString() || '',
        bike_score: property.bike_score?.toString() || '',
        transit_score: property.transit_score?.toString() || '',
        
        // All financial fields
        other_income: property.other_income?.toString() || '',
        utility_reimbursements: property.utility_reimbursements?.toString() || '',
        late_fee_income: property.late_fee_income?.toString() || '',
        pet_deposit: property.pet_deposit?.toString() || '',
        pet_monthly_fee: property.pet_monthly_fee?.toString() || '',
        parking_fee: property.parking_fee?.toString() || '',
        storage_fee: property.storage_fee?.toString() || '',
        laundry_income: property.laundry_income?.toString() || '',
        vending_income: property.vending_income?.toString() || '',
        amenity_fees: property.amenity_fees?.toString() || '',
        security_deposit_amount: property.security_deposit_amount?.toString() || '',
        first_month_rent: property.first_month_rent?.toString() || '',
        last_month_rent: property.last_month_rent?.toString() || '',
        late_fee_amount: property.late_fee_amount?.toString() || '',
        application_fee: property.application_fee?.toString() || '',
        water_cost: property.water_cost?.toString() || '',
        electric_cost: property.electric_cost?.toString() || '',
        gas_cost: property.gas_cost?.toString() || '',
        trash_cost: property.trash_cost?.toString() || '',
        sewer_cost: property.sewer_cost?.toString() || '',
        landscaping_cost: property.landscaping_cost?.toString() || '',
        cleaning_cost: property.cleaning_cost?.toString() || '',
        legal_fees: property.legal_fees?.toString() || '',
        accounting_fees: property.accounting_fees?.toString() || '',
        marketing_cost: property.marketing_cost?.toString() || '',
        office_expenses: property.office_expenses?.toString() || '',
        software_cost: property.software_cost?.toString() || '',
        maintenance_supplies: property.maintenance_supplies?.toString() || '',
        purchase_price: property.purchase_price?.toString() || '',
        down_payment: property.down_payment?.toString() || '',
        loan_amount: property.loan_amount?.toString() || '',
        interest_rate: property.interest_rate?.toString() || '',
        loan_term_years: property.loan_term_years?.toString() || '',
        loan_type: property.loan_type || '',
        lender_name: property.lender_name || '',
        loan_start_date: property.loan_start_date || '',
        closing_costs: property.closing_costs?.toString() || '',
        capital_improvements: property.capital_improvements?.toString() || '',
        equipment_purchases: property.equipment_purchases?.toString() || '',
        estimated_monthly_payment: property.estimated_monthly_payment?.toString() || '',
        mortgage_cost: property.mortgage_cost?.toString() || '',
        annual_depreciation: property.annual_depreciation?.toString() || '',
        depreciation_method: property.depreciation_method || 'straight_line',
        hoa_fees: property.hoa_fees?.toString() || '',
        special_assessments: property.special_assessments?.toString() || '',
        improvement_costs: property.improvement_costs?.toString() || '',
        property_taxes: property.property_taxes?.toString() || '',
        insurance_cost: property.insurance_cost?.toString() || '',
        management_fee: property.management_fee?.toString() || '',
        repair_costs: property.repair_costs?.toString() || '',
        sale_price: property.sale_price?.toString() || '',
        vacancy_allowance_percent: property.vacancy_allowance_percent?.toString() || '5.0',
        target_cap_rate: property.target_cap_rate?.toString() || '',
        target_cash_on_cash: property.target_cash_on_cash?.toString() || '',
      });
    }
  }, [property]);

  // Check if this property belongs to a client portfolio
  useEffect(() => {
    const checkClientStatus = async () => {
      if (!property?.portfolio_id) {
        setIsClientProperty(false);
        setCheckingClientStatus(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('portfolios')
          .select('client_name')
          .eq('id', property.portfolio_id)
          .single();

        if (error) throw error;
        
        // If client_name exists, this is a client property
        setIsClientProperty(!!data?.client_name);
      } catch (error) {
        console.error('Error checking client status:', error);
        setIsClientProperty(false);
      } finally {
        setCheckingClientStatus(false);
      }
    };

    if (property) {
      checkClientStatus();
    }
  }, [property?.id, property?.portfolio_id]);

  const checkPendingApplications = async () => {
    if (!property) return 0;
    
    const { data, error } = await supabase
      .from('property_applications')
      .select('id')
      .eq('property_id', property.id)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Error checking pending applications:', error);
      return 0;
    }
    
    return data?.length || 0;
  };

  const handleSave = async () => {
    if (!property) return;
    
    // Check if changing from available to vacant
    if (property.status === 'available' && formData.status === 'vacant') {
      const pendingCount = await checkPendingApplications();
      
      if (pendingCount > 0) {
        setPendingApplicationsCount(pendingCount);
        setShowVacantConfirmation(true);
        return;
      }
    }
    
    // Proceed with normal save
    await performSave();
  };

  const performSave = async () => {
    if (!property) return;
    
    setLoading(true);
    try {
      const updateData = {
        // Location
        street_address: formData.street_address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zipcode: formData.zipcode.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        
        // Basic Property Info
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
        lot_size: formData.lot_size ? parseFloat(formData.lot_size) : null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        property_type: formData.property_type || null,
        stories: formData.stories ? parseInt(formData.stories) : null,
        garage_spaces: formData.garage_spaces ? parseInt(formData.garage_spaces) : null,
        
        // Financial Core
        monthly_rent: parseFloat(formData.monthly_rent),
        desired_rent: formData.desired_rent ? parseFloat(formData.desired_rent) : null,
        unit_count: parseInt(formData.unit_count) || 1,
        status: formData.status,
        
        // Property Features (arrays)
        amenities: stringToArray(formData.amenities),
        additional_features: stringToArray(formData.additional_features),
        appliances_included: stringToArray(formData.appliances_included),
        community_amenities: stringToArray(formData.community_amenities),
        security_features: stringToArray(formData.security_features),
        accessibility_features: stringToArray(formData.accessibility_features),
        
        // Utilities & Amenities
        air_conditioning: formData.air_conditioning,
        furnished: formData.furnished,
        heating_type: formData.heating_type || null,
        flooring_type: formData.flooring_type || null,
        laundry_type: formData.laundry_type || null,
        parking_type: formData.parking_type || null,
        outdoor_space_type: formData.outdoor_space_type || null,
        outdoor_space_size: formData.outdoor_space_size ? parseFloat(formData.outdoor_space_size) : null,
        utilities_included: stringToArray(formData.utilities_included),
        
        // Rental Terms
        description: formData.description.trim() || null,
        lease_start_date: formData.lease_start_date || null,
        lease_end_date: formData.lease_end_date || null,
        lease_terms: stringToArray(formData.lease_terms),
        move_in_date: formData.move_in_date || null,
        rent_due_day: formData.rent_due_day ? parseInt(formData.rent_due_day) : 1,
        late_fee_grace_days: formData.late_fee_grace_days ? parseInt(formData.late_fee_grace_days) : 5,
        
        // Pet & Tenant Policies
        pet_policy: formData.pet_policy || null,
        max_pets: formData.max_pets ? parseInt(formData.max_pets) : null,
        credit_score_required: formData.credit_score_required ? parseInt(formData.credit_score_required) : null,
        eviction_policy: formData.eviction_policy || null,
        default_tenant_type: formData.status === 'occupied' ? formData.default_tenant_type : null,
        
        // Voucher Program
        has_voucher: formData.has_voucher,
        voucher_type: formData.voucher_type || null,
        voucher_programs_accepted: stringToArray(formData.voucher_programs_accepted),
        waives_fee_for_vouchers: formData.waives_fee_for_vouchers,
        pha_payment_standard: formData.pha_payment_standard ? parseFloat(formData.pha_payment_standard) : null,
        min_voucher_amount: formData.min_voucher_amount ? parseFloat(formData.min_voucher_amount) : null,
        max_voucher_amount: formData.max_voucher_amount ? parseFloat(formData.max_voucher_amount) : null,
        min_tenant_contribution: formData.min_tenant_contribution ? parseFloat(formData.min_tenant_contribution) : null,
        pha_inspection_date: formData.pha_inspection_date || null,
        next_inspection_date: formData.next_inspection_date || null,
        
        // School & Location Scores
        school_district: formData.school_district || null,
        walk_score: formData.walk_score ? parseInt(formData.walk_score) : null,
        bike_score: formData.bike_score ? parseInt(formData.bike_score) : null,
        transit_score: formData.transit_score ? parseInt(formData.transit_score) : null,
        
        // All financial fields with proper type conversion
        other_income: formData.other_income ? parseFloat(formData.other_income) : null,
        utility_reimbursements: formData.utility_reimbursements ? parseFloat(formData.utility_reimbursements) : null,
        late_fee_income: formData.late_fee_income ? parseFloat(formData.late_fee_income) : null,
        pet_deposit: formData.pet_deposit ? parseFloat(formData.pet_deposit) : null,
        pet_monthly_fee: formData.pet_monthly_fee ? parseFloat(formData.pet_monthly_fee) : null,
        parking_fee: formData.parking_fee ? parseFloat(formData.parking_fee) : null,
        storage_fee: formData.storage_fee ? parseFloat(formData.storage_fee) : null,
        laundry_income: formData.laundry_income ? parseFloat(formData.laundry_income) : null,
        vending_income: formData.vending_income ? parseFloat(formData.vending_income) : null,
        amenity_fees: formData.amenity_fees ? parseFloat(formData.amenity_fees) : null,
        security_deposit_amount: formData.security_deposit_amount ? parseFloat(formData.security_deposit_amount) : null,
        first_month_rent: formData.first_month_rent ? parseFloat(formData.first_month_rent) : null,
        last_month_rent: formData.last_month_rent ? parseFloat(formData.last_month_rent) : null,
        late_fee_amount: formData.late_fee_amount ? parseFloat(formData.late_fee_amount) : null,
        application_fee: formData.application_fee ? parseFloat(formData.application_fee) : null,
        water_cost: formData.water_cost ? parseFloat(formData.water_cost) : null,
        electric_cost: formData.electric_cost ? parseFloat(formData.electric_cost) : null,
        gas_cost: formData.gas_cost ? parseFloat(formData.gas_cost) : null,
        trash_cost: formData.trash_cost ? parseFloat(formData.trash_cost) : null,
        sewer_cost: formData.sewer_cost ? parseFloat(formData.sewer_cost) : null,
        landscaping_cost: formData.landscaping_cost ? parseFloat(formData.landscaping_cost) : null,
        cleaning_cost: formData.cleaning_cost ? parseFloat(formData.cleaning_cost) : null,
        legal_fees: formData.legal_fees ? parseFloat(formData.legal_fees) : null,
        accounting_fees: formData.accounting_fees ? parseFloat(formData.accounting_fees) : null,
        marketing_cost: formData.marketing_cost ? parseFloat(formData.marketing_cost) : null,
        office_expenses: formData.office_expenses ? parseFloat(formData.office_expenses) : null,
        software_cost: formData.software_cost ? parseFloat(formData.software_cost) : null,
        maintenance_supplies: formData.maintenance_supplies ? parseFloat(formData.maintenance_supplies) : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        down_payment: formData.down_payment ? parseFloat(formData.down_payment) : null,
        loan_amount: formData.loan_amount ? parseFloat(formData.loan_amount) : null,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
        loan_term_years: formData.loan_term_years ? parseInt(formData.loan_term_years) : null,
        loan_type: formData.loan_type || null,
        lender_name: formData.lender_name.trim() || null,
        loan_start_date: formData.loan_start_date || null,
        closing_costs: formData.closing_costs ? parseFloat(formData.closing_costs) : null,
        capital_improvements: formData.capital_improvements ? parseFloat(formData.capital_improvements) : null,
        equipment_purchases: formData.equipment_purchases ? parseFloat(formData.equipment_purchases) : null,
        estimated_monthly_payment: formData.estimated_monthly_payment ? parseFloat(formData.estimated_monthly_payment) : null,
        mortgage_cost: formData.mortgage_cost ? parseFloat(formData.mortgage_cost) : null,
        annual_depreciation: formData.annual_depreciation ? parseFloat(formData.annual_depreciation) : null,
        depreciation_method: formData.depreciation_method || 'straight_line',
        hoa_fees: formData.hoa_fees ? parseFloat(formData.hoa_fees) : null,
        special_assessments: formData.special_assessments ? parseFloat(formData.special_assessments) : null,
        improvement_costs: formData.improvement_costs ? parseFloat(formData.improvement_costs) : null,
        property_taxes: formData.property_taxes ? parseFloat(formData.property_taxes) : null,
        insurance_cost: formData.insurance_cost ? parseFloat(formData.insurance_cost) : null,
        management_fee: formData.management_fee ? parseFloat(formData.management_fee) : null,
        repair_costs: formData.repair_costs ? parseFloat(formData.repair_costs) : null,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        vacancy_allowance_percent: formData.vacancy_allowance_percent ? parseFloat(formData.vacancy_allowance_percent) : 5.0,
        target_cap_rate: formData.target_cap_rate ? parseFloat(formData.target_cap_rate) : null,
        target_cash_on_cash: formData.target_cash_on_cash ? parseFloat(formData.target_cash_on_cash) : null,
        
        // Update the full address for consistency
        address: `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zipcode}`.replace(/,\s*,/g, ',').replace(/,\s*$/, ''),
      };

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Property updated",
        description: "Property information has been successfully updated.",
      });

      onPropertyUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: "Failed to update property information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVacant = async () => {
    setShowVacantConfirmation(false);
    await performSave();
  };

  // Delete and restore handlers
  const handleSoftDelete = async () => {
    try {
      await softDeleteProperty.mutateAsync({
        propertyId: property.id,
        reason: 'Soft deleted from property edit modal'
      });

      toast({
        title: "Property Soft Deleted",
        description: "Property has been soft deleted and can be restored later.",
      });

      onPropertyUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error soft deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to soft delete property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async () => {
    try {
      await restoreProperty.mutateAsync({
        propertyId: property.id,
        reason: 'Restored from property edit modal'
      });

      toast({
        title: "Property Restored",
        description: "Property has been successfully restored.",
      });

      onPropertyUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error restoring property:', error);
      toast({
        title: "Error",
        description: "Failed to restore property. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!property) return null;

  const showTenantTypeField = formData.status === 'occupied';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Edit Property
          </DialogTitle>
          <DialogDescription>
            Update comprehensive property information for {property.address}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className={`grid w-full ${isClientProperty ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <TabsTrigger value="basic" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Property Features
            </TabsTrigger>
            {!isClientProperty && (
              <>
                <TabsTrigger value="financial" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Financial Details
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Location Information */}
            <Collapsible open={basicInfoOpen} onOpenChange={setBasicInfoOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Location Information</h3>
                </div>
                {basicInfoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <Label htmlFor="street_address">Street Address</Label>
                    <Input
                      id="street_address"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleInputChange}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Springfield"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="IL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipcode">ZIP Code</Label>
                    <Input
                      id="zipcode"
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleInputChange}
                      placeholder="62701"
                    />
                  </div>
                  <div>
                    <Label htmlFor="school_district">School District</Label>
                    <Input
                      id="school_district"
                      name="school_district"
                      value={formData.school_district}
                      onChange={handleInputChange}
                      placeholder="District 186"
                    />
                  </div>
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="39.7817"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="-89.6501"
                    />
                  </div>
                  <div>
                    <Label htmlFor="walk_score">Walk Score</Label>
                    <Input
                      id="walk_score"
                      name="walk_score"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.walk_score}
                      onChange={handleInputChange}
                      placeholder="85"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bike_score">Bike Score</Label>
                    <Input
                      id="bike_score"
                      name="bike_score"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.bike_score}
                      onChange={handleInputChange}
                      placeholder="70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transit_score">Transit Score</Label>
                    <Input
                      id="transit_score"
                      name="transit_score"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.transit_score}
                      onChange={handleInputChange}
                      placeholder="60"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Basic Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Basic Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="property_type">Property Type</Label>
                    <Select value={formData.property_type} onValueChange={(value) => handleSelectChange('property_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_family">Single Family</SelectItem>
                        <SelectItem value="multi_family">Multi Family</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="duplex">Duplex</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      name="bedrooms"
                      type="number"
                      min="0"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      placeholder="2.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="square_feet">Square Feet</Label>
                    <Input
                      id="square_feet"
                      name="square_feet"
                      type="number"
                      min="0"
                      value={formData.square_feet}
                      onChange={handleInputChange}
                      placeholder="1500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lot_size">Lot Size (sq ft)</Label>
                    <Input
                      id="lot_size"
                      name="lot_size"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.lot_size}
                      onChange={handleInputChange}
                      placeholder="8000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year_built">Year Built</Label>
                    <Input
                      id="year_built"
                      name="year_built"
                      type="number"
                      min="1800"
                      max={new Date().getFullYear()}
                      value={formData.year_built}
                      onChange={handleInputChange}
                      placeholder="2010"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stories">Stories</Label>
                    <Input
                      id="stories"
                      name="stories"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.stories}
                      onChange={handleInputChange}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="garage_spaces">Garage Spaces</Label>
                    <Input
                      id="garage_spaces"
                      name="garage_spaces"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.garage_spaces}
                      onChange={handleInputChange}
                      placeholder="2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="monthly_rent">Monthly Rent ($)</Label>
                    <Input
                      id="monthly_rent"
                      name="monthly_rent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthly_rent}
                      onChange={handleInputChange}
                      placeholder="1500.00"
                      className="font-semibold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="desired_rent">Desired Rent ($)</Label>
                    <Input
                      id="desired_rent"
                      name="desired_rent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.desired_rent}
                      onChange={handleInputChange}
                      placeholder="1600.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_count">Unit Count</Label>
                    <Input
                      id="unit_count"
                      name="unit_count"
                      type="number"
                      min="1"
                      value={formData.unit_count}
                      onChange={handleInputChange}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Property Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="maintenance">Under Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {showTenantTypeField && (
                    <div>
                      <Label htmlFor="default_tenant_type">Tenant Type</Label>
                      <Select value={formData.default_tenant_type} onValueChange={(value) => handleSelectChange('default_tenant_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="voucher">Voucher</SelectItem>
                          <SelectItem value="non_voucher">Non-Voucher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Property Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detailed description of the property, including highlights and notable features..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            {/* Property Features */}
            <Collapsible open={propertyFeaturesOpen} onOpenChange={setPropertyFeaturesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Property Features & Amenities</h3>
                </div>
                {propertyFeaturesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-6">
                {/* Simplified Amenities Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Available Amenities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="air_conditioning"
                          checked={formData.air_conditioning || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('air_conditioning', checked as boolean)}
                        />
                        <Label htmlFor="air_conditioning" className="text-sm cursor-pointer">Air Conditioning</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="furnished"
                          checked={formData.furnished || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('furnished', checked as boolean)}
                        />
                        <Label htmlFor="furnished" className="text-sm cursor-pointer">Furnished</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="in_unit_laundry"
                          checked={formData.in_unit_laundry || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('in_unit_laundry', checked as boolean)}
                        />
                        <Label htmlFor="in_unit_laundry" className="text-sm cursor-pointer">In-Unit Laundry</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hardwood_floors"
                          checked={formData.hardwood_floors || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('hardwood_floors', checked as boolean)}
                        />
                        <Label htmlFor="hardwood_floors" className="text-sm cursor-pointer">Hardwood Floors</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pet_friendly"
                          checked={formData.pet_friendly || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('pet_friendly', checked as boolean)}
                        />
                        <Label htmlFor="pet_friendly" className="text-sm cursor-pointer">Pet-Friendly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dishwasher"
                          checked={formData.dishwasher || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('dishwasher', checked as boolean)}
                        />
                        <Label htmlFor="dishwasher" className="text-sm cursor-pointer">Dishwasher</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="balcony_patio"
                          checked={formData.balcony_patio || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('balcony_patio', checked as boolean)}
                        />
                        <Label htmlFor="balcony_patio" className="text-sm cursor-pointer">Balcony/Patio</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pool"
                          checked={formData.pool || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('pool', checked as boolean)}
                        />
                        <Label htmlFor="pool" className="text-sm cursor-pointer">Pool</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gym_fitness"
                          checked={formData.gym_fitness || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('gym_fitness', checked as boolean)}
                        />
                        <Label htmlFor="gym_fitness" className="text-sm cursor-pointer">Gym/Fitness</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="garage"
                          checked={formData.garage || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('garage', checked as boolean)}
                        />
                        <Label htmlFor="garage" className="text-sm cursor-pointer">Garage</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="security_system"
                          checked={formData.security_system || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('security_system', checked as boolean)}
                        />
                        <Label htmlFor="security_system" className="text-sm cursor-pointer">Security System</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="wheelchair_accessible"
                          checked={formData.wheelchair_accessible || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('wheelchair_accessible', checked as boolean)}
                        />
                        <Label htmlFor="wheelchair_accessible" className="text-sm cursor-pointer">Wheelchair Accessible</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="fireplace"
                          checked={formData.fireplace || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('fireplace', checked as boolean)}
                        />
                        <Label htmlFor="fireplace" className="text-sm cursor-pointer">Fireplace</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="walk_in_closets"
                          checked={formData.walk_in_closets || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('walk_in_closets', checked as boolean)}
                        />
                        <Label htmlFor="walk_in_closets" className="text-sm cursor-pointer">Walk-in Closets</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="storage_unit"
                          checked={formData.storage_unit || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('storage_unit', checked as boolean)}
                        />
                        <Label htmlFor="storage_unit" className="text-sm cursor-pointer">Storage Unit</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gated_community"
                          checked={formData.gated_community || false}
                          onCheckedChange={(checked) => handleAmenityCheckboxChange('gated_community', checked as boolean)}
                        />
                        <Label htmlFor="gated_community" className="text-sm cursor-pointer">Gated Community</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Additional Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="heating_type">Heating Type</Label>
                        <Select value={formData.heating_type} onValueChange={(value) => handleSelectChange('heating_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select heating type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="forced_air">Forced Air</SelectItem>
                            <SelectItem value="radiant">Radiant</SelectItem>
                            <SelectItem value="baseboard">Baseboard</SelectItem>
                            <SelectItem value="heat_pump">Heat Pump</SelectItem>
                            <SelectItem value="geothermal">Geothermal</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="flooring_type">Flooring Type</Label>
                        <Select value={formData.flooring_type} onValueChange={(value) => handleSelectChange('flooring_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select flooring" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hardwood">Hardwood</SelectItem>
                            <SelectItem value="laminate">Laminate</SelectItem>
                            <SelectItem value="vinyl">Vinyl</SelectItem>
                            <SelectItem value="tile">Tile</SelectItem>
                            <SelectItem value="carpet">Carpet</SelectItem>
                            <SelectItem value="concrete">Concrete</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="laundry_type">Laundry Type</Label>
                        <Select value={formData.laundry_type} onValueChange={(value) => handleSelectChange('laundry_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select laundry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_unit">In Unit</SelectItem>
                            <SelectItem value="in_building">In Building</SelectItem>
                            <SelectItem value="hookups">Hookups Only</SelectItem>
                            <SelectItem value="nearby">Nearby</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="parking_type">Parking Type</Label>
                        <Select value={formData.parking_type} onValueChange={(value) => handleSelectChange('parking_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parking" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="garage">Garage</SelectItem>
                            <SelectItem value="driveway">Driveway</SelectItem>
                            <SelectItem value="street">Street</SelectItem>
                            <SelectItem value="lot">Parking Lot</SelectItem>
                            <SelectItem value="covered">Covered</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="outdoor_space_type">Outdoor Space</Label>
                        <Select value={formData.outdoor_space_type} onValueChange={(value) => handleSelectChange('outdoor_space_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outdoor space" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="balcony">Balcony</SelectItem>
                            <SelectItem value="patio">Patio</SelectItem>
                            <SelectItem value="yard">Yard</SelectItem>
                            <SelectItem value="deck">Deck</SelectItem>
                            <SelectItem value="rooftop">Rooftop Access</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="outdoor_space_size">Outdoor Space Size (sq ft)</Label>
                        <Input
                          id="outdoor_space_size"
                          name="outdoor_space_size"
                          type="number"
                          value={formData.outdoor_space_size || ''}
                          onChange={handleInputChange}
                          placeholder="Enter size in sq ft"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {!isClientProperty && (
              <>
                {/* Rental Terms */}
                <Collapsible open={rentalTermsOpen} onOpenChange={setRentalTermsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Rental Terms & Policies</h3>
                </div>
                {rentalTermsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="lease_start_date">Lease Start Date</Label>
                    <Input
                      id="lease_start_date"
                      name="lease_start_date"
                      type="date"
                      value={formData.lease_start_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lease_end_date">Lease End Date</Label>
                    <Input
                      id="lease_end_date"
                      name="lease_end_date"
                      type="date"
                      value={formData.lease_end_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="move_in_date">Available Move-in Date</Label>
                    <Input
                      id="move_in_date"
                      name="move_in_date"
                      type="date"
                      value={formData.move_in_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rent_due_day">Rent Due Day</Label>
                    <Select value={formData.rent_due_day} onValueChange={(value) => handleSelectChange('rent_due_day', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="late_fee_grace_days">Late Fee Grace Days</Label>
                    <Input
                      id="late_fee_grace_days"
                      name="late_fee_grace_days"
                      type="number"
                      min="0"
                      max="30"
                      value={formData.late_fee_grace_days}
                      onChange={handleInputChange}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credit_score_required">Min Credit Score</Label>
                    <Input
                      id="credit_score_required"
                      name="credit_score_required"
                      type="number"
                      min="300"
                      max="850"
                      value={formData.credit_score_required}
                      onChange={handleInputChange}
                      placeholder="650"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pet_policy">Pet Policy</Label>
                    <Select value={formData.pet_policy} onValueChange={(value) => handleSelectChange('pet_policy', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pet policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">Pets Allowed</SelectItem>
                        <SelectItem value="cats_only">Cats Only</SelectItem>
                        <SelectItem value="dogs_only">Dogs Only</SelectItem>
                        <SelectItem value="small_pets">Small Pets Only</SelectItem>
                        <SelectItem value="no_pets">No Pets</SelectItem>
                        <SelectItem value="case_by_case">Case by Case</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="max_pets">Max Pets Allowed</Label>
                    <Input
                      id="max_pets"
                      name="max_pets"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.max_pets}
                      onChange={handleInputChange}
                      placeholder="2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lease_terms">Lease Terms</Label>
                    <Textarea
                      id="lease_terms"
                      name="lease_terms"
                      value={formData.lease_terms}
                      onChange={handleInputChange}
                      placeholder="12 month lease, 6 month lease, month-to-month..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
                  </div>
                  <div>
                    <Label htmlFor="eviction_policy">Eviction Policy</Label>
                    <Textarea
                      id="eviction_policy"
                      name="eviction_policy"
                      value={formData.eviction_policy}
                      onChange={handleInputChange}
                      placeholder="No recent evictions, case by case basis..."
                      rows={3}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Voucher Program */}
            <Collapsible open={voucherProgramOpen} onOpenChange={setVoucherProgramOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Voucher Program Settings</h3>
                </div>
                {voucherProgramOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_voucher"
                      checked={formData.has_voucher}
                      onCheckedChange={(checked) => handleSwitchChange('has_voucher', checked)}
                    />
                    <Label htmlFor="has_voucher">Accepts Vouchers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="waives_fee_for_vouchers"
                      checked={formData.waives_fee_for_vouchers}
                      onCheckedChange={(checked) => handleSwitchChange('waives_fee_for_vouchers', checked)}
                    />
                    <Label htmlFor="waives_fee_for_vouchers">Waives Fees for Vouchers</Label>
                  </div>
                </div>

                {formData.has_voucher && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="voucher_type">Voucher Type</Label>
                        <Select value={formData.voucher_type} onValueChange={(value) => handleSelectChange('voucher_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select voucher type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="section8">Section 8</SelectItem>
                            <SelectItem value="project_based">Project Based</SelectItem>
                            <SelectItem value="tenant_based">Tenant Based</SelectItem>
                            <SelectItem value="vash">VASH</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="voucher_programs_accepted">Voucher Programs Accepted</Label>
                        <Textarea
                          id="voucher_programs_accepted"
                          name="voucher_programs_accepted"
                          value={formData.voucher_programs_accepted}
                          onChange={handleInputChange}
                          placeholder="Section 8, VASH, Emergency Housing Voucher..."
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="pha_payment_standard">PHA Payment Standard ($)</Label>
                        <Input
                          id="pha_payment_standard"
                          name="pha_payment_standard"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.pha_payment_standard}
                          onChange={handleInputChange}
                          placeholder="1200.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="min_voucher_amount">Min Voucher Amount ($)</Label>
                        <Input
                          id="min_voucher_amount"
                          name="min_voucher_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.min_voucher_amount}
                          onChange={handleInputChange}
                          placeholder="800.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_voucher_amount">Max Voucher Amount ($)</Label>
                        <Input
                          id="max_voucher_amount"
                          name="max_voucher_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.max_voucher_amount}
                          onChange={handleInputChange}
                          placeholder="1500.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="min_tenant_contribution">Min Tenant Contribution ($)</Label>
                        <Input
                          id="min_tenant_contribution"
                          name="min_tenant_contribution"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.min_tenant_contribution}
                          onChange={handleInputChange}
                          placeholder="300.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pha_inspection_date">Last PHA Inspection</Label>
                        <Input
                          id="pha_inspection_date"
                          name="pha_inspection_date"
                          type="date"
                          value={formData.pha_inspection_date}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="next_inspection_date">Next Inspection Due</Label>
                        <Input
                          id="next_inspection_date"
                          name="next_inspection_date"
                          type="date"
                          value={formData.next_inspection_date}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </TabsContent>

          {!isClientProperty && (
            <TabsContent value="financial" className="space-y-6">
            {/* Income & Revenue */}
            <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Income & Revenue</h3>
                </div>
                {incomeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="other_income">Other Income ($)</Label>
                    <Input
                      id="other_income"
                      name="other_income"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.other_income}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="utility_reimbursements">Utility Reimbursements ($)</Label>
                    <Input
                      id="utility_reimbursements"
                      name="utility_reimbursements"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.utility_reimbursements}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="late_fee_income">Late Fee Income ($)</Label>
                    <Input
                      id="late_fee_income"
                      name="late_fee_income"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.late_fee_income}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pet_monthly_fee">Pet Monthly Fee ($)</Label>
                    <Input
                      id="pet_monthly_fee"
                      name="pet_monthly_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pet_monthly_fee}
                      onChange={handleInputChange}
                      placeholder="25.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parking_fee">Parking Fee ($)</Label>
                    <Input
                      id="parking_fee"
                      name="parking_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.parking_fee}
                      onChange={handleInputChange}
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="storage_fee">Storage Fee ($)</Label>
                    <Input
                      id="storage_fee"
                      name="storage_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.storage_fee}
                      onChange={handleInputChange}
                      placeholder="30.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="laundry_income">Laundry Income ($)</Label>
                    <Input
                      id="laundry_income"
                      name="laundry_income"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.laundry_income}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vending_income">Vending Income ($)</Label>
                    <Input
                      id="vending_income"
                      name="vending_income"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.vending_income}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amenity_fees">Amenity Fees ($)</Label>
                    <Input
                      id="amenity_fees"
                      name="amenity_fees"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amenity_fees}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <h4 className="text-md font-semibold mt-6 mb-3">Move-in Fees & Deposits</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="security_deposit_amount">Security Deposit ($)</Label>
                    <Input
                      id="security_deposit_amount"
                      name="security_deposit_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.security_deposit_amount}
                      onChange={handleInputChange}
                      placeholder="1500.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pet_deposit">Pet Deposit ($)</Label>
                    <Input
                      id="pet_deposit"
                      name="pet_deposit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pet_deposit}
                      onChange={handleInputChange}
                      placeholder="300.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="application_fee">Application Fee ($)</Label>
                    <Input
                      id="application_fee"
                      name="application_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.application_fee}
                      onChange={handleInputChange}
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="late_fee_amount">Late Fee ($)</Label>
                    <Input
                      id="late_fee_amount"
                      name="late_fee_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.late_fee_amount}
                      onChange={handleInputChange}
                      placeholder="75.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="first_month_rent">First Month Rent ($)</Label>
                    <Input
                      id="first_month_rent"
                      name="first_month_rent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.first_month_rent}
                      onChange={handleInputChange}
                      placeholder="1500.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_month_rent">Last Month Rent ($)</Label>
                    <Input
                      id="last_month_rent"
                      name="last_month_rent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.last_month_rent}
                      onChange={handleInputChange}
                      placeholder="1500.00"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Operating Expenses */}
            <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Operating Expenses</h3>
                </div>
                {expensesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <h4 className="text-md font-semibold mb-3">Utilities (Monthly)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="water_cost">Water ($)</Label>
                    <Input
                      id="water_cost"
                      name="water_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.water_cost}
                      onChange={handleInputChange}
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="electric_cost">Electricity ($)</Label>
                    <Input
                      id="electric_cost"
                      name="electric_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.electric_cost}
                      onChange={handleInputChange}
                      placeholder="100.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gas_cost">Gas ($)</Label>
                    <Input
                      id="gas_cost"
                      name="gas_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.gas_cost}
                      onChange={handleInputChange}
                      placeholder="75.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="trash_cost">Trash/Recycling ($)</Label>
                    <Input
                      id="trash_cost"
                      name="trash_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.trash_cost}
                      onChange={handleInputChange}
                      placeholder="25.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sewer_cost">Sewer ($)</Label>
                    <Input
                      id="sewer_cost"
                      name="sewer_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sewer_cost}
                      onChange={handleInputChange}
                      placeholder="30.00"
                    />
                  </div>
                </div>

                <h4 className="text-md font-semibold mt-6 mb-3">Property Maintenance (Monthly)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="landscaping_cost">Landscaping ($)</Label>
                    <Input
                      id="landscaping_cost"
                      name="landscaping_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.landscaping_cost}
                      onChange={handleInputChange}
                      placeholder="80.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cleaning_cost">Cleaning ($)</Label>
                    <Input
                      id="cleaning_cost"
                      name="cleaning_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cleaning_cost}
                      onChange={handleInputChange}
                      placeholder="100.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repair_costs">Repairs & Maintenance ($)</Label>
                    <Input
                      id="repair_costs"
                      name="repair_costs"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.repair_costs}
                      onChange={handleInputChange}
                      placeholder="150.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintenance_supplies">Maintenance Supplies ($)</Label>
                    <Input
                      id="maintenance_supplies"
                      name="maintenance_supplies"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maintenance_supplies}
                      onChange={handleInputChange}
                      placeholder="50.00"
                    />
                  </div>
                </div>

                <h4 className="text-md font-semibold mt-6 mb-3">Professional Services (Monthly)</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="legal_fees">Legal Fees ($)</Label>
                    <Input
                      id="legal_fees"
                      name="legal_fees"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.legal_fees}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accounting_fees">Accounting ($)</Label>
                    <Input
                      id="accounting_fees"
                      name="accounting_fees"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.accounting_fees}
                      onChange={handleInputChange}
                      placeholder="75.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="management_fee">Management Fee ($)</Label>
                    <Input
                      id="management_fee"
                      name="management_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.management_fee}
                      onChange={handleInputChange}
                      placeholder="150.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="software_cost">Software/Tools ($)</Label>
                    <Input
                      id="software_cost"
                      name="software_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.software_cost}
                      onChange={handleInputChange}
                      placeholder="30.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="marketing_cost">Marketing ($)</Label>
                    <Input
                      id="marketing_cost"
                      name="marketing_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.marketing_cost}
                      onChange={handleInputChange}
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="office_expenses">Office Expenses ($)</Label>
                    <Input
                      id="office_expenses"
                      name="office_expenses"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.office_expenses}
                      onChange={handleInputChange}
                      placeholder="25.00"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Capital & Financing */}
            <Collapsible open={capitalOpen} onOpenChange={setCapitalOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Capital & Financing</h3>
                </div>
                {capitalOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <h4 className="text-md font-semibold mb-3">Purchase Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                    <Input
                      id="purchase_price"
                      name="purchase_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.purchase_price}
                      onChange={handleInputChange}
                      placeholder="250000.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="down_payment">Down Payment ($)</Label>
                    <Input
                      id="down_payment"
                      name="down_payment"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.down_payment}
                      onChange={handleInputChange}
                      placeholder="50000.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="closing_costs">Closing Costs ($)</Label>
                    <Input
                      id="closing_costs"
                      name="closing_costs"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.closing_costs}
                      onChange={handleInputChange}
                      placeholder="7500.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="capital_improvements">Capital Improvements ($)</Label>
                    <Input
                      id="capital_improvements"
                      name="capital_improvements"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.capital_improvements}
                      onChange={handleInputChange}
                      placeholder="15000.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="equipment_purchases">Equipment Purchases ($)</Label>
                    <Input
                      id="equipment_purchases"
                      name="equipment_purchases"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.equipment_purchases}
                      onChange={handleInputChange}
                      placeholder="5000.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sale_price">Current Sale Price ($)</Label>
                    <Input
                      id="sale_price"
                      name="sale_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sale_price}
                      onChange={handleInputChange}
                      placeholder="280000.00"
                    />
                  </div>
                </div>

                <h4 className="text-md font-semibold mt-6 mb-3">Loan Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="loan_amount">Loan Amount ($)</Label>
                    <Input
                      id="loan_amount"
                      name="loan_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.loan_amount}
                      onChange={handleInputChange}
                      placeholder="200000.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                    <Input
                      id="interest_rate"
                      name="interest_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      value={formData.interest_rate}
                      onChange={handleInputChange}
                      placeholder="4.75"
                    />
                  </div>
                  <div>
                    <Label htmlFor="loan_term_years">Loan Term (Years)</Label>
                    <Input
                      id="loan_term_years"
                      name="loan_term_years"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.loan_term_years}
                      onChange={handleInputChange}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="loan_type">Loan Type</Label>
                    <Select value={formData.loan_type} onValueChange={(value) => handleSelectChange('loan_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select loan type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conventional">Conventional</SelectItem>
                        <SelectItem value="fha">FHA</SelectItem>
                        <SelectItem value="va">VA</SelectItem>
                        <SelectItem value="usda">USDA</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="portfolio">Portfolio</SelectItem>
                        <SelectItem value="hard_money">Hard Money</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lender_name">Lender Name</Label>
                    <Input
                      id="lender_name"
                      name="lender_name"
                      value={formData.lender_name}
                      onChange={handleInputChange}
                      placeholder="First National Bank"
                    />
                  </div>
                  <div>
                    <Label htmlFor="loan_start_date">Loan Start Date</Label>
                    <Input
                      id="loan_start_date"
                      name="loan_start_date"
                      type="date"
                      value={formData.loan_start_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <h4 className="text-md font-semibold mt-6 mb-3">Monthly Carrying Costs</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="mortgage_cost">Mortgage Payment ($)</Label>
                    <Input
                      id="mortgage_cost"
                      name="mortgage_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.mortgage_cost}
                      onChange={handleInputChange}
                      placeholder="1046.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_monthly_payment">Estimated Monthly Payment ($)</Label>
                    <Input
                      id="estimated_monthly_payment"
                      name="estimated_monthly_payment"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.estimated_monthly_payment}
                      onChange={handleInputChange}
                      placeholder="1200.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="property_taxes">Property Taxes (Monthly) ($)</Label>
                    <Input
                      id="property_taxes"
                      name="property_taxes"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.property_taxes}
                      onChange={handleInputChange}
                      placeholder="200.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="insurance_cost">Insurance (Monthly) ($)</Label>
                    <Input
                      id="insurance_cost"
                      name="insurance_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.insurance_cost}
                      onChange={handleInputChange}
                      placeholder="125.00"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

          </TabsContent>
          )}

          {!isClientProperty && (
            <TabsContent value="performance" className="space-y-6">
              {/* Performance & Analysis */}
              <Collapsible open={performanceOpen} onOpenChange={setPerformanceOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Performance Metrics & Analysis</h3>
                  </div>
                  {performanceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="vacancy_allowance_percent">Vacancy Allowance (%)</Label>
                      <Input
                        id="vacancy_allowance_percent"
                        name="vacancy_allowance_percent"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.vacancy_allowance_percent}
                        onChange={handleInputChange}
                        placeholder="5.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="target_cap_rate">Target Cap Rate (%)</Label>
                      <Input
                        id="target_cap_rate"
                        name="target_cap_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.target_cap_rate}
                        onChange={handleInputChange}
                        placeholder="8.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="target_cash_on_cash">Target Cash-on-Cash Return (%)</Label>
                      <Input
                        id="target_cash_on_cash"
                        name="target_cash_on_cash"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.target_cash_on_cash}
                        onChange={handleInputChange}
                        placeholder="12.0"
                      />
                    </div>
                  </div>

                  {/* Performance Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Monthly Rent</div>
                        <div className="text-2xl font-bold">${formData.monthly_rent || '0'}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Monthly Expenses</div>
                        <div className="text-2xl font-bold">
                          ${(
                            (parseFloat(formData.mortgage_cost) || 0) +
                            (parseFloat(formData.property_taxes) || 0) +
                            (parseFloat(formData.insurance_cost) || 0) +
                            (parseFloat(formData.management_fee) || 0) +
                            (parseFloat(formData.repair_costs) || 0) +
                            (parseFloat(formData.water_cost) || 0) +
                            (parseFloat(formData.electric_cost) || 0) +
                            (parseFloat(formData.gas_cost) || 0)
                          ).toFixed(0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Monthly Cash Flow</div>
                        <div className="text-2xl font-bold">
                          ${(
                            (parseFloat(formData.monthly_rent) || 0) -
                            (parseFloat(formData.mortgage_cost) || 0) -
                            (parseFloat(formData.property_taxes) || 0) -
                            (parseFloat(formData.insurance_cost) || 0) -
                            (parseFloat(formData.management_fee) || 0) -
                            (parseFloat(formData.repair_costs) || 0) -
                            (parseFloat(formData.water_cost) || 0) -
                            (parseFloat(formData.electric_cost) || 0) -
                            (parseFloat(formData.gas_cost) || 0)
                          ).toFixed(0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Investment</div>
                        <div className="text-2xl font-bold">
                          ${(
                            (parseFloat(formData.down_payment) || 0) +
                            (parseFloat(formData.closing_costs) || 0) +
                            (parseFloat(formData.capital_improvements) || 0)
                          ).toFixed(0)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex flex-col gap-3 pt-6">
          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={loading || !formData.monthly_rent}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>

          {/* Soft Delete / Restore Button */}
          {property.deleted_at ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center gap-2" size="lg">
                  <RotateCcw className="h-4 w-4" />
                  Restore Property
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore Property</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore the property at {property.address} and make it visible again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRestore}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Restore Property
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full flex items-center gap-2" size="lg">
                  <Trash2 className="h-4 w-4" />
                  Soft Delete Property
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Soft Delete Property</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the property at {property.address} but it can be restored later.
                    All data will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSoftDelete}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Soft Delete Property
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </DialogContent>

      {/* Vacant Status Confirmation Dialog */}
      <AlertDialog open={showVacantConfirmation} onOpenChange={setShowVacantConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Property from Market?</AlertDialogTitle>
            <AlertDialogDescription>
              This property currently has {pendingApplicationsCount} pending application{pendingApplicationsCount !== 1 ? 's' : ''}. 
              Changing the status to "vacant" will:
              <br /><br />
              <strong>• Automatically withdraw all pending applications</strong>
              <br />
              <strong>• Return application credits to affected tenants</strong>
              <br />
              <strong>• Remove the property from the marketplace</strong>
              <br /><br />
              Tenants will be notified that their application credits have been returned because the property is no longer available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVacant}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Withdraw Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default EditPropertyModal;