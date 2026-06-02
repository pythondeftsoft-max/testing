import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, MoreVertical, Flag, Shield, Trash2, Calendar, Wrench } from 'lucide-react';
import { MessageWithSender } from '@/hooks/useAdminMessageThread';
import { useAdminMessageActions } from '@/hooks/useAdminMessageActions';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

interface AdminMessageBubbleProps {
  message: MessageWithSender;
  isFromTenant: boolean;
}

const AdminMessageBubble: React.FC<AdminMessageBubbleProps> = ({
  message,
  isFromTenant,
}) => {
  const { flagMessage, clearFlag, deleteMessage } = useAdminMessageActions();
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const senderName = `${message.sender_first_name} ${message.sender_last_name}`.trim() || message.sender_email;

  const handleFlag = () => {
    if (flagReason.trim()) {
      flagMessage.mutate({ messageId: message.id, reason: flagReason });
      setShowFlagDialog(false);
      setFlagReason('');
    }
  };

  const handleClearFlag = () => {
    clearFlag.mutate(message.id);
  };

  const handleDelete = () => {
    deleteMessage.mutate({ messageId: message.id });
    setShowDeleteDialog(false);
  };

  const getExtensionBadge = () => {
    if (message.extension === 'maintenance') {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Wrench className="w-3 h-3" />
          Maintenance
        </Badge>
      );
    }
    if (message.extension === 'appointment') {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Appointment
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
      <div className={`flex ${isFromTenant ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className="max-w-[70%]">
          <Card
            className={`p-3 ${
              message.is_flagged
                ? 'border-destructive bg-destructive/10'
                : isFromTenant
                ? 'bg-accent'
                : 'bg-primary/10'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">{senderName}</span>
                  <span className="text-xs text-muted-foreground">
                    {isFromTenant ? '(Tenant)' : '(Landlord)'}
                  </span>
                  {getExtensionBadge()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {message.is_flagged ? (
                    <DropdownMenuItem onClick={handleClearFlag}>
                      <Shield className="w-4 h-4 mr-2" />
                      Clear Flag
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setShowFlagDialog(true)}>
                      <Flag className="w-4 h-4 mr-2" />
                      Flag Message
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Message
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {message.is_flagged && (
              <div className="flex items-center gap-2 mb-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  Flagged: {message.flagged_reason}
                </span>
              </div>
            )}

            <div className="text-sm whitespace-pre-wrap break-words">
              {message.message_text}
            </div>

            {message.payload && (
              <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                <details>
                  <summary className="cursor-pointer">Additional data</summary>
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(message.payload, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Flag Dialog */}
      <AlertDialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flag Message</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for flagging this message. This will help with moderation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Reason for flagging..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFlag} disabled={!flagReason.trim()}>
              Flag Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminMessageBubble;
