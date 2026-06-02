import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActivityEvent {
  id: string;
  timestamp: string;
  userId: string;
  user_name: string;
  user_type: 'admin' | 'property_owner' | 'investor' | 'tenant' | 'user' | 'unknown';
  activity_type: string;
  description: string;
  device: string;
  browser: string;
  risk_score: number;
  risk_level: 'low' | 'high';
  status: 'success' | 'denied';
  route: string;
  portfolio_name?: string;
  metadata?: Record<string, any>;
}

export type ActivityTypeFilter = string | 'all';
export type TimeRangeFilter = 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d' | 'last_90d' | 'all';
export type UserTypeFilter = 'all' | 'tenant' | 'landlord' | 'admin' | 'owner';
export type RiskLevelFilter = 'all' | 'low' | 'medium' | 'high';
export type StatusFilter = 'all' | 'success' | 'failed' | 'warning' | 'suspicious';

interface ActivityFilters {
  activityType: ActivityTypeFilter;
  timeRange: TimeRangeFilter;
  userType: UserTypeFilter;
  riskLevel: RiskLevelFilter;
  status: StatusFilter;
  searchQuery: string;
}

export const useUserActivityFeed = () => {
  const [filters, setFilters] = useState<ActivityFilters>({
    activityType: 'all',
    timeRange: 'all',
    userType: 'all',
    riskLevel: 'all',
    status: 'all',
    searchQuery: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Convert time range filter to actual date range
  const getDateRange = (range: TimeRangeFilter): { startDate: string; endDate: string } => {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case 'last_hour':
        startDate.setHours(endDate.getHours() - 1);
        break;
      case 'last_24h':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'last_7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last_30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last_90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };

  // Fetch activities from unified database function
  const { data: allActivities = [], isLoading } = useQuery({
    queryKey: ['user-activity-feed', filters],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange(filters.timeRange);
      
      const { data, error } = await supabase.rpc('get_unified_activity_feed', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_activity_type: filters.activityType === 'all' ? null : filters.activityType,
        p_user_id: null,
        p_portfolio_id: null,
        p_search_query: filters.searchQuery || null,
        p_time_range: null
      });

      if (error) {
        console.error('Failed to fetch activity feed:', error);
        return [];
      }

      // Map database response to ActivityEvent format
      return (data || []).map((item: any) => {
        const userAgent = item.user_agent || '';
        
        // Parse device and browser from user agent
        const getDeviceFromUA = (ua: string) => {
          if (!ua) return 'Unknown';
          if (ua.includes('Mobile')) return 'Mobile';
          if (ua.includes('Tablet')) return 'Tablet';
          return 'Desktop';
        };
        
        const getBrowserFromUA = (ua: string) => {
          if (!ua) return 'Unknown';
          if (ua.includes('Chrome')) return 'Chrome';
          if (ua.includes('Firefox')) return 'Firefox';
          if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
          if (ua.includes('Edge')) return 'Edge';
          return 'Other';
        };

        return {
          id: item.id,
          timestamp: item.timestamp,
          userId: item.user_id,
          user_name: item.user_name,
          user_type: item.user_type || 'user',
          activity_type: item.activity_type,
          description: item.description,
          device: getDeviceFromUA(userAgent),
          browser: getBrowserFromUA(userAgent),
          risk_score: item.risk_score || 0,
          risk_level: item.risk_level || 'low',
          status: item.status || 'success',
          route: item.route || '',
          portfolio_name: item.portfolio_name,
          metadata: item.metadata || {}
        };
      }) as ActivityEvent[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // No client-side filtering needed - all filtering is done server-side
  const filteredActivities = allActivities;

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredActivities.slice(start, end);
  }, [filteredActivities, currentPage]);

  // Update filter
  const updateFilter = <K extends keyof ActivityFilters>(
    key: K,
    value: ActivityFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      activityType: 'all',
      timeRange: 'all',
      userType: 'all',
      riskLevel: 'all',
      status: 'all',
      searchQuery: '',
    });
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Timestamp',
      'User Name',
      'User Type',
      'Activity Type',
      'Description',
      'Status',
      'Risk Score',
      'Risk Level',
      'Device',
      'Browser',
      'Route',
      'Portfolio',
    ];

    const rows = filteredActivities.map(activity => [
      activity.timestamp,
      activity.user_name,
      activity.user_type,
      activity.activity_type,
      activity.description,
      activity.status,
      activity.risk_score.toString(),
      activity.risk_level,
      activity.device,
      activity.browser,
      activity.route,
      activity.portfolio_name || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user_activity_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    activities: paginatedActivities,
    allActivities: filteredActivities,
    isLoading,
    filters,
    updateFilter,
    resetFilters,
    currentPage,
    totalPages,
    setCurrentPage,
    totalCount: filteredActivities.length,
    exportToCSV,
  };
};
