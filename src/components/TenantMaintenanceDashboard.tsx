import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Home, AlertCircle, Clock, CheckCircle, Wrench, Plus, MapPin, Calendar, Zap, Wind, Package, Hammer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import MaintenanceNotificationsSection from './MaintenanceNotificationsSection';
import MaintenanceRequestModal from './MaintenanceRequestModal';
import MaintenanceRequestDetailModal from './MaintenanceRequestDetailModal';

interface TenantMaintenanceDashboardProps {
  userId: string;
}

const TenantMaintenanceDashboard = ({ userId }: TenantMaintenanceDashboardProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [userId]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        properties (address),
        property_units (unit_number)
      `)
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    if (!error) {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'plumbing':
        return <Wrench className="h-5 w-5 text-blue-600" />;
      case 'electrical':
        return <Zap className="h-5 w-5 text-yellow-600" />;
      case 'hvac':
        return <Wind className="h-5 w-5 text-cyan-600" />;
      case 'appliance':
      case 'appliance_repair':
        return <Package className="h-5 w-5 text-purple-600" />;
      default:
        return <Hammer className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', color: 'text-orange-600' };
      case 'in_progress':
        return { text: 'In Progress', color: 'text-blue-600' };
      case 'completed':
        return { text: 'Completed', color: 'text-green-600' };
      default:
        return { text: status, color: 'text-muted-foreground' };
    }
  };

  // Calculate statistics
  const totalRequests = requests.length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  // Filter requests
  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading maintenance requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-3xl font-bold mt-2">{totalRequests}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold mt-2 text-warning">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold mt-2 text-info">{inProgressCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold mt-2 text-success">{completedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                My Maintenance Requests
              </CardTitle>
              <CardDescription>Submit and track your maintenance requests</CardDescription>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px]">
                  <SelectValue placeholder="Filter requests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <MaintenanceRequestModal 
                userId={userId}
                onRequestCreated={fetchRequests}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequests.length > 0 && (
              <>
                {filteredRequests.map((request) => {
                const statusInfo = getStatusDisplay(request.status);
                const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true });

                return (
                  <div 
                    key={request.id} 
                    className={cn(
                      "border rounded-lg p-5 hover:bg-accent/30 transition-colors cursor-pointer",
                      "border-l-4",
                      request.status === 'completed' && "border-l-green-500",
                      request.status === 'in_progress' && "border-l-blue-500",
                      request.status === 'pending' && "border-l-orange-500"
                    )}
                  >
                    {/* Header: Icon + Title + Status Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {getCategoryIcon(request.category)}
                        <h3 className="font-semibold text-lg text-foreground">
                          {request.title}
                        </h3>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "font-medium shrink-0",
                          request.status === 'completed' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
                          request.status === 'in_progress' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
                          request.status === 'pending' && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
                        )}
                      >
                        {statusInfo.text}
                      </Badge>
                    </div>

                    {/* Property Location */}
                    {request.properties?.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>{request.properties.address}</span>
                        {request.property_units?.unit_number && (
                          <span className="font-medium">- Unit {request.property_units.unit_number}</span>
                        )}
                      </div>
                    )}

                    {/* Category */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <span>Category: <span className="font-medium">{getCategoryLabel(request.category)}</span></span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                      {request.description}
                    </p>

                    {/* Timeline Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t">
                      <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Submitted {formatDate(request.created_at)}</span>
                        <span>•</span>
                        <span className={cn("font-medium", statusInfo.color)}>
                          {statusInfo.text}
                        </span>
                        <span>•</span>
                        <span>{timeAgo}</span>
                        {request.completed_date && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium">
                              Completed {formatDate(request.completed_date)}
                            </span>
                          </>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedRequestId(request.id)}
                        className="h-7 text-xs"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          </div>
        </CardContent>
      </Card>

      <MaintenanceRequestDetailModal
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
};

export default TenantMaintenanceDashboard;
