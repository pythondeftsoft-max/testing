-- Add 4 missing email templates

-- 1. Password Reset Template
INSERT INTO email_templates (
  name,
  slug,
  audience,
  category,
  subject_template,
  preheader,
  html_template,
  default_cta_text,
  default_cta_url,
  is_active
) VALUES (
  'Password Reset Email',
  'password_reset',
  'all',
  'authentication',
  'Reset Your OpenKey Housing Password',
  'Reset your password to regain access to your account',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Oxygen-Sans,Ubuntu,Cantarell,''Helvetica Neue'',sans-serif;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <div style="text-align: center; margin: 0 0 40px;">
      <img src="https://openkeyhousing.com/logo.png" width="150" height="50" alt="OpenKey Housing" style="margin: 0 auto;">
    </div>
    <h1 style="color: #333; font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; padding: 0;">Reset Your Password</h1>
    <p style="color: #333; font-size: 14px; line-height: 24px; margin: 16px 0;">Hello {{userName}},</p>
    <p style="color: #333; font-size: 14px; line-height: 24px; margin: 16px 0;">We received a request to reset your password for your OpenKey Housing account. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{resetLink}}" style="background-color: #007ee6; border-radius: 6px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 20px;">Reset Password</a>
    </div>
    <p style="color: #333; font-size: 14px; line-height: 24px; margin: 16px 0;">If the button doesn''t work, you can copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #666; line-height: 20px; word-break: break-all; margin: 16px 0;">
      <a href="{{resetLink}}" style="color: #007ee6; text-decoration: underline;">{{resetLink}}</a>
    </p>
    <p style="color: #333; font-size: 14px; line-height: 24px; margin: 16px 0;">This link will expire in 24 hours for security purposes.</p>
    <p style="color: #333; font-size: 14px; line-height: 24px; margin: 16px 0;">If you didn''t request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    <div style="border-top: 1px solid #e6ebf1; margin: 32px 0;"></div>
    <p style="color: #8898aa; font-size: 12px; line-height: 16px; text-align: center; margin: 8px 0;">
      Need help? Contact us at <a href="mailto:{{supportEmail}}" style="color: #007ee6; text-decoration: underline;">{{supportEmail}}</a>
    </p>
    <p style="color: #8898aa; font-size: 12px; line-height: 16px; text-align: center; margin: 8px 0;">OpenKey Housing - Property Management Made Simple</p>
  </div>
</body>
</html>',
  'Reset Password',
  '{{resetLink}}',
  true
);

-- 2. Portfolio Invitation Template
INSERT INTO email_templates (
  name,
  slug,
  audience,
  category,
  subject_template,
  preheader,
  html_template,
  default_cta_text,
  default_cta_url,
  is_active
) VALUES (
  'Portfolio Team Invitation',
  'portfolio_invitation',
  'landlord',
  'team_management',
  'You''re invited to join the "{{portfolioName}}" portfolio team',
  'Join the portfolio management team',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🏢 Portfolio Team Invitation</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Join the portfolio management team</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; margin-bottom: 20px;">Hello,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>{{inviterName}}</strong> has invited you to join the management team for the portfolio: 
      <strong>"{{portfolioName}}"</strong>
    </p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #495057; margin: 0 0 15px 0;">🎯 Your Role: {{roleLabel}}</h3>
      <p style="margin: 0; color: #495057; font-size: 14px;">
        {{roleDescription}}
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{invitationUrl}}" 
         style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                color: white; 
                text-decoration: none; 
                padding: 15px 30px; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px; 
                display: inline-block;
                box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);">
        Accept Invitation & Join Portfolio
      </a>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1976d2;">
        <strong>💡 Next Steps:</strong> Click the button above to create your OpenKey account or sign in to access the portfolio management tools.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
    
    <p style="font-size: 14px; color: #666; text-align: center;">
      Questions? Reply to this email or contact our support team.<br>
      This invitation was sent by {{inviterName}} for the "{{portfolioName}}" portfolio.
    </p>
  </div>
</body>
</html>',
  'Accept Invitation & Join Portfolio',
  '{{invitationUrl}}',
  true
);

-- 3. Account Invitation Resend Template
INSERT INTO email_templates (
  name,
  slug,
  audience,
  category,
  subject_template,
  preheader,
  html_template,
  default_cta_text,
  default_cta_url,
  is_active
) VALUES (
  'Account Invitation Resend',
  'account_invitation_resend',
  'all',
  'administration',
  'Reminder: Your account invitation',
  'Your pending account invitation',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, ''Segoe UI'', Roboto, Ubuntu, Cantarell, sans-serif; color: #1f2937; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">You have a pending account invitation</h2>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5;">{{inviterName}} has invited you with role: <strong>{{role}}</strong>.</p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #6b7280;">This is a reminder that your invitation is still pending.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{inviteUrl}}" style="background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        ⏰ <strong>Expires:</strong> {{expiresAt}}
      </p>
    </div>
    
    <p style="margin: 20px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">
      If you didn''t expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>',
  'Accept Invitation',
  '{{inviteUrl}}',
  true
);

-- 4. Newsletter Welcome Template
INSERT INTO email_templates (
  name,
  slug,
  audience,
  category,
  subject_template,
  preheader,
  html_template,
  default_cta_text,
  default_cta_url,
  is_active
) VALUES (
  'Newsletter Welcome Email',
  'newsletter_welcome',
  'all',
  'newsletter',
  'Welcome to OpenKey Newsletter! 🏠',
  'Thank you for subscribing to our newsletter',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h1 style="color: #2563eb; font-size: 28px; margin-bottom: 20px; text-align: center;">
        Welcome to OpenKey! 🏠
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Thank you for subscribing to the OpenKey Newsletter! You''re now part of our community of real estate professionals, landlords, and tenants who stay ahead of the market.
      </p>
      
      <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">What to expect:</h3>
        <ul style="color: #333; line-height: 1.8;">
          <li>Weekly market insights and trends</li>
          <li>Section 8 and rental housing updates</li>
          <li>Property management tips and tools</li>
          <li>Investment opportunities and strategies</li>
          <li>Exclusive access to platform features</li>
        </ul>
      </div>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
        Our next newsletter goes out this week, so keep an eye on your inbox! In the meantime, feel free to explore our platform and see how we''re connecting Section 8 voucher holders with quality housing.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://openkey.com" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Visit OpenKey Platform
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
        You''re receiving this because you signed up for the OpenKey Newsletter.<br>
        If you no longer wish to receive these emails, you can unsubscribe at any time.
      </p>
      
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          © 2024 OpenKey. All rights reserved.<br>
          Connecting communities, unlocking opportunities.
        </p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Visit OpenKey Platform',
  'https://openkey.com',
  true
);