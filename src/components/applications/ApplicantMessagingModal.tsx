import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMessagingQuota } from '@/hooks/useMessagingQuota';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, AlertCircle, Lock, Paperclip, X, FileText, Image as ImageIcon, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import LeaseMessageCard from '@/components/LeaseMessageCard';
import MaintenanceMessageCard from '@/components/MaintenanceMessageCard';
import AppointmentMessageCard from '@/components/AppointmentMessageCard';

interface ApplicantMessagingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  tenantId: string;
  propertyId: string;
  tenantName?: string;
  propertyAddress?: string;
}

// Messages that should only appear in the main Messages tab, not in conversations
const SYSTEM_ONLY_EXTENSIONS = ['placement_fee_payment'];

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  property_application_id: string;
  extension?: string;
  payload?: any;
  sender_profile?: {
    first_name: string;
    last_name: string;
  };
}

export const ApplicantMessagingModal: React.FC<ApplicantMessagingModalProps> = ({
  open,
  onOpenChange,
  applicationId,
  tenantId,
  propertyId,
  tenantName = 'Applicant',
  propertyAddress = 'Property',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
      requestAnimationFrame(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
        }
      });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Scroll to bottom when modal opens
  useEffect(() => {
    if (open && messages.length > 0) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [open]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFilePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setFilePreview(null);
        }
      }
    },
    onDropRejected: (rejections) => {
      const error = rejections[0]?.errors[0];
      if (error?.code === 'file-too-large') {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Invalid file',
          description: 'Please upload a valid document or image file',
          variant: 'destructive',
        });
      }
    },
  });
  
  // Pass currentUserId as the sender, not tenantId
  const {
    canMessage,
    messagesRemaining,
    isPrimary,
    loading: quotaLoading,
    sendMessage,
    refetch: refetchQuota
  } = useMessagingQuota(currentUserId || '', applicationId, true);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (open) {
      // Refetch quota first, then fetch messages
      refetchQuota().then(() => {
        fetchMessages();
      });
    }
  }, [open, applicationId]);

  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`messages:${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // Note: Supabase realtime doesn't support OR filters, so we subscribe to all messages
          // and filter client-side in fetchMessages
        },
        () => {
          fetchMessages();
          refetchQuota();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Read receipts / edits — refetch so checkmarks update live
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log(`[ApplicantMessagingModal] Realtime status (${applicationId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, applicationId]);

  const fetchMessages = async () => {
    try {
      // Each application/push type shows only its OWN messages - no cross-type consolidation
      // This ensures new pushes start fresh without messages from old property_applications
      const linkedIds: string[] = [applicationId];
      
      // Terminal statuses that should NOT have their messages consolidated
      const terminalPushStatuses = ['denied', 'expired', 'declined'];
      const terminalAppStatuses = ['rejected', 'withdrawn', 'denied'];
      
      // Check if this is a property push - only find OTHER ACTIVE PUSHES (not property_applications)
      const { data: pushData } = await supabase
        .from('property_pushes')
        .select('property_id, tenant_id, status')
        .eq('id', applicationId)
        .maybeSingle();
      
      if (pushData) {
        // Only find other ACTIVE pushes for same property+tenant - NO cross-linking to property_applications
        const { data: linkedPushes } = await supabase
          .from('property_pushes')
          .select('id, status')
          .eq('property_id', pushData.property_id)
          .eq('tenant_id', pushData.tenant_id)
          .neq('id', applicationId);
        
        if (linkedPushes) {
          // Filter out terminal status pushes
          const activePushes = linkedPushes.filter(p => !terminalPushStatuses.includes(p.status));
          linkedIds.push(...activePushes.map(p => p.id));
        }
      }
      
      // Check if this is a property application - only find OTHER ACTIVE APPLICATIONS (not property_pushes)
      const { data: appData } = await supabase
        .from('property_applications')
        .select('property_id, tenant_id, status')
        .eq('id', applicationId)
        .maybeSingle();
      
      if (appData) {
        // Only find other ACTIVE applications for same property+tenant - NO cross-linking to property_pushes
        const { data: linkedApps } = await supabase
          .from('property_applications')
          .select('id, status')
          .eq('property_id', appData.property_id)
          .eq('tenant_id', appData.tenant_id)
          .neq('id', applicationId);
        
        if (linkedApps) {
          // Filter out terminal status applications
          const activeApps = linkedApps.filter(a => !terminalAppStatuses.includes(a.status));
          linkedIds.push(...activeApps.map(a => a.id));
        }
      }
      
      // Build OR conditions for all linked IDs
      const uniqueIds = [...new Set(linkedIds)];
      const orConditions = uniqueIds.flatMap(id => [
        `marketplace_application_id.eq.${id}`,
        `unit_application_id.eq.${id}`,
        `property_application_id.eq.${id}`,
        `property_push_id.eq.${id}`
      ]).join(',');

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          message_text,
          created_at,
          property_application_id,
          marketplace_application_id,
          unit_application_id,
          property_push_id,
          extension,
          payload,
          sender_profile:profiles!messages_sender_id_fkey(first_name, last_name)
        `)
        .or(orConditions)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Filter out system-only messages that belong in the main Messages tab
      const filteredMessages = (data || []).filter(
        msg => !SYSTEM_ONLY_EXTENSIONS.includes(msg.extension || '')
      );
      
      setMessages(filteredMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !canMessage || sending) return;

    setSending(true);
    setUploading(true);
    
    try {
      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentType = null;

      // Upload file if one is selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${currentUserId}/${applicationId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: signedData, error: signedErr } = await supabase.storage
          .from('message-attachments')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365);
        if (signedErr || !signedData?.signedUrl) throw (signedErr ?? new Error('Failed to sign attachment URL'));

        attachmentUrl = signedData.signedUrl;
        attachmentName = selectedFile.name;
        attachmentType = selectedFile.type;
      }

      // Send message with attachment info in payload
      const result = await sendMessage(
        messageText.trim() || 'Sent an attachment',
        attachmentUrl 
          ? { 
              attachment_url: attachmentUrl,
              attachment_name: attachmentName,
              attachment_type: attachmentType
            } 
          : undefined
      );
      
      if (result.success) {
        setMessageText('');
        setSelectedFile(null);
        setFilePreview(null);
        toast({
          title: 'Message sent',
          description: isPrimary 
            ? 'Your message has been sent' 
            : `${messagesRemaining - 1} messages remaining`,
        });
        await fetchMessages();
      } else {
        toast({
          title: 'Failed to send message',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const renderQuotaBanner = () => {
    if (quotaLoading) {
      return (
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-muted-foreground">Loading messaging status...</div>
          </div>
        </div>
      );
    }
    
    if (isPrimary) {
      return (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold text-sm">Primary Applicant</div>
              <div className="text-xs text-muted-foreground">Unlimited messaging available</div>
            </div>
          </div>
        </div>
      );
    }

    if (messagesRemaining === 0) {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <div className="font-semibold text-sm">No messages remaining</div>
              <div className="text-xs text-muted-foreground">
                Set this applicant as primary to send more messages
              </div>
            </div>
          </div>
        </div>
      );
    }

    const isLow = messagesRemaining <= 2;
    return (
      <div className={`border rounded-lg p-4 ${
        isLow 
          ? 'bg-orange-500/10 border-orange-500/20' 
          : 'bg-blue-500/10 border-blue-500/20'
      }`}>
        <div className="flex items-center gap-2">
          {isLow && <AlertCircle className="h-5 w-5 text-orange-500" />}
          {!isLow && <MessageCircle className="h-5 w-5 text-blue-500" />}
          <div className="flex-1">
            <div className="font-semibold text-sm">
              {messagesRemaining} message{messagesRemaining !== 1 ? 's' : ''} remaining
            </div>
            <div className="text-xs text-muted-foreground">
              {isLow 
                ? 'Consider setting this applicant as primary for unlimited messaging'
                : `Send up to ${messagesRemaining} messages to this applicant`
              }
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-lg flex items-center gap-2">
            {tenantName} - {propertyAddress}
            {isPrimary && (
              <Badge className="bg-openkey-gold text-white flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Primary
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4">
          {renderQuotaBanner()}
        </div>

        <ScrollArea className="flex-1 px-6" viewportRef={scrollViewportRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = message.sender_id === currentUserId;
                const senderName = message.sender_profile
                  ? `${message.sender_profile.first_name} ${message.sender_profile.last_name}`
                  : isCurrentUser ? 'You' : tenantName;

                // Render special message cards
                if (message.extension === 'lease_notification' || message.extension === 'lease_sent') {
                  return (
                    <LeaseMessageCard
                      key={message.id}
                      message={message}
                      isSender={isCurrentUser}
                      userType={isCurrentUser ? 'landlord' : 'tenant'}
                      onUpdate={fetchMessages}
                    />
                  );
                }

                if (message.extension === 'maintenance') {
                  return (
                    <MaintenanceMessageCard
                      key={message.id}
                      message={message}
                      isSender={isCurrentUser}
                    />
                  );
                }

                if (message.extension === 'appointment') {
                  return (
                    <AppointmentMessageCard
                      key={message.id}
                      message={message}
                      isSender={isCurrentUser}
                      userType={isCurrentUser ? 'landlord' : 'tenant'}
                      onUpdate={fetchMessages}
                    />
                  );
                }

                // Regular message bubble
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{senderName}</div>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.message_text}
                      </div>
                      {message.payload?.image_url && (
                        <div className="mt-2">
                          <img 
                            src={message.payload.image_url}
                            alt="Attachment"
                            className="rounded-md max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ maxHeight: '200px' }}
                            onClick={() => window.open(message.payload.image_url, '_blank')}
                          />
                        </div>
                      )}
                      {message.payload?.attachment_url && (
                        <a
                          href={message.payload.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-2 text-sm underline"
                        >
                          {message.payload.attachment_type?.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          {message.payload.attachment_name || 'View attachment'}
                        </a>
                      )}
                      <div
                        className={`text-xs mt-1 ${
                          isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t space-y-3">
          {/* File attachment area */}
          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
              ) : (
                <FileText className="h-12 w-12 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder={
                  canMessage
                    ? 'Type your message...'
                    : 'No messages remaining. Set as primary to continue.'
                }
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!canMessage || sending}
                className="min-h-[80px] resize-none"
              />
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} disabled={!canMessage || sending} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canMessage || sending}
                  className="w-full"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {isDragActive ? 'Drop file here' : 'Attach file (up to 10MB)'}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!canMessage || (!messageText.trim() && !selectedFile) || sending}
              className="self-end"
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
