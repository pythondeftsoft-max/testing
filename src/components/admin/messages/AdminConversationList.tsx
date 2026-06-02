import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdminConversationCard from './AdminConversationCard';
import { ConversationDetail } from '@/hooks/useAdminConversations';
import { Loader2, Inbox } from 'lucide-react';

interface AdminConversationListProps {
  conversations: ConversationDetail[];
  onSelectConversation: (id: string) => void;
  isLoading: boolean;
}

const AdminConversationList: React.FC<AdminConversationListProps> = ({
  conversations,
  onSelectConversation,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Inbox className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
        <p className="text-sm text-muted-foreground">
          There are no message conversations to display
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-3 pr-4">
        {conversations.map((conversation) => (
          <AdminConversationCard
            key={conversation.application_id}
            conversation={conversation}
            onClick={() => onSelectConversation(conversation.application_id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default AdminConversationList;
