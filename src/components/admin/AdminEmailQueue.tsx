
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useEmailStats, useProcessEmails } from '@/hooks/useEmailQueue';
import EmailQueueTable from './EmailQueueTable';

const AdminEmailQueue = () => {
  const { data: emailStats, isLoading: statsLoading } = useEmailStats();
  const processEmailsMutation = useProcessEmails();

  const handleProcessEmails = () => {
    processEmailsMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Email Queue Management</span>
          </CardTitle>
          <CardDescription>Monitor and process email notifications with real-time updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-card border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-warning" />
                <p className="text-sm font-medium">Pending</p>
              </div>
              <p className="text-2xl font-bold text-warning">
                {statsLoading ? '...' : emailStats?.pending || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <p className="text-sm font-medium">Sent</p>
              </div>
              <p className="text-2xl font-bold text-success">
                {statsLoading ? '...' : emailStats?.sent || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm font-medium">Failed</p>
              </div>
              <p className="text-2xl font-bold text-destructive">
                {statsLoading ? '...' : emailStats?.failed || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Total</p>
              </div>
              <p className="text-2xl font-bold">
                {statsLoading ? '...' : emailStats?.total || 0}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleProcessEmails}
              disabled={processEmailsMutation.isPending || !emailStats?.pending}
              className="flex-1"
            >
              {processEmailsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {processEmailsMutation.isPending 
                ? 'Processing Emails...' 
                : `Process ${emailStats?.pending || 0} Pending Emails`
              }
            </Button>
            
            <Button variant="outline" disabled>
              <Mail className="w-4 h-4 mr-2" />
              Compile Digests
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmailQueueTable />
    </div>
  );
};

export default AdminEmailQueue;
