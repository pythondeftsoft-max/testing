import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, ArrowRightLeft, Gift, Building, UserPlus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';

interface Transaction {
  id: string;
  type: 'portfolio_points' | 'referral_reward' | 'redemption' | 'conversion';
  amount: number;
  description: string;
  timestamp: string;
  status: string;
  metadata?: any;
}

interface UnifiedTransactionHistoryProps {
  userId: string;
}

const UnifiedTransactionHistory = ({ userId }: UnifiedTransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'portfolio_points' | 'referral_reward' | 'redemption' | 'conversion'>('all');

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch from multiple sources and combine
      const [portfolioPoints, referralRewards, redemptions] = await Promise.all([
        supabase
          .from('points_history')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(50),
        
        supabase
          .from('referral_rewards')
          .select('*')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false })
          .limit(50),
        
        supabase
          .from('redemptions')
          .select('*, rewards(name)')
          .eq('user_id', userId)
          .order('redeemed_at', { ascending: false })
          .limit(50)
      ]);

      const unifiedTransactions: Transaction[] = [];

      // Add portfolio points transactions
      if (portfolioPoints.data) {
        portfolioPoints.data.forEach(point => {
          unifiedTransactions.push({
            id: point.id,
            type: 'portfolio_points',
            amount: point.points_change,
            description: point.notes || `${point.event_type.replace(/_/g, ' ')}`,
            timestamp: point.timestamp,
            status: 'completed',
            metadata: point
          });
        });
      }

      // Add referral rewards - use earned_at for timestamp
      if (referralRewards.data) {
        referralRewards.data.forEach(reward => {
          unifiedTransactions.push({
            id: reward.id,
            type: 'referral_reward',
            amount: reward.reward_amount * 100, // Convert to points equivalent
            description: reward.reward_description || 'Referral reward',
            timestamp: reward.earned_at,
            status: reward.status,
            metadata: reward
          });
        });
      }

      // Add redemptions
      if (redemptions.data) {
        redemptions.data.forEach(redemption => {
          unifiedTransactions.push({
            id: redemption.id,
            type: 'redemption',
            amount: -redemption.points_used,
            description: `Redeemed: ${redemption.rewards?.name || 'Reward'}`,
            timestamp: redemption.redeemed_at,
            status: redemption.status,
            metadata: redemption
          });
        });
      }

      // Sort by timestamp
      unifiedTransactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setTransactions(unifiedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => 
    filter === 'all' || transaction.type === filter
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'portfolio_points':
        return <Building className="w-4 h-4" />;
      case 'referral_reward':
        return <UserPlus className="w-4 h-4" />;
      case 'redemption':
        return <Gift className="w-4 h-4" />;
      case 'conversion':
        return <ArrowRightLeft className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-success';
    } else if (type === 'redemption') {
      return 'text-openkey-gold';
    } else {
      return 'text-destructive';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { 
        label: 'Completed', 
        icon: CheckCircle,
        variant: 'success' as const 
      },
      available: { 
        label: 'Available', 
        icon: CheckCircle,
        variant: 'default' as const 
      },
      pending: { 
        label: 'Pending', 
        icon: Clock,
        variant: 'warning' as const 
      },
      redeemed: { 
        label: 'Redeemed', 
        icon: Gift,
        variant: 'secondary' as const 
      },
      converted: { 
        label: 'Converted', 
        icon: ArrowRightLeft,
        variant: 'default' as const 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <CardEnhanced variant="elevated">
        <CardEnhancedContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-openkey-blue" />
            <span className="ml-2 text-muted-foreground">Loading transaction history...</span>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" className="card-hover">
      <CardEnhancedHeader>
        <div className="flex items-center justify-between">
          <CardEnhancedTitle>Transaction History</CardEnhancedTitle>
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-48 border-openkey-blue/20 focus:ring-openkey-blue">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="portfolio_points">Portfolio Points</SelectItem>
              <SelectItem value="referral_reward">Referral Rewards</SelectItem>
              <SelectItem value="redemption">Redemptions</SelectItem>
              <SelectItem value="conversion">Conversions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted" />
            <p>No transactions found</p>
            <p className="text-sm mt-1">Start earning points to see your transaction history!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <CardEnhanced key={transaction.id} variant="elevated" className="card-hover p-0">
                <CardEnhancedContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full bg-openkey-blue/10 ${getTransactionColor(transaction.type, transaction.amount)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{transaction.description}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(transaction.timestamp), 'MMM d, yyyy HH:mm')}
                          </span>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${getTransactionColor(transaction.type, transaction.amount)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} pts
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {transaction.type.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>
            ))}
          </div>
        )}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default UnifiedTransactionHistory;
