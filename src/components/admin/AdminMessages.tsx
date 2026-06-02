import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useAdminConversations } from '@/hooks/useAdminConversations';
import AdminConversationList from './messages/AdminConversationList';
import AdminMessageThreadDialog from './messages/AdminMessageThreadDialog';
import AdminMessageSearch from './messages/AdminMessageSearch';
import AdminMessageSort from './messages/AdminMessageSort';
import AdminStatusFilter from './messages/AdminStatusFilter';
import AdminUnreadFilter from './messages/AdminUnreadFilter';
import AdminVolumeFilter from './messages/AdminVolumeFilter';
import AdminTimeRangeFilter from './messages/AdminTimeRangeFilter';
import AdminFlaggedFilter from './messages/AdminFlaggedFilter';

export interface MessageFilters {
  status: string;
  hasUnread: string;
  messageVolume: string;
  timeRange: string;
  flaggedStatus: string;
}
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const AdminMessages = () => {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MessageFilters>({
    status: 'all',
    hasUnread: 'all',
    messageVolume: 'all',
    timeRange: 'all',
    flaggedStatus: 'all',
  });
  const [sortBy, setSortBy] = useState('recent');
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useAdminConversations({
    ...filters,
    searchQuery,
    sortBy,
  });

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.application_id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      setShowMessageDialog(true);
    }
  };

  // Real-time subscription for messages
  useEffect(() => {
    const channel = supabase
      .channel('admin-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['admin-message-thread'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Message Moderation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Monitor and moderate all platform communications between landlords and tenants
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <AdminMessageSearch
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <AdminStatusFilter
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            />
            <AdminUnreadFilter
              value={filters.hasUnread}
              onChange={(value) => setFilters({ ...filters, hasUnread: value })}
            />
            <AdminFlaggedFilter
              value={filters.flaggedStatus}
              onChange={(value) => setFilters({ ...filters, flaggedStatus: value })}
            />
            <AdminVolumeFilter
              value={filters.messageVolume}
              onChange={(value) => setFilters({ ...filters, messageVolume: value })}
            />
            <AdminTimeRangeFilter
              value={filters.timeRange}
              onChange={(value) => setFilters({ ...filters, timeRange: value })}
            />
            <AdminMessageSort
              value={sortBy}
              onChange={setSortBy}
            />
          </div>

          <AdminConversationList
            conversations={conversations}
            onSelectConversation={handleSelectConversation}
            isLoading={isLoading}
          />
          
          <AdminMessageThreadDialog
            conversation={selectedConversation}
            open={showMessageDialog}
            onOpenChange={setShowMessageDialog}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminMessages;
