import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wrench, MapPin, Calendar, Zap, Wind, Package, Hammer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import MaintenanceRequestDetailModal from './MaintenanceRequestDetailModal';

interface MaintenanceNotificationsSectionProps {
  userId: string;
}

const MaintenanceNotificationsSection = ({ userId }: MaintenanceNotificationsSectionProps) => {
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
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
    if (!category) return 'General';
    return category.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', variant: 'warning' as const };
      case 'in_progress':
        return { text: 'In Progress', variant: 'default' as const };
      case 'completed':
        return { text: 'Completed', variant: 'success' as const };
      default:
        return { text: status, variant: 'secondary' as const };
    }
  };

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['maintenance-notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('category', 'Maintenance')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusFromType = (type: string) => {
    if (type?.includes('completed')) return 'completed';
    if (type?.includes('progress') || type?.includes('scheduled')) return 'in_progress';
    return 'pending';
  };

  const getCategoryFromTitle = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('plumb')) return 'plumbing';
    if (lower.includes('electr')) return 'electrical';
    if (lower.includes('hvac') || lower.includes('heat') || lower.includes('cool')) return 'hvac';
    if (lower.includes('appliance')) return 'appliance';
    return 'general';
  };

  const cleanTitle = (title: string) => {
    return title.replace(/^[🔧🔨✅⚡❄️🚿💡🔑]+\s*/, '').trim();
  };

  // Real-time subscription for maintenance notifications
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `category=eq.Maintenance,user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['maintenance-notifications', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => {
        const status = getStatusFromType(notification.type);
        const category = getCategoryFromTitle(notification.title);
        const statusInfo = getStatusDisplay(status);
        const title = cleanTitle(notification.title);
        
        return (
          <div
            key={notification.id}
            className={cn(
              "border rounded-lg p-5 hover:bg-accent/30 transition-colors",
              "border-l-4",
              status === 'completed' && "border-l-green-500",
              status === 'in_progress' && "border-l-blue-500",
              status === 'pending' && "border-l-orange-500"
            )}
          >
            {/* Header: Icon + Title + Status Badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                {getCategoryIcon(category)}
                <h3 className="font-semibold text-base text-foreground">
                  {title}
                </h3>
                {notification.priority === 'high' && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
              </div>
              <Badge 
                variant={statusInfo.variant}
                className="text-xs shrink-0 ml-2"
              >
                {statusInfo.text}
              </Badge>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <span>Category: <span className="font-medium">{getCategoryLabel(category)}</span></span>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
              {notification.description}
            </p>

            {/* Timeline Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Submitted {formatDate(notification.created_at)}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedRequestId(notification.id)}
                className="h-7 text-xs"
              >
                View Details
              </Button>
            </div>
          </div>
        );
      })}

      <MaintenanceRequestDetailModal
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
};

export default MaintenanceNotificationsSection;
