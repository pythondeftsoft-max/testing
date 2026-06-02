import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, MessageSquare, Clock } from 'lucide-react';
import { ConversationDetail } from '@/hooks/useAdminConversations';
import { formatDistanceToNow } from 'date-fns';

interface AdminConversationCardProps {
  conversation: ConversationDetail;
  onClick: () => void;
}

const AdminConversationCard: React.FC<AdminConversationCardProps> = ({
  conversation,
  onClick,
}) => {
  const tenantName = `${conversation.tenant_first_name} ${conversation.tenant_last_name}`.trim() || conversation.tenant_email;
  const landlordName = `${conversation.landlord_first_name} ${conversation.landlord_last_name}`.trim() || conversation.landlord_email;

  return (
    <Card
      className="p-4 cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-sm truncate">
                {tenantName} ↔ {landlordName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{conversation.property_address}</span>
            </div>
          </div>
          
          {conversation.flagged_count > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 flex-shrink-0">
              <AlertTriangle className="w-3 h-3" />
              {conversation.flagged_count}
            </Badge>
          )}
        </div>

        {/* Last Message Preview */}
        <div className="text-sm text-muted-foreground line-clamp-2">
          {conversation.last_message_text}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{conversation.message_count}</span>
            </div>
            {conversation.unread_by_landlord > 0 && (
              <Badge variant="secondary" className="text-xs">
                {conversation.unread_by_landlord} unread (L)
              </Badge>
            )}
            {conversation.unread_by_tenant > 0 && (
              <Badge variant="secondary" className="text-xs">
                {conversation.unread_by_tenant} unread (T)
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <Badge variant="outline" className="text-xs">
            {conversation.status}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default AdminConversationCard;
