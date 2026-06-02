-- Insert System Admin Invitation email template
INSERT INTO email_templates (
  name,
  slug,
  audience,
  category,
  subject_template,
  preheader,
  html_template,
  is_active
) VALUES (
  'System Admin Invitation',
  'system_admin_invitation',
  'all',
  'administration',
  '{{inviter_name}} invited you to join as {{role}}',
  'You''ve been invited to become a System Administrator',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Admin Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                System Admin Invitation
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #1f2937;">
                Hello <strong>{{recipient_name}}</strong>,
              </p>

              <!-- Main Message -->
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #1f2937;">
                <strong>{{inviter_name}}</strong> has invited you to join as a <strong>{{role}}</strong> for the system. This role will grant you administrative access to manage and oversee key operations.
              </p>

              <!-- Information Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Role</p>
                          <p style="margin: 4px 0 0; font-size: 16px; color: #1f2937; font-weight: 600;">{{role}}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Invited By</p>
                          <p style="margin: 4px 0 0; font-size: 16px; color: #1f2937; font-weight: 600;">{{inviter_name}}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Invitation Expires</p>
                          <p style="margin: 4px 0 0; font-size: 16px; color: #1f2937; font-weight: 600;">{{expires_date}} at {{expires_time}}</p>
                        </td>
                      </tr>
                      {{notes_section}}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{accept_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                      <strong>⚠️ Security Notice:</strong> This invitation link will expire in 7 days. If you did not expect this invitation or believe it was sent in error, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer Message -->
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If you have any questions about this invitation, please contact the person who invited you.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                © 2025 OpenKey. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  true
);