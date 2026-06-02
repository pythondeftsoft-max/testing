import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Building, DollarSign, Users, Calendar, Wrench, TrendingUp, X, AlertTriangle, Clock } from 'lucide-react';

interface PropertyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  landlordId: string;
  portfolioId?: string;
  propertyId?: string;
  title: string;
}

interface UnitDetail {
  id: string;
  unit_number: string;
  unit_name: string | null;
  status: string;
  monthly_rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  tenant_id: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  square_feet: number | null;
}

interface RentCollectionData {
  expected_rent: number;
  collected_rent: number;
  outstanding_balance: number;
  late_payments_count: number;
  avg_days_late: number;
  last_payment_date: string | null;
  collection_rate: number;
  collection_status: 'excellent' | 'good' | 'poor' | 'problem';
}

interface NOIBreakdownData {
  monthly_rent: number;
  insurance_cost: number;
  mortgage_cost: number;
  management_fee: number;
  repair_costs: number;
  total_expenses: number;
  net_operating_income: number;
  noi_margin: number;
  portfolio_contribution: number;
  profitability_category: 'profitable' | 'break-even' | 'loss-making';
}

interface TimeOnMarketData {
  days_on_market: number;
  market_performance_category: 'fast' | 'average' | 'slow' | 'problem';
  listing_date: string;
  lease_date: string | null;
  historical_days_to_lease: number | null;
  is_currently_available: boolean;
}

interface PropertyDetail {
  id: string;
  address: string;
  monthly_rent: number;
  status: string;
  bedrooms: number;
  bathrooms: number;
  lease_end_date: string | null;
  unit_count: number;
  tenant_count: number;
  maintenance_requests: number;
  collection_rate: number;
  days_on_market: number;
  units: UnitDetail[];
  rent_collection?: RentCollectionData;
  noi_breakdown?: NOIBreakdownData;
  time_on_market?: TimeOnMarketData;
}

