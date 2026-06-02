import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, Users, Settings, Pause, Play, X, TestTube, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { useAutopaySchedules, useUpdateAutopaySchedule } from '@/hooks/useAutopaySchedules';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { ColumnDef } from '@tanstack/react-table';

interface AutopaySchedule {
  id: string;
  tenant_id: string;
  asset_id: string;
  autopay_day: number;
  amount: number;
  currency_code: string;
  next_payment_date: string;
  status: string;
  failure_count: number;
  last_failure_reason?: string;
  created_at: string;
  updated_at: string;
  asset?: {
    asset_name: string;
    portfolio_id: string;
  };
  tenant?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const AutopayManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [testingReminders, setTestingReminders] = useState(false);
  const [lastReminderRun, setLastReminderRun] = useState<Date | null>(null);

  const portfolioId = searchParams.get('portfolioId');
  const { data: schedules = [], isLoading } = useAutopaySchedules(portfolioId || undefined);
  const updateScheduleMutation = useUpdateAutopaySchedule();

  // Check for last cron run on mount
  // Simulate cron status - replace with actual implementation in production
  React.useEffect(() => {
    // Simulate checking cron status
    setLastReminderRun(new Date(Date.now() - 24 * 60 * 60 * 1000)); // Yesterday for demo
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const matchesSearch = 
        schedule.tenant?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.tenant?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.asset?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
      const matchesDay = dayFilter === 'all' || schedule.autopay_day.toString() === dayFilter;
      
      return matchesSearch && matchesStatus && matchesDay;
    });
  }, [schedules, searchTerm, statusFilter, dayFilter]);

  const handleStatusChange = async (scheduleId: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      await updateScheduleMutation.mutateAsync({
        id: scheduleId,
        updates: { status: newStatus }
      });
      
      toast({
        title: "Schedule Updated",
        description: `Autopay schedule has been ${newStatus === 'active' ? 'activated' : newStatus === 'paused' ? 'paused' : 'cancelled'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update autopay schedule",
        variant: "destructive",
      });
    }
  };

  const runTestReminders = async () => {
    if (testingReminders) return;
    
    setTestingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-autopay-cron', {
        body: { test: true }
      });

      if (error) {
        throw error;
      }

      setLastReminderRun(new Date());
      toast({
        title: "Test Reminders Sent",
        description: "Test autopay reminders have been triggered successfully.",
      });
    } catch (error: any) {
      console.error('Error running test reminders:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test reminders",
        variant: "destructive",
      });
    } finally {
      setTestingReminders(false);
    }
  };

  const getStatusBadge = (status: string, failureCount: number) => {
    if (failureCount > 0) {
      return <Badge variant="destructive">Issues ({failureCount})</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success text-success-foreground">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatNextPayment = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `In ${diffDays} days`;
    }
  };

  const columns: ColumnDef<AutopaySchedule>[] = [
    {
      accessorKey: 'tenant',
      header: 'Tenant',
      cell: ({ row }) => {
        const tenant = row.original.tenant;
        return (
          <div>
            <div className="font-medium">
              {tenant?.first_name} {tenant?.last_name}
            </div>
            <div className="text-sm text-muted-foreground">
              {tenant?.email}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'asset',
      header: 'Property',
      cell: ({ row }) => {
        const asset = row.original.asset;
        return (
          <div className="font-medium">
            {asset?.asset_name || 'Unknown Property'}
          </div>
        );
      },
    },
    {
      accessorKey: 'autopay_day',
      header: 'Day',
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline">
            {row.original.autopay_day}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <CurrencyDisplay 
          amount={row.original.amount}
          currency={row.original.currency_code as any}
        />
      ),
    },
    {
      accessorKey: 'next_payment_date',
      header: 'Next Payment',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {new Date(row.original.next_payment_date).toLocaleDateString()}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatNextPayment(row.original.next_payment_date)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status, row.original.failure_count),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const schedule = row.original;
        return (
          <div className="flex items-center gap-2">
            {schedule.status === 'active' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(schedule.id, 'paused')}
                disabled={updateScheduleMutation.isPending}
              >
                <Pause className="h-3 w-3" />
              </Button>
            ) : schedule.status === 'paused' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(schedule.id, 'active')}
                disabled={updateScheduleMutation.isPending}
              >
                <Play className="h-3 w-3" />
              </Button>
            ) : null}
            
            {schedule.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(schedule.id, 'cancelled')}
                disabled={updateScheduleMutation.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const summary = useMemo(() => {
    const activeSchedules = schedules.filter(s => s.status === 'active');
    const totalMonthlyAmount = activeSchedules.reduce((sum, s) => sum + s.amount, 0);
    const issuesCount = schedules.filter(s => s.failure_count > 0).length;
    
    return {
      total: schedules.length,
      active: activeSchedules.length,
      totalMonthlyAmount,
      issuesCount
    };
  }, [schedules]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Autopay Management</h1>
              <p className="text-muted-foreground">Manage autopay reminders across your portfolio</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={runTestReminders}
              disabled={testingReminders}
              variant="outline"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testingReminders ? 'Testing...' : 'Run Test Reminders'}
            </Button>
            {lastReminderRun && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last run: {lastReminderRun.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Total Enrollments</div>
              </div>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-success" />
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-2xl font-bold text-success">{summary.active}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Monthly Total</div>
              </div>
              <div className="text-2xl font-bold">
                <CurrencyDisplay amount={summary.totalMonthlyAmount} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-destructive" />
                <div className="text-sm text-muted-foreground">Issues</div>
              </div>
              <div className="text-2xl font-bold text-destructive">{summary.issuesCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Search tenants or properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dayFilter} onValueChange={setDayFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="text-sm text-muted-foreground flex items-center">
                Showing {filteredSchedules.length} of {schedules.length} schedules
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Autopay Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={filteredSchedules} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};