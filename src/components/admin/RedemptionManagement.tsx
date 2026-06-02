
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Package, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_used: number;
  status: string;
  redemption_code: string | null;
  notes: string | null;
  redeemed_at: string;
  fulfilled_at: string | null;
  rewards: {
    name: string;
    type: string;
    cost: number;
  };
  profiles: {
    first_name: string | null;
    last_name: string | null;
    id: string;
  };
}

export const RedemptionManagement = () => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rewardTypeFilter, setRewardTypeFilter] = useState<string>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select(`
          *,
          rewards!inner(name, type, cost),
          profiles!redemptions_user_id_fkey!inner(first_name, last_name, id)
        `)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;
      setRedemptions(data || []);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      toast({
        title: "Error",
        description: "Failed to load redemptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRedemptionStatus = async (redemptionId: string, newStatus: string, notes?: string) => {
    setUpdatingStatus(redemptionId);
    
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'fulfilled') {
        updateData.fulfilled_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('redemptions')
        .update(updateData)
        .eq('id', redemptionId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Redemption marked as ${newStatus}`,
      });

      fetchRedemptions(); // Refresh the list
    } catch (error) {
      console.error('Error updating redemption status:', error);
      toast({
        title: "Error",
        description: "Failed to update redemption status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
      processing: { label: 'Processing', variant: 'default' as const, icon: Package },
      fulfilled: { label: 'Fulfilled', variant: 'success' as const, icon: CheckCircle },
      failed: { label: 'Failed', variant: 'danger' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredRedemptions = redemptions.filter(redemption => {
    const matchesSearch = searchTerm === '' || 
      redemption.profiles.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redemption.profiles.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redemption.rewards.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redemption.redemption_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || redemption.status === statusFilter;
    const matchesType = rewardTypeFilter === 'all' || redemption.rewards.type === rewardTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getRewardTypes = () => {
    const types = [...new Set(redemptions.map(r => r.rewards.type))];
    return types;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading redemptions...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Redemption Management
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by user name, reward, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rewardTypeFilter} onValueChange={setRewardTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getRewardTypes().map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRedemptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No redemptions found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Points Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Redeemed Date</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRedemptions.map((redemption) => (
                <TableRow key={redemption.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {redemption.profiles.first_name || 'Unknown'} {redemption.profiles.last_name || ''}
                      </p>
                      <p className="text-xs text-gray-500">{redemption.profiles.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{redemption.rewards.name}</p>
                      <p className="text-xs text-gray-500">
                        {redemption.rewards.type.replace('_', ' ')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-blue-600">
                      {redemption.points_used.toLocaleString()} pts
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(redemption.status)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{format(new Date(redemption.redeemed_at), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(redemption.redeemed_at), 'h:mm a')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {redemption.redemption_code ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {redemption.redemption_code}
                      </code>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {redemption.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRedemptionStatus(redemption.id, 'processing')}
                            disabled={updatingStatus === redemption.id}
                          >
                            {updatingStatus === redemption.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Process'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateRedemptionStatus(redemption.id, 'fulfilled')}
                            disabled={updatingStatus === redemption.id}
                          >
                            {updatingStatus === redemption.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Fulfill'
                            )}
                          </Button>
                        </>
                      )}
                      {redemption.status === 'processing' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateRedemptionStatus(redemption.id, 'fulfilled')}
                            disabled={updatingStatus === redemption.id}
                          >
                            {updatingStatus === redemption.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Fulfill'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRedemptionStatus(redemption.id, 'failed', 'Processing failed')}
                            disabled={updatingStatus === redemption.id}
                          >
                            {updatingStatus === redemption.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Mark Failed'
                            )}
                          </Button>
                        </>
                      )}
                      {redemption.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRedemptionStatus(redemption.id, 'pending')}
                          disabled={updatingStatus === redemption.id}
                        >
                          {updatingStatus === redemption.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Retry'
                          )}
                        </Button>
                      )}
                      {redemption.status === 'fulfilled' && redemption.fulfilled_at && (
                        <span className="text-xs text-gray-500">
                          Fulfilled {format(new Date(redemption.fulfilled_at), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
