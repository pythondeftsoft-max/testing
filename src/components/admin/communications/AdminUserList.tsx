import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Loader2, Mail, MessageSquare, Bell } from 'lucide-react';
import { useAdminUsersList, AdminUser, UserFilter } from '@/hooks/useAdminUsersList';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminUserListProps {
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
}

export const AdminUserList: React.FC<AdminUserListProps> = ({
  selectedUserId,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const { data: users, isLoading } = useAdminUsersList(searchQuery, filter);

  // Group users by category
  const groupedUsers = React.useMemo(() => {
    if (!users) return { unread: [], active: [], other: [] };
    
    const unread = users.filter(u => u.unread_count > 0);
    const active = users.filter(u => u.has_conversation && u.unread_count === 0);
    const other = users.filter(u => !u.has_conversation);
    
    return { unread, active, other };
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderUserCard = (user: AdminUser) => (
    <Button
      key={user.user_id}
      variant="ghost"
      className={cn(
        "w-full justify-start text-left h-auto py-3 px-3 transition-all",
        selectedUserId === user.user_id && "bg-accent",
        user.unread_count > 0 && "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={() => onSelectUser(user.user_id)}
    >
      <div className="flex items-start gap-3 w-full">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative",
          user.has_conversation 
            ? "bg-gradient-to-br from-primary/20 to-primary/10" 
            : "bg-muted"
        )}>
          <User className={cn(
            "h-5 w-5",
            user.has_conversation ? "text-primary" : "text-muted-foreground"
          )} />
          {user.has_conversation && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={cn(
              "text-sm truncate",
              user.unread_count > 0 ? "font-bold" : "font-semibold"
            )}>
              {user.first_name} {user.last_name}
            </span>
            {user.unread_count > 0 && (
              <Badge variant="destructive" className="px-1.5 py-0 text-xs font-bold">
                {user.unread_count}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mb-1">
            {user.email}
          </p>
          {user.has_conversation ? (
            <>
              <p className={cn(
                "text-xs line-clamp-1",
                user.unread_count > 0 
                  ? "text-foreground font-medium" 
                  : "text-muted-foreground/70"
              )}>
                {user.last_message}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {format(new Date(user.last_message_at!), 'MMM d, h:mm a')}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {user.user_type}
              </Badge>
              <p className="text-xs text-muted-foreground/60 italic">
                No messages
              </p>
            </div>
          )}
        </div>
      </div>
    </Button>
  );

  return (
    <div className="flex flex-col h-full border-r">
      {/* Header with Tabs */}
      <div className="p-4 border-b space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Messages
        </h3>
        
        <Tabs value={filter} onValueChange={(v) => setFilter(v as UserFilter)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">
              <User className="h-3.5 w-3.5 mr-1.5" />
              All
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Active
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              <Bell className="h-3.5 w-3.5 mr-1.5" />
              Unread
              {groupedUsers.unread.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 px-1 py-0 text-xs h-4">
                  {groupedUsers.unread.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Users List with Sections */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {users && users.length > 0 ? (
            <>
              {/* Unread Section */}
              {filter === 'all' && groupedUsers.unread.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Unread ({groupedUsers.unread.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {groupedUsers.unread.map(renderUserCard)}
                  </div>
                </div>
              )}

              {/* Active Conversations Section */}
              {filter === 'all' && groupedUsers.active.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Active Conversations ({groupedUsers.active.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {groupedUsers.active.map(renderUserCard)}
                  </div>
                </div>
              )}

              {/* All Other Users Section */}
              {filter === 'all' && groupedUsers.other.length > 0 && (
                <div>
                  <div className="px-3 py-2 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      All Users ({groupedUsers.other.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {groupedUsers.other.map(renderUserCard)}
                  </div>
                </div>
              )}

              {/* Filtered view (no sections) */}
              {filter !== 'all' && (
                <div className="space-y-1">
                  {users.map(renderUserCard)}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              {filter === 'unread' ? (
                <>
                  <Bell className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm font-medium">No unread messages</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're all caught up!
                  </p>
                </>
              ) : filter === 'active' ? (
                <>
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm font-medium">No active conversations</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a conversation with any user
                  </p>
                </>
              ) : (
                <>
                  <User className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm font-medium">
                    {searchQuery ? 'No users found' : 'No users yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? 'Try a different search' : 'Users will appear here'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
