import { supabase } from '@/integrations/supabase/client';

interface NotificationParams {
  applicationId: string;
  tenantId: string;
  propertyId: string;
  matchScore?: number;
  assignedWorkerId?: string;
}

/**
 * Creates in-app and email notifications when an application is created
 */
export const notifyApplicationCreated = async ({
  applicationId,
  tenantId,
  propertyId,
  matchScore,
}: NotificationParams): Promise<void> => {
  try {
    // Fetch property details for notifications
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('address, monthly_rent, bedrooms, bathrooms, owner_id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('Error fetching property for notifications:', propertyError);
      return;
    }

    // Fetch tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Error fetching tenant for notifications:', tenantError);
      return;
    }

    const tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'A tenant';

    // Create notifications in parallel
    await Promise.all([
      // Notify tenant
      createTenantNotification(tenantId, property, applicationId, matchScore),
      // Notify property owner
      createOwnerNotification(property.owner_id, property, applicationId, tenantName),
      // Queue tenant email
      queueTenantEmail(tenantId, tenant.email, property, applicationId, matchScore),
      // Queue owner email
      queueOwnerEmail(property.owner_id, property, applicationId, tenantName),
    ]);

    console.log('Application notifications sent successfully');
  } catch (error) {
    console.error('Error sending application notifications:', error);
    // Don't throw - notifications should not block application creation
  }
};

/**
 * Creates in-app notification for tenant
 */
const createTenantNotification = async (
  tenantId: string,
  property: any,
  applicationId: string,
  matchScore?: number
): Promise<void> => {
  const { error } = await supabase.from('notifications').insert({
    user_id: tenantId,
    title: '🎉 Property Match Found!',
    description: `We've submitted your application for ${property.address}${matchScore ? ` (${matchScore}% match score)` : ''}. Check your applications to see the details.`,
    type: 'success',
    link: '/applications',
    category: 'application',
    related_entity_type: 'property_application',
    related_entity_id: applicationId,
  });

  if (error) {
    console.error('Error creating tenant notification:', error);
  }
};

/**
 * Creates in-app notification for property owner
 */
const createOwnerNotification = async (
  ownerId: string,
  property: any,
  applicationId: string,
  tenantName: string
): Promise<void> => {
  if (!ownerId) return;

  const { error } = await supabase.from('notifications').insert({
    user_id: ownerId,
    title: '📋 New Application Received',
    description: `${tenantName} has submitted an application for ${property.address}. Review the application in your dashboard.`,
    type: 'info',
    link: `/landlord/applications/${applicationId}`,
    category: 'application',
    related_entity_type: 'property_application',
    related_entity_id: applicationId,
  });

  if (error) {
    console.error('Error creating owner notification:', error);
  }
};

/**
 * Queues email notification for tenant
 */
const queueTenantEmail = async (
  tenantId: string,
  tenantEmail: string | null,
  property: any,
  applicationId: string,
  matchScore?: number
): Promise<void> => {
  if (!tenantEmail) return;

  const subject = 'Great News! We Found You a Property Match';
  const body = `
    <h2>Congratulations!</h2>
    <p>We've found a great property match for you and submitted your application.</p>
    
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3>Property Details</h3>
      <p><strong>Address:</strong> ${property.address}</p>
      <p><strong>Rent:</strong> $${property.monthly_rent?.toLocaleString() || 'N/A'}/month</p>
      <p><strong>Bedrooms:</strong> ${property.bedrooms || 'N/A'} | <strong>Bathrooms:</strong> ${property.bathrooms || 'N/A'}</p>
      ${matchScore ? `<p><strong>Match Score:</strong> ${matchScore}%</p>` : ''}
    </div>
    
    <p>The property owner will review your application and get back to you soon.</p>
    <p><strong>Next Steps:</strong> Keep an eye on your email for updates from the property owner.</p>
  `;

  const { error } = await supabase.from('email_queue').insert({
    user_id: tenantId,
    to_email: tenantEmail,
    subject,
    body,
    link: `${window.location.origin}/applications`,
    audience: 'tenant',
    template_slug: 'application-created-tenant',
    category: 'application',
    metadata: {
      application_id: applicationId,
      property_id: property.id,
      property_address: property.address,
      match_score: matchScore,
    },
  });

  if (error) {
    console.error('Error queuing tenant email:', error);
  }
};

