import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getNotificationLink, VALID_NOTIFICATION_ROUTES } from '@/utils/notificationLinks';
import { getLandlordNotificationLink, VALID_LANDLORD_NOTIFICATION_ROUTES } from '@/utils/landlordNotificationLinks';
import { useNotificationConfigurations } from './useNotificationConfiguration';

export interface NotificationTypeStats {
  type: string;
  category: string | null;
  total_count: number;
  unread_count: number;
  no_link_count: number;
  last_24h: number;
  last_sent: string | null;
  examples: Array<{
    id: string;
    title: string;
    description: string;
    link: string | null;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    created_at: string;
    read: boolean;
    action_type?: string;
    action_data?: any;
  }>;
  route?: string;
  linkStatus: 'valid' | 'missing' | 'unknown';
  userType: 'tenant' | 'landlord';
  status: 'active' | 'never_sent';
}

// Helper function to infer category from notification type
const inferCategory = (type: string, route: string): string | null => {
  // Check type name patterns
  if (type.includes('maintenance')) return 'Maintenance';
  if (type.includes('payment') || type.includes('rent')) return 'Payment';
  if (type.includes('lease') || type.includes('contract')) return 'Lease';
  if (type.includes('application')) return 'Application';
  if (type.includes('appointment')) return 'Appointment';
  if (type.includes('message')) return 'Messages';
  if (type.includes('document')) return 'Documents';
  if (type.includes('property')) return 'Property';
  if (type.includes('portfolio') || type.includes('account') || type.includes('invite')) return 'Account';
  if (type.includes('points') || type.includes('reward') || type.includes('referral')) return 'Points & Rewards';
  if (type === 'info' || type === 'system') return 'General';
  
  // Check route patterns
  if (route.includes('maintenance')) return 'Maintenance';
  if (route.includes('payment') || route.includes('rent')) return 'Payment';
  if (route.includes('lease')) return 'Lease';
  if (route.includes('application')) return 'Application';
  if (route.includes('appointment')) return 'Appointment';
  if (route.includes('message')) return 'Messages';
  if (route.includes('document')) return 'Documents';
  if (route.includes('property')) return 'Property';
  if (route.includes('portfolio')) return 'Account';
  
  return 'General';
}

export const useNotificationTypeAnalytics = () => {
  const { data: customConfigs } = useNotificationConfigurations();

  return useQuery({
    queryKey: ['notification-type-analytics', customConfigs],
    queryFn: async () => {
      // Create master list of all possible notification types from code
      const allTenantTypes = Object.keys(VALID_NOTIFICATION_ROUTES);
      const allLandlordTypes = Object.keys(VALID_LANDLORD_NOTIFICATION_ROUTES);
      
      // Get all notifications from database
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, category, title, description, link, read, created_at, user_id, priority, action_type, action_data')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group database notifications by type
      const dbTypeMap = new Map<string, any[]>();
      data?.forEach((notification) => {
        const type = notification.type;
        if (!dbTypeMap.has(type)) {
          dbTypeMap.set(type, []);
        }
        dbTypeMap.get(type)!.push(notification);
      });

      const allStats: NotificationTypeStats[] = [];

      // Process tenant notification types
      allTenantTypes.forEach((type) => {
        let route = getNotificationLink(type);
        
        // Check for custom config
        const customConfig = customConfigs?.find(
          c => c.notification_type === type && c.user_type === 'tenant'
        );
        
        if (customConfig?.custom_link) {
          route = customConfig.custom_link;
        }
        
        const dbNotifications = dbTypeMap.get(type) || [];
        const hasData = dbNotifications.length > 0;
        
        // Get category from first notification or infer it
        const category = hasData 
          ? dbNotifications[0].category 
          : inferCategory(type, route);
        
        const linkStatus = route === '/dashboard' && type !== 'info' && type !== 'system' 
          ? 'missing' 
          : 'valid';

        const stat: NotificationTypeStats = {
          type,
          category,
          total_count: dbNotifications.length,
          unread_count: 0,
          no_link_count: 0,
          last_24h: 0,
          last_sent: null,
          examples: [],
          route,
          linkStatus,
          userType: 'tenant',
          status: hasData ? 'active' : 'never_sent',
        };

        // Calculate stats from database if exists
        if (hasData) {
          const now = new Date();
          dbNotifications.forEach((notification) => {
            if (!notification.read) stat.unread_count++;
            if (!notification.link) stat.no_link_count++;
            
            const createdAt = new Date(notification.created_at);
            const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff <= 24) stat.last_24h++;
            
            if (!stat.last_sent || createdAt > new Date(stat.last_sent)) {
              stat.last_sent = notification.created_at;
            }

            // Add to examples (keep only first 5)
            if (stat.examples.length < 5) {
              stat.examples.push({
                id: notification.id,
                title: notification.title,
                description: notification.description,
                link: notification.link,
                type: notification.type,
                priority: (notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
                category: notification.category || category || 'General',
                created_at: notification.created_at,
                read: notification.read,
                action_type: notification.action_type,
                action_data: notification.action_data,
              });
            }
          });
        }

        allStats.push(stat);
      });

      // Process landlord notification types
      allLandlordTypes.forEach((type) => {
        let route = getLandlordNotificationLink(type);
        
        // Check for custom config
        const customConfig = customConfigs?.find(
          c => c.notification_type === type && c.user_type === 'landlord'
        );
        
        if (customConfig?.custom_link) {
          route = customConfig.custom_link;
        }
        
        const dbNotifications = dbTypeMap.get(type) || [];
        const hasData = dbNotifications.length > 0;
        
        // Get category from first notification or infer it
        const category = hasData 
          ? dbNotifications[0].category 
          : inferCategory(type, route);
        
        const linkStatus = route === '/dashboard' && type !== 'info' && type !== 'system' && type !== 'account_invite'
          ? 'missing' 
          : 'valid';

        const stat: NotificationTypeStats = {
          type,
          category,
          total_count: dbNotifications.length,
          unread_count: 0,
          no_link_count: 0,
          last_24h: 0,
          last_sent: null,
          examples: [],
          route,
          linkStatus,
          userType: 'landlord',
          status: hasData ? 'active' : 'never_sent',
        };

        // Calculate stats from database if exists
        if (hasData) {
          const now = new Date();
          dbNotifications.forEach((notification) => {
            if (!notification.read) stat.unread_count++;
            if (!notification.link) stat.no_link_count++;
            
            const createdAt = new Date(notification.created_at);
            const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff <= 24) stat.last_24h++;
            
            if (!stat.last_sent || createdAt > new Date(stat.last_sent)) {
              stat.last_sent = notification.created_at;
            }

            // Add to examples (keep only first 5)
            if (stat.examples.length < 5) {
              stat.examples.push({
                id: notification.id,
                title: notification.title,
                description: notification.description,
                link: notification.link,
                type: notification.type,
                priority: (notification.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
                category: notification.category || category || 'General',
                created_at: notification.created_at,
                read: notification.read,
                action_type: notification.action_type,
                action_data: notification.action_data,
              });
            }
          });
        }

        allStats.push(stat);
      });

      // Sort by user type, status, category, then type
      return allStats.sort((a, b) => {
        // First by user type
        if (a.userType !== b.userType) {
          return a.userType === 'tenant' ? -1 : 1;
        }
        // Then by status (active first)
        if (a.status !== b.status) {
          return a.status === 'active' ? -1 : 1;
        }
        // Then by category
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        // Finally by type
        return a.type.localeCompare(b.type);
      });
    },
  });
};

