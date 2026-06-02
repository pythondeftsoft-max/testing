import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowRight, CreditCard, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface RecentPayment {
  id: string;
  amount: number;
  currency_code: string;
  status: string;
  payment_date: string;
  portfolio_assets?: {
    asset_name: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface RecentPaymentsWidgetProps {
  portfolioId?: string;
}

export const RecentPaymentsWidget = ({ portfolioId }: RecentPaymentsWidgetProps) => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalThisMonth: 0,
    countThisMonth: 0,
    pendingCount: 0
  });

  useEffect(() => {
    fetchRecentPayments();
  }, [portfolioId]);

  const fetchRecentPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let assetIds: string[] = [];

      if (portfolioId) {
        // Get assets for specific portfolio
        const { data: assets, error: assetsError } = await supabase
          .from('portfolio_assets')
          .select('id')
          .eq('portfolio_id', portfolioId);

        if (assetsError) throw assetsError;
        assetIds = assets?.map(a => a.id) || [];
      } else {
        // Get all assets for user's portfolios
        const { data: userPortfolios, error: portfolioError } = await supabase
          .from('portfolio_roles')
          .select('portfolio_id')
          .eq('user_id', user.id)
          .in('role_name', ['admin_partner', 'editor']);

        if (portfolioError) throw portfolioError;

        const portfolioIds = userPortfolios?.map(p => p.portfolio_id) || [];
        
        if (portfolioIds.length > 0) {
          const { data: assets, error: assetsError } = await supabase
            .from('portfolio_assets')
            .select('id')
            .in('portfolio_id', portfolioIds);

          if (assetsError) throw assetsError;
          assetIds = assets?.map(a => a.id) || [];
        }
      }

      if (assetIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get recent payments (last 5) - without profiles for now
      const { data: recentPayments, error: paymentsError } = await supabase
        .from('asset_payment_transactions')
        .select(`
          id,
          amount,
          currency_code,
          status,
          payment_date,
          portfolio_assets (
            asset_name
          )
        `)
        .in('asset_id', assetIds)
        .order('payment_date', { ascending: false })
        .limit(5);

      if (paymentsError) throw paymentsError;

      // Calculate stats for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyPayments, error: monthlyError } = await supabase
        .from('asset_payment_transactions')
        .select('amount, status')
        .in('asset_id', assetIds)
        .gte('payment_date', startOfMonth.toISOString());

      if (monthlyError) throw monthlyError;

      const totalThisMonth = monthlyPayments
        ?.filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

      const countThisMonth = monthlyPayments
        ?.filter(p => p.status === 'succeeded')
        .length || 0;

      const pendingCount = monthlyPayments
        ?.filter(p => p.status === 'pending')
        .length || 0;

      setPayments(recentPayments || []);
      setStats({
        totalThisMonth,
        countThisMonth,
        pendingCount
      });
    } catch (error) {
      console.error('Error fetching recent payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="default" className="bg-success text-success-foreground">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewAll = () => {
    if (portfolioId) {
      navigate(`/landlord/payments?portfolioId=${portfolioId}`);
    } else {
      navigate('/landlord/payments');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Recent Payments
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleViewAll}
          className="text-primary hover:text-primary/80"
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <CurrencyDisplay 
              amount={stats.totalThisMonth} 
              variant="large"
              className="text-foreground"
            />
            <div className="text-xs text-muted-foreground">This Month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.countThisMonth}</div>
            <div className="text-xs text-muted-foreground">Payments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{stats.pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Recent Payments List */}
        <div className="space-y-3">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent payments</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {payment.portfolio_assets?.asset_name || 'Property Payment'}
                  </div>
                          <div className="text-xs text-muted-foreground">
                            Payment received • {' '}
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                </div>
                <div className="flex items-center gap-2">
                  <CurrencyDisplay 
                    amount={payment.amount} 
                    currency={payment.currency_code?.toUpperCase() as any}
                    className="text-sm font-medium"
                  />
                  {getStatusBadge(payment.status)}
                </div>
              </div>
            ))
          )}
        </div>

        {payments.length > 0 && (
          <div className="pt-3 mt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewAll}
              className="w-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Payment Analytics
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};