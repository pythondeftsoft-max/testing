interface NotificationTrigger {
  trigger: string;
  testData: {
    title: string;
    description: string;
    type: 'success' | 'info' | 'warning' | 'error';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
}

export const TENANT_NOTIFICATION_TRIGGERS: Record<string, NotificationTrigger> = {
  // Lease notifications
  'lease_renewal': {
    trigger: 'When landlord sends a lease renewal offer',
    testData: {
      title: 'Lease Renewal Offer Received',
      description: 'Your landlord has sent you a lease renewal offer for 123 Demo St. Review and respond by the deadline.',
      type: 'info',
      priority: 'high'
    }
  },
  
  // Maintenance notifications
  'maintenance_completed': {
    trigger: 'When maintenance work is marked as complete',
    testData: {
      title: 'Maintenance Completed',
      description: 'The maintenance work has been completed. Please verify and confirm.',
      type: 'success'
    }
  },
  
  // Payment notifications
  'payment_due': {
    trigger: 'When rent payment is due today',
    testData: {
      title: 'Rent Payment Due',
      description: 'Your rent payment of $1,500 is due today.',
      type: 'error',
      priority: 'urgent'
    }
  },
  'payment_overdue': {
    trigger: 'When rent payment is past due',
    testData: {
      title: 'Payment Overdue',
      description: 'Your rent payment of $1,500 is overdue. Please pay immediately.',
      type: 'error',
      priority: 'urgent'
    }
  },
  
  // Application notifications
  'application_approved': {
    trigger: 'When landlord approves your application',
    testData: {
      title: 'Application Approved! 🎉',
      description: 'Congratulations! Your application for 123 Demo St has been approved.',
      type: 'success',
      priority: 'high'
    }
  },
  'application_rejected': {
    trigger: 'When landlord rejects your application',
    testData: {
      title: 'Application Update',
      description: 'Unfortunately, your application was not selected for 123 Demo St.',
      type: 'info'
    }
  },
  'application_credits_refreshed': {
    trigger: 'When your weekly application credits are automatically refreshed (every 7 days)',
    testData: {
      title: '✨ Application Credits Refreshed!',
      description: 'Your 5 free application credits have been refreshed for this week.',
      type: 'success'
    }
  },
  
  // Messages
  'message_received': {
    trigger: 'When landlord sends you a message',
    testData: {
      title: 'New Message from Landlord',
      description: 'You have a new message regarding your property.',
      type: 'info'
    }
  },
  
  // Points & Rewards
  'points_awarded': {
    trigger: 'When you reach a 2000-point milestone (2000, 4000, 6000, etc.)',
    testData: {
      title: '🎉 Milestone Reached!',
      description: 'Congratulations! You\'ve earned 2,000 points total!',
      type: 'success',
      priority: 'high'
    }
  },
  'referral_reward': {
    trigger: 'When a referral reward becomes available to claim (after referred tenant stays housed for 60 days)',
    testData: {
      title: '🎉 Referral Reward Available!',
      description: 'Congratulations! Your $100 referral reward is now available to claim.',
      type: 'success',
      priority: 'high'
    }
  },
  
  // Appointments
  'appointment_scheduled': {
    trigger: 'When a property viewing is scheduled',
    testData: {
      title: 'Appointment Scheduled',
      description: 'Your property viewing at 123 Demo St is scheduled for tomorrow at 2:00 PM.',
      type: 'info',
      priority: 'high'
    }
  },
  'appointment_cancelled': {
    trigger: 'When a scheduled property viewing is cancelled by landlord or property manager',
    testData: {
      title: '❌ Appointment Cancelled',
      description: 'Your property viewing at 123 Demo St scheduled for tomorrow at 2:00 PM has been cancelled. You can schedule a new viewing anytime.',
      type: 'warning',
      priority: 'high'
    }
  },

  // Admin Communications
  'admin_message': {
    trigger: 'When an administrator sends you a direct message',
    testData: {
      title: '📬 New Message from OpenKey',
      description: 'You have a new message from the OpenKey admin team. Check your admin messages for important updates.',
      type: 'info',
      priority: 'normal'
    }
  },

  // Property Matches
  'property_match': {
    trigger: 'When an admin pushes a property match to you',
    testData: {
      title: 'New Property Match!',
      description: 'We found a property for you at 123 Demo St. Tap to review!',
      type: 'success',
      priority: 'high'
    }
  },
};

export const LANDLORD_NOTIFICATION_TRIGGERS: Record<string, NotificationTrigger> = {
  // Applications
  'application_received': {
    trigger: 'When a tenant submits an application for your property',
    testData: {
      title: '📋 New Application Received',
      description: 'John Doe has submitted an application for 123 Demo St.',
      type: 'info',
      priority: 'high'
    }
  },
  
  // Maintenance
  'maintenance_request_received': {
    trigger: 'When a tenant submits a maintenance request',
    testData: {
      title: '🔧 New Maintenance Request',
      description: 'Tenant at 123 Demo St has reported: Leaking faucet in bathroom.',
      type: 'warning',
      priority: 'high'
    }
  },
  
  // Payments
  'payment_received': {
    trigger: 'When a tenant makes a rent payment',
    testData: {
      title: '💰 Payment Received',
      description: 'Rent payment of $1,500 received from John Doe for 123 Demo St.',
      type: 'success'
    }
  },
  
  // Lease renewals
  'lease_expiring_soon': {
    trigger: 'When a lease is expiring within 60 days',
    testData: {
      title: 'Lease Expiring Soon',
      description: 'The lease for 123 Demo St expires in 45 days. Consider sending a renewal offer.',
      type: 'warning',
      priority: 'high'
    }
  },
  'lease_renewal_request': {
    trigger: 'When a tenant in one of their properties requests a lease renewal',
    testData: {
      title: '📋 Lease Renewal Request',
      description: 'John Doe has requested to renew their lease at 123 Demo St.',
      type: 'info',
      priority: 'high'
    }
  },
  'lease_renewal_declined': {
    trigger: 'When tenant declines your lease renewal offer',
    testData: {
      title: 'Lease Renewal Declined',
      description: 'John Doe has declined the lease renewal offer for 123 Demo St.',
      type: 'warning'
    }
  },
  'lease_contract_signed': {
    trigger: 'When tenant signs a lease contract',
    testData: {
      title: '📝 Contract Signed',
      description: 'John Doe has signed the lease contract for 123 Demo St.',
      type: 'success'
    }
  },
  
  // Property Limits
  'property_limit_warning': {
    trigger: 'When approaching property limit for your plan',
    testData: {
      title: '⚠️ Property Limit Warning',
      description: 'You have 2 properties remaining in your current plan.',
      type: 'warning'
    }
  },
  
  // Messages
  'message_received': {
    trigger: 'When a tenant sends you a message',
    testData: {
      title: '💬 New Message from Tenant',
      description: 'You have a new message from John Doe regarding 123 Demo St.',
      type: 'info'
    }
  },
  'admin_message': {
    trigger: 'When an admin sends you a message',
    testData: {
      title: '📧 Message from Admin',
      description: 'You have a new message from the OpenKey team.',
      type: 'info',
      priority: 'high'
    }
  },
  
  // Appointments
  'appointment_reminder': {
    trigger: 'When you have an upcoming property viewing appointment',
    testData: {
      title: '📅 Appointment Reminder',
      description: 'You have a property viewing scheduled today at 2:00 PM for 123 Demo St.',
      type: 'info',
      priority: 'high'
    }
  },
  
  // Portfolio & Account Management
  'portfolio_invite': {
    trigger: 'When someone invites you to join their portfolio team',
    testData: {
      title: '👥 Team Invitation',
      description: 'You\'ve been invited to join the Harbor View Properties team. Accept to collaborate and manage properties together.',
      type: 'info',
      priority: 'high'
    }
  },
  'account_invite': {
    trigger: 'When someone invites you to create a landlord account',
    testData: {
      title: '🎉 Account Invitation',
      description: 'You\'ve been invited to join OpenKey as a property manager. Complete your registration to get started.',
      type: 'info',
      priority: 'high'
    }
  },
  
  // Points & Rewards
  'portfolio_points': {
    trigger: 'Every 10,000 points earned from tenants',
    testData: {
      title: '🎉 Portfolio Milestone Achieved',
      description: 'Your portfolio has earned 10,000 points! Check your points dashboard to see the breakdown.',
      type: 'success',
      priority: 'high'
    }
  },
};
