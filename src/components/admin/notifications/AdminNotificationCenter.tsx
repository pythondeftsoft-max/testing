import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationTypeAnalytics } from '@/hooks/useNotificationTypeAnalytics';
import { NotificationStatsPanel } from './NotificationStatsPanel';
import { NotificationTypeCard } from './NotificationTypeCard';
import { Search, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const AdminNotificationCenter = () => {
  const { data: stats, isLoading } = useNotificationTypeAnalytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [linkFilter, setLinkFilter] = useState<'all' | 'with-link' | 'no-link'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'never_sent'>('all');

  const tenantStats = useMemo(() => {
    if (!stats) return [];
    return stats.filter((s) => s.userType === 'tenant');
  }, [stats]);

  const landlordStats = useMemo(() => {
    if (!stats) return [];
    return stats.filter((s) => s.userType === 'landlord');
  }, [stats]);

  const filterStats = (statsArray: typeof stats) => {
    if (!statsArray) return [];
    
    let filtered = statsArray;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply link filter
    if (linkFilter === 'with-link') {
      filtered = filtered.filter((s) => s.linkStatus === 'valid');
    } else if (linkFilter === 'no-link') {
      filtered = filtered.filter((s) => s.linkStatus === 'missing');
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((s) => s.status === 'active');
    } else if (statusFilter === 'never_sent') {
      filtered = filtered.filter((s) => s.status === 'never_sent');
    }

    return filtered;
  };

  const filteredTenantStats = filterStats(tenantStats);
  const filteredLandlordStats = filterStats(landlordStats);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Center</h1>
        <p className="text-muted-foreground">
          Monitor and manage all notification types across the platform
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notification types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="never_sent">Never Sent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={linkFilter} onValueChange={(v: any) => setLinkFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Links</SelectItem>
            <SelectItem value="with-link">With Links</SelectItem>
            <SelectItem value="no-link">Missing Links</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="tenant" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tenant">
            Tenant Notifications ({tenantStats.length})
          </TabsTrigger>
          <TabsTrigger value="landlord">
            Landlord Notifications ({landlordStats.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="space-y-6">
          <NotificationStatsPanel stats={filteredTenantStats} userType="tenant" />
          
          {filteredTenantStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No tenant notifications found matching your filters
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTenantStats.map((stat) => (
                <NotificationTypeCard key={stat.type} stat={stat} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="landlord" className="space-y-6">
          <NotificationStatsPanel stats={filteredLandlordStats} userType="landlord" />
          
          {filteredLandlordStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No landlord notifications found matching your filters
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLandlordStats.map((stat) => (
                <NotificationTypeCard key={stat.type} stat={stat} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
