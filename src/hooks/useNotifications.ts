import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationFilters {
  type?: string;
  read?: boolean;
  includeArchived?: boolean;
  search?: string;
}

export interface SnoozeOption {
  label: string;
  minutes: number;
}

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: '1 day', minutes: 1440 },
];

const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

export const useNotifications = (
  pageSize: number = 20,
  filters: NotificationFilters = {}
) => {
  const { toast } = useToast();

  const fetchNotifications = async ({ pageParam = 0 }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile to check user type
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter out "info" and "system" notifications for tenant users
    if (profile?.user_type === 'tenant') {
      query = query.not('type', 'in', '("info","system")');
    }

    // Apply filters
    if (!filters.includeArchived) {
      query = query.is('archived_at', null);
    }

    if (filters.read !== undefined) {
      query = query.eq('read', filters.read);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    // Handle snoozed notifications
    query = query.or('snoozed_until.is.null,snoozed_until.lte.' + new Date().toISOString());

    // Apply search
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply pagination
    const start = pageParam * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return {
      notifications: data || [],
      nextCursor: data && data.length === pageSize ? pageParam + 1 : null,
      hasMore: data && data.length === pageSize,
      totalCount: count || 0,
    };
  };

  const infiniteQuery = useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'list', filters],
    queryFn: fetchNotifications,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 30000,
  });

  return infiniteQuery;
};

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['notification-count'] });
  };

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNotifications();
      toast({
        title: 'Success',
        description: 'Notifications marked as read',
      });
    },
    onError: (error) => {
      console.error('Error marking notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      });
    },
  });

  const markUnread = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: false })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNotifications();
      toast({
        title: 'Success',
        description: 'Notifications marked as unread',
      });
    },
    onError: (error) => {
      console.error('Error marking notifications as unread:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as unread',
        variant: 'destructive',
      });
    },
  });

  const archive = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ archived_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNotifications();
      toast({
        title: 'Success',
        description: 'Notifications archived',
      });
    },
    onError: (error) => {
      console.error('Error archiving notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive notifications',
        variant: 'destructive',
      });
    },
  });

  const unarchive = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ archived_at: null })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNotifications();
      toast({
        title: 'Success',
        description: 'Notifications unarchived',
      });
    },
    onError: (error) => {
      console.error('Error unarchiving notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to unarchive notifications',
        variant: 'destructive',
      });
    },
  });

  const snooze = useMutation({
    mutationFn: async ({ ids, minutes }: { ids: string[]; minutes: number }) => {
      const snoozedUntil = new Date();
      snoozedUntil.setMinutes(snoozedUntil.getMinutes() + minutes);

      const { error } = await supabase
        .from('notifications')
        .update({ snoozed_until: snoozedUntil.toISOString() })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, { minutes }) => {
      invalidateNotifications();
      const duration = minutes < 60 ? `${minutes} minutes` : 
                      minutes === 60 ? '1 hour' : 
                      minutes === 240 ? '4 hours' : 
                      minutes === 1440 ? '1 day' : `${minutes} minutes`;
      toast({
        title: 'Success',
        description: `Notifications snoozed for ${duration}`,
      });
    },
    onError: (error) => {
      console.error('Error snoozing notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to snooze notifications',
        variant: 'destructive',
      });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async (filters: NotificationFilters = {}) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // Apply same filters as the list
      if (!filters.includeArchived) {
        query = query.is('archived_at', null);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      // Handle snoozed notifications
      query = query.or('snoozed_until.is.null,snoozed_until.lte.' + new Date().toISOString());

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNotifications();
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    },
  });

  const clearOld = useMutation({
    mutationFn: async (days: number = 90) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { error } = await supabase
        .from('notifications')
        .update({ archived_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate.toISOString())
        .is('archived_at', null);

      if (error) throw error;
    },
    onSuccess: (_, days) => {
      invalidateNotifications();
      toast({
        title: 'Success',
        description: `Notifications older than ${days} days have been archived`,
      });
    },
    onError: (error) => {
      console.error('Error clearing old notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear old notifications',
        variant: 'destructive',
      });
    },
  });

  return {
    markRead,
    markUnread,
    archive,
    unarchive,
    snooze,
    markAllAsRead,
    clearOld,
  };
};