-- Update the account_invitation email template with all necessary variables and improved HTML

UPDATE email_templates
SET 
  subject_template = 'You''re invited to join {{company_name}} as {{role}}',
  html_template = '
    <div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Account Invitation</h1>
      </div>
      
      <!-- Content -->
      <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #111827; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{recipient_name}}!</p>
        
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          <strong style="color: #111827;">{{inviter_name}}</strong> has invited you to join {{company_name}} with the role of <strong style="color: #667eea;">{{role}}</strong>.
        </p>
        
        {{#if notes}}
        <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #4b5563; font-size: 14px; margin: 0; font-style: italic;">
            <strong>Message from {{inviter_name}}:</strong><br>
            {{notes}}
          </p>
        </div>
        {{/if}}
        
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Click the button below to accept this invitation and get started:
        </p>
        
        <!-- CTA Button -->
        <div style="margin: 30px 0; text-align: center;">
          <a href="{{invitation_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
            Accept Invitation
          </a>
        </div>
        
        <!-- Invitation Details -->
        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 25px 0;">
          <p style="color: #111827; font-weight: 600; margin-top: 0; margin-bottom: 12px; font-size: 14px;">Invitation Details:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Role:</td>
              <td style="color: #111827; font-size: 14px; padding: 6px 0; font-weight: 500;">{{role}}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Expires:</td>
              <td style="color: #111827; font-size: 14px; padding: 6px 0; font-weight: 500;">{{expiration_date}}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Invited by:</td>
              <td style="color: #111827; font-size: 14px; padding: 6px 0; font-weight: 500;">{{inviter_name}}</td>
            </tr>
          </table>
        </div>
        
        <!-- Fallback Link -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 10px;">If the button doesn''t work, copy and paste this link:</p>
          <p style="word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #374151; margin: 0;">{{invitation_url}}</p>
        </div>
        
        <!-- Footer Note -->
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-top: 30px; margin-bottom: 0;">
          If you didn''t expect this invitation, you can safely ignore this email. This invitation will expire on {{expiration_date}}.
        </p>
      </div>
      
      <!-- Security Disclaimer -->
      <div style="margin-top: 20px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
          This is an automated invitation from {{company_name}}. Please do not reply to this email.
        </p>
      </div>
    </div>
  ',
  preheader = 'You''ve been invited to join {{company_name}} - Accept your invitation to get started',
  updated_at = now()
WHERE slug = 'account_invitation';