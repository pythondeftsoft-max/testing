import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Paperclip, X, FileText, Image, AlertCircle, Wrench, MessageSquare, DollarSign, ScrollText, ClipboardCheck, Settings, HelpCircle, Megaphone, Users, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAdminDirectMessages } from '@/hooks/useAdminDirectMessages';

const MESSAGE_TYPES = {
  general: {
    label: 'General',
    icon: MessageSquare,
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  urgent: {
    label: 'Urgent',
    icon: AlertCircle,
    color: 'bg-red-500/10 text-red-700 dark:text-red-400',
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  },
  application: {
    label: 'Application',
    icon: FileText,
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
  billing: {
    label: 'Billing/Payment',
    icon: DollarSign,
    color: 'bg-green-500/10 text-green-700 dark:text-green-400',
  },
  lease: {
    label: 'Lease/Contract',
    icon: ScrollText,
    color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  },
  inspection: {
    label: 'Inspection',
    icon: ClipboardCheck,
    color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  },
  settings: {
    label: 'Account/Settings',
    icon: Settings,
    color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  },
  help: {
    label: 'Help/Support',
    icon: HelpCircle,
    color: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  },
  announcement: {
    label: 'Announcement',
    icon: Megaphone,
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
} as const;

interface AdminNewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminNewMessageDialog: React.FC<AdminNewMessageDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [recipientType, setRecipientType] = useState<'individual' | 'group'>('individual');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'landlords' | 'tenants' | null>(null);
  const [subject, setSubject] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'maintenance' | 'application' | 'urgent' | 'billing' | 'lease' | 'inspection' | 'settings' | 'help' | 'announcement'>('general');
  const [messageContent, setMessageContent] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { sendMessage, isSending } = useAdminDirectMessages(null);

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users-for-messaging'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_admin_users', {
        search_query: '',
        type_filter: null,
        status_filter: null,
        limit_count: 100,
        offset_count: 0,
      });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Calculate user type counts
  const userCounts = {
    total: users?.length || 0,
    landlords: users?.filter(u => u.user_type === 'landlord' || u.user_type === 'individual_owner').length || 0,
    tenants: users?.filter(u => u.user_type === 'tenant').length || 0,
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;
    if (recipientType === 'individual' && !selectedUserId) return;
    if (recipientType === 'group' && !selectedGroup) return;

    // Show confirmation for bulk messages
    if (recipientType === 'group') {
      setShowConfirmDialog(true);
      return;
    }

    sendMessage(
      {
        recipientId: selectedUserId || undefined,
        recipientGroup: undefined,
        subject: subject || 'No Subject',
        messageType,
        messageText: messageContent,
        file: selectedFile || undefined,
      }
    );
    
    setMessageContent('');
    setSubject('');
    setMessageType('general');
    setSelectedUserId('');
    setSelectedGroup(null);
    setRecipientType('individual');
    setSelectedFile(null);
    setFilePreview(null);
    onOpenChange(false);
  };

  const handleConfirmBulkSend = () => {
    setShowConfirmDialog(false);
    
    sendMessage(
      {
        recipientId: undefined,
        recipientGroup: selectedGroup!,
        subject: subject || 'No Subject',
        messageType,
        messageText: messageContent,
        file: selectedFile || undefined,
      }
    );
    
    setMessageContent('');
    setSubject('');
    setMessageType('general');
    setSelectedUserId('');
    setSelectedGroup(null);
    setRecipientType('individual');
    setSelectedFile(null);
    setFilePreview(null);
    onOpenChange(false);
  };

  const handleRecipientChange = (value: string) => {
    if (value.startsWith('group:')) {
      setRecipientType('group');
      setSelectedGroup(value.replace('group:', '') as 'all' | 'landlords' | 'tenants');
      setSelectedUserId('');
    } else {
      setRecipientType('individual');
      setSelectedUserId(value);
      setSelectedGroup(null);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Send a direct message to any user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selector */}
          <div className="space-y-2">
            <Label>To</Label>
            <Select 
              value={recipientType === 'group' ? `group:${selectedGroup}` : selectedUserId} 
              onValueChange={handleRecipientChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient...">
                  {recipientType === 'group' && selectedGroup ? (
                    selectedGroup === 'all' ? '📢 All Users' :
                    selectedGroup === 'landlords' ? '🏠 All Landlords' :
                    '👥 All Tenants'
                  ) : selectedUserId && users?.find(u => u.id === selectedUserId) ? (
                    `${users.find(u => u.id === selectedUserId)?.first_name} ${users.find(u => u.id === selectedUserId)?.last_name}`.trim() || users.find(u => u.id === selectedUserId)?.email
                  ) : (
                    "Select recipient..."
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <div className="px-2 py-1.5 sticky top-0 bg-popover z-10 border-b">
                  <Input
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="h-8"
                  />
                </div>
                
                {/* Group Options */}
                {!userSearchQuery && (
                  <div className="border-b">
                    <SelectItem value="group:all" className="font-semibold bg-accent/50">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        <span>All Users</span>
                        <Badge variant="secondary" className="ml-auto">{userCounts.total}</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="group:landlords" className="font-semibold bg-accent/50">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>All Landlords</span>
                        <Badge variant="secondary" className="ml-auto">{userCounts.landlords}</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="group:tenants" className="font-semibold bg-accent/50">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>All Tenants</span>
                        <Badge variant="secondary" className="ml-auto">{userCounts.tenants}</Badge>
                      </div>
                    </SelectItem>
                  </div>
                )}

                {usersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : !users || users.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  users
                    .filter(user => {
                      if (!userSearchQuery) return true;
                      const searchLower = userSearchQuery.toLowerCase();
                      const userName = `${user.first_name} ${user.last_name}`.toLowerCase();
                      const email = user.email.toLowerCase();
                      return userName.includes(searchLower) || email.includes(searchLower);
                    })
                    .map((user) => {
                      const userName = `${user.first_name} ${user.last_name}`.trim() || user.email;
                      return (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span>{userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.email} • {user.user_type}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message Type */}
          <div className="space-y-2">
            <Label>Message Type</Label>
            <Select value={messageType} onValueChange={(v) => setMessageType(v as any)}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {React.createElement(MESSAGE_TYPES[messageType].icon, { className: 'w-4 h-4' })}
                    <span>{MESSAGE_TYPES[messageType].label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MESSAGE_TYPES).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {React.createElement(type.icon, { className: 'w-4 h-4' })}
                      <span>{type.label}</span>
                      <Badge variant="secondary" className={type.color}>
                        {key}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          {/* File Attachment */}
          <div className="space-y-2">
            <Label>Attachment (Optional)</Label>
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Paperclip className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? (
                    'Drop file here...'
                  ) : (
                    <>
                      Drag & drop a file, or click to browse
                      <br />
                      <span className="text-xs">Images, PDFs, Word, Excel (max 10MB)</span>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-16 h-16 rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={
                !messageContent.trim() || 
                (recipientType === 'individual' && !selectedUserId) ||
                (recipientType === 'group' && !selectedGroup) ||
                isSending
              }
              className="gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send to Group?</DialogTitle>
              <DialogDescription>
                This will send the message to{' '}
                <strong>
                  {selectedGroup === 'all' ? `ALL users (${userCounts.total} people)` :
                   selectedGroup === 'landlords' ? `ALL landlords (${userCounts.landlords} people)` :
                   `ALL tenants (${userCounts.tenants} people)`}
                </strong>
                . This action cannot be undone. Continue?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmBulkSend} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send to All'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