/**
 * Queues email notification for property owner
 */
const queueOwnerEmail = async (
  ownerId: string,
  property: any,
  applicationId: string,
  tenantName: string
): Promise<void> => {
  if (!ownerId) return;

  // Fetch owner email
  const { data: owner, error: ownerError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', ownerId)
    .single();

  if (ownerError || !owner?.email) return;

  const subject = `New Tenant Application for ${property.address}`;
  const body = `
    <h2>New Application Received</h2>
    <p>You have received a new tenant application for your property.</p>
    
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3>Property</h3>
      <p><strong>Address:</strong> ${property.address}</p>
      <p><strong>Rent:</strong> $${property.monthly_rent?.toLocaleString() || 'N/A'}/month</p>
      
      <h3 style="margin-top: 20px;">Applicant</h3>
      <p><strong>Name:</strong> ${tenantName}</p>
    </div>
    
    <p><strong>Action Required:</strong> Review the application and contact the tenant to proceed.</p>
  `;

  const { error } = await supabase.from('email_queue').insert({
    user_id: ownerId,
    to_email: owner.email,
    subject,
    body,
    link: `${window.location.origin}/landlord/applications/${applicationId}`,
    audience: 'landlord',
    template_slug: 'application-received-owner',
    category: 'application',
    metadata: {
      application_id: applicationId,
      property_id: property.id,
      property_address: property.address,
      tenant_name: tenantName,
    },
  });

  if (error) {
    console.error('Error queuing owner email:', error);
  }
};

/**
 * Notifies tenant when their application is denied
 */
export const notifyApplicationDenied = async (
  applicationId: string,
  tenantId: string,
  propertyId: string
): Promise<void> => {
  try {
    // Fetch property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('address, monthly_rent')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('Error fetching property for denial notification:', propertyError);
      return;
    }

    // Fetch tenant email
    const { data: tenant, error: tenantError } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Error fetching tenant for denial notification:', tenantError);
      return;
    }

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: tenantId,
      title: '❌ Application Update',
      description: `Your application for ${property.address} was not selected. Keep looking - we'll help you find the right place!`,
      type: 'info',
      link: '/applications',
      category: 'application',
      related_entity_type: 'property_application',
      related_entity_id: applicationId,
    });

    // Queue email notification
    if (tenant.email) {
      const subject = `Application Update - ${property.address}`;
      const body = `
        <h2>Application Status Update</h2>
        <p>Hi ${tenant.first_name || 'there'},</p>
        
        <p>Thank you for your interest in <strong>${property.address}</strong>.</p>
        
        <p>Unfortunately, your application was not selected for this property. We understand this can be disappointing, but don't give up! There are many great properties available.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>💡 Next Steps:</strong></p>
          <ul style="margin: 10px 0 0 0;">
            <li>Continue browsing available properties</li>
            <li>Make sure your profile is complete and up-to-date</li>
            <li>Apply to multiple properties to increase your chances</li>
          </ul>
        </div>
        
        <p>Keep searching - the right home is out there!</p>
        
        <p>Best regards,<br>The OpenKey Team</p>
      `;

      await supabase.from('email_queue').insert({
        user_id: tenantId,
        to_email: tenant.email,
        subject,
        body,
        link: `${window.location.origin}/applications`,
        audience: 'tenant',
        template_slug: 'application-denied',
        category: 'application',
        metadata: {
          application_id: applicationId,
          property_id: propertyId,
          property_address: property.address,
        },
      });
    }

    console.log('Application denial notification sent successfully');
  } catch (error) {
    console.error('Error sending application denial notification:', error);
    // Don't throw - notifications should not block the denial process
  }
};
