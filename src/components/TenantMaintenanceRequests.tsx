import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, Zap, Wind, Package, Hammer, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import MaintenanceRequestDetailModal from './MaintenanceRequestDetailModal';

interface TenantMaintenanceRequestsProps {
  userId: string;
}

const TenantMaintenanceRequests = ({ userId }: TenantMaintenanceRequestsProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading maintenance requests...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            My Maintenance Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No maintenance requests found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          My Maintenance Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => {
            const statusInfo = getStatusDisplay(request.status);
            const timeAgo = formatDistanceToNow(new Date(request.submitted_date), { addSuffix: true });

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
                  {getCategoryIcon(request.category)}
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
                    <span>Submitted {formatDate(request.submitted_date)}</span>
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
        </div>

        <MaintenanceRequestDetailModal
          requestId={selectedRequestId}
          isOpen={!!selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
        />
      </CardContent>
    </Card>
  );
};

export default TenantMaintenanceRequests;
