import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { ConversationDetail } from '@/hooks/useAdminConversations';
import { useResendPaymentLink } from '@/hooks/useResendPaymentLink';
import AdminMessageThread from './AdminMessageThread';

interface AdminMessageThreadDialogProps {
  conversation: ConversationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminMessageThreadDialog: React.FC<AdminMessageThreadDialogProps> = ({
  conversation,
  open,
  onOpenChange,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const resendPaymentLink = useResendPaymentLink();

  if (!conversation) return null;

  const tenantName = `${conversation.tenant_first_name} ${conversation.tenant_last_name}`.trim() || conversation.tenant_email;
  const landlordName = `${conversation.landlord_first_name} ${conversation.landlord_last_name}`.trim() || conversation.landlord_email;
  
  const handleResendPaymentLink = () => {
    resendPaymentLink.mutate(conversation.application_id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg">
                {tenantName} ↔ {landlordName}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {conversation.property_address}
              </p>
            </div>
            {conversation.status === 'lease_signed' && (
              <Button
                onClick={handleResendPaymentLink}
                disabled={resendPaymentLink.isPending}
                size="sm"
                variant="outline"
              >
                <Send className="w-4 h-4 mr-2" />
                Resend Payment Link
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <AdminMessageThread
            conversation={conversation}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails(!showDetails)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminMessageThreadDialog;
