import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Receipt, Download, CheckCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePaymentData } from "@/hooks/usePaymentData";
import { generatePaymentHistoryPDF } from "@/utils/paymentPdfUtils";

interface PaymentHistoryTabProps {
  userId: string;
  properties: any[];
}

export const PaymentHistoryTab = ({ userId, properties }: PaymentHistoryTabProps) => {
  const [currentPropertyId, setCurrentPropertyId] = useState<string>("");
  const { toast } = useToast();

  const { paymentHistory, property: currentProperty, isLoading: paymentDataLoading } = usePaymentData(currentPropertyId, userId);

  useEffect(() => {
    if (properties.length > 0 && !currentPropertyId) {
      const tenantProperty = properties.find(p => p.user_role === 'tenant');
      const selectedProperty = tenantProperty || properties[0];
      setCurrentPropertyId(selectedProperty.id);
    }
  }, [properties, currentPropertyId]);

  const handleDownloadPDF = () => {
    if (!paymentHistory.length) {
      toast({
        title: "No Payment History",
        description: "There are no payments to export.",
        variant: "destructive"
      });
      return;
    }

    const paymentsData = paymentHistory.map(payment => ({
      id: payment.id || 'N/A',
      date: new Date(payment.payment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      amount: payment.amount,
      status: payment.status,
      method: payment.payment_method || 'Online',
      paymentStatus: payment.payment_status as 'on_time' | 'late',
      daysLate: payment.days_late || 0,
      referenceNumber: payment.reference_number || 'N/A',
      lateFeeAmount: payment.late_fee_amount || 0
    }));

    const summary = {
      totalPayments: paymentHistory.length,
      totalAmount: paymentHistory.reduce((sum, p) => sum + p.amount, 0),
      onTimePayments: paymentHistory.filter(p => p.payment_status === 'on_time').length,
      latePayments: paymentHistory.filter(p => p.payment_status === 'late').length,
      totalLateFees: paymentHistory.reduce((sum, p) => sum + (p.late_fee_amount || 0), 0)
    };

    const propertyDetails = {
      address: currentProperty?.address || 'Demo Property Address',
      monthlyRent: currentProperty?.monthly_rent || 1200,
      lateFeeAmount: currentProperty?.late_fee_amount || 25,
      graceDays: currentProperty?.late_fee_grace_days || 5,
      rentDueDay: currentProperty?.rent_due_day || 1
    };

    generatePaymentHistoryPDF(paymentsData, summary, userId, propertyDetails);
  };

  const getPaymentStatusBadge = (paymentStatus: string, daysLate?: number) => {
    if (paymentStatus === 'on_time') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 py-0">
          On Time
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0">
          Late ({daysLate || 0}d)
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Receipt className="w-5 h-5" />
          <span>Payment History</span>
        </CardTitle>
        <Button variant="outline" onClick={handleDownloadPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </CardHeader>
      <CardContent>
        {paymentDataLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Loading payment history...</p>
          </div>
        ) : paymentHistory.length > 0 ? (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex flex-col p-4 bg-card rounded-lg space-y-2.5 border border-border">
                    {/* Top Row: Amount, Method, Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-base">
                            ${payment.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {(payment as any).card_brand && (payment as any).card_last_four
                              ? `${(payment as any).card_brand.charAt(0).toUpperCase() + (payment as any).card_brand.slice(1)} •••• ${(payment as any).card_last_four}`
                              : payment.payment_method === 'stripe' || payment.payment_method === 'card'
                                ? 'Credit/Debit Card'
                                : payment.payment_method || 'Online'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPaymentStatusBadge(payment.payment_status, payment.days_late)}
                        <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Second Row: Property Address */}
                    <div className="flex items-center space-x-2 text-sm text-foreground pl-8">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {payment.properties?.address || 'Property address unavailable'}
                      </span>
                    </div>
                    
                    {/* Third Row: Date and Reference */}
                    <div className="flex items-center text-xs text-muted-foreground pl-8">
                      <span>
                        {new Date(payment.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No payment history found</p>
            <p className="text-sm text-gray-400">Your payments will appear here after you make your first payment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
