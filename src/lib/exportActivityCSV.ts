import { format } from 'date-fns';
import type { ActivityFeedItem, ActivityTrackerFilters } from '@/hooks/useActivityTrackerData';

export const exportActivityToCSV = (
  activities: ActivityFeedItem[],
  filters: ActivityTrackerFilters
) => {
  const csvRows = [
    ['Date', 'Time', 'Worker', 'Role', 'Entity Type', 'Entity Name', 'From Stage', 'To Stage', 'Points', 'Direction', 'Territory', 'Notes'],
    ...activities.map(a => [
      format(new Date(a.created_at), 'yyyy-MM-dd'),
      format(new Date(a.created_at), 'HH:mm:ss'),
      a.worker_name,
      a.changed_by_type === 'system' || !a.metadata?.actor_role 
        ? 'System'
        : a.metadata.actor_role.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      a.entity_type.charAt(0).toUpperCase() + a.entity_type.slice(1),
      a.entity_name,
      a.from_stage || 'N/A',
      a.to_stage,
      a.points_earned.toFixed(2),
      a.is_forward_move ? 'Forward' : 'Backward',
      a.territory_name || 'N/A',
      (a.notes || '').replace(/,/g, ';') // Escape commas
    ])
  ];
  
  const csvContent = csvRows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `worker-activity-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};
