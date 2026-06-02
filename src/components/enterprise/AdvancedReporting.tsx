
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Download, Calendar, Filter, Brain, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReportData {
  portfolio_performance: Array<{
    portfolio_name: string;
    total_revenue: number;
    vacancy_rate: number;
    roi: number;
    maintenance_costs: number;
  }>;
  predictive_analytics: {
    predicted_vacancy_trend: Array<{ month: string; predicted_vacancy: number }>;
    market_analysis: Array<{ metric: string; current: number; predicted: number }>;
    risk_assessment: Array<{ portfolio: string; risk_score: number; factors: string[] }>;
  };
  custom_metrics: Array<{
    metric_name: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    benchmark: number;
  }>;
}

const AdvancedReporting = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedPortfolio, setSelectedPortfolio] = useState('all');
  const [reportType, setReportType] = useState('performance');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['advanced-reporting', selectedTimeRange, selectedPortfolio, reportType],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-advanced-reports', {
        body: {
          timeRange: selectedTimeRange,
          portfolioId: selectedPortfolio === 'all' ? null : selectedPortfolio,
          reportType,
        },
      });
      if (error) throw error;
      return data as ReportData;
    },
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportReport = async (format: 'pdf' | 'excel') => {
    const { data, error } = await supabase.functions.invoke('export-report', {
      body: {
        reportData,
        format,
        timeRange: selectedTimeRange,
        portfolioId: selectedPortfolio,
      },
    });
    
    if (error) {
      console.error('Export failed:', error);
      return;
    }
    
    // Create download link
    const blob = new Blob([data], { 
      type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-report-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Advanced Reporting & BI</h2>
          <p className="text-muted-foreground">Comprehensive business intelligence and predictive analytics</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => exportReport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Portfolios</SelectItem>
                  <SelectItem value="residential">Residential Portfolio</SelectItem>
                  <SelectItem value="commercial">Commercial Portfolio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Revenue Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData?.portfolio_performance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="portfolio_name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value?.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="total_revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vacancy Rate Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData?.portfolio_performance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="portfolio_name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Vacancy Rate']} />
                    <Line type="monotone" dataKey="vacancy_rate" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span>Predictive Vacancy Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData?.predictive_analytics?.predicted_vacancy_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Predicted Vacancy']} />
                    <Line type="monotone" dataKey="predicted_vacancy" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData?.predictive_analytics?.risk_assessment?.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{risk.portfolio}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {risk.factors.map((factor, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          risk.risk_score > 70 ? 'text-red-600' : 
                          risk.risk_score > 40 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {risk.risk_score}%
                        </div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Metrics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportData?.custom_metrics?.map((metric, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{metric.metric_name}</h4>
                      <div className={`flex items-center ${
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <TrendingUp className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      Benchmark: {metric.benchmark.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;
