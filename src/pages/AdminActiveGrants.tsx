import React, { useState } from 'react';
import { useAccessGrants } from '@/hooks/useAccessGrants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Clock, User, Search, Filter, AlertTriangle, Download } from 'lucide-react';
import { useActiveGrantsRealtime } from '@/hooks/useActiveGrantsRealtime';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function AdminActiveGrants() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [revokeReason, setRevokeReason] = useState('');
  const [selectedGrantId, setSelectedGrantId] = useState<string>('');

  const { grants, isLoading, revokeGrant } = useAccessGrants(undefined, true);
  
  // Enable realtime updates
  useActiveGrantsRealtime();

  const activeGrants = grants?.filter(grant => !grant.revoked_at) || [];

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const minutes = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60));
    
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const getMinutesUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60));
  };

  const filteredGrants = activeGrants?.filter(grant => {
    const matchesSearch = !searchTerm || 
      grant.user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grant.user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grant.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grant.object_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    
    if (expiryFilter === 'all') return true;
    
    const minutes = getMinutesUntilExpiry(grant.expires_at);
    
    switch (expiryFilter) {
      case '1h':
        return minutes <= 60;
      case '6h':
        return minutes <= 360;
      case '24h':
        return minutes <= 1440;
      default:
        return true;
    }
  }) || [];

  const handleRevoke = async () => {
    if (!selectedGrantId) return;
    
    try {
      await revokeGrant.mutateAsync({
        grantId: selectedGrantId,
        reason: revokeReason || undefined,
      });
      setSelectedGrantId('');
      setRevokeReason('');
      toast.success('Grant revoked successfully');
    } catch (error) {
      console.error('Failed to revoke grant:', error);
    }
  };

  const exportToCSV = () => {
    if (!filteredGrants.length) {
      toast.error('No grants to export');
      return;
    }

    const headers = ['User Email', 'Object', 'Action', 'Scope', 'Portfolio ID', 'Expires At', 'Time Until Expiry', 'Request ID'];
    const rows = filteredGrants.map(grant => [
      grant.user?.email || 'Unknown',
      grant.object_name,
      grant.action,
      grant.scope,
      grant.portfolio_id || 'N/A',
      new Date(grant.expires_at).toLocaleString(),
      getTimeUntilExpiry(grant.expires_at),
      grant.request_id || 'N/A'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `active-grants-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Grants exported to CSV');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Grants</h1>
          <p className="text-muted-foreground">
            Manage temporary access grants across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">
            {filteredGrants?.length || 0} filtered grants
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Active Access Grants
              </CardTitle>
              <CardDescription>
                Manage temporary access grants across the platform
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users or permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grants</SelectItem>
                  <SelectItem value="1h">Expiring in 1h</SelectItem>
                  <SelectItem value="6h">Expiring in 6h</SelectItem>
                  <SelectItem value="24h">Expiring in 24h</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Badge variant="secondary">
                {filteredGrants.length} grant{filteredGrants.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !filteredGrants || filteredGrants.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Active Grants</h3>
              <p className="text-muted-foreground">
                {searchTerm || expiryFilter !== 'all' 
                  ? 'No grants match your current filters' 
                  : 'There are no active access grants at the moment'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrants.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {grant.user.first_name} {grant.user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {grant.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{grant.object_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {grant.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge variant={grant.scope === 'account' ? 'default' : 'secondary'}>
                          {grant.scope}
                        </Badge>
                        {grant.portfolio && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {grant.portfolio.name}
                          </p>
                        )}
                        {grant.request_id && (
                          <Badge variant="outline" className="text-xs mt-1">
                            via request
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {grant.granter?.first_name} {grant.granter?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(grant.created_at), { addSuffix: true })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Badge 
                          variant={getMinutesUntilExpiry(grant.expires_at) <= 60 ? "destructive" : "secondary"}
                        >
                          {getTimeUntilExpiry(grant.expires_at)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGrantId(grant.id)}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Access Grant</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke this access grant for{' '}
                              <strong>{grant.user.first_name} {grant.user.last_name}</strong>?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Reason (optional)</label>
                              <Textarea
                                placeholder="Explain why this grant is being revoked..."
                                value={revokeReason}
                                onChange={(e) => setRevokeReason(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {
                              setRevokeReason('');
                              setSelectedGrantId('');
                            }}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleRevoke}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke Grant
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}