-- Insert 10 diverse unread notifications with proper categories for testing
INSERT INTO public.notifications (user_id, title, description, type, category, priority, read, link)
VALUES 
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Urgent: Water Heater Repair Scheduled',
    'Your water heater repair has been scheduled for tomorrow at 10 AM. A technician will contact you 30 minutes before arrival.',
    'maintenance_scheduled',
    'Maintenance',
    'high',
    false,
    '/maintenance'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Rent Payment Due in 2 Days',
    'Your rent payment of $2,100 is due on October 24th. Pay now to avoid late fees.',
    'payment_due',
    'Payment',
    'high',
    false,
    '/pay-rent'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Application Status Update',
    'Your application for 456 Elm Street has moved to final review. A decision will be made within 48 hours.',
    'application_update',
    'Application',
    'high',
    false,
    '/applications'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Signature Required: Lease Renewal',
    'Your lease renewal document is ready for signature. Please review and sign by October 28th.',
    'document_signature_required',
    'Documents',
    'high',
    false,
    '/dashboard'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Points Earned: On-Time Payment Bonus',
    'Congratulations! You earned 100 points for paying rent on time for 6 consecutive months.',
    'points_awarded',
    'Points',
    'medium',
    false,
    '/dashboard?tab=My Points'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Lease Renewal Options Available',
    'Your current lease expires in 45 days. Review your renewal options and let us know your decision.',
    'lease_renewal',
    'Lease',
    'medium',
    false,
    '/dashboard'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'New Message from Property Manager',
    'Sarah Johnson sent you a message regarding the upcoming property inspection scheduled for next week.',
    'message_received',
    'Messages',
    'medium',
    false,
    '/messages'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Portfolio Access Granted',
    'You have been added to the "Riverfront Properties" portfolio. You can now view all properties in this collection.',
    'portfolio_access',
    'Portfolio',
    'medium',
    false,
    '/portfolio'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'Property Viewing Confirmed',
    'Your viewing appointment for 789 Maple Avenue is confirmed for October 26th at 2:00 PM.',
    'appointment_scheduled',
    'Appointments',
    'low',
    false,
    '/appointments'
  ),
  (
    'eb292509-b618-43b3-869c-0abedd81a26b',
    'System Maintenance Notice',
    'The platform will undergo scheduled maintenance on October 27th from 2 AM to 4 AM EST. Some features may be temporarily unavailable.',
    'system_maintenance',
    'System',
    'low',
    false,
    '/dashboard'
  );