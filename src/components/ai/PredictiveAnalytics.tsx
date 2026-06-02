import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  DollarSign, 
  BarChart3, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const PredictiveAnalytics = () => {
  const [selectedModel, setSelectedModel] = useState('user-engagement');

  const forecastData = [
    { month: 'Jan', actual: 45000, predicted: 47000, confidence: 0.92 },
    { month: 'Feb', actual: 52000, predicted: 54000, confidence: 0.89 },
    { month: 'Mar', actual: 48000, predicted: 51000, confidence: 0.91 },
    { month: 'Apr', actual: 61000, predicted: 58000, confidence: 0.87 },
    { month: 'May', actual: 55000, predicted: 62000, confidence: 0.85 },
    { month: 'Jun', actual: null, predicted: 67000, confidence: 0.83 },
    { month: 'Jul', actual: null, predicted: 71000, confidence: 0.81 },
    { month: 'Aug', actual: null, predicted: 68000, confidence: 0.79 },
  ];

  const insights = [
    {
      id: 1,
      type: 'trend',
      priority: 'high',
      title: 'User Engagement Spike Predicted',
      description: 'AI models predict a 23% increase in user engagement next month based on historical patterns and feature releases.',
      confidence: 87,
      impact: 'positive',
      action: 'Scale infrastructure to handle increased load'
    },
    {
      id: 2,
      type: 'anomaly',
      priority: 'medium',
      title: 'Revenue Pattern Deviation',
      description: 'Detected unusual pattern in subscription renewals that may indicate churn risk.',
      confidence: 94,
      impact: 'negative',
      action: 'Implement retention campaign for at-risk segments'
    },
    {
      id: 3,
      type: 'opportunity',
      priority: 'high',
      title: 'Feature Adoption Opportunity',
      description: 'ML analysis shows 68% of users who try Feature X become power users within 30 days.',
      confidence: 91,
      impact: 'positive',
      action: 'Increase Feature X visibility in onboarding'
    },
    {
      id: 4,
      type: 'risk',
      priority: 'low',
      title: 'Seasonal Traffic Decline',
      description: 'Historical patterns suggest 15% traffic decrease in August due to seasonal factors.',
      confidence: 76,
      impact: 'neutral',
      action: 'Plan maintenance windows during low-traffic periods'
    }
  ];

  const models = [
    {
      id: 'user-engagement',
      name: 'User Engagement',
      accuracy: 87.5,
      lastTrained: '2024-01-15',
      predictions: 156,
      status: 'active'
    },
    {
      id: 'revenue-forecast',
      name: 'Revenue Forecast',
      accuracy: 92.1,
      lastTrained: '2024-01-14',
      predictions: 89,
      status: 'active'
    },
    {
      id: 'churn-prediction',
      name: 'Churn Prediction',
      accuracy: 84.3,
      lastTrained: '2024-01-13',
      predictions: 234,
      status: 'training'
    },
    {
      id: 'feature-adoption',
      name: 'Feature Adoption',
      accuracy: 79.8,
      lastTrained: '2024-01-12',
      predictions: 67,
      status: 'active'
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Target className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'training':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Training</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Predictive Analytics</h2>
          <p className="text-muted-foreground">AI-powered insights and forecasting for business intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Brain className="w-4 h-4 mr-2" />
            Train Models
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Models</p>
                <p className="text-2xl font-bold text-foreground">
                  {models.filter(m => m.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Accuracy</p>
                <p className="text-2xl font-bold text-foreground">
                  {(models.reduce((acc, m) => acc + m.accuracy, 0) / models.length).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Predictions Today</p>
                <p className="text-2xl font-bold text-foreground">
                  {models.reduce((acc, m) => acc + m.predictions, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-foreground">
                  {insights.filter(i => i.priority === 'high').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>Actionable insights and recommendations from machine learning analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <Card key={insight.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getImpactIcon(insight.impact)}
                            <h4 className="font-medium">{insight.title}</h4>
                            {getPriorityBadge(insight.priority)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                          
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Confidence:</span>
                              <Progress value={insight.confidence} className="w-20 h-2" />
                              <span className="text-xs font-medium">{insight.confidence}%</span>
                            </div>
                          </div>
                          
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-sm font-medium text-primary">Recommended Action:</p>
                            <p className="text-sm text-muted-foreground">{insight.action}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button variant="ghost" size="sm">Details</Button>
                          <Button variant="outline" size="sm">Act</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>Predictive modeling for business metrics with confidence intervals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        typeof value === 'number' ? `$${value.toLocaleString()}` : value,
                        name === 'actual' ? 'Actual' : 'Predicted'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <h4 className="font-medium text-foreground">Next Month Prediction</h4>
                  <p className="text-2xl font-bold text-primary">$67,000</p>
                  <p className="text-sm text-muted-foreground">83% confidence</p>
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-foreground">Growth Rate</h4>
                  <p className="text-2xl font-bold text-success">+21.8%</p>
                  <p className="text-sm text-muted-foreground">vs. last month</p>
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-foreground">Accuracy</h4>
                  <p className="text-2xl font-bold text-foreground">92.1%</p>
                  <p className="text-sm text-muted-foreground">model performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>ML Model Performance</CardTitle>
              <CardDescription>Monitor and manage machine learning model accuracy and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <Card key={model.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-medium">{model.name}</h4>
                            {getStatusBadge(model.status)}
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Accuracy</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={model.accuracy} className="flex-1" />
                                <span className="text-sm font-medium">{model.accuracy}%</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Last Trained</span>
                              <p className="text-sm font-medium mt-1">{model.lastTrained}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Predictions Today</span>
                              <p className="text-sm font-medium mt-1">{model.predictions}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Status</span>
                              <p className="text-sm font-medium mt-1 capitalize">{model.status}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">Retrain</Button>
                          <Button variant="ghost" size="sm">Configure</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>Deep analysis of patterns and trends across business metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">User Behavior Trends</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Session Duration</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">+12.3%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Page Views per Session</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">+8.7%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Bounce Rate</span>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">-5.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Business Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Conversion Rate</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">+3.4%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Customer Lifetime Value</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">+15.8%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Churn Rate</span>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">-2.1%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveAnalytics;