-- Insert brand new, properly-tagged test notifications
-- These demonstrate all notification types with correct routing

INSERT INTO public.notifications (user_id, title, description, type, category, priority, read, created_at)
SELECT 
  id as user_id,
  notification.title,
  notification.description,
  notification.type,
  notification.category,
  notification.priority,
  false as read,
  NOW() as created_at
FROM auth.users
CROSS JOIN (
  VALUES
    -- Maintenance notifications (Routes to /maintenance)
    ('🔧 Plumbing Issue Reported', 'Your report of low water pressure in bathroom has been received. A technician will contact you within 24 hours.', 'maintenance_request_submitted', 'Maintenance', 'high'),
    ('✅ HVAC Repair Complete', 'Great news! The heating system repair in your unit has been completed and tested. System is now fully operational.', 'maintenance_completed', 'Maintenance', 'medium'),
    ('🔨 Electrician En Route', 'Your maintenance technician is on the way to fix the outlet issue. ETA: 30 minutes.', 'maintenance_in_progress', 'Maintenance', 'high'),
    
    -- Payment notifications (Routes to /payments or /pay-rent)
    ('💰 Payment Confirmed', 'Your October rent payment of $1,850 has been successfully processed. Receipt sent to your email.', 'payment_received', 'Payment', 'low'),
    ('⚠️ Upcoming Payment', 'Reminder: November rent of $1,850 is due in 5 days. Pay online to earn bonus points!', 'payment_due', 'Payment', 'high'),
    ('📊 Payment History Available', 'Your 2024 payment history is ready to download. Perfect timing for tax season!', 'payment_confirmed', 'Payment', 'low'),
    
    -- Application notifications (Routes to /applications)
    ('🎉 Welcome Aboard!', 'Your application for Riverfront Apartments Unit 204 has been approved! Next step: Sign your lease online.', 'application_approved', 'Application', 'high'),
    ('📋 Background Check in Progress', 'Your application is moving forward. Background check typically takes 2-3 business days.', 'application_status_update', 'Application', 'medium'),
    ('📝 Additional Info Needed', 'Please upload proof of employment to complete your application for Sunset Towers.', 'application_update', 'Application', 'high'),
    
    -- Messages (Routes to /messages)
    ('💬 Property Manager Response', 'Sarah from management responded to your question about parking permits. Check messages for details.', 'message_received', 'Messages', 'medium'),
    
    -- Points & Rewards (Routes to /dashboard?tab=My Points)
    ('⭐ Bonus Points Earned!', 'You earned 100 bonus points for your 6-month on-time payment streak! Keep it up!', 'points_awarded', 'Points', 'medium'),
    ('🎁 Reward Ready to Claim', 'You have 500 points! Redeem now for a $50 Starbucks gift card or restaurant voucher.', 'reward_earned', 'Points', 'high'),
    
    -- Lease notifications (Routes to /dashboard)
    ('📅 Lease Decision Needed', 'Your lease renewal offer is ready for review. Lock in your rate before December 1st.', 'lease_renewal', 'Lease', 'high'),
    ('✍️ Lease Renewal Accepted', 'Your lease renewal has been processed! Your new lease term begins February 1st, 2026.', 'lease_renewal_completed', 'Lease', 'medium'),
    
    -- Documents (Routes to /dashboard)
    ('📄 Important: Insurance Policy Required', 'Please upload your renter''s insurance policy by November 15th to maintain compliance.', 'document_received', 'Documents', 'high'),
    
    -- Appointments (Routes to /dashboard)
    ('🏠 Annual Inspection Next Week', 'Your annual unit inspection is scheduled for Monday, October 28th at 10:00 AM. Please be available.', 'appointment_scheduled', 'Appointments', 'high'),
    
    -- Portfolio (Routes to /dashboard)
    ('👥 Team Invitation', 'You''ve been invited to join the Harbor View Properties team. Accept to collaborate on portfolio management.', 'portfolio_invite', 'Portfolio', 'medium'),
    
    -- System (Routes to /dashboard)
    ('🔔 New Feature: Mobile App Updates', 'Check out our new mobile app with enhanced payment tracking and maintenance request photos!', 'system', 'System', 'low')
) AS notification(title, description, type, category, priority)