-- Insert email template for lease renewal offers
INSERT INTO email_templates (
  slug,
  name,
  subject_template,
  html_template,
  is_active
) VALUES (
  'lease_renewal_offer_sent',
  'Lease Renewal Offer Sent',
  'New Lease Renewal Offer for {{property_address}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lease Renewal Offer</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">New Lease Renewal Offer</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 16px; line-height: 1.5;">Hi {{tenant_name}},</p>
              
              <p style="margin: 0 0 30px; color: #18181b; font-size: 16px; line-height: 1.5;">Your landlord has sent you a new lease renewal offer for:</p>
              
              <!-- Property Info -->
              <div style="background-color: #f4f4f5; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <p style="margin: 0; color: #3f3f46; font-size: 18px; font-weight: 600;">{{property_address}}</p>
              </div>
              
              <!-- Offer Details -->
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 20px; font-weight: 600;">Offer Details</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #71717a; font-size: 14px;">Current Rent</span>
                  </td>
                  <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #18181b; font-size: 16px; font-weight: 500;">${{current_rent}}/month</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #71717a; font-size: 14px;">New Rent</span>
                  </td>
                  <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #2563eb; font-size: 16px; font-weight: 600;">${{new_rent}}/month</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #71717a; font-size: 14px;">Current Lease Ends</span>
                  </td>
                  <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #18181b; font-size: 16px; font-weight: 500;">{{current_lease_end}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #71717a; font-size: 14px;">New Lease Ends</span>
                  </td>
                  <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="color: #2563eb; font-size: 16px; font-weight: 600;">{{proposed_lease_end}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #71717a; font-size: 14px;">Response Due Date</span>
                  </td>
                  <td align="right" style="padding: 12px 0;">
                    <span style="color: #dc2626; font-size: 16px; font-weight: 600;">{{response_due_date}}</span>
                  </td>
                </tr>
              </table>
              
              <!-- Notes (if provided) -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600; text-transform: uppercase;">Additional Notes from Your Landlord</h3>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">{{notes}}</p>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{view_link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">View Offer & Respond</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #71717a; font-size: 14px; line-height: 1.5;">Please review the offer carefully and respond by {{response_due_date}}. You can accept, decline, or negotiate the terms through your dashboard.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f4f4f5; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #71717a; font-size: 12px;">This is an automated notification from your property management system.</p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">If you have questions, please contact your landlord directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject_template = EXCLUDED.subject_template,
  html_template = EXCLUDED.html_template,
  is_active = EXCLUDED.is_active,
  updated_at = now();