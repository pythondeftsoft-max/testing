import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { MapPin, User } from 'lucide-react';
import { ConversationDetail } from '@/hooks/useAdminConversations';

interface AdminConversationDetailsSheetProps {
  conversation: ConversationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminConversationDetailsSheet: React.FC<AdminConversationDetailsSheetProps> = ({
  conversation,
  open,
  onOpenChange,
}) => {
  if (!conversation) return null;

  const tenantName = `${conversation.tenant_first_name} ${conversation.tenant_last_name}`.trim() || conversation.tenant_email;
  const landlordName = `${conversation.landlord_first_name} ${conversation.landlord_last_name}`.trim() || conversation.landlord_email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Conversation Details</SheetTitle>
          <SheetDescription>
            View details about this conversation
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Property</span>
            </div>
            <div className="text-sm text-muted-foreground pl-6">
              {conversation.property_address}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Tenant</span>
            </div>
            <div className="text-sm text-muted-foreground pl-6">
              {tenantName}
              <br />
              {conversation.tenant_email}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Landlord</span>
            </div>
            <div className="text-sm text-muted-foreground pl-6">
              {landlordName}
              <br />
              {conversation.landlord_email}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold">Status</span>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{conversation.status}</Badge>
              <Badge variant="secondary">
                {conversation.message_count} messages
              </Badge>
              {conversation.flagged_count > 0 && (
                <Badge variant="destructive">
                  {conversation.flagged_count} flagged
                </Badge>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminConversationDetailsSheet;
