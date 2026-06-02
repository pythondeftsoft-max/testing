
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Filter, Download, Clock, User, Activity, Users } from 'lucide-react';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PortfolioAuditLogProps {
  portfolioId: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'points_awarded' | 'points_distributed' | 'points_adjusted';
  user: string;
  details: string;
  points: number;
  status: 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

const PortfolioAuditLog = ({ portfolioId }: PortfolioAuditLogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const { portfolioPoints, loading: pointsLoading } = usePortfolioPoints(portfolioId);

  // Fetch portfolio user points (distributions)
  const { data: userPoints, isLoading: distributionsLoading } = useQuery({
    queryKey: ['portfolio-user-points-audit', portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('portfolio_user_points')
        .select(`
          *,
          profiles!portfolio_user_points_user_id_fkey(first_name, last_name),
          portfolio_points!portfolio_user_points_portfolio_points_id_fkey(source_event_type),
          profiles!portfolio_user_points_distributed_by_fkey(first_name, last_name)
        `);
      
      // Only filter by portfolio_id if not showing "everything"
      if (portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId,
  });

  const loading = pointsLoading || distributionsLoading;

  // Convert portfolio points to audit entries (awards to portfolio)
  const awardEntries: AuditEntry[] = portfolioPoints?.map(point => ({
    id: `award-${point.id}`,
    timestamp: point.created_at,
    action: 'points_awarded' as const,
    user: point.processed_by || 'System',
    details: `Awarded ${point.points_awarded} points to portfolio for ${point.source_event_type.replace(/_/g, ' ')}`,
    points: point.points_awarded,
    status: 'success' as const,
    metadata: { 
      eventType: point.source_event_type,
      propertyId: point.property_id,
      tenantId: point.tenant_id,
      notes: point.notes,
      type: 'award'
    }
  })) || [];

  // Convert user points to audit entries (distributions to team members)
  const distributionEntries: AuditEntry[] = userPoints?.map(point => {
    const recipientName = point.profiles?.first_name 
      ? `${point.profiles.first_name} ${point.profiles.last_name || ''}`.trim()
      : 'Unknown User';
    const distributorName = point.profiles?.first_name
      ? `${point.profiles.first_name} ${point.profiles.last_name || ''}`.trim()
      : 'System';
    
    return {
      id: `dist-${point.id}`,
      timestamp: point.created_at,
      action: 'points_distributed' as const,
      user: distributorName,
      details: `Distributed ${point.points_awarded} points to ${recipientName}`,
      points: point.points_awarded,
      status: 'success' as const,
      metadata: {
        userId: point.user_id,
        recipientName,
        distributorName,
        portfolioPointsId: point.portfolio_points_id,
        eventType: point.portfolio_points?.source_event_type,
        type: 'distribution'
      }
    };
  }) || [];

  // Combine and sort all audit entries chronologically
  const auditEntries: AuditEntry[] = [...awardEntries, ...distributionEntries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    const matchesAction = filterAction === 'all' || entry.action === filterAction;
    
    return matchesSearch && matchesStatus && matchesAction;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'points_awarded':
        return 'Points Awarded';
      case 'points_distributed':
        return 'Points Distributed';
      case 'points_adjusted':
        return 'Points Adjusted';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const exportAuditLog = () => {
    // Placeholder for export functionality
    console.log('Exporting audit log...');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-500" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-500" />
              Audit Log
            </CardTitle>
            <CardDescription>
              Complete audit trail of all portfolio points activities
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportAuditLog}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search audit log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="points_awarded">Points Awarded</SelectItem>
              <SelectItem value="points_distributed">Points Distributed</SelectItem>
              <SelectItem value="points_adjusted">Points Adjusted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Entries */}
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No audit entries found</p>
              {searchTerm && (
                <p className="text-sm">Try adjusting your search criteria</p>
              )}
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center mt-1">
                  {entry.action === 'points_distributed' ? (
                    <Users className="w-4 h-4 text-blue-500" />
                  ) : (
                    getStatusIcon(entry.status)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          entry.action === 'points_distributed' 
                            ? 'border-blue-500 text-blue-600' 
                            : 'border-green-500 text-green-600'
                        }`}
                      >
                        {getActionLabel(entry.action)}
                      </Badge>
                      <span className={`text-sm font-medium ${
                        entry.action === 'points_distributed' 
                          ? 'text-blue-600' 
                          : 'text-green-600'
                      }`}>
                        {entry.action === 'points_distributed' ? '→' : '+'}{entry.points} pts
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground mb-1">{entry.details}</p>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="w-3 h-3 mr-1" />
                    <span>{entry.user === 'System' ? 'Automated System' : entry.user}</span>
                    {entry.metadata?.eventType && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Event: {entry.metadata.eventType.replace(/_/g, ' ')}</span>
                      </>
                    )}
                    {entry.metadata?.recipientName && (
                      <>
                        <span className="mx-2">•</span>
                        <span>To: {entry.metadata.recipientName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredEntries.filter(e => e.status === 'success').length}
            </div>
            <div className="text-xs text-muted-foreground">Successful Actions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredEntries.filter(e => e.status === 'warning').length}
            </div>
            <div className="text-xs text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredEntries.filter(e => e.status === 'error').length}
            </div>
            <div className="text-xs text-muted-foreground">Errors</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioAuditLog;
