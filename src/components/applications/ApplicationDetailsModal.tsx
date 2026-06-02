
import React, { useState } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationDetailsModalProps {
  application: any;
}

const ApplicationDetailsModal = ({ application }: ApplicationDetailsModalProps) => {
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const { toast } = useToast();

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('property_applications')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Application Updated",
        description: `Application has been ${status}.`,
      });

      window.location.reload(); // Simple refresh to update the data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (applicationId: string, userId: string) => {
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      const { data, error } = await supabase.rpc('send_landlord_message', {
        application_id: applicationId,
        message_text: messageText.trim(),
        sender_id: userId
      });

      if (error) throw error;
      
      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        if (!result.success) {
          throw new Error(result.error_message || 'Failed to send message');
        }
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the tenant.",
      });

      setMessageText('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Tenant Profile & Screening Details</DialogTitle>
        <DialogDescription>
          Review full tenant information and make your decision
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Tenant Info</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Name:</strong> {application.profiles?.first_name} {application.profiles?.last_name}</p>
              <p><strong>Email:</strong> {application.profiles?.email}</p>
              <p><strong>Phone:</strong> {application.profiles?.phone}</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Property Info</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Address:</strong> {application.properties?.address}</p>
              <p><strong>Rent:</strong> ${application.properties?.monthly_rent}/month</p>
              <p><strong>Requested:</strong> {formatDate(application.created_at)}</p>
            </div>
          </div>
        </div>

        {application.tenant_profiles && (
          <div>
            <h4 className="font-medium mb-2">Financial & Background Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>Monthly Income:</strong> ${application.tenant_profiles.monthly_income?.toLocaleString() || 'Not provided'}</p>
              <p><strong>Employment:</strong> {application.tenant_profiles.employment_status || 'Not provided'}</p>
              <p><strong>Credit Score:</strong> {application.tenant_profiles.credit_score || 'Not provided'}</p>
              <p><strong>Section 8 Voucher:</strong> {application.tenant_profiles.voucher_holder ? 'Yes' : 'No'}</p>
              {application.tenant_profiles.voucher_holder && application.tenant_profiles.voucher_amount && (
              <p><strong>Voucher Amount:</strong> ${application.tenant_profiles.voucher_amount}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">Send Message to Tenant</h4>
          <div className="space-y-2">
            <Textarea
              placeholder="Write a message to the tenant..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
            />
            <Button
              onClick={async () => {
                const userId = await getCurrentUserId();
                if (userId) {
                  await sendMessage(application.id, userId);
                }
              }}
              disabled={!messageText.trim() || sendingMessage}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingMessage ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>

        {application.status === 'pending' && (
          <div className="flex space-x-4">
            <Button
              onClick={() => updateApplicationStatus(application.id, 'approved')}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Tenant
            </Button>
            <Button
              variant="destructive"
              onClick={() => updateApplicationStatus(application.id, 'rejected')}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deny Application
            </Button>
          </div>
        )}
      </div>
    </DialogContent>
  );
};

export default ApplicationDetailsModal;
