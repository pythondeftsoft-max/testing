import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Plus, Search, Send, Loader2, Inbox, Phone, CheckCheck, Clock, AlertCircle, ChevronLeft, Filter, X, WifiOff } from 'lucide-react';
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
  SmsFilters,
} from '@/hooks/useSmsMessaging';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useSmsSystemEnabled } from '@/hooks/useSmsSystemEnabled';
import UserSearchAutocomplete from '@/components/admin/UserSearchAutocomplete';
import type { AdminUserSearchResult } from '@/hooks/useAdminUserSearch';
import { formatPhoneInput } from '@/utils/phoneFormatting';

export const AdminCommunicationsHub: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<SmsConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newMessageBody, setNewMessageBody] = useState('');
  const [selectedNewUser, setSelectedNewUser] = useState<AdminUserSearchResult | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SmsFilters>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { enabled: smsEnabled, toggle: toggleSms, isLoading: smsToggleLoading } = useSmsSystemEnabled();
  const [togglingState, setTogglingState] = useState(false);

  // Gap 6: Real-time subscriptions
  useSmsRealtime();

  const hasActiveFilters = !!(filters.workerId || filters.propertyId || filters.deliveryStatus || filters.dateFrom || filters.dateTo);

  const { data: conversations, isLoading: convsLoading } = useSmsConversations(hasActiveFilters ? filters : undefined);
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
      setSelectedNewUser(null);
      toast.success('SMS sent successfully');
    } catch (err: any) {
      toast.error('Failed to send SMS: ' + (err.message || 'Unknown error'));
    }
  };

  const clearFilters = () => {
    setFilters({});
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

  const handleToggleSms = async () => {
    setTogglingState(true);
    try {
      await toggleSms(!smsEnabled);
      toast.success(smsEnabled ? 'SMS system disabled' : 'SMS system enabled');
    } catch {
      toast.error('Failed to update SMS toggle');
    } finally {
      setTogglingState(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* SMS System Toggle Banner */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">SMS System</span>
          {!smsEnabled && (
            <Badge variant="outline" className="text-xs">
              <WifiOff className="w-3 h-3 mr-1" />
              Disabled
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{smsEnabled ? 'Active' : 'Off'}</span>
          <Switch
            checked={smsEnabled}
            onCheckedChange={handleToggleSms}
            disabled={togglingState || smsToggleLoading}
          />
        </div>
      </div>

      {!smsEnabled && (
        <div className="px-4 py-3 border-b bg-muted/50">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            SMS system is currently disabled. Waiting for Twilio approval. Toggle the switch above to enable when ready.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden bg-background border rounded-lg">
        {/* Left Panel: Conversation List */}
        <div className={cn(
          "w-full md:w-[380px] border-r flex flex-col",
          selectedConversation && "hidden md:flex"
        )}>
          {/* Header */}
          <div className="px-4 py-3 border-b bg-card/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">SMS Messages</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant={hasActiveFilters ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  disabled={!smsEnabled}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                <Button onClick={() => setIsNewMessageOpen(true)} size="sm" disabled={!smsEnabled}>
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Gap 5: Admin Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent className="pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery Status</Label>
                  <Select
                    value={filters.deliveryStatus || ''}
                    onValueChange={(v) => setFilters(f => ({ ...f, deliveryStatus: v || undefined }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date From</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))}
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {convsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Inbox className="w-10 h-10 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No matches found' : 'No conversations yet'}
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
            {/* Chat Header */}
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

            {/* Messages */}
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

            {/* Compose Bar */}
            <div className="border-t px-4 py-3">
              <div className="flex gap-2">
                <Textarea
                  placeholder={smsEnabled ? "Type your SMS..." : "SMS system is disabled"}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                  disabled={!smsEnabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendSms.isPending || !smsEnabled}
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
            <p className="text-sm">Choose a conversation from the left or start a new one</p>
          </div>
        )}
      </div>
      </div>

      {/* New Message Dialog */}
      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New SMS</DialogTitle>
            <DialogDescription>Send a new SMS message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Search User (optional)</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <UserSearchAutocomplete
                    placeholder="Search by name or email..."
                    selectedUser={selectedNewUser}
                    onUserSelect={(user) => {
                      setSelectedNewUser(user);
                      setNewContactName(`${user.first_name} ${user.last_name}`.trim());
                      if (user.phone) {
                        setNewPhone(user.phone);
                      } else {
                        setNewPhone('');
                      }
                    }}
                  />
                </div>
                {selectedNewUser && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      setSelectedNewUser(null);
                      setNewPhone('');
                      setNewContactName('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {selectedNewUser && !selectedNewUser.phone && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No phone number on file — enter manually below
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Name (optional)</Label>
              <Input
                placeholder="John Doe"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={newMessageBody}
                onChange={(e) => setNewMessageBody(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNewMessageOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleNewMessage}
                disabled={!newPhone.trim() || !newMessageBody.trim() || sendSms.isPending}
              >
                {sendSms.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send SMS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
