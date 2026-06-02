import { mockAdminUsers } from './adminMocks';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_type: 'tenant' | 'landlord' | 'admin' | 'owner';
  activity_type: 'login' | 'logout' | 'points_earned' | 'profile_update' | 
                 'role_change' | 'security_alert' | 'session_terminated' | 
                 'failed_login' | 'mfa_verified' | 'referral_sent' | 'admin_action';
  description: string;
  details: {
    ip_address?: string;
    device?: string;
    location?: string;
    browser?: string;
    os?: string;
    points?: number;
    old_value?: string;
    new_value?: string;
    [key: string]: any;
  };
  risk_score: number;
  status: 'success' | 'failed' | 'warning' | 'suspicious';
  session_id?: string;
}

const activityTypes = [
  'login', 'logout', 'points_earned', 'profile_update', 
  'role_change', 'security_alert', 'session_terminated', 
  'failed_login', 'mfa_verified', 'referral_sent', 'admin_action'
] as const;

const devices = [
  'iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Pro', 'Windows PC', 
  'iPad Air', 'Android Tablet', 'Desktop', 'Laptop'
];

const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Brave'];
const oses = ['iOS 17', 'Android 14', 'macOS 14', 'Windows 11', 'Linux'];

const locations = [
  'New York, US', 'Los Angeles, US', 'Chicago, US', 'Houston, US',
  'Phoenix, US', 'San Francisco, US', 'Seattle, US', 'Miami, US',
  'Boston, US', 'Denver, US'
];

const ipAddresses = [
  '192.168.1.', '10.0.0.', '172.16.0.', '198.51.100.'
];

const generateRandomIP = () => {
  const prefix = ipAddresses[Math.floor(Math.random() * ipAddresses.length)];
  return `${prefix}${Math.floor(Math.random() * 255)}`;
};

const generateActivityDescription = (type: string, userName: string): string => {
  switch (type) {
    case 'login':
      return `${userName} logged in successfully`;
    case 'logout':
      return `${userName} logged out`;
    case 'points_earned':
      return `${userName} earned points for referral activity`;
    case 'profile_update':
      return `${userName} updated their profile information`;
    case 'role_change':
      return `${userName}'s role was updated by admin`;
    case 'security_alert':
      return `Suspicious login attempt detected for ${userName}`;
    case 'session_terminated':
      return `Session terminated for ${userName}`;
    case 'failed_login':
      return `Failed login attempt for ${userName}`;
    case 'mfa_verified':
      return `${userName} completed MFA verification`;
    case 'referral_sent':
      return `${userName} sent a referral invitation`;
    case 'admin_action':
      return `${userName} performed an admin action`;
    default:
      return `${userName} performed an action`;
  }
};

const generateRiskScore = (type: string): number => {
  switch (type) {
    case 'security_alert':
    case 'failed_login':
      return Math.floor(Math.random() * 40) + 60; // 60-100
    case 'session_terminated':
      return Math.floor(Math.random() * 20) + 50; // 50-70
    case 'login':
      return Math.floor(Math.random() * 30); // 0-30
    case 'mfa_verified':
      return Math.floor(Math.random() * 10); // 0-10
    default:
      return Math.floor(Math.random() * 40); // 0-40
  }
};

const generateStatus = (type: string): 'success' | 'failed' | 'warning' | 'suspicious' => {
  switch (type) {
    case 'security_alert':
      return 'suspicious';
    case 'failed_login':
      return 'failed';
    case 'session_terminated':
      return 'warning';
    default:
      return 'success';
  }
};

const generateDetails = (type: string) => {
  const details: ActivityEvent['details'] = {
    ip_address: generateRandomIP(),
    device: devices[Math.floor(Math.random() * devices.length)],
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    os: oses[Math.floor(Math.random() * oses.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
  };

  switch (type) {
    case 'points_earned':
      details.points = Math.floor(Math.random() * 50) + 10;
      details.reason = 'Referral completed';
      break;
    case 'profile_update':
      details.fields_updated = ['phone_number', 'address'];
      break;
    case 'role_change':
      details.old_value = 'tenant';
      details.new_value = 'landlord';
      break;
    case 'referral_sent':
      details.recipient_email = 'friend@example.com';
      break;
  }

  return details;
};

const generateTimestamp = (daysAgo: number, hourOffset: number = 0): string => {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  now.setHours(now.getHours() - hourOffset);
  now.setMinutes(Math.floor(Math.random() * 60));
  return now.toISOString();
};

export const generateMockActivities = (count: number = 100): ActivityEvent[] => {
  const activities: ActivityEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const user = mockAdminUsers[Math.floor(Math.random() * mockAdminUsers.length)];
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const daysAgo = Math.floor(Math.random() * 7); // Last 7 days
    const hourOffset = Math.floor(Math.random() * 24);
    
    // More activity during business hours (9am-5pm)
    const hour = new Date().getHours() - hourOffset;
    const isBusinessHours = hour >= 9 && hour <= 17;
    
    // Skip some non-business hour activities to make it more realistic
    if (!isBusinessHours && Math.random() > 0.3) {
      continue;
    }
    
    const riskScore = generateRiskScore(activityType);
    
    activities.push({
      id: `activity-${i}-${Date.now()}`,
      timestamp: generateTimestamp(daysAgo, hourOffset),
      user_id: user.id,
      user_name: `${user.first_name} ${user.last_name}`,
      user_email: user.email,
      user_type: user.user_type as 'tenant' | 'landlord' | 'admin' | 'owner',
      activity_type: activityType,
      description: generateActivityDescription(activityType, `${user.first_name} ${user.last_name}`),
      details: generateDetails(activityType),
      risk_score: riskScore,
      status: generateStatus(activityType),
      session_id: activityType.includes('login') || activityType === 'logout' 
        ? `session-${Math.random().toString(36).substr(2, 9)}` 
        : undefined,
    });
  }
  
  // Sort by timestamp descending (newest first)
  return activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

// Pre-generate activities
export const mockActivities = generateMockActivities(150);

// Helper functions
export const getActiveSessionsCount = (): number => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return mockActivities.filter(
    a => a.activity_type === 'login' && new Date(a.timestamp) > fifteenMinutesAgo
  ).length;
};

export const getTodaySessionsCount = (): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return mockActivities.filter(
    a => (a.activity_type === 'login' || a.activity_type === 'logout') && 
         new Date(a.timestamp) >= today
  ).length;
};

export const getHighRiskSessionsCount = (): number => {
  return mockActivities.filter(a => a.risk_score > 50 && a.status !== 'failed').length;
};

export const getSecurityAlertsCount = (): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return mockActivities.filter(
    a => (a.activity_type === 'security_alert' || a.activity_type === 'failed_login') && 
         new Date(a.timestamp) >= today
  ).length;
};

export const getRecentActionsCount = (): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return mockActivities.filter(a => new Date(a.timestamp) >= today).length;
};

export const getPeakActivityHour = (): string => {
  const hourCounts: { [hour: number]: number } = {};
  
  mockActivities.forEach(activity => {
    const hour = new Date(activity.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  if (!peakHour) return 'N/A';
  
  const hour = parseInt(peakHour);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  
  return `${displayHour}:00 ${period}`;
};
