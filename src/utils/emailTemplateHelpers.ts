/**
 * Helper functions and constants for email template management
 */

export const EMAIL_TEMPLATE_SUGGESTIONS = {
  tenant_property_match: {
    name: 'Property Match (Tenant)',
    slug: 'tenant_property_match',
    description: 'Sent to tenants when an admin pushes a property match to them',
    subject_template: '🏠 New Property Match: {{property_address}}',
    variables: [
      'tenant_name',
      'property_address',
      'rent',
      'match_score',
      'admin_push_message'
    ],
    sample_html: `
      <h2>🏠 New Property Match!</h2>
      <p>Hello {{tenant_name}},</p>
      <p>Great news! A property has been specially matched to your preferences.</p>
      
      <h3>Property Details:</h3>
      <ul>
        <li><strong>Address:</strong> {{property_address}}</li>
        <li><strong>Monthly Rent:</strong> \${{rent}}</li>
        <li><strong>Match Score:</strong> {{match_score}}%</li>
      </ul>
      
      {{admin_push_message}}
      
      <p>Log in to your dashboard to view this property and apply!</p>
      
      <p>Best regards,<br>OpenKey Property Management</p>
    `
  },
  lease_renewal_accepted_landlord: {
    name: 'Lease Renewal Accepted (Landlord)',
    slug: 'lease_renewal_accepted_landlord',
    description: 'Sent to landlords when a tenant accepts a lease renewal offer',
    subject_template: '✅ Lease Renewal Accepted - {{property_address}}',
    variables: [
      'landlord_name',
      'property_address',
      'response_type',
      'current_rent',
      'new_rent',
      'lease_end_date',
      'proposed_end_date',
      'next_steps'
    ],
    sample_html: `
      <h2>Great News! Lease Renewal Accepted</h2>
      <p>Hello {{landlord_name}},</p>
      <p>Your tenant has <strong>accepted</strong> the lease renewal offer for <strong>{{property_address}}</strong>.</p>
      
      <h3>Renewal Details:</h3>
      <ul>
        <li><strong>Current Rent:</strong> {{current_rent}}</li>
        <li><strong>New Rent:</strong> {{new_rent}}</li>
        <li><strong>Current Lease End:</strong> {{lease_end_date}}</li>
        <li><strong>New Lease End:</strong> {{proposed_end_date}}</li>
      </ul>
      
      <h3>Next Steps:</h3>
      <p>{{next_steps}}</p>
      
      <p>You can review and sign the contract in your dashboard.</p>
      
      <p>Best regards,<br>OpenKey Property Management</p>
    `
  },
  lease_renewal_declined_landlord: {
    name: 'Lease Renewal Declined (Landlord)',
    slug: 'lease_renewal_declined_landlord',
    description: 'Sent to landlords when a tenant declines a lease renewal offer',
    subject_template: '❌ Lease Renewal Declined - {{property_address}}',
    variables: [
      'landlord_name',
      'property_address',
      'response_type',
      'current_rent',
      'new_rent',
      'lease_end_date',
      'proposed_end_date',
      'decline_reason',
      'next_steps'
    ],
    sample_html: `
      <h2>Lease Renewal Response Received</h2>
      <p>Hello {{landlord_name}},</p>
      <p>Your tenant has <strong>declined</strong> the lease renewal offer for <strong>{{property_address}}</strong>.</p>
      
      <h3>Renewal Details:</h3>
      <ul>
        <li><strong>Current Rent:</strong> {{current_rent}}</li>
        <li><strong>Offered Rent:</strong> {{new_rent}}</li>
        <li><strong>Current Lease End:</strong> {{lease_end_date}}</li>
        <li><strong>Proposed End:</strong> {{proposed_end_date}}</li>
      </ul>
      
      <h3>Tenant's Reason:</h3>
      <p style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>{{decline_reason}}</strong>
      </p>
      
      <h3>What You Can Do:</h3>
      <p>{{next_steps}}</p>
      <ul>
        <li>Review their feedback and consider sending a revised offer</li>
        <li>Reach out to discuss their concerns</li>
        <li>Start planning for a new tenant if needed</li>
      </ul>
      
      <p>You can send a new offer addressing their concerns through your dashboard.</p>
      
      <p>Best regards,<br>OpenKey Property Management</p>
    `
  }
};

export const getEmailTemplateSuggestion = (slug: string) => {
  return EMAIL_TEMPLATE_SUGGESTIONS[slug as keyof typeof EMAIL_TEMPLATE_SUGGESTIONS];
};

export const getAllEmailTemplateSuggestions = () => {
  return Object.values(EMAIL_TEMPLATE_SUGGESTIONS);
};
