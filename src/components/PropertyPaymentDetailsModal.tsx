import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePaymentData } from '@/hooks/usePaymentData';
import AdvancedHAPPaymentTracker from '@/components/AdvancedHAPPaymentTracker';
import EnhancedHAPPayeeConfig from '@/components/EnhancedHAPPayeeConfig';
import { PlaidLink } from '@/components/PlaidLink';
import UnitHAPConfig from '@/components/UnitHAPConfig';
import UnitPaymentTracker from '@/components/UnitPaymentTracker';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, 
  Settings, 
  CreditCard, 
  Building2, 
  DollarSign, 
  Calendar,
  FileText,
  Download,
  ExternalLink,
  Check,
  Clock,
  AlertTriangle,
  TrendingUp,
  User,
  MapPin
} from 'lucide-react';

interface Property {
  id: string;
  address: string;
  monthly_rent: number;
  status: string;
  has_voucher?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  rent_splits?: Array<{
    pha_portion: number;
    tenant_portion: number;
  }>;
}

interface PropertyPaymentDetailsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const PropertyPaymentDetailsModal: React.FC<PropertyPaymentDetailsModalProps> = ({
  property,
  isOpen,
  onClose,
  onRefresh
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('history');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  
  const { 
    paymentHistory, 
    hapPayments, 
    unifiedPaymentHistory,
    balance, 
    property: propertyDetails,
    isLoading,
    refetch
  } = usePaymentData(property?.id || '');

  useEffect(() => {
    if (property?.id && isOpen) {
      fetchUnits();
    }
  }, [property?.id, isOpen]);

  const fetchUnits = async () => {
    try {
      setLoadingUnits(true);
      const { data, error } = await supabase
        .from('property_units')
        .select(`
          *,
          hap_payee_configs!left(id, pha_approval_status, auto_tracking_enabled, is_active)
        `)
        .eq('property_id', property?.id)
        .order('unit_number');

      if (error) throw error;
      setUnits(data || []);
      
      // Set first unit as selected by default
      if (data && data.length > 0) {
        setSelectedUnitId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
      toast({
        title: "Error",
        description: "Failed to load property units",
        variant: "destructive"
      });
    } finally {
      setLoadingUnits(false);
    }
  };

  if (!property) return null;

  const handleRefresh = () => {
    refetch();
    fetchUnits();
    onRefresh?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const hapPortion = property.rent_splits?.[0]?.pha_portion || 0;
  const tenantPortion = property.rent_splits?.[0]?.tenant_portion || property.monthly_rent;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {property.address}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Payment History
            </TabsTrigger>
            <TabsTrigger value="hap-setup" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              HAP Setup
            </TabsTrigger>
            <TabsTrigger value="bank-connection" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Bank Connection
            </TabsTrigger>
            <TabsTrigger value="property-details" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Property Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current Balance Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-2xl font-bold">
                        {balance ? formatCurrency(balance.balance_remaining) : '$0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {balance?.current_due_date ? new Date(balance.current_due_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* HAP Status Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">HAP Portion</p>
                      <p className="text-2xl font-bold">{formatCurrency(hapPortion)}</p>
                      <Badge variant={property.has_voucher ? 'default' : 'outline'} className="text-xs mt-1">
                        {property.has_voucher ? 'Active' : 'Not Set Up'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tenant Portion Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tenant Portion</p>
                      <p className="text-2xl font-bold">{formatCurrency(tenantPortion)}</p>
                      <p className="text-xs text-muted-foreground">
                        {balance ? `${(tenantPortion / property.monthly_rent * 100).toFixed(0)}% of rent` : '100% of rent'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment History Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Recent Payment History
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Showing payments for {property.address}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading payment history...</p>
                  </div>
                ) : unifiedPaymentHistory && unifiedPaymentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {unifiedPaymentHistory.slice(0, 15).map((payment, index) => {
                      // Calculate payment status based on payment source
                      const isHAPPayment = payment.payment_source === 'hap';
                      const isTenantPayment = payment.payment_source === 'tenant';
                      
                      // Get payment portion amount for comparison
                      const expectedAmount = isHAPPayment ? hapPortion : tenantPortion;
                      const paidAmount = payment.display_amount || 0;
                      
                      // Calculate payment completion based on source
                      const isPortionComplete = paidAmount >= expectedAmount;
                      const isPartialPayment = paidAmount > 0 && paidAmount < expectedAmount;
                      
                      // HAP payment logic: never late, only expected/received/processing
                      const getStatusConfig = () => {
                        if (isHAPPayment) {
                          if (payment.display_status === 'received' || payment.display_status === 'completed') {
                            return {
                              variant: 'default' as const,
                              icon: Check,
                              label: 'HAP Received',
                              bgColor: 'bg-green-50 border-green-200',
                              iconColor: 'text-green-600'
                            };
                          }
                          if (payment.display_status === 'processing' || payment.display_status === 'pending') {
                            return {
                              variant: 'outline' as const,
                              icon: Clock,
                              label: 'HAP Processing',
                              bgColor: 'bg-blue-50 border-blue-200',
                              iconColor: 'text-blue-600'
                            };
                          }
                          return {
                            variant: 'outline' as const,
                            icon: AlertTriangle,
                            label: 'HAP Expected',
                            bgColor: 'bg-gray-50 border-gray-200',
                            iconColor: 'text-gray-600'
                          };
                        }
                        
                        // Tenant payment logic: can be late, partial, etc.
                        if (isTenantPayment) {
                          const isLate = payment.days_late > 0;
                          
                          if (isPortionComplete && !isLate) {
                            return {
                              variant: 'default' as const,
                              icon: Check,
                              label: 'Tenant Paid',
                              bgColor: 'bg-green-50 border-green-200',
                              iconColor: 'text-green-600'
                            };
                          }
                          if (isPortionComplete && isLate) {
                            return {
                              variant: 'secondary' as const,
                              icon: Clock,
                              label: 'Paid Late',
                              bgColor: 'bg-orange-50 border-orange-200',
                              iconColor: 'text-orange-600'
                            };
                          }
                          if (isPartialPayment) {
                            return {
                              variant: 'secondary' as const,
                              icon: TrendingUp,
                              label: 'Partial Payment',
                              bgColor: 'bg-yellow-50 border-yellow-200',
                              iconColor: 'text-yellow-600'
                            };
                          }
                          if (payment.display_status === 'pending' || payment.display_status === 'processing') {
                            return {
                              variant: 'outline' as const,
                              icon: Clock,
                              label: 'Processing',
                              bgColor: 'bg-blue-50 border-blue-200',
                              iconColor: 'text-blue-600'
                            };
                          }
                          return {
                            variant: 'destructive' as const,
                            icon: AlertTriangle,
                            label: 'Overdue',
                            bgColor: 'bg-red-50 border-red-200',
                            iconColor: 'text-red-600'
                          };
                        }
                        
                        // Fallback
                        return {
                          variant: 'outline' as const,
                          icon: AlertTriangle,
                          label: 'Unknown',
                          bgColor: 'bg-gray-50 border-gray-200',
                          iconColor: 'text-gray-600'
                        };
                      };

                      const statusConfig = getStatusConfig();
                      const StatusIcon = statusConfig.icon;
                      
                      // Calculate monthly completion percentage
                      // This shows progress toward full monthly rent (HAP + tenant combined)
                      const portionCompletionPercentage = Math.min((paidAmount / expectedAmount) * 100, 100);

                      return (
                        <div key={index} className={`p-4 rounded-lg border transition-all hover:shadow-sm ${statusConfig.bgColor}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Payment Source Icon */}
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                payment.payment_source === 'hap' 
                                  ? 'bg-green-100 border-2 border-green-200' 
                                  : 'bg-blue-100 border-2 border-blue-200'
                              }`}>
                                {payment.payment_source === 'hap' ? (
                                  <Building2 className="w-6 h-6 text-green-600" />
                                ) : (
                                  <User className="w-6 h-6 text-blue-600" />
                                )}
                              </div>
                              
                              {/* Payment Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-lg">{formatCurrency(payment.display_amount)}</p>
                                    {payment.payment_source === 'hap' && hapPortion > 0 && (
                                      <span className="text-sm text-muted-foreground">
                                        of {formatCurrency(hapPortion)}
                                      </span>
                                    )}
                                    {payment.payment_source === 'tenant' && tenantPortion > 0 && (
                                      <span className="text-sm text-muted-foreground">
                                        of {formatCurrency(tenantPortion)}
                                      </span>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs font-medium">
                                    {payment.payment_source === 'hap' ? 'HAP Payment' : 'Tenant Payment'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground font-medium">{property.address}</span>
                                </div>
                                
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {payment.display_date ? new Date(payment.display_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    }) : 'Date pending'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {payment.display_method?.charAt(0).toUpperCase() + payment.display_method?.slice(1) || 'Manual'}
                                  </span>
                                  {payment.days_late > 0 && (
                                    <span className="text-orange-600 font-medium">
                                      {payment.days_late} days late
                                    </span>
                                  )}
                                </div>
                                
                                {payment.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 bg-white/50 p-2 rounded border">
                                    {payment.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Status and Progress */}
                            <div className="text-right flex flex-col items-end gap-2">
                              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                              
                              {/* Progress indicator for portion completion */}
                              <div className="w-24">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>Portion</span>
                                  <span>{Math.round(portionCompletionPercentage)}%</span>
                                </div>
                                <Progress value={portionCompletionPercentage} className="h-2" />
                              </div>
                              
                              {payment.late_fee_amount && payment.late_fee_amount > 0 && (
                                <div className="text-xs text-orange-600 font-medium">
                                  +{formatCurrency(payment.late_fee_amount)} late fee
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {unifiedPaymentHistory.length > 15 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" size="sm">
                          <History className="w-4 h-4 mr-2" />
                          View All {unifiedPaymentHistory.length} Payments
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Payment History</h3>
                    <p className="text-muted-foreground mb-4">No payments recorded for this property yet.</p>
                    <Button variant="outline" size="sm">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Set Up Payment Tracking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hap-setup" className="space-y-6">
            {loadingUnits ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : units.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No units found for this property.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Unit Selector */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Label htmlFor="unit-select" className="text-sm font-medium">
                    Select Unit to Configure HAP:
                  </Label>
                  <Select value={selectedUnitId || ""} onValueChange={setSelectedUnitId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>Unit {unit.unit_number}</span>
                            {unit.hap_payee_configs.length > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                HAP Configured
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit HAP Configuration */}
                {selectedUnitId && (
                  <UnitHAPConfig
                    propertyId={property.id}
                    unitId={selectedUnitId}
                    unitNumber={units.find(u => u.id === selectedUnitId)?.unit_number || ""}
                    onConfigUpdated={handleRefresh}
                  />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bank-connection" className="space-y-6">
            {loadingUnits ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : units.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No units found for this property.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Property Header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{property.address}</h3>
                        <p className="text-sm text-muted-foreground">
                          {units.length} units • Bank connection for automatic HAP tracking
                        </p>
                      </div>
                      <Badge variant={property.has_voucher ? 'default' : 'outline'}>
                        {property.has_voucher ? 'HAP Enabled' : 'No HAP Setup'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Unit Selector */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Label htmlFor="unit-select" className="text-sm font-medium">
                    Select Unit for Bank Connection:
                  </Label>
                  <Select value={selectedUnitId || ""} onValueChange={setSelectedUnitId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>Unit {unit.unit_number}</span>
                            <div className="flex items-center gap-1 ml-2">
                              {unit.hap_payee_configs.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  HAP Setup
                                </Badge>
                              )}
                              {unit.hap_payee_configs.some((config: any) => config.auto_tracking_enabled) && (
                                <Badge variant="default" className="text-xs">
                                  Connected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Bank Connection & Payment Tracking */}
                {selectedUnitId && (
                  <div className="space-y-6">
                    <UnitPaymentTracker
                      propertyId={property.id}
                      unitId={selectedUnitId}
                      unitNumber={units.find(u => u.id === selectedUnitId)?.unit_number || ""}
                      showBankConnection={true}
                      onRefresh={handleRefresh}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="property-details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{property.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Units</p>
                      <p className="font-medium">{units.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium">{formatCurrency(property.monthly_rent)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={property.status === 'occupied' ? 'default' : 'outline'}>
                        {property.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Units Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Units Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingUnits ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : units.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No units configured for this property.</p>
                  ) : (
                    <div className="space-y-3">
                      {units.slice(0, 4).map((unit) => (
                        <div key={unit.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">{unit.unit_number}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Unit {unit.unit_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {unit.bedrooms}br • {unit.bathrooms}ba
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={unit.status === 'occupied' ? 'default' : 'secondary'}>
                              {unit.status}
                            </Badge>
                            {unit.hap_payee_configs.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                HAP
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {units.length > 4 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{units.length - 4} more units
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    View Documents
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Payment Report
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};