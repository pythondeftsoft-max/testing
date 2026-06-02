
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, Target, Mail, Calendar } from 'lucide-react';
import { useUnifiedReferralData } from '@/hooks/useUnifiedReferralData';
import { useReferralDetails } from '@/hooks/useReferralDetails';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';

interface UserReferralSectionProps {
  userId: string;
}

const UserReferralSection = ({ userId }: UserReferralSectionProps) => {
  const { unifiedValue, enhancedStats, loading, error } = useUnifiedReferralData(userId);
  const { data: referralDetails, isLoading: detailsLoading, error: detailsError } = useReferralDetails(userId);

  if (loading || detailsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <MetricSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || detailsError) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading referral data</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Referral Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enhancedStats?.total_referrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {enhancedStats?.qualified_referrals || 0} qualified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(unifiedValue?.total_unified_points || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unified referral value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Rewards</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enhancedStats?.available_rewards_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready to claim
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enhancedStats?.progress_to_milestone || 0}%</div>
            <p className="text-xs text-muted-foreground">
              To next milestone
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Qualified Referrals</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {enhancedStats?.qualified_referrals || 0}
                  </Badge>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending Referrals</span>
                  <Badge variant="secondary">
                    {enhancedStats?.pending_referrals || 0}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Gift Card Value</span>
                <span className="text-sm">{formatCurrency(unifiedValue?.total_gift_card_value || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Point Equivalent</span>
                <span className="text-sm">{formatCurrency(unifiedValue?.total_point_equivalent || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Available Points</span>
                <span className="text-sm">{formatCurrency(unifiedValue?.available_point_equivalent || 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Referrals with Real Data */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Referral Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {referralDetails && referralDetails.length > 0 ? (
              referralDetails.slice(0, 5).map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{referral.referred_user_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{referral.referred_user_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(referral.referral_date).toLocaleDateString()}</span>
                      {referral.qualified_date && (
                        <span className="ml-2 text-green-600">
                          • Qualified {new Date(referral.qualified_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {referral.notes && (
                      <p className="text-xs text-muted-foreground">{referral.notes}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <Badge 
                      variant={referral.status === 'qualified' ? 'default' : 'secondary'}
                      className={getStatusColor(referral.status)}
                    >
                      {referral.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {referral.reward_amount > 0 ? `$${referral.reward_amount}` : 'No reward'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referral activity found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserReferralSection;
