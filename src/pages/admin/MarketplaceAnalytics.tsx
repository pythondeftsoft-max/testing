import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';

const MarketplaceAnalytics = () => {
  const { data: isAdmin, isLoading: isLoadingAdmin } = useAdminCheck();
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const { data: funnelData, isLoading, error: queryError } = useQuery({
    queryKey: ['marketplace-funnel', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_marketplace_funnel', {
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
      });

      if (error) throw error;
      return data[0] || {};
    },
    enabled: !!isAdmin // Only run query if user is admin
  });

  const fetchTimeSeriesData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_marketplace_timeseries', {
          start_date: dateRange.from?.toISOString().split('T')[0],
          end_date: dateRange.to?.toISOString().split('T')[0]
        });

      if (error) throw error;
      
      // Process data for chart
      const processedData = data?.reduce((acc: any[], item: any) => {
        const existingDate = acc.find(d => d.date === item.date_bucket);
        if (existingDate) {
          existingDate[item.event_type] = item.total_count;
        } else {
          acc.push({
            date: item.date_bucket,
            [item.event_type]: item.total_count
          });
        }
        return acc;
      }, []) || [];

      setTimeSeriesData(processedData);
    } catch (error: any) {
      console.error('Failed to fetch time series data:', error);
    }
  };

  React.useEffect(() => {
    if (isAdmin) {
      fetchTimeSeriesData();
    }
  }, [dateRange, isAdmin]);

  const handleDateRangePreset = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date()
    });
  };

  const funnelChartData = [
    { step: 'Guard Shown', count: funnelData?.guard_shown || 0 },
    { step: 'Opt-in Clicked', count: funnelData?.opt_in_clicked || 0 },
    { step: 'Access Granted', count: funnelData?.access_granted || 0 },
    { step: 'Search Loaded', count: funnelData?.search_view_loaded || 0 },
    { step: 'Search Performed', count: funnelData?.search_performed || 0 },
    { step: 'Application Started', count: funnelData?.application_started || 0 },
    { step: 'Application Submitted', count: funnelData?.application_submitted || 0 },
  ];

  const calculateConversionRate = (current: number, previous: number) => {
    return previous > 0 ? ((current / previous) * 100).toFixed(1) : '0.0';
  };

  // Show loading while checking admin status
  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check admin access with friendlier message  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">
            Marketplace analytics are only available to administrators. 
            Contact your administrator if you need access to this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace Analytics</h1>
          <p className="text-muted-foreground">
            Track marketplace engagement and conversion funnel
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleDateRangePreset(7)}>
            7 days
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDateRangePreset(30)}>
            30 days
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDateRangePreset(90)}>
            90 days
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[280px] justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} -{' '}
                      {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range as { from: Date; to: Date })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Show alert if no data for date range */}
      {!isLoading && (!funnelData || Object.values(funnelData).every(val => val === 0)) && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No marketplace activity found for the selected date range. Try selecting a different time period or check back later.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guard Shown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{funnelData?.guard_shown || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total marketplace guard views
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opt-in Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {calculateConversionRate(funnelData?.opt_in_clicked || 0, funnelData?.guard_shown || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {funnelData?.opt_in_clicked || 0} opted in
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {calculateConversionRate(funnelData?.search_performed || 0, funnelData?.access_granted || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {funnelData?.search_performed || 0} searches performed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Application Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {calculateConversionRate(funnelData?.application_submitted || 0, funnelData?.search_performed || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {funnelData?.application_submitted || 0} applications submitted
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            User journey through the marketplace experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="space-y-3 w-full">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="step" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Series Chart */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
            <CardDescription>Daily marketplace activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            {timeSeriesData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="guard_shown" 
                      stroke="hsl(var(--chart-1))" 
                      name="Marketplace Views"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="search_performed" 
                      stroke="hsl(var(--chart-2))" 
                      name="Searches"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="application_started" 
                      stroke="hsl(var(--chart-3))" 
                      name="Applications Started"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="application_submitted" 
                      stroke="hsl(var(--chart-4))" 
                      name="Applications Submitted"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                {isLoading ? 'Loading chart data...' : 'No data available for selected date range'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Business Phase Breakdown */}
      {funnelData?.by_business_phase && Object.keys(funnelData.by_business_phase).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Business Phase</CardTitle>
            <CardDescription>
              Engagement metrics broken down by business phase configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(funnelData.by_business_phase).map(([phase, data]: [string, any]) => (
                <div key={phase} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium capitalize">{phase}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.guard_shown} views • {data.opt_in_clicked} opt-ins • {data.search_performed} searches
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {calculateConversionRate(data.opt_in_clicked, data.guard_shown)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Opt-in rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketplaceAnalytics;