import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building, DollarSign, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import EnhancedHAPPayeeConfig from './EnhancedHAPPayeeConfig';
import AdvancedHAPPaymentTracker from './AdvancedHAPPaymentTracker';

interface HAPDashboardProps {
  propertyId?: string;
  landlordId?: string;
}

const HAPDashboard = ({ propertyId, landlordId }: HAPDashboardProps) => {
  const { toast } = useToast();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [hapSummary, setHapSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propertyId) {
      setSelectedProperty(propertyId);
      fetchPropertyData(propertyId);
    } else if (landlordId) {
      fetchLandlordProperties();
    }
  }, [propertyId, landlordId]);

  useEffect(() => {
    if (selectedProperty) {
      fetchHAPSummary();
    }
  }, [selectedProperty]);

  const fetchLandlordProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          has_voucher,
          rent_splits!inner(pha_portion, tenant_portion)
        `)
        .eq('owner_id', landlordId)
        .eq('has_voucher', true)
        .order('address');

      if (error) throw error;

      setProperties(data || []);
      if (data && data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to load properties with vouchers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyData = async (propId: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          has_voucher,
          rent_splits(pha_portion, tenant_portion)
        `)
        .eq('id', propId)
        .single();

      if (error) throw error;

      setProperties([data]);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast({
        title: "Error",
        description: "Failed to load property data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHAPSummary = async () => {
    try {
      // Fetch HAP payments summary for selected property
      const { data: payments, error } = await supabase
        .from('hap_payments')
        .select('*')
        .eq('property_id', selectedProperty);

      if (error) throw error;

      // Calculate summary statistics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const currentMonthPayments = payments?.filter(p => {
        const paymentDate = new Date(p.payment_period_start);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }) || [];

      const totalExpected = payments?.reduce((sum, p) => sum + (p.expected_amount || 0), 0) || 0;
      const totalReceived = payments?.filter(p => p.payment_status === 'received').reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0) || 0;
      const latePayments = payments?.filter(p => p.payment_status === 'late').length || 0;
      const missedPayments = payments?.filter(p => p.payment_status === 'missing').length || 0;

      setHapSummary({
        totalExpected,
        totalReceived,
        latePayments,
        missedPayments,
        currentMonthStatus: currentMonthPayments[0]?.payment_status || 'no_data',
        currentMonthAmount: currentMonthPayments[0]?.expected_amount || 0
      });
    } catch (error) {
      console.error('Error fetching HAP summary:', error);
    }
  };

  const getPropertySelect = () => {
    if (properties.length <= 1) return null;

    return (
      <div className="mb-6">
        <select 
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="w-full p-2 border border-input rounded-md bg-background"
        >
          <option value="">Select a property</option>
          {properties.map(property => (
            <option key={property.id} value={property.id}>
              {property.address}
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Voucher Properties Found</h3>
          <p className="text-muted-foreground mb-4">
            You don't have any properties configured with housing vouchers yet.
          </p>
          <Button variant="outline">
            Add Voucher Property
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {getPropertySelect()}

      {selectedProperty && (
        <>
          {/* HAP Summary Cards */}
          {hapSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Month</p>
                      <p className="text-lg font-semibold">
                        ${hapSummary.currentMonthAmount.toFixed(2)}
                      </p>
                      <Badge 
                        variant={hapSummary.currentMonthStatus === 'received' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {hapSummary.currentMonthStatus === 'received' ? 'Received' : 
                         hapSummary.currentMonthStatus === 'expected' ? 'Expected' : 'No Data'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Received</p>
                      <p className="text-lg font-semibold">
                        ${hapSummary.totalReceived.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of ${hapSummary.totalExpected.toFixed(2)} expected
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Collection Rate</p>
                      <p className="text-lg font-semibold">
                        {hapSummary.totalExpected > 0 
                          ? Math.round((hapSummary.totalReceived / hapSummary.totalExpected) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Issues</p>
                      <p className="text-lg font-semibold">
                        {hapSummary.latePayments + hapSummary.missedPayments}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hapSummary.latePayments} late, {hapSummary.missedPayments} missed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main HAP Management Tabs */}
          <Tabs defaultValue="payments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
              <TabsTrigger value="config">Payee Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="payments">
              <AdvancedHAPPaymentTracker propertyId={selectedProperty} />
            </TabsContent>

            <TabsContent value="config">
              <EnhancedHAPPayeeConfig 
                propertyId={selectedProperty} 
                onConfigUpdated={fetchHAPSummary}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default HAPDashboard;