const PropertyBreakdownModal = ({ isOpen, onClose, landlordId, portfolioId, propertyId, title }: PropertyBreakdownModalProps) => {
  const [properties, setProperties] = useState<PropertyDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && landlordId) {
      fetchPropertyDetails();
    }
  }, [isOpen, landlordId, portfolioId, propertyId]);

  const fetchRentCollectionData = async (propertyId: string, monthlyRent: number): Promise<RentCollectionData> => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Fetch rent payments for the last 6 months
      const { data: payments, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('property_id', propertyId)
        .gte('payment_date', sixMonthsAgo.toISOString().split('T')[0])
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const paymentsData = payments || [];
      
      // Calculate metrics
      const totalExpected = monthlyRent * 6; // 6 months expected
      const totalCollected = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
      
      const latePayments = paymentsData.filter(p => p.days_late && p.days_late > 0);
      const avgDaysLate = latePayments.length > 0 
        ? latePayments.reduce((sum, p) => sum + (p.days_late || 0), 0) / latePayments.length 
        : 0;

      // Calculate outstanding balance (simplified)
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const hasCurrentMonthPayment = paymentsData.some(p => 
        new Date(p.payment_date) >= currentMonthStart
      );
      const outstandingBalance = hasCurrentMonthPayment ? 0 : monthlyRent;

      // Determine status
      let collectionStatus: RentCollectionData['collection_status'] = 'excellent';
      if (collectionRate < 70) collectionStatus = 'problem';
      else if (collectionRate < 85) collectionStatus = 'poor';
      else if (collectionRate < 95) collectionStatus = 'good';

      return {
        expected_rent: totalExpected,
        collected_rent: totalCollected,
        outstanding_balance: outstandingBalance,
        late_payments_count: latePayments.length,
        avg_days_late: avgDaysLate,
        last_payment_date: paymentsData.length > 0 ? paymentsData[0].payment_date : null,
        collection_rate: collectionRate,
        collection_status: collectionStatus
      };
    } catch (error) {
      console.error('Error fetching rent collection data:', error);
      // Return default values on error
      return {
        expected_rent: monthlyRent * 6,
        collected_rent: 0,
        outstanding_balance: monthlyRent,
        late_payments_count: 0,
        avg_days_late: 0,
        last_payment_date: null,
        collection_rate: 0,
        collection_status: 'problem'
      };
    }
  };

  const fetchNOIBreakdownData = async (property: any, totalPortfolioNOI: number): Promise<NOIBreakdownData> => {
    const monthlyRent = property.monthly_rent || 0;
    const insuranceCost = property.insurance_cost || 0;
    const mortgageCost = property.mortgage_cost || 0;
    const managementFee = property.management_fee || 0;
    const repairCosts = property.repair_costs || 0;
    
    const totalExpenses = insuranceCost + mortgageCost + managementFee + repairCosts;
    const netOperatingIncome = monthlyRent - totalExpenses;
    const noiMargin = monthlyRent > 0 ? (netOperatingIncome / monthlyRent) * 100 : 0;
    const portfolioContribution = totalPortfolioNOI > 0 ? (netOperatingIncome / totalPortfolioNOI) * 100 : 0;
    
    let profitabilityCategory: NOIBreakdownData['profitability_category'] = 'profitable';
    if (netOperatingIncome < -100) profitabilityCategory = 'loss-making';
    else if (netOperatingIncome <= 100) profitabilityCategory = 'break-even';
    
    return {
      monthly_rent: monthlyRent,
      insurance_cost: insuranceCost,
      mortgage_cost: mortgageCost,
      management_fee: managementFee,
      repair_costs: repairCosts,
      total_expenses: totalExpenses,
      net_operating_income: netOperatingIncome,
      noi_margin: noiMargin,
      portfolio_contribution: portfolioContribution,
      profitability_category: profitabilityCategory
    };
  };

  const fetchTimeOnMarketData = async (property: any): Promise<TimeOnMarketData> => {
    const currentDate = new Date();
    const listingDate = new Date(property.created_at);
    const isCurrentlyAvailable = ['available', 'vacant'].includes(property.status);
    
    // Calculate current days on market
    const daysOnMarket = Math.floor((currentDate.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let historicalDaysToLease: number | null = null;
    let leaseDate: string | null = null;
    
    // Try to find historical leasing data if property was recently leased
    if (!isCurrentlyAvailable) {
      try {
        // Look for approved applications to estimate lease date
        const { data: applications } = await supabase
          .from('property_applications')
          .select('created_at, updated_at')
          .eq('property_id', property.id)
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (applications && applications.length > 0) {
          const approvalDate = new Date(applications[0].updated_at);
          leaseDate = applications[0].updated_at;
          historicalDaysToLease = Math.floor((approvalDate.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      } catch (error) {
        console.error('Error fetching historical lease data:', error);
      }
    }
    
    // Determine market performance category
    let marketPerformanceCategory: TimeOnMarketData['market_performance_category'] = 'average';
    const relevantDays = isCurrentlyAvailable ? daysOnMarket : (historicalDaysToLease || daysOnMarket);
    
    if (relevantDays <= 30) marketPerformanceCategory = 'fast';
    else if (relevantDays <= 60) marketPerformanceCategory = 'average';
    else if (relevantDays <= 90) marketPerformanceCategory = 'slow';
    else marketPerformanceCategory = 'problem';
    
    return {
      days_on_market: daysOnMarket,
      market_performance_category: marketPerformanceCategory,
      listing_date: property.created_at,
      lease_date: leaseDate,
      historical_days_to_lease: historicalDaysToLease,
      is_currently_available: isCurrentlyAvailable
    };
  };

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      
      // Build the query based on whether we're filtering by a specific property or category
      let query = supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          status,
          bedrooms,
          bathrooms,
          lease_end_date,
          unit_count,
          created_at,
          insurance_cost,
          mortgage_cost,
          management_fee,
          repair_costs
        `)
        .eq('owner_id', landlordId)
        .is('deleted_at', null)
        .not('portfolio_id', 'is', null); // Only show properties with portfolio_id
      
      // Filter by portfolio if a specific one is selected
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      // Apply filters based on the title/category
      if (title.includes('Vacant')) {
        query = query.eq('status', 'vacant');
      } else if (title.includes('Available')) {
        query = query.eq('status', 'available');
      } else if (title.includes('Expiring')) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query.lte('lease_end_date', thirtyDaysFromNow.toISOString().split('T')[0]);
      } else if (title.includes('Late')) {
        // This would need a more complex query with joins - for now, show all occupied
        query = query.eq('status', 'occupied');
      }

      const { data: propertiesData, error } = await query;

      if (error) throw error;

      // Fetch units for each property and enhance with additional metrics
      const enhancedProperties = await Promise.all(
        (propertiesData || []).map(async (property) => {
          // Fetch units for this property
          const { data: unitsData } = await supabase
            .from('property_units')
            .select(`
              id,
              unit_number,
              unit_name,
              status,
              monthly_rent,
              bedrooms,
              bathrooms,
              tenant_id,
              lease_start_date,
              lease_end_date,
              square_feet
            `)
            .eq('property_id', property.id);

          // Calculate tenant count based on occupied units or property status
          const occupiedUnits = unitsData?.filter(unit => unit.status === 'occupied').length || 0;
          const tenant_count = unitsData?.length > 0 ? occupiedUnits : (property.status === 'occupied' ? 1 : 0);

          return {
            ...property,
            tenant_count,
            maintenance_requests: Math.floor(Math.random() * 3), // Simulated
            collection_rate: property.status === 'occupied' ? 85 + Math.random() * 15 : 0,
            days_on_market: property.status === 'available' ? 
              Math.floor((new Date().getTime() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
            units: unitsData || []
          };
        })
      );

      // If this is rent collection performance, enhance with actual rent payment data
      if (title.includes('Rent Collection Performance')) {
        const propertiesWithRentData = await Promise.all(
          enhancedProperties.map(async (property) => {
            const rentCollectionData = await fetchRentCollectionData(property.id, property.monthly_rent);
            return {
              ...property,
              rent_collection: rentCollectionData,
              collection_rate: rentCollectionData.collection_rate
            };
          })
        );
        
        // Sort by collection performance (worst first for attention)
        propertiesWithRentData.sort((a, b) => {
          if (!a.rent_collection || !b.rent_collection) return 0;
          return a.rent_collection.collection_rate - b.rent_collection.collection_rate;
        });
        
        setProperties(propertiesWithRentData);
      } else if (title.includes('Financial Performance')) {
        // Calculate total portfolio NOI first for contribution percentages
        const totalPortfolioNOI = enhancedProperties.reduce((sum, property) => {
          const monthlyRent = property.monthly_rent || 0;
          const totalExpenses = (property.insurance_cost || 0) + (property.mortgage_cost || 0) + 
                               (property.management_fee || 0) + (property.repair_costs || 0);
          return sum + (monthlyRent - totalExpenses);
        }, 0);

        const propertiesWithNOIData = await Promise.all(
          enhancedProperties.map(async (property) => {
            const noiBreakdownData = await fetchNOIBreakdownData(property, totalPortfolioNOI);
            return {
              ...property,
              noi_breakdown: noiBreakdownData
            };
          })
        );
        
        // Sort by NOI (worst performing first for attention)
        propertiesWithNOIData.sort((a, b) => {
          if (!a.noi_breakdown || !b.noi_breakdown) return 0;
          return a.noi_breakdown.net_operating_income - b.noi_breakdown.net_operating_income;
        });
        
        setProperties(propertiesWithNOIData);
      } else if (title.includes('Marketing Performance')) {
        // Add time-on-market specific data
        const propertiesWithTimeData = await Promise.all(
          enhancedProperties.map(async (property) => {
            const timeOnMarketData = await fetchTimeOnMarketData(property);
            return {
              ...property,
              time_on_market: timeOnMarketData,
              days_on_market: timeOnMarketData.days_on_market
            };
          })
        );
        
        // Sort by time on market (longest first for attention)
        propertiesWithTimeData.sort((a, b) => {
          if (!a.time_on_market || !b.time_on_market) return 0;
          return b.time_on_market.days_on_market - a.time_on_market.days_on_market;
        });
        
        setProperties(propertiesWithTimeData);
      } else {
        setProperties(enhancedProperties);
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800 border-green-200';
      case 'available': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vacant': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCollectionStatusColor = (status: RentCollectionData['collection_status']) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'poor': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'problem': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCollectionStatusIcon = (status: RentCollectionData['collection_status']) => {
    switch (status) {
      case 'excellent': return TrendingUp;
      case 'good': return DollarSign;
      case 'poor': return Clock;
      case 'problem': return AlertTriangle;
      default: return DollarSign;
    }
  };

  const getProfitabilityCategoryColor = (category: NOIBreakdownData['profitability_category']) => {
    switch (category) {
      case 'profitable': return 'bg-green-100 text-green-800 border-green-200';
      case 'break-even': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'loss-making': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProfitabilityIcon = (category: NOIBreakdownData['profitability_category']) => {
    switch (category) {
      case 'profitable': return TrendingUp;
      case 'break-even': return DollarSign;
      case 'loss-making': return AlertTriangle;
      default: return DollarSign;
    }
  };

  const getMarketPerformanceColor = (category: TimeOnMarketData['market_performance_category']) => {
    switch (category) {
      case 'fast': return 'bg-green-100 text-green-800 border-green-200';
      case 'average': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'slow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'problem': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMarketPerformanceIcon = (category: TimeOnMarketData['market_performance_category']) => {
    switch (category) {
      case 'fast': return TrendingUp;
      case 'average': return Clock;
      case 'slow': return AlertTriangle;
      case 'problem': return AlertTriangle;
      default: return Clock;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">{title} - Property Breakdown</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>No properties match this category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-md transition-shadow border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-black text-lg mb-2">{property.address}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>{property.bedrooms}BR / {property.bathrooms}BA</span>
                        <Badge className={getStatusColor(property.status)}>
                          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-black">{formatCurrency(property.monthly_rent)}</div>
                      <div className="text-sm text-gray-600">monthly rent</div>
                    </div>
                  </div>

                   {/* Show rent collection specific metrics if available */}
                   {title.includes('Rent Collection Performance') && property.rent_collection ? (
                     <div className="space-y-4">
                       {/* Collection Status Badge */}
                       <div className="flex items-center justify-between">
                         <Badge className={getCollectionStatusColor(property.rent_collection.collection_status)}>
                           {property.rent_collection.collection_status.charAt(0).toUpperCase() + 
                            property.rent_collection.collection_status.slice(1)} Performance
                         </Badge>
                         {property.rent_collection.outstanding_balance > 0 && (
                           <div className="text-red-600 font-medium text-sm">
                             {formatCurrency(property.rent_collection.outstanding_balance)} Outstanding
                           </div>
                         )}
                       </div>

                       {/* Collection Metrics Grid */}
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {/* Collection Rate */}
                         <div className="flex items-center space-x-2">
                           {(() => {
                             const StatusIcon = getCollectionStatusIcon(property.rent_collection.collection_status);
                             return <StatusIcon className="w-4 h-4 text-gray-500" />;
                           })()}
                           <div>
                             <div className="text-sm font-medium text-black">
                               {property.rent_collection.collection_rate.toFixed(1)}%
                             </div>
                             <div className="text-xs text-gray-600">Collection Rate</div>
                           </div>
                         </div>

                         {/* Amount Collected */}
                         <div className="flex items-center space-x-2">
                           <DollarSign className="w-4 h-4 text-green-500" />
                           <div>
                             <div className="text-sm font-medium text-black">
                               {formatCurrency(property.rent_collection.collected_rent)}
                             </div>
                             <div className="text-xs text-gray-600">
                               of {formatCurrency(property.rent_collection.expected_rent)}
                             </div>
                           </div>
                         </div>

                         {/* Late Payments */}
                         <div className="flex items-center space-x-2">
                           <Clock className="w-4 h-4 text-orange-500" />
                           <div>
                             <div className="text-sm font-medium text-black">
                               {property.rent_collection.late_payments_count}
                             </div>
                             <div className="text-xs text-gray-600">Late Payments</div>
                           </div>
                         </div>

                         {/* Average Days Late */}
                         <div className="flex items-center space-x-2">
                           <Calendar className="w-4 h-4 text-red-500" />
                           <div>
                             <div className="text-sm font-medium text-black">
                               {property.rent_collection.avg_days_late.toFixed(0)}d
                             </div>
                             <div className="text-xs text-gray-600">Avg Days Late</div>
                           </div>
                         </div>
                       </div>

                       {/* Last Payment Info */}
                       {property.rent_collection.last_payment_date && (
                         <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                           Last payment: {new Date(property.rent_collection.last_payment_date).toLocaleDateString()}
                         </div>
                       )}
                     </div>
                   ) : title.includes('Financial Performance') && property.noi_breakdown ? (
                     <div className="space-y-4">
                       {/* Profitability Status Badge */}
                       <div className="flex items-center justify-between">
                         <Badge className={getProfitabilityCategoryColor(property.noi_breakdown.profitability_category)}>
                           {property.noi_breakdown.profitability_category.charAt(0).toUpperCase() + 
                            property.noi_breakdown.profitability_category.slice(1).replace('-', ' ')} Property
                         </Badge>
                         <div className={`font-medium text-sm ${property.noi_breakdown.net_operating_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                           {formatCurrency(property.noi_breakdown.net_operating_income)} NOI
                         </div>
                       </div>

                       {/* NOI Calculation Breakdown */}
                       <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                         <div className="flex justify-between text-sm">
                           <span className="text-gray-600">Monthly Rent Revenue:</span>
                           <span className="font-medium text-green-600">{formatCurrency(property.noi_breakdown.monthly_rent)}</span>
                         </div>
                         <div className="space-y-1 text-xs text-gray-600">
                           <div className="flex justify-between">
                             <span>Insurance Cost:</span>
                             <span>-{formatCurrency(property.noi_breakdown.insurance_cost)}</span>
                           </div>
                           <div className="flex justify-between">
                             <span>Mortgage Cost:</span>
                             <span>-{formatCurrency(property.noi_breakdown.mortgage_cost)}</span>
                           </div>
                           <div className="flex justify-between">
                             <span>Management Fee:</span>
                             <span>-{formatCurrency(property.noi_breakdown.management_fee)}</span>
                           </div>
                           <div className="flex justify-between">
                             <span>Repair Costs:</span>
                             <span>-{formatCurrency(property.noi_breakdown.repair_costs)}</span>
                           </div>
                         </div>
                         <div className="border-t pt-2 flex justify-between text-sm font-medium">
                           <span>Total Expenses:</span>
                           <span className="text-red-600">-{formatCurrency(property.noi_breakdown.total_expenses)}</span>
                         </div>
                       </div>

                       {/* NOI Performance Metrics */}
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         {/* NOI Margin */}
                         <div className="flex items-center space-x-2">
                           {(() => {
                             const ProfitIcon = getProfitabilityIcon(property.noi_breakdown.profitability_category);
                             return <ProfitIcon className="w-4 h-4 text-gray-500" />;
                           })()}
                           <div>
                             <div className={`text-sm font-medium ${property.noi_breakdown.noi_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {property.noi_breakdown.noi_margin.toFixed(1)}%
                             </div>
                             <div className="text-xs text-gray-600">NOI Margin</div>
                           </div>
                         </div>

                         {/* Portfolio Contribution */}
                         <div className="flex items-center space-x-2">
                           <TrendingUp className="w-4 h-4 text-blue-500" />
                           <div>
                             <div className="text-sm font-medium text-black">
                               {Math.abs(property.noi_breakdown.portfolio_contribution).toFixed(1)}%
                             </div>
                             <div className="text-xs text-gray-600">Portfolio Impact</div>
                           </div>
                         </div>

                         {/* Expense Ratio */}
                         <div className="flex items-center space-x-2">
                           <DollarSign className="w-4 h-4 text-orange-500" />
                           <div>
                             <div className="text-sm font-medium text-black">
                               {property.noi_breakdown.monthly_rent > 0 ? 
                                 ((property.noi_breakdown.total_expenses / property.noi_breakdown.monthly_rent) * 100).toFixed(1) : 
                                 '0'}%
                             </div>
                             <div className="text-xs text-gray-600">Expense Ratio</div>
                           </div>
                         </div>
                        </div>
                      </div>
                    ) : title.includes('Marketing Performance') && property.time_on_market ? (
                      <div className="space-y-4">
                        {/* Market Performance Status Badge */}
                        <div className="flex items-center justify-between">
                          <Badge className={getMarketPerformanceColor(property.time_on_market.market_performance_category)}>
                            {property.time_on_market.market_performance_category.charAt(0).toUpperCase() + 
                             property.time_on_market.market_performance_category.slice(1)} Performer
                          </Badge>
                          <div className="text-right">
                            <div className="text-lg font-bold text-black">
                              {property.time_on_market.days_on_market} days
                            </div>
                            <div className="text-xs text-gray-600">
                              {property.time_on_market.is_currently_available ? 'Currently on market' : 'Time to lease'}
                            </div>
                          </div>
                        </div>

                        {/* Time on Market Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Market Performance */}
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const PerformanceIcon = getMarketPerformanceIcon(property.time_on_market.market_performance_category);
                              return <PerformanceIcon className="w-4 h-4 text-gray-500" />;
                            })()}
                            <div>
                              <div className="text-sm font-medium text-black">
                                {property.time_on_market.market_performance_category.charAt(0).toUpperCase() + 
                                 property.time_on_market.market_performance_category.slice(1)}
                              </div>
                              <div className="text-xs text-gray-600">Performance</div>
                            </div>
                          </div>

                          {/* Listing Date */}
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <div>
                              <div className="text-sm font-medium text-black">
                                {new Date(property.time_on_market.listing_date).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-600">Listed Date</div>
                            </div>
                          </div>

                          {/* Historical Performance */}
                          {property.time_on_market.historical_days_to_lease !== null && (
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-green-500" />
                              <div>
                                <div className="text-sm font-medium text-black">
                                  {property.time_on_market.historical_days_to_lease}d
                                </div>
                                <div className="text-xs text-gray-600">Days to Lease</div>
                              </div>
                            </div>
                          )}

                          {/* Status Indicator */}
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-purple-500" />
                            <div>
                              <div className="text-sm font-medium text-black">
                                {property.time_on_market.is_currently_available ? 'Available' : 'Leased'}
                              </div>
                              <div className="text-xs text-gray-600">Current Status</div>
                            </div>
                          </div>
                        </div>

                        {/* Market Performance Insights */}
                        <div className="bg-gray-50 p-3 rounded-lg text-sm">
                          {property.time_on_market.market_performance_category === 'fast' && (
                            <div className="text-green-700">
                              🎯 <strong>Quick Leasing:</strong> This property leases faster than average. Consider similar marketing strategies for other properties.
                            </div>
                          )}
                          {property.time_on_market.market_performance_category === 'average' && (
                            <div className="text-blue-700">
                              📊 <strong>Market Average:</strong> This property is performing at market pace. Monitor for optimization opportunities.
                            </div>
                          )}
                          {property.time_on_market.market_performance_category === 'slow' && (
                            <div className="text-yellow-700">
                              ⚠️ <strong>Slower Than Average:</strong> Consider adjusting pricing, improving photos, or enhancing property features.
                            </div>
                          )}
                          {property.time_on_market.market_performance_category === 'problem' && (
                            <div className="text-red-700">
                              🚨 <strong>Needs Attention:</strong> This property has been on market too long. Review pricing, condition, and marketing strategy immediately.
                            </div>
                          )}
                        </div>

                        {/* Lease Date Info */}
                        {property.time_on_market.lease_date && (
                          <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                            Leased on: {new Date(property.time_on_market.lease_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                     /* Default metrics grid for other breakdowns */
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Tenant Status */}
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-black">{property.tenant_count}</div>
                          <div className="text-xs text-gray-600">Tenants</div>
                        </div>
                      </div>

                      {/* Lease Expiration */}
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="text-sm font-medium text-black">
                            {property.lease_end_date ? 
                              new Date(property.lease_end_date).toLocaleDateString() : 
                              'N/A'
                            }
                          </div>
                          <div className="text-xs text-gray-600">Lease End</div>
                        </div>
                      </div>

                      {/* Maintenance */}
                      <div className="flex items-center space-x-2">
                        <Wrench className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="text-sm font-medium text-black">{property.maintenance_requests}</div>
                          <div className="text-xs text-gray-600">Open Requests</div>
                        </div>
                      </div>

                      {/* Performance Metric */}
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium text-black">
                            {property.status === 'occupied' ? 
                              `${property.collection_rate.toFixed(0)}%` : 
                              `${property.days_on_market}d`
                            }
                          </div>
                          <div className="text-xs text-gray-600">
                            {property.status === 'occupied' ? 'Collection' : 'On Market'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Unit Breakdown - Show if property has multiple units */}
                  {property.units.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-black mb-2">Unit Breakdown ({property.units.length} units)</h4>
                        <div className="space-y-2">
                          {property.units.map((unit) => (
                            <div key={unit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div>
                                  <span className="text-sm font-medium text-black">
                                    {unit.unit_name || `Unit ${unit.unit_number}`}
                                  </span>
                                  <div className="text-xs text-gray-600">
                                    {unit.bedrooms}BR / {unit.bathrooms}BA
                                    {unit.square_feet && ` • ${unit.square_feet} sq ft`}
                                  </div>
                                </div>
                                <Badge className={getStatusColor(unit.status)}>
                                  {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-black">
                                  {unit.monthly_rent ? formatCurrency(unit.monthly_rent) : 'N/A'}
                                </div>
                                {unit.lease_end_date && (
                                  <div className="text-xs text-gray-600">
                                    Lease ends {new Date(unit.lease_end_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {properties.length} properties • Total Monthly Rent: {formatCurrency(
                properties.reduce((sum, p) => sum + p.monthly_rent, 0)
              )}
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyBreakdownModal;