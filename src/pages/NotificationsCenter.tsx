import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, CheckCheck, Archive, Clock, MoreVertical, Filter } from 'lucide-react';
import { useNotifications, useNotificationMutations, SNOOZE_OPTIONS } from '@/hooks/useNotifications';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const NotificationsCenter: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    read: searchParams.get('read') === 'false' ? false : searchParams.get('read') === 'true' ? true : undefined,
    includeArchived: searchParams.get('includeArchived') === 'true',
    search: '',
  });

  const { ref, inView } = useInView();
  const { unreadCount } = useNotificationCount();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useNotifications(20, filters);

  const {
    markRead,
    markUnread,
    archive,
    unarchive,
    snooze,
    markAllAsRead,
    clearOld
  } = useNotificationMutations();

  const notifications = data?.pages.flatMap(page => page.notifications) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  // Load more when in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.read !== undefined) params.set('read', filters.read.toString());
    if (filters.includeArchived) params.set('includeArchived', 'true');
    if (search) params.set('search', search);
    setSearchParams(params);
  }, [filters, search, setSearchParams]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  }, [selectedIds.length, notifications]);

  const handleSelectNotification = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selected => selected !== id)
        : [...prev, id]
    );
  }, []);

  const handleBulkAction = useCallback(async (action: string, params?: any) => {
    if (selectedIds.length === 0) return;

    try {
      switch (action) {
        case 'markRead':
          await markRead.mutateAsync(selectedIds);
          break;
        case 'markUnread':
          await markUnread.mutateAsync(selectedIds);
          break;
        case 'archive':
          await archive.mutateAsync(selectedIds);
          break;
        case 'unarchive':
          await unarchive.mutateAsync(selectedIds);
          break;
        case 'snooze':
          await snooze.mutateAsync({ ids: selectedIds, minutes: params.minutes });
          break;
      }
      setSelectedIds([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  }, [selectedIds, markRead, markUnread, archive, unarchive, snooze]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => markAllAsRead.mutateAsync(filters)}
                disabled={markAllAsRead.isPending}
                variant="outline"
                size="sm"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => clearOld.mutateAsync(90)}>
                    Clear Old (90+ days)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => refetch()}>
                    Refresh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.read === undefined ? '' : filters.read.toString()}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  read: value === '' ? undefined : value === 'true' 
                }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="false">Unread</SelectItem>
                  <SelectItem value="true">Read</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-archived"
                  checked={filters.includeArchived}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeArchived: checked }))}
                />
                <Label htmlFor="include-archived">Include archived</Label>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('markRead')}
                  >
                    Mark Read
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('markUnread')}
                  >
                    Mark Unread
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('archive')}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Clock className="h-4 w-4 mr-1" />
                        Snooze
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {SNOOZE_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.minutes}
                          onClick={() => handleBulkAction('snooze', { minutes: option.minutes })}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          )}

          {/* Header Checkbox */}
          {notifications.length > 0 && (
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                checked={selectedIds.length === notifications.length}
                onCheckedChange={handleSelectAll}
                aria-label="Select all notifications"
              />
              <span className="text-sm text-muted-foreground">
                Select all ({totalCount} total)
              </span>
            </div>
          )}

          <Separator />

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filters.search || filters.type || filters.read !== undefined ? 
                  'No notifications match your filters' : 
                  'No notifications yet'
                }
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={cn(
                      "p-4 cursor-pointer transition-colors",
                      !notification.read && "bg-muted/30",
                      notification.archived_at && "opacity-60",
                      selectedIds.includes(notification.id) && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.includes(notification.id)}
                        onCheckedChange={() => handleSelectNotification(notification.id)}
                        className="mt-1"
                      />
                      <div className="text-lg">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{notification.title}</h4>
                          {!notification.read && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              New
                            </Badge>
                          )}
                          {notification.archived_at && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Archived
                            </Badge>
                          )}
                          {notification.snoozed_until && new Date(notification.snoozed_until) > new Date() && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              <Clock className="h-3 w-3 mr-1" />
                              Snoozed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Infinite scroll trigger */}
                {hasNextPage && (
                  <div ref={ref} className="flex justify-center py-4">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};