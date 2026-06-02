import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle, TrendingDown, User } from 'lucide-react';
import { RentDelinquency, TopLatePayer } from '@/hooks/useLandlordAnalytics';

interface RentDelinquencyPanelProps {
  data: RentDelinquency | null;
  topLatePayers: TopLatePayer[];
  loading: boolean;
  portfolioId?: string;
  propertyIds?: string[];
}

const RentDelinquencyPanel = ({ data, topLatePayers, loading, portfolioId, propertyIds }: RentDelinquencyPanelProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black">Rent & Delinquency</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black">Rent & Delinquency</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          No rent data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black">Rent & Delinquency</h3>
        <div className="text-sm text-gray-500">Cash flow hinges on on-time payments</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Payment Performance & Quick Action */}
        <div className="space-y-4">
          {/* Payment Performance */}
          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Payment Performance</CardTitle>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">On-Time Payments</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPercentage(data.on_time_payment_rate)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Late Payments</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatPercentage(data.late_payment_rate)}
                  </span>
                </div>
              </div>
              
              {/* Visual bar */}
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${data.on_time_payment_rate}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Action */}
          <Card className="bg-blue-50 border border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">Send Payment Reminders</p>
                  <p className="text-sm text-blue-700">Automated reminders can improve collection rates</p>
                </div>
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Top Late Payers */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black flex items-center">
              <User className="w-5 h-5 mr-2 text-red-500" />
              Top Late Payers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLatePayers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No late payments - excellent!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topLatePayers.map((payer, index) => (
                  <div 
                    key={payer.tenant_id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-black">
                        {payer.tenant_name || 'Unknown Tenant'}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {payer.property_address}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-red-600">
                        {formatCurrency(payer.overdue_amount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {payer.days_late} days late
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RentDelinquencyPanel;