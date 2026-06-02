import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserActivityStats {
  total_logins: number;
  messages_sent: number;
  properties_viewed: number;
  referrals_sent: number;
  points_earned_this_month: number;
  last_active: string | null;
}

export interface UserActivityEvent {
  id: string;
  type: 'login' | 'points_earned' | 'referral_sent' | 'profile_updated' | 'message_sent' | 'property_viewed';
  description: string;
  timestamp: string;
  details: string;
}

export const useAdminUserActivity = (userId: string) => {
  // Fetch activity stats
  const statsQuery = useQuery({
    queryKey: ['admin-user-activity-stats', userId],
    queryFn: async (): Promise<UserActivityStats> => {
      // Get referrals sent count
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', userId);

      if (referralsError) console.error('Error fetching referrals:', referralsError);

      // Get points earned this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: pointsData, error: pointsError } = await supabase
        .from('portfolio_user_points')
        .select('points_awarded')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      if (pointsError) console.error('Error fetching points:', pointsError);

      const pointsThisMonth = pointsData?.reduce((sum, p) => sum + (p.points_awarded || 0), 0) || 0;

      // Get profile for last active
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('updated_at, created_at')
        .eq('id', userId)
        .single();

      if (profileError) console.error('Error fetching profile:', profileError);

      // Get messages count (admin_messages where user is recipient or sender)
      const { data: messagesReceived, error: messagesReceivedError } = await supabase
        .from('admin_messages')
        .select('id')
        .eq('recipient_user_id', userId);

      if (messagesReceivedError) console.error('Error fetching messages received:', messagesReceivedError);

      const { data: messagesSent, error: messagesSentError } = await supabase
        .from('admin_messages')
        .select('id')
        .eq('admin_user_id', userId);

      if (messagesSentError) console.error('Error fetching messages sent:', messagesSentError);

      const totalMessages = (messagesReceived?.length || 0) + (messagesSent?.length || 0);

      return {
        total_logins: 0, // Not available without auth logs
        messages_sent: totalMessages,
        properties_viewed: 0, // Would need property_views table
        referrals_sent: referrals?.length || 0,
        points_earned_this_month: pointsThisMonth,
        last_active: profile?.updated_at || profile?.created_at || null,
      };
    },
    enabled: !!userId,
  });

  // Fetch recent activity events
  const activityQuery = useQuery({
    queryKey: ['admin-user-activity-events', userId],
    queryFn: async (): Promise<UserActivityEvent[]> => {
      const activities: UserActivityEvent[] = [];

      // Get recent points earned
      const { data: pointsData, error: pointsError } = await supabase
        .from('portfolio_user_points')
        .select('id, points_awarded, source_event_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!pointsError && pointsData) {
        pointsData.forEach((p) => {
          activities.push({
            id: `points_${p.id}`,
            type: 'points_earned',
            description: `Earned ${p.points_awarded} points`,
            timestamp: p.created_at,
            details: p.source_event_type || 'Points awarded',
          });
        });
      }

      // Get recent referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('id, referred_email, status, created_at')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!referralsError && referralsData) {
        referralsData.forEach((r) => {
          activities.push({
            id: `referral_${r.id}`,
            type: 'referral_sent',
            description: `Sent referral to ${r.referred_email || 'user'}`,
            timestamp: r.created_at,
            details: `Status: ${r.status}`,
          });
        });
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, 10);
    },
    enabled: !!userId,
  });

  return {
    stats: statsQuery.data,
    activities: activityQuery.data || [],
    isLoading: statsQuery.isLoading || activityQuery.isLoading,
    error: statsQuery.error || activityQuery.error,
  };
};
