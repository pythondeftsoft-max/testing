import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Building2, DollarSign, Calendar, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import HAPDashboard from '@/components/HAPDashboard';
import RentLedgerIntegration from '@/components/RentLedgerIntegration';

const LandlordHAP = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [hapSummary, setHapSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          fetchProperties(user.id);
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/auth');
      }
    };
    
    getUser();
  }, [navigate]);

  const fetchProperties = async (landlordId: string) => {
    try {
      // Get properties with vouchers
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          has_voucher,
          rent_splits(pha_portion, tenant_portion, voucher_type)
        `)
        .eq('owner_id', landlordId)
        .eq('has_voucher', true)
        .order('address');

      if (error) throw error;

      setProperties(properties || []);

      // Fetch HAP summary across all properties
      await fetchHAPSummary(landlordId);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to load property data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHAPSummary = async (landlordId: string) => {
    try {
      // Get all HAP payments for landlord's properties
      const { data: payments, error } = await supabase
        .from('hap_payments')
        .select(`
          *,
          properties!inner(owner_id)
        `)
        .eq('properties.owner_id', landlordId);

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
      const currentMonthExpected = currentMonthPayments.reduce((sum, p) => sum + (p.expected_amount || 0), 0);
      const currentMonthReceived = currentMonthPayments.filter(p => p.payment_status === 'received').reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0);
      const latePayments = payments?.filter(p => p.payment_status === 'late').length || 0;
      const missedPayments = payments?.filter(p => p.payment_status === 'missing').length || 0;

      setHapSummary({
        totalProperties: properties.length,
        totalExpected,
        totalReceived,
        currentMonthExpected,
        currentMonthReceived,
        latePayments,
        missedPayments,
        collectionRate: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0
      });
    } catch (error) {
      console.error('Error fetching HAP summary:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading HAP data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">HAP Payment Management</h1>
                <p className="text-muted-foreground">Section 8 Housing Assistance Payment tracking</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Voucher Properties Found</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any properties configured with housing vouchers yet.
              </p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Voucher Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            {hapSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Properties with Vouchers</p>
                        <p className="text-2xl font-bold">{hapSummary.totalProperties}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-emerald-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">This Month HAP</p>
                        <p className="text-2xl font-bold">${hapSummary.currentMonthReceived.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">
                          of ${hapSummary.currentMonthExpected.toFixed(0)} expected
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total HAP Received</p>
                        <p className="text-2xl font-bold">${hapSummary.totalReceived.toFixed(0)}</p>
                        <Badge 
                          variant={hapSummary.collectionRate > 90 ? 'default' : 'outline'}
                          className="text-xs mt-1"
                        >
                          {hapSummary.collectionRate.toFixed(1)}% rate
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Issues</p>
                        <p className="text-2xl font-bold">{hapSummary.latePayments + hapSummary.missedPayments}</p>
                        <p className="text-xs text-muted-foreground">
                          {hapSummary.latePayments} late, {hapSummary.missedPayments} missed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Properties Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Properties with Vouchers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.map((property) => (
                    <div key={property.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{property.address}</h4>
                        <Badge variant="outline" className="text-xs">
                          {property.rent_splits?.[0]?.voucher_type || 'Section 8'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Monthly Rent: ${property.monthly_rent?.toFixed(2)}</p>
                        {property.rent_splits?.[0] && (
                          <p>HAP: ${property.rent_splits[0].pha_portion?.toFixed(2)} | 
                             Tenant: ${property.rent_splits[0].tenant_portion?.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* HAP Management Dashboard */}
            <HAPDashboard landlordId={user?.id} />
            
            {/* Rent Ledger Integration */}
            <RentLedgerIntegration propertyId={properties[0]?.id} />
          </div>
        )}
      </main>
    </div>
  );
};

export default LandlordHAP;
