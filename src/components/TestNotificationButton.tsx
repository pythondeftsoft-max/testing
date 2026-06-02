
import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';

const TestNotificationButton = () => {
  const { toast } = useToast();

  const createTestNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create test notifications.",
          variant: "destructive"
        });
        return;
      }

      const testNotifications = [
        // Maintenance notifications
        {
          user_id: user.id,
          title: 'Maintenance Work Completed',
          description: 'The maintenance work on your AC unit has been completed. Please review and confirm.',
          type: 'maintenance_completed',
          category: 'Maintenance',
          priority: 'medium',
          read: false
        },
        
        // Payment notifications
        {
          user_id: user.id,
          title: 'Rent Payment Due',
          description: 'Your rent payment of $1,500 is due in 3 days. Please submit payment to avoid late fees.',
          type: 'payment_due',
          category: 'Payment',
          priority: 'high',
          read: false
        },
        
        // Application notifications
        {
          user_id: user.id,
          title: 'Application Approved!',
          description: 'Congratulations! Your rental application for 123 Main Street has been approved.',
          type: 'application_approved',
          category: 'Application',
          priority: 'high',
          read: false
        },
        {
          user_id: user.id,
          title: 'Application Rejected',
          description: 'Your application for Downtown Loft has been declined. Please check your email for details.',
          type: 'application_rejected',
          category: 'Application',
          priority: 'medium',
          read: false
        },
        
        // Messages notification
        {
          user_id: user.id,
          title: 'New Message from Property Manager',
          description: 'You have a new message from your property manager regarding your lease renewal.',
          type: 'message_received',
          category: 'Messages',
          priority: 'medium',
          read: false
        },
        
        // Points notification
        {
          user_id: user.id,
          title: 'Points Awarded!',
          description: "You've earned 50 points for paying rent on time! Check your rewards dashboard.",
          type: 'points_awarded',
          category: 'Points',
          priority: 'medium',
          read: false
        },
        
        // Lease notification
        {
          user_id: user.id,
          title: 'Lease Renewal Available',
          description: 'Your lease expires in 60 days. Review your renewal options and submit your decision.',
          type: 'lease_renewal',
          category: 'Lease',
          priority: 'high',
          read: false
        },
        
        // Documents notification
        {
          user_id: user.id,
          title: 'Document Signature Required',
          description: 'Please review and sign the new parking agreement by end of week.',
          type: 'document_signature_required',
          category: 'Documents',
          priority: 'high',
          read: false
        },
        
        // Appointments notification
        {
          user_id: user.id,
          title: 'Appointment Scheduled',
          description: 'Your property inspection is scheduled for Friday, October 25th at 2:00 PM.',
          type: 'appointment_scheduled',
          category: 'Appointments',
          priority: 'medium',
          read: false
        },
        
        // Portfolio notification
        {
          user_id: user.id,
          title: 'Portfolio Access Granted',
          description: 'You now have access to Sunset Properties portfolio. View properties and team details.',
          type: 'portfolio_access',
          category: 'Portfolio',
          priority: 'medium',
          read: false
        },
        
        // System notification
        {
          user_id: user.id,
          title: 'Scheduled System Maintenance',
          description: 'The platform will undergo maintenance this Sunday from 2-4 AM EST.',
          type: 'system_maintenance',
          category: 'System',
          priority: 'low',
          read: false
        }
      ];

      const { error } = await supabase
        .from('notifications')
        .insert(testNotifications);

      if (error) throw error;

      toast({
        title: "Test Notifications Created",
        description: "13 diverse test notifications have been created successfully.",
      });

    } catch (error) {
      console.error('Error creating test notifications:', error);
      toast({
        title: "Error",
        description: "Failed to create test notifications.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={createTestNotification}
      variant="outline"
      size="sm"
    >
      <Bell className="w-4 h-4 mr-2" />
      Create Test Notification
    </Button>
  );
};

export default TestNotificationButton;
