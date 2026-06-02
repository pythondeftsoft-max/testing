import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Plus, Search, Send, Loader2, Inbox, Phone, CheckCheck, Clock, AlertCircle, ChevronLeft, WifiOff } from 'lucide-react';
import { useSmsSystemEnabled } from '@/hooks/useSmsSystemEnabled';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  useSmsConversations,
  useSmsMessages,
  useSendSms,
  useMarkSmsRead,
  useSmsRealtime,
  SmsConversation,
} from '@/hooks/useSmsMessaging';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const WorkerMessagingPanel: React.FC = () => {
  const { enabled: smsEnabled, isLoading: smsLoading } = useSmsSystemEnabled();
  const [selectedConversation, setSelectedConversation] = useState<SmsConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newMessageBody, setNewMessageBody] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time subscriptions
  useSmsRealtime();

  // RLS automatically filters to assigned_worker_id = current user
  const { data: conversations, isLoading: convsLoading } = useSmsConversations();
  const { data: messages, isLoading: msgsLoading } = useSmsMessages(selectedConversation?.id || null);
  const sendSms = useSendSms();
  const markRead = useMarkSmsRead();

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages?.length]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.unread_count > 0) {
      markRead.mutate(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  const filteredConversations = conversations?.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.contact_name?.toLowerCase().includes(q) ||
      c.contact_phone.toLowerCase().includes(q)
    );
  }) || [];

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;
    try {
      await sendSms.mutateAsync({
        to: selectedConversation.contact_phone,
        body: messageText,
        conversation_id: selectedConversation.id,
      });
      setMessageText('');
    } catch (err: any) {
      toast.error('Failed to send SMS: ' + (err.message || 'Unknown error'));
    }
  };

  const handleNewMessage = async () => {
    if (!newPhone.trim() || !newMessageBody.trim()) return;
    try {
      await sendSms.mutateAsync({
        to: newPhone,
        body: newMessageBody,
        contact_name: newContactName || undefined,
      });
      setIsNewMessageOpen(false);
      setNewPhone('');
      setNewContactName('');
      setNewMessageBody('');
      toast.success('SMS sent successfully');
    } catch (err: any) {
      toast.error('Failed to send SMS: ' + (err.message || 'Unknown error'));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-green-500" />;
      case 'sent':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'failed':
      case 'undelivered':
        return <AlertCircle className="w-3 h-3 text-destructive" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Admin</Badge>;
      case 'worker':
        return <Badge variant="default" className="text-[10px] px-1.5 py-0">Worker</Badge>;
      case 'system':
        return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Auto-Push</Badge>;
      case 'contact':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Contact</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{role}</Badge>;
    }
  };

  if (!smsEnabled) {
    return (
      <div className="flex h-[calc(100vh-180px)] bg-background border rounded-lg overflow-hidden items-center justify-center">
        <div className="flex flex-col items-center text-center px-6 max-w-md">
          <WifiOff className="w-16 h-16 text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-lg font-semibold mb-2">SMS Messaging Not Available</h3>
          <p className="text-sm text-muted-foreground">
            The SMS messaging system is currently disabled. Contact your admin for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] bg-background border rounded-lg overflow-hidden">
      {/* Left Panel: Conversation List */}
      <div className={cn(
        "w-full md:w-[380px] border-r flex flex-col",
        selectedConversation && "hidden md:flex"
      )}>
        <div className="px-4 py-3 border-b bg-card/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">My Messages</h2>
            </div>
            <Button onClick={() => setIsNewMessageOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search my conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {convsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Inbox className="w-10 h-10 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No matches found' : 'No assigned conversations yet'}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const initials = conv.contact_name
                  ? conv.contact_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : conv.contact_phone.slice(-2);

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                      isSelected && "bg-accent",
                      conv.unread_count > 0 && !isSelected && "bg-primary/5"
                    )}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm truncate", conv.unread_count > 0 && "font-bold")}>
                          {conv.contact_name || conv.contact_phone}
                        </span>
                        {conv.last_message_at && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message_preview || 'No messages'}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="rounded-full text-[10px] px-1.5 py-0 shrink-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      {conv.contact_name && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {conv.contact_phone}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel: Chat Thread */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedConversation && "hidden md:flex"
      )}>
        {selectedConversation ? (
          <>
            <div className="px-4 py-3 border-b bg-card/50 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setSelectedConversation(null)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {selectedConversation.contact_name
                    ? selectedConversation.contact_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : selectedConversation.contact_phone.slice(-2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {selectedConversation.contact_name || selectedConversation.contact_phone}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedConversation.contact_phone}
                </p>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              {msgsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="py-4 space-y-3">
                  {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isOutbound ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5",
                            isOutbound
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {getRoleBadge(msg.sender_role)}
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                          <div className={cn(
                            "flex items-center gap-1.5 mt-1.5",
                            isOutbound ? "justify-end" : "justify-start"
                          )}>
                            <span className={cn(
                              "text-[10px]",
                              isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                            {isOutbound && getStatusIcon(msg.delivery_status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  No messages in this conversation yet
                </div>
              )}
            </ScrollArea>

            <div className="border-t px-4 py-3">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your SMS..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendSms.isPending}
                  size="icon"
                  className="h-[44px] w-[44px] shrink-0"
                >
                  {sendSms.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                "Reply STOP to unsubscribe" is appended automatically
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="text-lg font-semibold mb-1">Select a conversation</h3>
            <p className="text-sm">Choose from your assigned conversations</p>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New SMS Message</DialogTitle>
            <DialogDescription>Send a new SMS to a contact</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div>
              <Label>Contact Name (optional)</Label>
              <Input
                placeholder="Jane Doe"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={newMessageBody}
                onChange={(e) => setNewMessageBody(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleNewMessage}
              disabled={!newPhone.trim() || !newMessageBody.trim() || sendSms.isPending}
              className="w-full"
            >
              {sendSms.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
