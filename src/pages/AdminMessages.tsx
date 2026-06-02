import { useState } from 'react';
import { useUserAdminMessages } from '@/hooks/useUserAdminMessages';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Mail, Download, FileText, Info, ChevronDown, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AdminMessages = () => {
  const { messages, isLoading, markAsRead } = useUserAdminMessages();
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showAdminDetails, setShowAdminDetails] = useState(false);

  const selectedMessageData = messages.find(m => m.id === selectedMessage);

  // Fetch admin profile details
  const { data: adminProfile } = useQuery({
    queryKey: ['admin-profile', selectedMessageData?.admin_user_id],
    queryFn: async () => {
      if (!selectedMessageData?.admin_user_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedMessageData.admin_user_id)
        .single();
      return data;
    },
    enabled: !!selectedMessageData?.admin_user_id,
  });

  const handleMessageClick = (messageId: string) => {
    setSelectedMessage(messageId);
    const message = messages.find(m => m.id === messageId);
    if (message && !message.read) {
      markAsRead(messageId);
    }
  };

  const getMessageTypeIcon = (type: string | null) => {
    switch (type) {
      case 'urgent':
        return '🚨';
      case 'maintenance':
        return '🔧';
      case 'appointment':
        return '📅';
      case 'billing':
        return '💳';
      case 'inspection':
        return '🔍';
      case 'announcement':
        return '📢';
      default:
        return '📬';
    }
  };

  const getMessageTypeBadge = (type: string | null) => {
    if (!type) return null;
    
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      urgent: 'destructive',
      maintenance: 'default',
      appointment: 'default',
      billing: 'secondary',
      inspection: 'secondary',
      announcement: 'outline',
    };

    return (
      <Badge variant={variants[type] || 'outline'} className="ml-2">
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Messages</h1>
          <p className="text-muted-foreground">
            Important communications from the OpenKey admin team
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p className="text-muted-foreground text-center">
                You'll see important communications from the admin team here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <CardDescription>
                    {messages.filter(m => !m.read).length} unread
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2 p-4">
                      {messages.map((message) => (
                        <button
                          key={message.id}
                          onClick={() => handleMessageClick(message.id)}
                          className={`w-full text-left p-4 rounded-lg border transition-colors ${
                            selectedMessage === message.id
                              ? 'bg-accent border-primary'
                              : message.read
                              ? 'bg-card hover:bg-accent/50 border-border'
                              : 'bg-primary/5 hover:bg-primary/10 border-primary/20'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">
                                {getMessageTypeIcon(message.message_type)}
                              </span>
                              {!message.read && (
                                <Badge variant="default" className="h-5 px-1.5">
                                  New
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(message.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <h4 className="font-semibold mb-1 line-clamp-1">
                            {message.subject}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.message_text}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              {selectedMessageData ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {getMessageTypeIcon(selectedMessageData.message_type)}
                          </span>
                          <CardTitle className="text-xl">
                            {selectedMessageData.subject}
                          </CardTitle>
                          {getMessageTypeBadge(selectedMessageData.message_type)}
                        </div>
                        <CardDescription className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>
                              From: {selectedMessageData.admin_name}
                              {adminProfile?.email && ` (${adminProfile.email})`} •{' '}
                              {formatDistanceToNow(
                                new Date(selectedMessageData.created_at),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          {adminProfile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAdminDetails(!showAdminDetails)}
                              className="h-7 text-xs ml-2"
                            >
                              <Info className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap">
                          {selectedMessageData.message_text}
                        </p>
                      </div>

                      {selectedMessageData.attachment_url && (
                        <div className="mt-6 p-4 border rounded-lg bg-accent/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Attachment</p>
                                <p className="text-sm text-muted-foreground">
                                  Click to download
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a
                                href={selectedMessageData.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}

                      {selectedMessageData.recipient_group && (
                        <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">
                            <strong>Sent to:</strong>{' '}
                            {selectedMessageData.recipient_group === 'all'
                              ? 'All Users'
                              : selectedMessageData.recipient_group === 'landlords'
                              ? 'All Landlords'
                              : 'All Tenants'}
                          </p>
                        </div>
                      )}

                      {/* Admin Details Collapsible Section */}
                      {adminProfile && (
                        <Collapsible open={showAdminDetails} onOpenChange={setShowAdminDetails} className="mt-6">
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <Info className="h-4 w-4 mr-2" />
                              Admin Details
                              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showAdminDetails ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-4">
                            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                                  <p className="text-sm font-medium">{adminProfile.email || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                                  <p className="text-sm font-medium">{adminProfile.phone || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">User Type</p>
                                  <p className="text-sm font-medium capitalize">{adminProfile.user_type || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Admin ID</p>
                                  <p className="text-sm font-medium font-mono text-xs">{adminProfile.id?.slice(0, 8)}...</p>
                                </div>
                                {adminProfile.created_at && (
                                  <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground mb-1">Account Created</p>
                                    <p className="text-sm font-medium">
                                      {new Date(adminProfile.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-24">
                    <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Select a message
                    </h3>
                    <p className="text-muted-foreground text-center">
                      Choose a message from the list to view its content
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
