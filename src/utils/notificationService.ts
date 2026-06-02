import { toast } from '@/hooks/use-toast';

interface NotificationOptions {
  title: string;
  description: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

export const showMaintenanceNotification = (options: NotificationOptions) => {
  const { title, description, type = 'info' } = options;
  
  const variant = type === 'error' ? 'destructive' : 'default';
  
  toast({
    title,
    description,
    variant,
  });
};

export const notifyNewMaintenanceRequest = (title: string, priority: string) => {
  showMaintenanceNotification({
    title: '🔧 New Maintenance Request',
    description: title + ' - Priority: ' + priority,
    type: 'info',
  });
};

export const notifyStatusUpdate = (status: string) => {
  showMaintenanceNotification({
    title: '📋 Status Updated',
    description: 'Request is now ' + status.replace('_', ' '),
    type: 'info',
  });
};

export const notifyVendorAssigned = (vendorName: string) => {
  showMaintenanceNotification({
    title: '👷 Vendor Assigned',
    description: vendorName + ' has been assigned to your request',
    type: 'info',
  });
};

export const notifyMaintenanceAppointmentScheduled = (date: string) => {
  showMaintenanceNotification({
    title: '📅 Appointment Scheduled',
    description: 'Maintenance appointment scheduled for ' + date,
    type: 'info',
  });
};

export const notifyRequestCompleted = () => {
  showMaintenanceNotification({
    title: '✅ Request Completed',
    description: 'Your maintenance request has been completed',
    type: 'success',
  });
};

export const notifyHighPriority = (title: string) => {
  showMaintenanceNotification({
    title: '🚨 High Priority Request',
    description: title,
    type: 'error',
  });
};

export const notifyAppointmentScheduled = (
  date: string, 
  time: string, 
  type: string,
  propertyAddress: string
) => {
  showMaintenanceNotification({
    title: '📅 Appointment Scheduled',
    description: `${type} appointment at ${propertyAddress} on ${date} at ${time}`,
    type: 'info',
  });
};

export const notifyAppointmentCancelled = (propertyAddress: string) => {
  showMaintenanceNotification({
    title: '❌ Appointment Cancelled',
    description: `Appointment at ${propertyAddress} has been cancelled`,
    type: 'warning',
  });
};

export const notifyAppointmentUpdated = (propertyAddress: string) => {
  showMaintenanceNotification({
    title: '📝 Appointment Updated',
    description: `Appointment at ${propertyAddress} has been updated`,
    type: 'info',
  });
};

export const notifyAppointmentConfirmed = (propertyAddress: string) => {
  showMaintenanceNotification({
    title: '✅ Appointment Confirmed',
    description: `Your appointment at ${propertyAddress} has been confirmed`,
    type: 'success',
  });
};

export const notifyAppointmentReminder = (
  timeUntil: string,
  appointmentTime: string,
  type: string,
  propertyAddress?: string
) => {
  showMaintenanceNotification({
    title: `⏰ Appointment in ${timeUntil}`,
    description: `${type} appointment${propertyAddress ? ' at ' + propertyAddress : ''} at ${appointmentTime}`,
    type: 'info',
  });
};

export const notifyTenantContractSigned = (
  tenantName: string,
  propertyAddress: string
) => {
  showMaintenanceNotification({
    title: '✍️ Lease Contract Signed',
    description: `${tenantName} has signed the lease renewal contract for ${propertyAddress}`,
    type: 'success',
  });
};

export const notifyContractFullyExecuted = (propertyAddress: string) => {
  showMaintenanceNotification({
    title: '🎉 Contract Completed',
    description: `Lease renewal contract for ${propertyAddress} is fully executed`,
    type: 'success',
  });
};
