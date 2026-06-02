import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Wrench, Users, DollarSign, Home, Calendar, Filter, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'property' | 'tenant';
  title: string;
  description: string;
  timestamp: string;
  property_id?: string;
  property_address?: string;
  status: 'success' | 'warning' | 'info' | 'error';
  amount?: number;
}

interface RealTimeActivityFeedProps {
  landlordId: string;
  portfolioId?: string;
}

const RealTimeActivityFeed: React.FC<RealTimeActivityFeedProps> = ({
  landlordId,
  portfolioId
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Fetch recent payments
      const { data: payments } = await supabase
        .from('rent_payments')
        .select(`
          id, amount, payment_date, status,
          property:properties(id, address)
        `)
        .order('payment_date', { ascending: false })
        .limit(10);

      // Fetch recent maintenance requests
      const { data: maintenance } = await supabase
        .from('maintenance_requests')
        .select(`
          id,
          description,
          status,
          created_at,
          property:properties(id, address)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent applications
      const { data: applications } = await supabase
        .from('property_applications')
        .select(`
          id,
          status,
          created_at,
          property:properties(id, address)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform data into activity items
      const activityItems: ActivityItem[] = [];

      // Add payment activities
      payments?.forEach(payment => {
        const property = payment.property as any;
        activityItems.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: 'Rent Payment Received',
          description: `${property?.address || 'Property'} - $${payment.amount}`,
          timestamp: payment.payment_date,
          property_id: property?.id,
          property_address: property?.address,
          status: payment.status === 'completed' ? 'success' : 'warning',
          amount: payment.amount
        });
      });

      // Add maintenance activities
      maintenance?.forEach(request => {
        activityItems.push({
          id: `maintenance-${request.id}`,
          type: 'maintenance',
          title: 'Maintenance Request',
          description: `${request.property?.address || 'Property'} - ${request.description}`,
          timestamp: request.created_at,
          property_id: request.property?.id,
          property_address: request.property?.address,
          status: request.status === 'completed' ? 'success' : 'warning'
        });
      });

      // Add application activities
      applications?.forEach(app => {
        const property = app.property as any;
        activityItems.push({
          id: `application-${app.id}`,
          type: 'tenant',
          title: 'Property Application',
          description: `${property?.address || 'Property'} - ${app.status}`,
          timestamp: app.created_at,
          property_id: property?.id,
          property_address: property?.address,
          status: app.status === 'approved' ? 'success' : 'info'
        });
      });

      // Sort by timestamp
      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(activityItems.slice(0, 20));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Set up real-time subscriptions
    const paymentsChannel = supabase
      .channel('payments-activity')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rent_payments',
        filter: `landlord_id=eq.${landlordId}`
      }, () => fetchActivities())
      .subscribe();

    const maintenanceChannel = supabase
      .channel('maintenance-activity')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'maintenance_requests',
        filter: `landlord_id=eq.${landlordId}`
      }, () => fetchActivities())
      .subscribe();

    const applicationsChannel = supabase
      .channel('applications-activity')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'property_applications'
      }, () => fetchActivities())
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(maintenanceChannel);
      supabase.removeChannel(applicationsChannel);
    };
  }, [landlordId, portfolioId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'maintenance': return <Wrench className="h-5 w-5 text-yellow-600" />;
      case 'lease': return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'property': return <Home className="h-5 w-5 text-purple-600" />;
      case 'tenant': return <Users className="h-5 w-5 text-orange-600" />;
      default: return <CheckCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-l-4 border-green-500';
      case 'warning': return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'error': return 'bg-red-50 border-l-4 border-red-500';
      default: return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };

  const filteredActivities = activities.filter(activity => 
    filter === 'all' || activity.type === filter
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-100">
              <div className="h-5 w-5 bg-gray-300 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'payment' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('payment')}
        >
          Payments
        </Button>
        <Button
          variant={filter === 'maintenance' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('maintenance')}
        >
          Maintenance
        </Button>
        <Button
          variant={filter === 'tenant' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('tenant')}
        >
          Tenants
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Activity Feed */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity found</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-sm ${getStatusColor(activity.status)}`}
            >
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{activity.title}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {activity.description}
                </div>
              </div>
              <div className="text-right">
                {activity.amount && (
                  <div className="font-medium text-sm text-green-600">
                    ${activity.amount.toLocaleString()}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RealTimeActivityFeed;