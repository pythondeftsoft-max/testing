import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AdminUser } from '@/hooks/useAdminUsersList';
import { cn } from '@/lib/utils';

interface AdminConversationCardProps {
  user: AdminUser;
  onClick: () => void;
}

export const AdminConversationCard: React.FC<AdminConversationCardProps> = ({
  user,
  onClick,
}) => {
  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'destructive';
      case 'landlord':
      case 'individual_owner':
        return 'default';
      case 'tenant':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatUserType = (userType: string) => {
    if (userType === 'individual_owner') return 'Individual Owner';
    return userType.charAt(0).toUpperCase() + userType.slice(1);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement mark as read functionality
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement delete conversation functionality
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        user.unread_count > 0 && "border-primary/30 bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{fullName}</h4>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {user.unread_count > 0 && (
                <Badge variant="default" className="rounded-full">
                  {user.unread_count}
                </Badge>
              )}
              {user.has_conversation && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleMarkAsRead}
                >
                  <CheckCheck className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* User Type Badge */}
          <Badge variant={getUserTypeBadgeVariant(user.user_type)} className="mb-2">
            {formatUserType(user.user_type)}
          </Badge>

          {/* Last Message Preview */}
          {user.last_message && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {user.last_message}
              </p>
              {user.last_message_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(user.last_message_at), { addSuffix: true })}
                </p>
              )}
            </div>
          )}

          {/* No Conversation Yet */}
          {!user.has_conversation && (
            <p className="text-xs text-muted-foreground italic mt-2">
              No messages yet
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
