import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Inbox } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminUsersList, UserFilter } from '@/hooks/useAdminUsersList';
import { AdminConversationCard } from './AdminConversationCard';

interface AdminConversationListProps {
  onSelectUser: (userId: string) => void;
}

export const AdminConversationList: React.FC<AdminConversationListProps> = ({
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');

  const { data: users, isLoading } = useAdminUsersList(searchQuery, filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unreadUsers = users?.filter(u => u.unread_count > 0) || [];
  const activeUsers = users?.filter(u => u.has_conversation && u.unread_count === 0) || [];
  const allUsers = users || [];

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="px-6 py-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 border-b">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as UserFilter)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All ({allUsers.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">
              Active ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread ({unreadUsers.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-4">
          {allUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Start a new conversation with the "New Message" button'}
              </p>
            </div>
          ) : (
            <>
              {/* Unread Section */}
              {unreadUsers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Unread ({unreadUsers.length})
                  </h3>
              {unreadUsers.map((user) => (
                  <AdminConversationCard
                    key={user.user_id}
                    user={user}
                    onClick={() => onSelectUser(user.user_id)}
                  />
                ))}
                </div>
              )}

              {/* Active Conversations Section */}
              {activeUsers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Active ({activeUsers.length})
                  </h3>
              {activeUsers.map((user) => (
                  <AdminConversationCard
                    key={user.user_id}
                    user={user}
                    onClick={() => onSelectUser(user.user_id)}
                  />
                ))}
                </div>
              )}

              {/* All Users Section (no conversation yet) */}
              {filter === 'all' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    All Users ({allUsers.length})
                  </h3>
                  {allUsers
                    .filter(u => !u.has_conversation)
                    .map((user) => (
                      <AdminConversationCard
                        key={user.user_id}
                        user={user}
                        onClick={() => onSelectUser(user.user_id)}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
