-- Seed missing email templates for complete admin control

-- Maintenance Request Update Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template, 
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Maintenance Request Update',
  'maintenance_request_update',
  'tenant',
  'maintenance',
  'Maintenance Request Update: {{request_type}}',
  'Your maintenance request status has been updated',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Maintenance Request Update</h2>
    <p>Hello {{tenant_name}},</p>
    <p>Your maintenance request for <strong>{{request_type}}</strong> has been updated.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Status:</strong> {{status}}</p>
      <p><strong>Scheduled Date:</strong> {{scheduled_date}}</p>
      <p><strong>Notes:</strong> {{notes}}</p>
    </div>
    <p>If you have any questions, please contact your property manager.</p>
  </div>',
  'View Details',
  '{{request_link}}',
  true
);

-- Lease Renewal Reminder Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Lease Renewal Reminder',
  'lease_renewal_reminder',
  'tenant',
  'lease',
  'Lease Renewal Notice - {{days_remaining}} Days Remaining',
  'Your lease is coming up for renewal',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Lease Renewal Reminder</h2>
    <p>Hello {{tenant_name}},</p>
    <p>Your lease at <strong>{{property_address}}</strong> is expiring soon.</p>
    <div style="background: #fff4e6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
      <p><strong>Lease End Date:</strong> {{lease_end_date}}</p>
      <p><strong>Days Remaining:</strong> {{days_remaining}}</p>
    </div>
    <p>Please review your renewal options and let us know your decision.</p>
  </div>',
  'View Renewal Options',
  '{{renewal_terms_link}}',
  true
);

-- Housing Contract Available Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Housing Contract Available',
  'housing_contract_available',
  'tenant',
  'application',
  '🎉 Congratulations! Your Housing Contract is Ready',
  'Your housing application has been approved',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #10b981;">🎉 Congratulations, {{tenant_name}}!</h2>
    <p>Great news! Your housing contract for <strong>{{property_address}}</strong> is now ready for your signature.</p>
    <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p><strong>Property:</strong> {{property_address}}</p>
      <p><strong>Move-in Date:</strong> {{move_in_date}}</p>
      <p><strong>Monthly Rent:</strong> {{monthly_rent}}</p>
    </div>
    <p>Please review and sign your contract as soon as possible to secure your new home.</p>
  </div>',
  'Sign Contract Now',
  '{{contract_link}}',
  true
);

-- Asset Reminder Email Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Asset Reminder (Immediate)',
  'asset_reminder_immediate',
  'landlord',
  'financial',
  'Reminder: Update {{asset_name}} Information',
  'Action required for your asset',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Asset Update Reminder</h2>
    <p>Hello,</p>
    <p>This is a reminder to update information for your asset: <strong>{{asset_name}}</strong></p>
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p><strong>Reminder Type:</strong> {{reminder_type}}</p>
      <p><strong>Due Date:</strong> {{due_date}}</p>
      <p><strong>Property:</strong> {{property_address}}</p>
    </div>
    <p>Please take action to keep your records up to date.</p>
  </div>',
  'Update Asset',
  '{{asset_link}}',
  true
);

-- Asset Digest Email Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Asset Digest (Weekly)',
  'asset_digest_weekly',
  'landlord',
  'digest',
  'Weekly Asset Update Digest - {{week_range}}',
  'Your weekly summary of pending asset updates',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Weekly Asset Digest</h2>
    <p>Hello,</p>
    <p>Here is your weekly summary of asset reminders for {{week_range}}:</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Total Pending Reminders:</strong> {{total_count}}</p>
      <div style="margin-top: 15px;">
        {{reminders_list}}
      </div>
    </div>
    <p>Review your dashboard for complete details.</p>
  </div>',
  'View Dashboard',
  '{{dashboard_link}}',
  true
);

-- Welcome Email Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Welcome New User',
  'welcome_new_user',
  'all',
  'onboarding',
  'Welcome to OpenKey Housing! 🏠',
  'Get started with your new account',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #3b82f6;">Welcome to OpenKey Housing! 🏠</h2>
    <p>Hello {{user_name}},</p>
    <p>Welcome to OpenKey Housing! We are excited to have you join our platform as a <strong>{{user_type}}</strong>.</p>
    <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Here is what you can do next:</strong></p>
      <ul>
        <li>Complete your profile</li>
        <li>Browse available properties</li>
        <li>Set up your preferences</li>
        <li>Connect with property managers</li>
      </ul>
    </div>
    <p>If you need any help getting started, our support team is here to assist you.</p>
  </div>',
  'Get Started',
  '{{getting_started_link}}',
  true
);

-- Account Invitation Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Account Invitation',
  'account_invitation',
  'all',
  'account',
  'You have been invited to join {{company_name}} on OpenKey',
  'Accept your invitation to get started',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>You have been Invited!</h2>
    <p>Hello,</p>
    <p><strong>{{inviter_name}}</strong> has invited you to join <strong>{{company_name}}</strong> on OpenKey Housing.</p>
    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <p><strong>Invited Email:</strong> {{invitee_email}}</p>
      <p><strong>Invited By:</strong> {{inviter_name}}</p>
      <p><strong>Company:</strong> {{company_name}}</p>
    </div>
    <p>Click the button below to accept your invitation and create your account.</p>
  </div>',
  'Accept Invitation',
  '{{accept_link}}',
  true
);

-- Payment Confirmation Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Payment Confirmation',
  'payment_confirmation',
  'all',
  'payment',
  'Payment Received - {{amount}} for {{service_type}}',
  'Your payment has been processed successfully',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #10b981;">Payment Confirmed ✓</h2>
    <p>Hello {{user_name}},</p>
    <p>We have successfully received your payment.</p>
    <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p><strong>Amount:</strong> {{amount}}</p>
      <p><strong>Service:</strong> {{service_type}}</p>
      <p><strong>Payment Date:</strong> {{payment_date}}</p>
      <p><strong>Transaction ID:</strong> {{transaction_id}}</p>
    </div>
    <p>Thank you for your payment. A receipt has been generated and is available for download.</p>
  </div>',
  'Download Receipt',
  '{{receipt_link}}',
  true
);

-- Application Status Update Template
INSERT INTO email_templates (
  name, slug, audience, category, subject_template, preheader, html_template,
  default_cta_text, default_cta_url, is_active
) VALUES (
  'Application Status Update',
  'application_status_update',
  'tenant',
  'application',
  'Application Update: {{property_address}}',
  'Your application status has changed',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Application Status Update</h2>
    <p>Hello {{tenant_name}},</p>
    <p>Your application for <strong>{{property_address}}</strong> has been updated.</p>
    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <p><strong>Property:</strong> {{property_address}}</p>
      <p><strong>Status:</strong> {{status}}</p>
      <p><strong>Updated:</strong> {{update_date}}</p>
    </div>
    <div style="background: #fefce8; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Next Steps:</strong></p>
      <p>{{next_steps}}</p>
    </div>
  </div>',
  'View Application',
  '{{application_link}}',
  true
);