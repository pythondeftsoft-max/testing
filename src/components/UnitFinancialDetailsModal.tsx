import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PropertyModalApplicationsSubTabs from './applications/PropertyModalApplicationsSubTabs';
import { useUnitFinancialAggregation } from '@/hooks/useUnitFinancialAggregation';
import UnitMaintenanceTab from './UnitMaintenanceTab';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  DollarSign, 
  TrendingUp, 
  Building, 
  Home, 
  AlertTriangle,
  RefreshCw,
  PieChart,
  BarChart3,
  Calculator 
} from 'lucide-react';

interface UnitFinancialDetailsModalProps {
  unit: any;
  property: any;
  onClose: () => void;
  onUnitUpdated: () => void;
  initialTab?: string;
  readOnly?: boolean;
}

export const UnitFinancialDetailsModal = ({ unit, property, onClose, onUnitUpdated, initialTab = 'details', readOnly = false }: UnitFinancialDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [unitNumber, setUnitNumber] = useState('');
  const [unitName, setUnitName] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [tenantType, setTenantType] = useState('');
  const [additionalIncome, setAdditionalIncome] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const { toast } = useToast();

  // Get unit-specific financial data
  const { aggregatedData, units, loading: financialLoading, error: financialError, refreshData } = useUnitFinancialAggregation(property?.id || '');

  // Find this specific unit's financial data
  const unitFinancialData = aggregatedData?.unitSummaries?.find(summary => summary.unitId === unit?.id);

  useEffect(() => {
    if (unit) {
      setUnitNumber(unit.unit_number || '');
      setUnitName(unit.unit_name || unit.name || '');
      setMonthlyRent(unit.monthly_rent?.toString() || '');
      setBedrooms(unit.bedrooms?.toString() || '');
      setBathrooms(unit.bathrooms?.toString() || '');
      setSquareFeet(unit.square_feet?.toString() || '');
      setStatus(unit.status || '');
      setDescription(unit.description || '');
      setTenantType(unit.tenant_type || '');
      setAdditionalIncome(unit.additional_income?.toString() || '');
      setSecurityDeposit(unit.security_deposit_amount?.toString() || '');
      setActiveTab(unit.initialTab || initialTab);
    }
  }, [unit, initialTab]);

  const handleSave = async () => {
    try {
      const updates = {
        unit_number: unitNumber,
        unit_name: unitName,
        monthly_rent: monthlyRent ? parseFloat(monthlyRent) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        square_feet: squareFeet ? parseInt(squareFeet) : null,
        status: status,
        description: description,
        tenant_type: tenantType,
        additional_income: additionalIncome ? parseFloat(additionalIncome) : 0,
        security_deposit_amount: securityDeposit ? parseFloat(securityDeposit) : 0,
      };

      const { error } = await supabase
        .from('property_units')
        .update(updates)
        .eq('id', unit.id);

      if (error) throw error;

      toast({
        title: "Unit Updated",
        description: "Unit details have been updated successfully.",
      });

      onUnitUpdated();
      refreshData(); // Refresh financial data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('property_units')
        .delete()
        .eq('id', unit.id);

      if (error) throw error;

      toast({
        title: "Unit Deleted",
        description: "Unit has been deleted successfully.",
      });

      onUnitUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
    return `${value.toFixed(1)}%`;
  };

  if (!unit || !property) return null;

  return (
    <Dialog open={!!unit} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Unit {unit.unit_number} - {property.address}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-3 shrink-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Unit Details</TabsTrigger>
                <TabsTrigger value="financials">Financial Analytics</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0">
              <TabsContent value="details" className="p-6 space-y-6 h-full overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unitNumber">Unit Number</Label>
                    <Input
                      type="text"
                      id="unitNumber"
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitName">Unit Name</Label>
                    <Input
                      type="text"
                      id="unitName"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthlyRent">Monthly Rent</Label>
                    <Input
                      type="number"
                      id="monthlyRent"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      type="number"
                      id="bedrooms"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      type="number"
                      id="bathrooms"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="squareFeet">Square Feet</Label>
                    <Input
                      type="number"
                      id="squareFeet"
                      value={squareFeet}
                      onChange={(e) => setSquareFeet(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="additionalIncome">Additional Income</Label>
                    <Input
                      type="number"
                      id="additionalIncome"
                      value={additionalIncome}
                      onChange={(e) => setAdditionalIncome(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="securityDeposit">Security Deposit</Label>
                    <Input
                      type="number"
                      id="securityDeposit"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus} disabled={readOnly}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tenantType">Tenant Type</Label>
                  <Select value={tenantType} onValueChange={setTenantType} disabled={readOnly}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tenant type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description of the unit"
                    disabled={readOnly}
                  />
                </div>

                {!readOnly && (
                  <div className="flex justify-end gap-2">
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete Unit
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="financials" className="p-4 h-full overflow-y-auto">
                {financialLoading ? (
                  <div className="space-y-3">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-8 bg-muted rounded w-1/2"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  </div>
                ) : financialError || !unitFinancialData ? (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <p>{financialError || 'No financial data available for this unit'}</p>
                    <p className="text-sm mt-1">Add unit rent and expense details to see financial analytics</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshData}
                      className="mt-3"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">Unit Financial Analytics</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshData}
                        disabled={financialLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${financialLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    {/* Unit Performance Metrics - Compact Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <MetricDisplay
                        label="Monthly Rent"
                        value={formatCurrency(unitFinancialData.totalUnitIncome)}
                        isLoading={financialLoading}
                        error={!!financialError}
                        icon={<DollarSign className="h-4 w-4 text-primary" />}
                      />
                      <MetricDisplay
                        label="Unit Expenses"
                        value={formatCurrency(unitFinancialData.unitOperatingExpenses)}
                        isLoading={financialLoading}
                        error={!!financialError}
                        icon={<Calculator className="h-4 w-4 text-primary" />}
                      />
                      <MetricDisplay
                        label="Net Income"
                        value={formatCurrency(unitFinancialData.unitNetIncome)}
                        isLoading={financialLoading}
                        error={!!financialError}
                        icon={<TrendingUp className="h-4 w-4 text-primary" />}
                      />
                      <MetricDisplay
                        label="Profit Margin"
                        value={formatPercentage(unitFinancialData.totalUnitIncome > 0 ? (unitFinancialData.unitNetIncome / unitFinancialData.totalUnitIncome) * 100 : 0)}
                        isLoading={financialLoading}
                        error={!!financialError}
                        icon={<PieChart className="h-4 w-4 text-primary" />}
                      />
                    </div>

                    {/* Income vs Expenses Analysis - Compact Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4" />
                            Unit Revenue
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Monthly Income</span>
                              <span className="font-medium">{formatCurrency(unitFinancialData.totalUnitIncome)}</span>
                            </div>
                            <Progress value={100} className="h-1.5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Base Rent</span>
                              <span className="font-medium">{formatCurrency(unitFinancialData.totalUnitIncome - (unitFinancialData.additionalIncome || 0))}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Additional Income</span>
                              <span className="font-medium">{formatCurrency(unitFinancialData.additionalIncome || 0)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Calculator className="h-4 w-4" />
                            Unit Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Total Expenses</span>
                              <span className="font-medium">{formatCurrency(unitFinancialData.unitOperatingExpenses)}</span>
                            </div>
                            <Progress 
                              value={unitFinancialData.totalUnitIncome > 0 ? (unitFinancialData.unitOperatingExpenses / unitFinancialData.totalUnitIncome) * 100 : 0}
                              className="h-1.5" 
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Operating Expenses</span>
                              <span className="font-medium">{formatCurrency(unitFinancialData.unitOperatingExpenses || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Property Share</span>
                              <span className="font-medium">{formatCurrency(0)}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <div className="flex justify-between text-sm font-medium">
                              <span>Net Operating Income</span>
                              <span className="text-primary">{formatCurrency(unitFinancialData.unitNetIncome)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Unit Performance Status - Compact Version */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Building className="h-4 w-4" />
                          Unit Performance Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Status Overview */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Current Status</h4>
                            <div className="p-3 bg-background rounded-lg border">
                              <div className="font-medium text-sm">{unitFinancialData.status || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">
                                Unit {unitFinancialData.unitNumber || unit.unit_number}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {unit.bedrooms || 0} bed / {unit.bathrooms || 0} bath
                              </div>
                            </div>
                          </div>

                          {/* Performance Grade */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Performance Grade</h4>
                            {(() => {
                              const margin = unitFinancialData.totalUnitIncome > 0 ? (unitFinancialData.unitNetIncome / unitFinancialData.totalUnitIncome) * 100 : 0;
                              const isGood = margin >= 70 && unitFinancialData.status === 'occupied';
                              return (
                                <div className={`p-3 rounded-lg border ${isGood ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'}`}>
                                  <div className="font-medium text-sm">{isGood ? 'Excellent' : 'Needs Attention'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatPercentage(margin)} profit margin
                                  </div>
                                  <div className={`text-xs ${isGood ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                    {isGood ? 'Performing well' : 'Review recommended'}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Annual Projection */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Annual Projection</h4>
                            <div className="p-3 bg-background rounded-lg border">
                              <div className="font-medium text-sm">{formatCurrency(unitFinancialData.unitNetIncome * 12)}</div>
                              <div className="text-xs text-muted-foreground">
                                Net annual income
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Based on current performance
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="applications" className="p-6 h-full overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Unit Applications & Tenants</h3>
                    <Badge variant="outline">
                      Unit {unit.unit_number}
                    </Badge>
                  </div>
                  <PropertyModalApplicationsSubTabs
                    propertyId={property.id}
                    unitId={unit.id}
                    propertyAddress={`${property.address} - Unit ${unit.unit_number}`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="maintenance" className="p-6 h-full overflow-y-auto">
                <UnitMaintenanceTab unitId={unit.id} unitNumber={unit.unit_number} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};