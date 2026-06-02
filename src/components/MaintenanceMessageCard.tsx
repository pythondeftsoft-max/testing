import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Zap,
  Wind,
  Package,
  Hammer,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import MaintenanceRequestDetailModal from './MaintenanceRequestDetailModal';

interface MaintenanceMessageCardProps {
  message: any;
  isSender: boolean;
  senderName?: string;
  userType?: 'tenant' | 'landlord' | 'admin';
}

const MaintenanceMessageCard: React.FC<MaintenanceMessageCardProps> = ({ message, isSender, senderName, userType = 'landlord' }) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  const getCategoryIcon = (category?: string) => {
    const iconProps = { className: "h-5 w-5" };
    
    switch (category?.toLowerCase()) {
      case 'plumbing':
        return <Wrench {...iconProps} className="h-5 w-5 text-blue-500" />;
      case 'electrical':
        return <Zap {...iconProps} className="h-5 w-5 text-yellow-500" />;
      case 'hvac':
        return <Wind {...iconProps} className="h-5 w-5 text-cyan-500" />;
      case 'appliance':
      case 'appliance_repair':
        return <Package {...iconProps} className="h-5 w-5 text-purple-500" />;
      case 'heat':
        return <Zap {...iconProps} className="h-5 w-5 text-orange-500" />;
      default:
        return <Hammer {...iconProps} className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return 'General';
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusDisplay = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { 
          text: 'Pending', 
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          borderColor: 'border-l-orange-500'
        };
      case 'in_progress':
        return { 
          text: 'In Progress', 
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          borderColor: 'border-l-blue-500'
        };
      case 'completed':
        return { 
          text: 'Completed', 
          className: 'bg-green-100 text-green-800 border-green-200',
          borderColor: 'border-l-green-500'
        };
      default:
        return { 
          text: 'Unknown', 
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          borderColor: 'border-l-gray-500'
        };
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    
    const priorityColors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-red-100 text-red-800 border-red-200',
      urgent: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    return (
      <Badge 
        variant="outline" 
        className={cn("capitalize text-xs", priorityColors[priority.toLowerCase()] || "bg-gray-100 text-gray-800")}
      >
        {priority}
      </Badge>
    );
  };

  // Extract data from message payload
  const maintenanceRequestId = message.payload?.maintenance_request_id;
  const title = message.payload?.title || 'Maintenance Request';
  const description = message.payload?.description || '';
  const status = message.payload?.status || 'pending';
  const priority = message.payload?.priority;
  const category = message.payload?.category;
  
  const statusDisplay = getStatusDisplay(status);

  return (
    <>
      <div className={cn("flex w-full", isSender ? "justify-end" : "justify-start")}>
        <Card className={cn(
          "w-full max-w-2xl border-l-4 hover:bg-accent/30 transition-colors",
          statusDisplay.borderColor
        )}>
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getCategoryIcon(category)}
                <h4 className="font-semibold text-lg">{title}</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getPriorityBadge(priority)}
                <Badge variant="outline" className={cn("capitalize", statusDisplay.className)}>
                  {statusDisplay.text}
                </Badge>
              </div>
            </div>
            
            {/* Category */}
            {category && (
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Category: {getCategoryLabel(category)}
                </span>
              </div>
            )}
            
            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                {description}
              </p>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Submitted by: {isSender ? 'You' : (senderName || 'Tenant')}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{formatDate(new Date(message.created_at))}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
              </div>
              
              {maintenanceRequestId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedRequestId(maintenanceRequestId)}
                  className="shrink-0"
                >
                  View Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <MaintenanceRequestDetailModal
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        userType={userType}
      />
    </>
  );
};

export default MaintenanceMessageCard;
