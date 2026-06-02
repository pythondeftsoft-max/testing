import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, User, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';

interface ActivityLogEntry {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: any;
  new_values: any;
  notes: string | null;
  created_at: string;
}

interface ActivityLogProps {
  userId: string;
}

export function ActivityLog({ userId }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
  }, [userId]);

  useEffect(() => {
    applyFilters();
  }, [activities, searchTerm, filterType, filterAction]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = activities;

    // Filter by entity type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.entity_type === filterType);
    }

    // Filter by action
    if (filterAction !== 'all') {
      filtered = filtered.filter(activity => activity.action === filterAction);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.entity_type.toLowerCase().includes(term) ||
        activity.action.toLowerCase().includes(term) ||
        (activity.notes && activity.notes.toLowerCase().includes(term)) ||
        activity.entity_id.includes(term)
      );
    }

    setFilteredActivities(filtered);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'success';
      case 'updated':
        return 'default';
      case 'deleted':
        return 'destructive';
      case 'allocated':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'deposits':
        return 'Deposit';
      case 'deposit_allocations':
        return 'Allocation';
      case 'payouts':
        return 'Payout';
      default:
        return entityType;
    }
  };

  const formatActivityDescription = (activity: ActivityLogEntry) => {
    const entityLabel = getEntityTypeLabel(activity.entity_type);
    
    switch (activity.action) {
      case 'created':
        if (activity.entity_type === 'deposits' && activity.new_values?.amount) {
          return `Created ${entityLabel.toLowerCase()} of ${formatCurrency(activity.new_values.amount)}`;
        }
        if (activity.entity_type === 'deposit_allocations' && activity.new_values?.amount) {
          return `Created ${entityLabel.toLowerCase()} of ${formatCurrency(activity.new_values.amount)}`;
        }
        return `Created ${entityLabel.toLowerCase()}`;
        
      case 'updated':
        const changes = [];
        if (activity.old_values && activity.new_values) {
          // Compare key fields
          if (activity.old_values.amount !== activity.new_values.amount) {
            changes.push(`amount: ${formatCurrency(activity.old_values.amount)} → ${formatCurrency(activity.new_values.amount)}`);
          }
          if (activity.old_values.status !== activity.new_values.status) {
            changes.push(`status: ${activity.old_values.status} → ${activity.new_values.status}`);
          }
        }
        return changes.length > 0 
          ? `Updated ${entityLabel.toLowerCase()}: ${changes.join(', ')}`
          : `Updated ${entityLabel.toLowerCase()}`;
          
      case 'deleted':
        return `Deleted ${entityLabel.toLowerCase()}`;
        
      case 'allocated':
        return `Allocated ${entityLabel.toLowerCase()}`;
        
      default:
        return `${activity.action} ${entityLabel.toLowerCase()}`;
    }
  };

  const uniqueTypes = Array.from(new Set(activities.map(a => a.entity_type)));
  const uniqueActions = Array.from(new Set(activities.map(a => a.action)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Log
        </CardTitle>
        
        {/* Filters */}
        <div className="flex gap-4 pt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {getEntityTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading activity log...</p>
        ) : filteredActivities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {activities.length === 0 
              ? "No activity recorded yet" 
              : "No activities match your filters"
            }
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(activity.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeColor(activity.action)}>
                      {activity.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{getEntityTypeLabel(activity.entity_type)}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {activity.entity_id.slice(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm">{formatActivityDescription(activity)}</p>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {activity.notes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}