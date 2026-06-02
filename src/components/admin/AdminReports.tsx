import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDown, Calendar, Users, Award, Gift } from 'lucide-react';
import { useAdminPointsLeaderboard } from '@/hooks/useAdminPointsAnalytics';
import { useAdminReferralsRecentActivity } from '@/hooks/useAdminReferralsAnalytics';
import { format } from 'date-fns';

interface ExportConfig {
  reportType: 'points-leaderboard' | 'referrals-activity';
  period: string;
  limit: number;
  startDate?: string;
  endDate?: string;
}

const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const AdminReports = () => {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    reportType: 'points-leaderboard',
    period: '30d',
    limit: 100,
  });

  const { data: pointsLeaderboard } = useAdminPointsLeaderboard(exportConfig.period, exportConfig.limit);
  const { data: referralsActivity } = useAdminReferralsRecentActivity(exportConfig.limit);

  const handleExport = () => {
    let data: any[] = [];
    let filename = '';

    switch (exportConfig.reportType) {
      case 'points-leaderboard':
        data = pointsLeaderboard?.map((item, idx) => ({
          rank: idx + 1,
          user_name: item.user_name,
          total_points: item.total_points,
        })) || [];
        filename = `points-leaderboard-${exportConfig.period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      
      case 'referrals-activity':
        data = referralsActivity?.map(item => ({
          referrer_name: item.referrer_name,
          status: item.status,
          updated_at: format(new Date(item.updated_at), 'yyyy-MM-dd HH:mm:ss'),
        })) || [];
        filename = `referrals-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
    }

    if (data.length > 0) {
      downloadCSV(data, filename);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileDown className="h-6 w-6" />
          Reports & Export
        </h2>
        <p className="text-muted-foreground">
          Generate and export system reports
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
            <CardDescription>Configure and download reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select
                value={exportConfig.reportType}
                onValueChange={(value: ExportConfig['reportType']) => 
                  setExportConfig(prev => ({ ...prev, reportType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points-leaderboard">Points Leaderboard</SelectItem>
                  <SelectItem value="referrals-activity">Referrals Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportConfig.reportType === 'points-leaderboard' && (
              <div className="space-y-2">
                <Label htmlFor="period">Time Period</Label>
                <Select
                  value={exportConfig.period}
                  onValueChange={(value) => 
                    setExportConfig(prev => ({ ...prev, period: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="limit">Record Limit</Label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={exportConfig.limit}
                onChange={(e) => 
                  setExportConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 100 }))
                }
              />
            </div>

            <Button onClick={handleExport} className="w-full">
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Preview of selected report data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
              {exportConfig.reportType === 'points-leaderboard' && pointsLeaderboard?.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium">{item.user_name}</span>
                  </div>
                  <span>{item.total_points.toLocaleString()}</span>
                </div>
              ))}
              
              {exportConfig.reportType === 'referrals-activity' && referralsActivity?.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b">
                  <span className="font-medium">{item.referrer_name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.status === 'qualified' ? 'bg-green-100 text-green-800' :
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
              
              {exportConfig.reportType === 'points-leaderboard' && (!pointsLeaderboard || pointsLeaderboard.length === 0) && (
                <div className="text-muted-foreground">No leaderboard data available</div>
              )}
              
              {exportConfig.reportType === 'referrals-activity' && (!referralsActivity || referralsActivity.length === 0) && (
                <div className="text-muted-foreground">No referrals activity data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
            <CardDescription>Current system overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary/10 mx-auto mb-2">
                  <Users className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold">{pointsLeaderboard?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent/10 mx-auto mb-2">
                  <Gift className="h-4 w-4 text-accent" />
                </div>
                <div className="text-2xl font-bold">{referralsActivity?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Recent Referrals</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 mx-auto mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">{format(new Date(), 'MMM')}</div>
                <div className="text-sm text-muted-foreground">Current Month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};