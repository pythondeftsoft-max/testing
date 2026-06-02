import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Info } from 'lucide-react';
import AdminMessageBubble from './AdminMessageBubble';
import AdminConversationDetailsSheet from './AdminConversationDetailsSheet';
import { useAdminMessageThread } from '@/hooks/useAdminMessageThread';
import { ConversationDetail } from '@/hooks/useAdminConversations';

interface AdminMessageThreadProps {
  conversation: ConversationDetail | null;
  showDetails: boolean;
  onToggleDetails: () => void;
}

const AdminMessageThread: React.FC<AdminMessageThreadProps> = ({ conversation, showDetails, onToggleDetails }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages, isLoading } = useAdminMessageThread(conversation?.application_id || null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
          <p className="text-sm text-muted-foreground">
            There are no conversations to display
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Messages</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDetails}
            className="flex-shrink-0"
          >
            <Info className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)]" ref={scrollRef}>
              <div className="p-4 space-y-2">
                {messages?.map((message) => (
                  <AdminMessageBubble
                    key={message.id}
                    message={message}
                    isFromTenant={message.created_by_tenant || false}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Conversation Details Sheet */}
      <AdminConversationDetailsSheet
        conversation={conversation}
        open={showDetails}
        onOpenChange={onToggleDetails}
      />
    </div>
  );
};

export default AdminMessageThread;
