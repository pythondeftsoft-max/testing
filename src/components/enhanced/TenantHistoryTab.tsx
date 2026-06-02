
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home, 
  MapPin, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { EnhancedTenantProfileData } from '@/hooks/useEnhancedTenantProfile';

interface TenantHistoryTabProps {
  tenantData: EnhancedTenantProfileData;
}

export const TenantHistoryTab = ({ tenantData }: TenantHistoryTabProps) => {
  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 3.5) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 2.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Fair';
    return 'Poor';
  };

  const recentPayments = tenantData.paymentHistory.slice(0, 10);
  const totalPaid = tenantData.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const latePayments = tenantData.paymentHistory.filter(p => (p.daysLate || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Housing History Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {tenantData.housingHistory.length}
            </div>
            <div className="text-sm text-gray-600">Properties Lived In</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {tenantData.housingHistory.filter(h => h.leaseRenewed).length}
            </div>
            <div className="text-sm text-gray-600">Lease Renewals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {tenantData.housingHistory.length > 0 ? (
                (tenantData.housingHistory.reduce((sum, h) => sum + (h.performanceScore || 0), 0) / tenantData.housingHistory.length).toFixed(1)
              ) : (
                'N/A'
              )}
            </div>
            <div className="text-sm text-gray-600">Avg. Performance Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Housing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Housing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-4">
              {tenantData.housingHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No housing history available.
                </div>
              ) : (
                tenantData.housingHistory.map((housing) => (
                  <div key={housing.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{housing.propertyAddress}</span>
                        {housing.performanceScore && (
                          <Badge className={getPerformanceColor(housing.performanceScore)}>
                            {getPerformanceLabel(housing.performanceScore)} ({housing.performanceScore.toFixed(1)})
                          </Badge>
                        )}
                        {housing.leaseRenewed && (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Renewed
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">Move In:</span>
                        <span className="font-medium">
                          {new Date(housing.moveInDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {housing.moveOutDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Move Out:</span>
                          <span className="font-medium">
                            {new Date(housing.moveOutDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-green-600 font-medium">Current Residence</span>
                        </div>
                      )}
                      
                      {housing.rentAmount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Rent:</span>
                          <span className="font-medium">${housing.rentAmount.toLocaleString()}/mo</span>
                        </div>
                      )}
                    </div>
                    
                    {housing.moveOutReason && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Move Out Reason:</span> {housing.moveOutReason}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      Duration: {housing.moveOutDate ? (
                        Math.ceil((new Date(housing.moveOutDate).getTime() - new Date(housing.moveInDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
                      ) : (
                        Math.ceil((Date.now() - new Date(housing.moveInDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
                      )} months
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${totalPaid.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(tenantData.analytics.onTimePaymentRate || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">On-Time Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {latePayments}
              </div>
              <div className="text-sm text-gray-600">Late Payments</div>
            </div>
          </div>
          
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment history available.
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {(payment.daysLate || 0) > 0 ? (
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        <span className="font-medium">${payment.amount.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </div>
                      {payment.paymentDate && (
                        <div className="text-sm text-gray-600">
                          Paid: {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {payment.status}
                      </Badge>
                      {(payment.daysLate || 0) > 0 && (
                        <span className="text-xs text-orange-600">
                          {payment.daysLate} days late
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
