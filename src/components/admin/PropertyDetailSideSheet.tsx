import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Home, 
  User, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Bed,
  Bath,
  Edit,
  Trash2,
  Send,
  FileText,
  Loader2,
  CreditCard,
  Building
} from 'lucide-react';
import PropertyFinancialBreakdown from '../PropertyFinancialBreakdown';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PropertyData {
  id: string;
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  bedrooms?: number;
  bathrooms?: number;
  monthly_rent: number;
  desired_rent?: number;
  unit_count: number;
  status: string;
  description?: string;
  amenities?: string[];
  has_voucher?: boolean;
  voucher_type?: string;
  created_at: string;
  owner_id: string;
  owner_name: string;
}

interface PropertyDetailSideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyData | null;
}

const PropertyDetailSideSheet = ({ isOpen, onClose, property }: PropertyDetailSideSheetProps) => {
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  if (!property) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'occupied': return 'bg-blue-100 text-blue-800';
      case 'vacant': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchPropertyPayments = async () => {
    setPaymentsLoading(true);
    try {
      // Fetch tenant portion payments (Stripe)
      const { data: rentPayments } = await supabase
        .from('rent_payments')
        .select(`
          id,
          payment_date,
          amount,
          payment_status,
          payment_source,
          stripe_payment_intent_id,
          tenant_id,
          unit_id,
          profiles:tenant_id(first_name, last_name),
          property_units:unit_id(unit_number, unit_name)
        `)
        .eq('property_id', property.id)
        .order('payment_date', { ascending: false });

      // Fetch HAP payments (Plaid)
      const { data: hapPayments } = await supabase
        .from('hap_payments')
        .select(`
          id,
          payment_date,
          actual_amount,
          payment_status,
          plaid_transaction_id,
          tenant_id,
          unit_id,
          profiles:tenant_id(first_name, last_name),
          property_units:unit_id(unit_number, unit_name)
        `)
        .eq('property_id', property.id)
        .order('payment_date', { ascending: false });

      // Merge and format data
      const allPayments = [
        ...(rentPayments || []).map(p => ({
          ...p,
          payment_type: 'Tenant Portion',
          amount: p.amount,
          source: 'Stripe',
          transaction_id: p.stripe_payment_intent_id
        })),
        ...(hapPayments || []).map(p => ({
          ...p,
          payment_type: 'HAP/Section 8',
          amount: p.actual_amount,
          source: 'Plaid',
          transaction_id: p.plaid_transaction_id
        }))
      ].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

      setPaymentsData(allPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && property) {
      fetchPropertyPayments();
    }
  }, [isOpen, property?.id]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Details
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">
              <DollarSign className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
          {/* Property Header */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{property.address}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(property.status)} variant="secondary">
                  {property.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{property.bedrooms || 0} bedrooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{property.bathrooms || 0} bathrooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{property.unit_count || 1} units</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Financial Breakdown</h4>
            <PropertyFinancialBreakdown property={property} />
          </div>

          <Separator />

          {/* Location Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Location</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{property.zipcode || 'No ZIP code'}</span>
              </div>
              {property.city && (
                <div className="text-sm text-gray-600">
                  {property.city}{property.state && `, ${property.state}`}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Owner Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Owner</h4>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{property.owner_name}</span>
            </div>
          </div>

          {/* Voucher Information */}
          {property.has_voucher && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Housing Voucher</h4>
                <div className="space-y-2">
                  <div className="text-sm text-green-600 font-medium">Accepts Housing Vouchers</div>
                  {property.voucher_type && (
                    <div className="text-sm text-gray-600">Type: {property.voucher_type}</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Description */}
          {property.description && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
              </div>
            </>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Property Metadata */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Property Information</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Added: {new Date(property.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-gray-500">ID: {property.id}</div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button className="w-full" variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Property
            </Button>
            <Button className="w-full" variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Push to Tenant
            </Button>
          </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
                <Badge variant="outline">{paymentsData.length} payments</Badge>
              </div>

              {paymentsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paymentsData.length === 0 ? (
                <div className="border border-border rounded-lg p-8 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No payment records found for this property</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsData.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm">
                            {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {payment.payment_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${parseFloat(payment.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getPaymentStatusColor(payment.payment_status)} variant="secondary">
                              {payment.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {payment.profiles?.first_name} {payment.profiles?.last_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {payment.source === 'Stripe' ? (
                                <CreditCard className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Building className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">{payment.source}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default PropertyDetailSideSheet;
