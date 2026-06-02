import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MapPin, 
  Bed, 
  Bath, 
  DollarSign, 
  Calendar, 
  Home, 
  Users, 
  TrendingUp,
  Eye,
  MessageSquare,
  Wrench,
  FileText,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Building,
  Filter,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedPropertyDocuments from './EnhancedPropertyDocuments';
import PropertyUnitsManager from './PropertyUnitsManager';
import TenantProfileModal from './TenantProfileModal';
import { PropertyFinances } from './property-steps/PropertyFinances';
import PropertyFinancialBreakdown from './PropertyFinancialBreakdown';
import EnhancedPropertyFinancialBreakdown from './EnhancedPropertyFinancialBreakdown';
import { useUnitFinancialAggregation } from '@/hooks/useUnitFinancialAggregation';

import { PropertyCashFlowManager } from './property/PropertyCashFlowManager';
import { usePmMode } from '@/hooks/usePmMode';
import { useAllIncomingPayments, useAllIncomingPaymentStats } from '@/hooks/useAllIncomingPayments';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyPaymentsSubTab } from './property/PropertyPaymentsSubTab';
import { PropertyExpenses } from './property/PropertyExpenses';

interface Property {
  id: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  desired_rent: number;
  zipcode: string;
  city: string;
  state: string;
  street_address: string;
  photos: string[];
  amenities: string[];
  status: string;
  owner_id: string;
  tenant_request_count?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  unit_count?: number;
  insurance_cost?: number;
  mortgage_cost?: number;
  management_fee?: number;
  repair_costs?: number;
  square_feet?: number;
  property_type?: string;
  move_in_date?: string;
  // Comprehensive financial fields
  purchase_price?: number;
  current_market_value?: number;
  purchase_date?: string;
  down_payment_amount?: number;
  loan_amount?: number;
  interest_rate?: number;
  security_deposit_amount?: number;
  application_fee?: number;
  late_fee_amount?: number;
  pet_deposit?: number;
  pet_fee_monthly?: number;
  utility_water?: number;
  utility_electric?: number;
  utility_gas?: number;
  utility_trash?: number;
  landscaping_cost?: number;
  advertising_cost?: number;
  legal_professional_fees?: number;
  capital_improvements?: number;
  property_management_software?: number;
  turnover_costs?: number;
  tenant_screening_costs?: number;
  other_income_sources?: number;
  other_income_description?: string;
  property_taxes?: number;
  [key: string]: any;
}

interface PropertyUnit {
  id: string;
  unit_number: string;
  unit_name: string | null;
  monthly_rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  status: string;
  tenant_id: string | null;
}

interface AggregatedUnitData {
  totalBedrooms: number;
  totalBathrooms: number;
  totalSquareFeet: number;
  totalMonthlyRent: number;
  averageRent: number;
  occupiedUnits: number;
  availableUnits: number;
}

interface LandlordPropertyDetailsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (property: Property) => void;
  onViewApplications: (property: Property) => void;
  onViewMessages: (property: Property) => void;
}

const LandlordPropertyDetailsModal = ({ 
  property, 
  isOpen, 
  onClose, 
  onEdit,
  onViewApplications,
  onViewMessages
}: LandlordPropertyDetailsModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [applications, setApplications] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedUnitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { pmEnabled } = usePmMode();

  // If PM mode flips off while a PM-only tab is active, snap to overview
  useEffect(() => {
    if (!pmEnabled && (activeTab === 'financials' || activeTab === 'maintenance')) {
      setActiveTab('overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmEnabled]);

  const [currentTenants, setCurrentTenants] = useState<any[]>([]);
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState<{
    tenantId: string;
    propertyId: string;
  } | null>(null);
  
  // Maintenance pagination state
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [maintenanceItemsPerPage, setMaintenanceItemsPerPage] = useState(2);
  
  // Tenants pagination state
  const [tenantsPage, setTenantsPage] = useState(1);
  const [tenantsItemsPerPage, setTenantsItemsPerPage] = useState(10);
  
  // Expense metrics state
  const [expenseMetrics, setExpenseMetrics] = useState({ total: 0, thisMonth: 0 });
  
  // Handle items per page change - reset to page 1
  const handleMaintenanceItemsPerPageChange = (value: string) => {
    setMaintenanceItemsPerPage(Number(value));
    setMaintenancePage(1);
  };
  
  // Handle tenants items per page change
  const handleTenantsItemsPerPageChange = (value: string) => {
    setTenantsItemsPerPage(Number(value));
    setTenantsPage(1);
  };
  
  // Financial editing state
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [financialFormData, setFinancialFormData] = useState<any>({});
  const [rentSplitId, setRentSplitId] = useState<string | null>(null);
  const { toast } = useToast();

  // Payment filters for Payments sub-tab
  const [paymentFilters, setPaymentFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    paymentType: 'all',
  });

  // Unit financial aggregation for multi-unit properties
  const { aggregatedData: unitFinancialData, units: financialUnits, loading: unitDataLoading } = useUnitFinancialAggregation(property?.id || '');

  // Property-specific payment queries
  const propertyPaymentFilters = {
    propertyId: property?.id,
    dateFrom: paymentFilters.dateFrom || undefined,
    dateTo: paymentFilters.dateTo || undefined,
    status: paymentFilters.status === 'all' ? undefined : paymentFilters.status,
    paymentType: paymentFilters.paymentType === 'all' ? undefined : paymentFilters.paymentType,
  };

  const { data: propertyPaymentsData, isLoading: propertyPaymentsLoading } = useAllIncomingPayments(
    property?.owner_id || '',
    undefined,
    propertyPaymentFilters
  );

  const { data: propertyPaymentStats } = useAllIncomingPaymentStats(
    property?.owner_id || '',
    undefined,
    { propertyId: property?.id }
  );

  useEffect(() => {
    if (property && isOpen) {
      initializeFinancialData();
      fetchPropertyData();
      // Reset to overview tab if property changes to single unit
      const isMultiUnit = property.unit_count && property.unit_count > 1;
      if (!isMultiUnit && activeTab === "units") {
        setActiveTab("overview");
      }
    }
  }, [property, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const sections = ['overview', 'financials', 'tenants', 'maintenance', 'documents', 'details'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const sectionId = entry.target.getAttribute('data-section');
            if (sectionId && sections.includes(sectionId)) {
              setActiveTab(sectionId);
            }
          }
        });
      },
      { threshold: [0.3, 0.7], rootMargin: '-50px 0px -50px 0px' }
    );

    // Start observing after a delay to let DOM settle
    const timer = setTimeout(() => {
      sections.forEach(section => {
        const element = document.querySelector(`[data-section="${section}"]`);
        if (element) observer.observe(element);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isOpen]);

  // Field mapping utility functions
  const mapDatabaseToForm = (dbData: any) => {
    return {
      // Basic fields
      status: dbData.status,
      tenantType: dbData.tenant_type || 'market_rate',
      description: dbData.description,
      
      // Rent & HAP fields (will be populated from rent_splits in initializeFinancialData)
      monthly_rent: dbData.monthly_rent,
      tenant_portion: '',
      hap_portion: '',
      voucher_type: '',
      
      // Monthly Operating Expenses - map snake_case to camelCase
      monthlyInsurance: dbData.insurance_cost,
      monthlyMortgage: dbData.mortgage_cost,
      monthlyManagementFee: dbData.management_fee,
      monthlyRepairs: dbData.repair_costs,
      propertyTaxes: dbData.property_taxes,
      
      // Property Acquisition & Value
      purchasePrice: dbData.purchase_price,
      currentMarketValue: dbData.current_market_value,
      purchaseDate: dbData.purchase_date,
      downPaymentAmount: dbData.down_payment_amount,
      loanAmount: dbData.loan_amount,
      interestRate: dbData.interest_rate,
      
      // Additional Income Sources
      securityDepositAmount: dbData.security_deposit_amount,
      applicationFee: dbData.application_fee,
      lateFeeAmount: dbData.late_fee_amount,
      petDeposit: dbData.pet_deposit,
      petFeeMonthly: dbData.pet_fee_monthly,
      otherIncomeSources: dbData.other_income_sources,
      otherIncomeDescription: dbData.other_income_description,
      
      // Utilities & Additional Operating Costs
      utilityWater: dbData.utility_water,
      utilityElectric: dbData.utility_electric,
      utilityGas: dbData.utility_gas,
      utilityTrash: dbData.utility_trash,
      landscapingCost: dbData.landscaping_cost,
      advertisingCost: dbData.advertising_cost,
      legalProfessionalFees: dbData.legal_professional_fees,
      propertyManagementSoftware: dbData.property_management_software,
      capitalImprovements: dbData.capital_improvements,
      turnoverCosts: dbData.turnover_costs,
      tenantScreeningCosts: dbData.tenant_screening_costs,
    };
  };

  const mapFormToDatabase = (formData: any) => {
    return {
      // Basic fields
      status: formData.status,
      tenant_type: formData.tenantType,
      description: formData.description,
      
      // Rent field - allow null for unset values
      monthly_rent: formData.monthly_rent === '' || formData.monthly_rent === undefined 
        ? null 
        : parseFloat(formData.monthly_rent) || 0,
      
      // Monthly Operating Expenses - map camelCase to snake_case
      insurance_cost: parseFloat(formData.monthlyInsurance) || 0,
      mortgage_cost: parseFloat(formData.monthlyMortgage) || 0,
      management_fee: parseFloat(formData.monthlyManagementFee) || 0,
      repair_costs: parseFloat(formData.monthlyRepairs) || 0,
      property_taxes: parseFloat(formData.propertyTaxes) || 0,
      
      // Property Acquisition & Value
      purchase_price: parseFloat(formData.purchasePrice) || 0,
      current_market_value: parseFloat(formData.currentMarketValue) || 0,
      purchase_date: formData.purchaseDate,
      down_payment_amount: parseFloat(formData.downPaymentAmount) || 0,
      loan_amount: parseFloat(formData.loanAmount) || 0,
      interest_rate: parseFloat(formData.interestRate) || 0,
      
      // Additional Income Sources
      security_deposit_amount: parseFloat(formData.securityDepositAmount) || 0,
      application_fee: parseFloat(formData.applicationFee) || 0,
      late_fee_amount: parseFloat(formData.lateFeeAmount) || 0,
      pet_deposit: parseFloat(formData.petDeposit) || 0,
      pet_fee_monthly: parseFloat(formData.petFeeMonthly) || 0,
      other_income_sources: parseFloat(formData.otherIncomeSources) || 0,
      other_income_description: formData.otherIncomeDescription,
      
      // Utilities & Additional Operating Costs
      utility_water: parseFloat(formData.utilityWater) || 0,
      utility_electric: parseFloat(formData.utilityElectric) || 0,
      utility_gas: parseFloat(formData.utilityGas) || 0,
      utility_trash: parseFloat(formData.utilityTrash) || 0,
      landscaping_cost: parseFloat(formData.landscapingCost) || 0,
      advertising_cost: parseFloat(formData.advertisingCost) || 0,
      legal_professional_fees: parseFloat(formData.legalProfessionalFees) || 0,
      property_management_software: parseFloat(formData.propertyManagementSoftware) || 0,
      capital_improvements: parseFloat(formData.capitalImprovements) || 0,
      turnover_costs: parseFloat(formData.turnoverCosts) || 0,
      tenant_screening_costs: parseFloat(formData.tenantScreeningCosts) || 0,
    };
  };

  const initializeFinancialData = async () => {
    if (property) {
      const baseFormData = mapDatabaseToForm(property);
      
      // Fetch existing rent_splits
      const { data: rentSplit } = await supabase
        .from('rent_splits')
        .select('*')
        .eq('property_id', property.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (rentSplit) {
        setRentSplitId(rentSplit.id);
        baseFormData.tenant_portion = rentSplit.tenant_portion?.toString() || '';
        baseFormData.hap_portion = rentSplit.pha_portion?.toString() || '';
        baseFormData.voucher_type = rentSplit.voucher_type || '';
        // Use rent_split's total_rent if available
        baseFormData.monthly_rent = rentSplit.total_rent?.toString() || baseFormData.monthly_rent;
      }
      
      setFinancialFormData(baseFormData);
    }
  };

  const fetchPropertyData = async () => {
    if (!property) return;
    
    setLoading(true);
    try {
      // Fetch applications
      const { data: appData } = await supabase
        .from('property_applications')
        .select(`
          *,
          profiles:tenant_id (first_name, last_name, phone)
        `)
        .eq('property_id', property.id)
        .order('created_at', { ascending: false });

      // Fetch current tenants
      const { data: tenantsData } = await supabase
        .from('marketplace_applications')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          property_units (
            id,
            unit_number,
            unit_name
          )
        `)
        .eq('property_id', property.id)
        .eq('lifecycle_stage', 'current_tenant')
        .eq('status', 'housed')
        .order('became_tenant_at', { ascending: false });

      // Fetch maintenance requests with unit information
      const { data: maintData } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          property_units (
            id,
            unit_number,
            unit_name
          )
        `)
        .eq('property_id', property.id)
        .order('created_at', { ascending: false });

      // Fetch expense metrics from vendor_payment_records (property-level AND unit-level)
      // First get unit IDs for this property
      const { data: propertyUnits } = await supabase
        .from('property_units')
        .select('id')
        .eq('property_id', property.id);

      const unitIds = propertyUnits?.map(u => u.id) || [];

      // Fetch expenses by property_id OR by unit_id (for unit-level payments)
      let expenseQuery = supabase
        .from('vendor_payment_records')
        .select('amount, paid_at');

      if (unitIds.length > 0) {
        expenseQuery = expenseQuery.or(`property_id.eq.${property.id},unit_id.in.(${unitIds.join(',')})`);
      } else {
        expenseQuery = expenseQuery.eq('property_id', property.id);
      }

      const { data: expenseData } = await expenseQuery;

      if (expenseData) {
        const total = expenseData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonth = expenseData
          .filter(exp => {
            if (!exp.paid_at) return false;
            const date = new Date(exp.paid_at);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);
        setExpenseMetrics({ total, thisMonth });
      }

      // Fetch units for multi-unit properties
      if (property.unit_count && property.unit_count > 1) {
        const { data: unitsData } = await supabase
          .from('property_units')
          .select('*')
          .eq('property_id', property.id)
          .order('unit_number');

        if (unitsData) {
          setUnits(unitsData);
          
          // Aggregate unit data
          const aggregated = unitsData.reduce((acc, unit) => {
            return {
              totalBedrooms: acc.totalBedrooms + (unit.bedrooms || 0),
              totalBathrooms: acc.totalBathrooms + (unit.bathrooms || 0),
              totalSquareFeet: acc.totalSquareFeet + (unit.square_feet || 0),
              totalMonthlyRent: acc.totalMonthlyRent + (unit.monthly_rent || 0),
              occupiedUnits: acc.occupiedUnits + (unit.status === 'occupied' ? 1 : 0),
              availableUnits: acc.availableUnits + (unit.status === 'available' ? 1 : 0),
              averageRent: 0 // Will calculate after
            };
          }, {
            totalBedrooms: 0,
            totalBathrooms: 0,
            totalSquareFeet: 0,
            totalMonthlyRent: 0,
            occupiedUnits: 0,
            availableUnits: 0,
            averageRent: 0
          });

          // Calculate average rent
          const rentableUnits = unitsData.filter(unit => unit.monthly_rent && unit.monthly_rent > 0);
          aggregated.averageRent = rentableUnits.length > 0 
            ? aggregated.totalMonthlyRent / rentableUnits.length 
            : 0;

          setAggregatedData(aggregated);
        }
      }

      setApplications(appData || []);
      setMaintenanceRequests(maintData || []);
      setCurrentTenants(tenantsData || []);
    } catch (error) {
      console.error('Error fetching property data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  const displayRent = property.desired_rent || property.monthly_rent;
  const fullAddress = `${property.street_address}, ${property.city}, ${property.state} ${property.zipcode}`;
  const images = property.photos || [];
  const isMultiUnit = property.unit_count && property.unit_count > 1;

  const displayBedrooms = isMultiUnit && aggregatedData 
    ? `${aggregatedData.totalBedrooms} total` 
    : property.bedrooms || 'N/A';
  
  const displayBathrooms = isMultiUnit && aggregatedData 
    ? `${aggregatedData.totalBathrooms} total` 
    : property.bathrooms || 'N/A';

  const displaySquareFeet = isMultiUnit && aggregatedData && aggregatedData.totalSquareFeet > 0
    ? `${aggregatedData.totalSquareFeet.toLocaleString()} total sq ft`
    : property.square_feet ? `${property.square_feet.toLocaleString()} sq ft` : null;

  const displayMonthlyRent = isMultiUnit && aggregatedData && aggregatedData.totalMonthlyRent > 0
    ? aggregatedData.totalMonthlyRent
    : displayRent;

  const getStatusBadge = () => {
    switch (property.status) {
      case 'occupied':
        return <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Occupied
        </Badge>;
      case 'available':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Eye className="h-3 w-3 mr-1" />
          Available
        </Badge>;
      case 'vacant':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Vacant
        </Badge>;
      default:
        return <Badge variant="outline">{property.status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const calculateMonthlyProfit = () => {
    const income = displayMonthlyRent;
    const expenses = (property.mortgage_cost || 0) + 
                   (property.insurance_cost || 0) + 
                   (property.management_fee || 0) + 
                   (property.repair_costs || 0);
    return income - expenses;
  };

  const calculateYearlyROI = () => {
    const monthlyProfit = calculateMonthlyProfit();
    const yearlyProfit = monthlyProfit * 12;
    const totalInvestment = (property.mortgage_cost || 0) * 12; // Simplified calculation
    return totalInvestment > 0 ? (yearlyProfit / totalInvestment) * 100 : 0;
  };

  const updateFinancialFormData = (field: string, value: any) => {
    setFinancialFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFinancialSave = async () => {
    if (!property) return;

    try {
      const mappedData = mapFormToDatabase(financialFormData);
      
      const { error } = await supabase
        .from('properties')
        .update({
          ...mappedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', property.id);

      if (error) throw error;

      // Upsert to rent_splits table if voucher data is provided
      if (financialFormData.voucher_type && financialFormData.monthly_rent) {
        const rentSplitData = {
          property_id: property.id,
          total_rent: parseFloat(financialFormData.monthly_rent) || 0,
          tenant_portion: parseFloat(financialFormData.tenant_portion) || 0,
          pha_portion: parseFloat(financialFormData.hap_portion) || 0,
          voucher_type: financialFormData.voucher_type,
          is_active: true,
          effective_date: new Date().toISOString().split('T')[0],
        };

        if (rentSplitId) {
          // Update existing rent_split
          const { error: rentSplitError } = await supabase
            .from('rent_splits')
            .update(rentSplitData)
            .eq('id', rentSplitId);
          
          if (rentSplitError) throw rentSplitError;
        } else {
          // Insert new rent_split
          const { data: newRentSplit, error: rentSplitError } = await supabase
            .from('rent_splits')
            .insert(rentSplitData)
            .select()
            .single();
          
          if (rentSplitError) throw rentSplitError;
          if (newRentSplit) setRentSplitId(newRentSplit.id);
        }
      }

      // Dispatch properties-changed event to refresh dashboard
      window.dispatchEvent(new CustomEvent('properties-changed', { 
        detail: { eventType: 'UPDATE' }
      }));

      toast({
        title: "Success",
        description: "Financial details updated successfully",
      });

      setIsEditingFinancials(false);
      
      // Update the property object with new values (mapped back to snake_case)
      Object.assign(property, mappedData);
    } catch (error) {
      console.error('Error updating financial details:', error);
      toast({
        title: "Error",
        description: "Failed to update financial details",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 animate-scale-in [&>button]:hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <Home className="h-6 w-6" />
                    Property Details
                  </DialogTitle>
                  <p className="text-gray-600 mt-1">{fullAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge()}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(property)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Property
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Property Images */}
            {images.length > 0 && (
              <div className="mb-6 animate-fade-in">
                <div className="relative h-80 bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={images[currentImageIndex]} 
                    alt={`Property photo ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                  
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
                        <Badge variant="outline" className="bg-white/90">
                          <Camera className="h-3 w-3 mr-1" />
                          {currentImageIndex + 1} of {images.length}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="sticky top-0 z-10 bg-background border-b">
                {(() => {
                  const visibleCount =
                    1 /* overview */ +
                    (isMultiUnit ? 1 : 0) +
                    (pmEnabled ? 1 : 0) /* financials */ +
                    1 /* tenants */ +
                    (pmEnabled ? 1 : 0) /* maintenance */ +
                    1; /* documents */
                  const colsMap: Record<number, string> = {
                    3: 'grid-cols-3',
                    4: 'grid-cols-4',
                    5: 'grid-cols-5',
                    6: 'grid-cols-6',
                  };
                  const colsClass = colsMap[visibleCount] ?? 'grid-cols-6';
                  return (
                    <TabsList className={`grid w-full ${colsClass}`}>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      {isMultiUnit && <TabsTrigger value="units">Units</TabsTrigger>}
                      {pmEnabled && <TabsTrigger value="financials">Financials</TabsTrigger>}
                      <TabsTrigger value="tenants">Tenants</TabsTrigger>
                      {pmEnabled && <TabsTrigger value="maintenance">Maintenance</TabsTrigger>}
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                  );
                })()}
              </div>



              <TabsContent value="overview" data-section="overview" className="space-y-6 animate-fade-in">
                {/* Financial Analytics - Only for properties with financial data */}
                {unitFinancialData && !unitDataLoading && (
                  <>
                    <div className="flex items-center justify-between mt-2">
                      <h3 className="text-lg font-semibold">Financial Analytics</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('financials')}
                      >
                        View Details
                      </Button>
                    </div>
                    
                    {/* 4 KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center">
                            <DollarSign className="h-8 w-8 text-primary" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-muted-foreground">Average Rent/Unit</p>
                              <p className="text-2xl font-bold">{formatCurrency(unitFinancialData.averageRentPerUnit)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center">
                            <Home className="h-8 w-8 text-primary" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
                              <p className="text-2xl font-bold">{unitFinancialData.occupancyRate.toFixed(1)}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center">
                            <TrendingUp className="h-8 w-8 text-primary" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-muted-foreground">Monthly NOI</p>
                              <p className="text-2xl font-bold">{formatCurrency(unitFinancialData.netOperatingIncome)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center">
                            <TrendingUp className="h-8 w-8 text-primary" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-muted-foreground">Annual ROI</p>
                              <p className="text-2xl font-bold">
                                {property.purchase_price && property.purchase_price > 0
                                  ? `${((unitFinancialData.netOperatingIncome * 12 / property.purchase_price) * 100).toFixed(1)}%`
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Revenue Analysis and Expense Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      {/* Revenue Analysis */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Revenue Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Potential Revenue</span>
                            <span className="font-semibold">{formatCurrency(unitFinancialData.totalPotentialRent + unitFinancialData.totalAdditionalIncome)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Actual Revenue</span>
                            <span className="font-semibold text-primary">{formatCurrency(unitFinancialData.totalIncome)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm text-muted-foreground">Vacancy Loss</span>
                            <span className="font-semibold text-destructive">
                              {formatCurrency((unitFinancialData.totalPotentialRent + unitFinancialData.totalAdditionalIncome) - unitFinancialData.totalIncome)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Expense Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Expense Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Property-Level</span>
                            <span className="font-semibold">{formatCurrency(unitFinancialData.totalPropertyLevelExpenses)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Unit-Level</span>
                            <span className="font-semibold">{formatCurrency(unitFinancialData.totalUnitOperatingExpenses)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm text-muted-foreground">Total Expense Ratio</span>
                            <span className="font-semibold">
                              {unitFinancialData.totalIncome > 0 
                                ? formatPercentage((unitFinancialData.totalExpenses / unitFinancialData.totalIncome) * 100)
                                : '0%'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Net Operating Income</span>
                            <span className="font-bold text-primary">{formatCurrency(unitFinancialData.netOperatingIncome)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Advanced Financial Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Est. Cap Rate</span>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          {formatPercentage(
                            unitFinancialData.totalIncome > 0 && property?.purchase_price
                              ? ((unitFinancialData.totalIncome - unitFinancialData.totalPropertyLevelExpenses - unitFinancialData.totalUnitOperatingExpenses) * 12 / property.purchase_price) * 100
                              : 0
                          )}
                        </div>
                      </Card>

                      <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Avg. Revenue/Unit</span>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(
                            unitFinancialData.occupiedUnits > 0 
                              ? unitFinancialData.totalIncome / unitFinancialData.occupiedUnits 
                              : 0
                          )}
                        </div>
                      </Card>

                      <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Avg. Expenses/Unit</span>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(
                            unitFinancialData.totalUnits > 0 
                              ? (unitFinancialData.totalPropertyLevelExpenses + unitFinancialData.totalUnitOperatingExpenses) / unitFinancialData.totalUnits 
                              : 0
                          )}
                        </div>
                      </Card>

                      <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Net Margin</span>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          {formatPercentage(
                            unitFinancialData.totalIncome > 0
                              ? ((unitFinancialData.totalIncome - unitFinancialData.totalPropertyLevelExpenses - unitFinancialData.totalUnitOperatingExpenses) / unitFinancialData.totalIncome) * 100
                              : 0
                          )}
                        </div>
                      </Card>
                    </div>
                    
                    {/* Unit Performance Analysis */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Unit Performance Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Best Performer */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Best Performer</h4>
                            {financialUnits.length > 0 && (() => {
                              const bestUnit = [...unitFinancialData.unitSummaries].sort((a, b) => b.unitNetIncome - a.unitNetIncome)[0];
                              return (
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                  <div className="font-medium">{bestUnit.unitNumber || `Unit ${bestUnit.unitId.slice(0, 8)}`}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Net: {formatCurrency(bestUnit.unitNetIncome)}/mo
                                  </div>
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    {((bestUnit.unitNetIncome / bestUnit.totalUnitIncome) * 100).toFixed(1)}% margin
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Occupancy Status */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-muted-foreground text-sm">Occupancy Status</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Occupied Units</span>
                                <span className="font-medium">{unitFinancialData.occupiedUnits} / {unitFinancialData.totalUnits}</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all" 
                                  style={{ width: `${unitFinancialData.occupancyRate}%` }}
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {unitFinancialData.totalUnits - unitFinancialData.occupiedUnits} vacant units
                              </div>
                            </div>
                          </div>

                          {/* Needs Attention */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Needs Attention</h4>
                            {(() => {
                              const underperformingUnits = unitFinancialData.unitSummaries.filter(unit => {
                                const margin = unit.totalUnitIncome > 0 ? (unit.unitNetIncome / unit.totalUnitIncome) * 100 : 0;
                                return margin < 70 || unit.status !== 'occupied';
                              });
                              return underperformingUnits.length > 0 ? (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <div className="font-medium">{underperformingUnits.length} units</div>
                                  <div className="text-sm text-muted-foreground">
                                    Low margins or vacant
                                  </div>
                                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                    Review recommended
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                  <div className="font-medium">All units</div>
                                  <div className="text-sm text-muted-foreground">
                                    Performing well
                                  </div>
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    No issues detected
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Property Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Property Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Bedrooms</span>
                        <div className="flex items-center">
                          <Bed className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="font-medium">{displayBedrooms}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Bathrooms</span>
                        <div className="flex items-center">
                          <Bath className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="font-medium">{displayBathrooms}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Units</span>
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="font-medium">{property.unit_count || 1}</span>
                        </div>
                      </div>
                      {isMultiUnit && aggregatedData && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Occupied Units</span>
                            <span className="font-medium text-green-600">{aggregatedData.occupiedUnits}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Available Units</span>
                            <span className="font-medium text-blue-600">{aggregatedData.availableUnits}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status</span>
                        {getStatusBadge()}
                      </div>
                      {displaySquareFeet && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Square Feet</span>
                          <span className="font-medium">{displaySquareFeet}</span>
                        </div>
                      )}
                      {property.property_type && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Property Type</span>
                          <span className="font-medium capitalize">{property.property_type.replace('_', ' ')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Lease Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {property.lease_start_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Lease Start</span>
                          <span className="font-medium">{formatDate(property.lease_start_date)}</span>
                        </div>
                      )}
                      {property.lease_end_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Lease End</span>
                          <span className="font-medium">{formatDate(property.lease_end_date)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Tenant Requests</span>
                        <Badge variant="outline">
                          {property.tenant_request_count || 0} requests
                        </Badge>
                      </div>
                      {property.move_in_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Available From</span>
                          <span className="font-medium">{formatDate(property.move_in_date)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {isMultiUnit && (
                <TabsContent value="units" data-section="units" className="animate-fade-in">
                  <PropertyUnitsManager 
                    propertyId={property.id}
                    landlordId={property.owner_id}
                    propertyAddress={`${property.street_address}, ${property.city}, ${property.state} ${property.zipcode}`}
                  />
                </TabsContent>
              )}

              <TabsContent value="financials" data-section="financials" className="animate-fade-in">
                <Tabs defaultValue="payments" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="financial-data">Financial Data</TabsTrigger>
                  </TabsList>

                  {/* Payments Sub-Tab */}
                  <TabsContent value="payments" className="space-y-6">
                    <PropertyPaymentsSubTab
                      propertyPaymentsData={propertyPaymentsData}
                      propertyPaymentStats={propertyPaymentStats}
                      propertyPaymentsLoading={propertyPaymentsLoading}
                      paymentFilters={paymentFilters}
                      setPaymentFilters={setPaymentFilters}
                    />
                  </TabsContent>

                  {/* Financial Data Sub-Tab */}
                  <TabsContent value="financial-data" className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Comprehensive Financial Management</h3>
                      <Button 
                        onClick={handleFinancialSave}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>

                    {/* Data Completeness Indicator */}
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Financial Data Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Complete financial data for accurate analytics and reporting
                        </p>
                      </CardContent>
                    </Card>

                    {/* Comprehensive Financial Input Form */}
                    <PropertyFinances
                      formData={financialFormData}
                      updateFormData={updateFinancialFormData}
                      property={property}
                    />

                    {/* Enhanced Financial Summary with Unit Aggregation */}
                    <EnhancedPropertyFinancialBreakdown 
                      property={property || { id: '', monthly_rent: 0 }} 
                      showTopMetrics={false}
                      showUnitPerformance={false}
                      showRevenueExpense={false}
                      showAdvancedMetrics={false}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="tenants" data-section="tenants" className="animate-fade-in">
                {(() => {
                  const tenantsTotalPages = Math.ceil(currentTenants.length / tenantsItemsPerPage);
                  const paginatedTenants = currentTenants.slice(
                    (tenantsPage - 1) * tenantsItemsPerPage,
                    tenantsPage * tenantsItemsPerPage
                  );
                  const startIndex = (tenantsPage - 1) * tenantsItemsPerPage + 1;
                  const endIndex = Math.min(tenantsPage * tenantsItemsPerPage, currentTenants.length);

                  return (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Current Tenants
                          </CardTitle>
                          {currentTenants.length > 0 && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Show:</span>
                                <Select value={tenantsItemsPerPage.toString()} onValueChange={handleTenantsItemsPerPageChange}>
                                  <SelectTrigger className="w-[70px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {startIndex}-{endIndex} of {currentTenants.length}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setTenantsPage(prev => Math.max(1, prev - 1))}
                                  disabled={tenantsPage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setTenantsPage(prev => Math.min(tenantsTotalPages, prev + 1))}
                                  disabled={tenantsPage === tenantsTotalPages}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {loading ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Loading tenants...</p>
                          </div>
                        ) : currentTenants.length === 0 ? (
                          <div className="text-center py-8">
                            <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">No current tenants</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tenant</TableHead>
                                {isMultiUnit && <TableHead>Unit</TableHead>}
                                <TableHead>Contact</TableHead>
                                <TableHead>Housed Since</TableHead>
                                <TableHead className="w-[60px]">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedTenants.map((tenant: any) => (
                                <TableRow key={tenant.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {tenant.profiles?.first_name} {tenant.profiles?.last_name}
                                      </span>
                                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                        Current
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  {isMultiUnit && (
                                    <TableCell>
                                      {tenant.property_units?.unit_number ? (
                                        <span className="text-sm">
                                          {tenant.property_units.unit_name || `Unit ${tenant.property_units.unit_number}`}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    <div className="flex flex-col text-sm">
                                      {tenant.profiles?.email && (
                                        <span className="text-muted-foreground truncate max-w-[180px]" title={tenant.profiles.email}>
                                          {tenant.profiles.email}
                                        </span>
                                      )}
                                      {tenant.profiles?.phone && (
                                        <span className="text-muted-foreground">{tenant.profiles.phone}</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {tenant.became_tenant_at ? (
                                      <span className="text-sm">{formatDate(tenant.became_tenant_at)}</span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {tenant.profiles?.id && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setSelectedTenantForProfile({
                                          tenantId: tenant.profiles.id,
                                          propertyId: property.id
                                        })}
                                        title="View tenant details"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Tenant Profile Modal */}
                {selectedTenantForProfile && (
                  <TenantProfileModal
                    isOpen={!!selectedTenantForProfile}
                    onClose={() => setSelectedTenantForProfile(null)}
                    tenantId={selectedTenantForProfile.tenantId}
                    propertyId={selectedTenantForProfile.propertyId}
                    isPrimary={true}
                    showPrimaryBadge={false}
                  />
                )}
              </TabsContent>

              <TabsContent value="maintenance" data-section="maintenance" className="animate-fade-in">
                <div className="space-y-6">
                  {/* Expense Summary Widgets */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{maintenanceRequests.length}</div>
                          <div className="text-sm text-muted-foreground">Total Requests</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">${expenseMetrics.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className="text-sm text-muted-foreground">Amount Spent</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">${expenseMetrics.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className="text-sm text-muted-foreground">Spent This Month</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Maintenance Requests with Pagination */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <CardTitle className="text-lg">Maintenance Requests</CardTitle>
                      {maintenanceRequests.length > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Show:</span>
                            <Select 
                              value={maintenanceItemsPerPage.toString()} 
                              onValueChange={handleMaintenanceItemsPerPageChange}
                            >
                              <SelectTrigger className="w-[60px] h-7">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {((maintenancePage - 1) * maintenanceItemsPerPage) + 1}-{Math.min(maintenancePage * maintenanceItemsPerPage, maintenanceRequests.length)} of {maintenanceRequests.length}
                          </span>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7"
                              disabled={maintenancePage === 1}
                              onClick={() => setMaintenancePage(p => p - 1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7"
                              disabled={maintenancePage >= Math.ceil(maintenanceRequests.length / maintenanceItemsPerPage)}
                              onClick={() => setMaintenancePage(p => p + 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {maintenanceRequests.length === 0 ? (
                        <div className="text-center py-8">
                          <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-muted-foreground">No maintenance requests</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {maintenanceRequests
                            .slice((maintenancePage - 1) * maintenanceItemsPerPage, maintenancePage * maintenanceItemsPerPage)
                            .map((req: any) => (
                            <div key={req.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{req.title}</p>
                                  {req.unit_id && req.property_units && (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                                      Unit {req.property_units.unit_number || req.property_units.unit_name || req.unit_id}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDate(req.submitted_date)}
                                </p>
                              </div>
                              <div className="ml-3 flex flex-col gap-2">
                                <Badge 
                                  variant={req.status === 'completed' ? 'default' : 
                                         req.status === 'in_progress' ? 'secondary' : 'outline'}
                                >
                                  {req.status}
                                </Badge>
                                <Badge 
                                  variant={req.priority === 'high' ? 'destructive' : 
                                         req.priority === 'medium' ? 'secondary' : 'outline'}
                                >
                                  {req.priority}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="documents" data-section="documents" className="animate-fade-in">
                <EnhancedPropertyDocuments propertyId={property.id} />
              </TabsContent>

              <TabsContent value="details" data-section="details" className="animate-fade-in">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Property Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">
                        {property.description || 'No description provided.'}
                      </p>
                    </CardContent>
                  </Card>

                  {property.amenities && property.amenities.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Amenities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.map((amenity, index) => (
                            <Badge key={index} variant="outline">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Property History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Added to Platform</span>
                        <span className="font-medium">
                          {property.created_at ? formatDate(property.created_at) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Last Updated</span>
                        <span className="font-medium">
                          {property.updated_at ? formatDate(property.updated_at) : 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LandlordPropertyDetailsModal;
