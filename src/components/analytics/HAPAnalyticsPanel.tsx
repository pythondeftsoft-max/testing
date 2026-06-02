
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HAPAnalyticsData {
  totalExpected: number;
  totalReceived: number;
  currentMonthExpected: number;
  currentMonthReceived: number;
  latePayments: number;
  missedPayments: number;
  collectionRate: number;
  propertiesWithVouchers: number;
}

interface HAPAnalyticsPanelProps {
  data: HAPAnalyticsData | null;
  loading: boolean;
  landlordId: string;
}

const HAPAnalyticsPanel = ({ data, loading, landlordId }: HAPAnalyticsPanelProps) => {
  const navigate = useNavigate();

  const handleViewFullDashboard = () => {
    navigate('/landlord-hap');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            HAP Payment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.propertiesWithVouchers === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            HAP Payment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No properties with housing vouchers found</p>
            <Button 
              variant="outline" 
              onClick={handleViewFullDashboard}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Set Up HAP Tracking
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          HAP Payment Analytics
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleViewFullDashboard}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View Full Dashboard
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">${data.currentMonthReceived.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">This Month HAP</div>
            <div className="text-xs text-muted-foreground">
              of ${data.currentMonthExpected.toFixed(0)} expected
            </div>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">${data.totalReceived.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">Total HAP Received</div>
            <div className="text-xs text-muted-foreground">
              {data.collectionRate.toFixed(1)}% collection rate
            </div>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{data.propertiesWithVouchers}</div>
            <div className="text-sm text-muted-foreground">Voucher Properties</div>
            <div className="text-xs text-muted-foreground">
              Active Section 8 units
            </div>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">{data.latePayments + data.missedPayments}</div>
            <div className="text-sm text-muted-foreground">Payment Issues</div>
            <div className="text-xs text-muted-foreground">
              {data.latePayments} late, {data.missedPayments} missed
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>HAP Collection Performance</span>
            <span className={`font-medium ${data.collectionRate > 90 ? 'text-green-600' : data.collectionRate > 70 ? 'text-yellow-600' : 'text-red-600'}`}>
              {data.collectionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                data.collectionRate > 90 ? 'bg-green-600' : 
                data.collectionRate > 70 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(data.collectionRate, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HAPAnalyticsPanel;
