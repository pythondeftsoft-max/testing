import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Target,
  Users,
  BarChart3,
  BookOpen,
  Download,
  Share2,
  Calendar,
  Award
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { ImportSession, ImportResult } from '@/types/propertyImport';

interface ImportSuccessTrackerProps {
  session: ImportSession;
  results: ImportResult[];
}

export const ImportSuccessTracker: React.FC<ImportSuccessTrackerProps> = ({
  session,
  results
}) => {
  // Mock historical data for tracking trends
  const historicalImports = [
    { month: 'Jan', success_rate: 78, properties: 45, time_saved: 12 },
    { month: 'Feb', success_rate: 82, properties: 52, time_saved: 15 },
    { month: 'Mar', success_rate: 85, properties: 38, time_saved: 18 },
    { month: 'Apr', success_rate: 88, properties: 63, time_saved: 22 },
    { month: 'May', success_rate: 91, properties: 71, time_saved: 25 },
    { month: 'Jun', success_rate: 94, properties: 59, time_saved: 28 }
  ];

  const improvementMetrics = [
    { category: 'Data Quality', current: 94, target: 98, improvement: '+12%' },
    { category: 'Processing Speed', current: 87, target: 95, improvement: '+23%' },
    { category: 'Error Reduction', current: 91, target: 96, improvement: '+18%' },
    { category: 'User Satisfaction', current: 89, target: 95, improvement: '+15%' }
  ];

  const commonIssuesLearned = [
    {
      issue: 'Address Format Inconsistency',
      frequency: 23,
      solution: 'Auto-normalize address formats',
      status: 'implemented'
    },
    {
      issue: 'Missing Rental Prices',
      frequency: 18,
      solution: 'AI price estimation based on comparables',
      status: 'implemented'
    },
    {
      issue: 'Duplicate Property Detection',
      frequency: 12,
      solution: 'Enhanced fuzzy matching algorithm',
      status: 'in_progress'
    },
    {
      issue: 'Property Type Classification',
      frequency: 8,
      solution: 'Improved ML classification model',
      status: 'planned'
    }
  ];

  const currentSessionStats = {
    successRate: session.total_rows ? (session.successful_imports / session.total_rows) * 100 : 0,
    processingTime: 145, // seconds
    dataQuality: 94,
    timeSaved: 32 // minutes
  };

  const knowledgeBaseEntries = [
    {
      title: 'Best Practices for CSV Formatting',
      description: 'Standardized formats that improve import success rates',
      type: 'guide',
      impact: 'High'
    },
    {
      title: 'Common Data Quality Issues',
      description: 'Frequent problems and their automated solutions',
      type: 'troubleshooting',
      impact: 'Medium'
    },
    {
      title: 'Property Type Classification Tips',
      description: 'How to ensure accurate property categorization',
      type: 'best_practice',
      impact: 'Medium'
    },
    {
      title: 'Duplicate Detection Strategies',
      description: 'Methods to prevent duplicate property imports',
      type: 'technique',
      impact: 'High'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Current Session Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Current Session Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{currentSessionStats.successRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
              <Badge variant="secondary" className="text-green-600 mt-1">Excellent</Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{currentSessionStats.processingTime}s</div>
              <div className="text-sm text-muted-foreground">Processing Time</div>
              <Badge variant="secondary" className="text-blue-600 mt-1">Fast</Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{currentSessionStats.dataQuality}%</div>
              <div className="text-sm text-muted-foreground">Data Quality</div>
              <Badge variant="secondary" className="text-purple-600 mt-1">High</Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">{currentSessionStats.timeSaved}min</div>
              <div className="text-sm text-muted-foreground">Time Saved</div>
              <Badge variant="secondary" className="text-amber-600 mt-1">Efficient</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Success Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalImports}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="success_rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Import Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historicalImports}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="properties" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Continuous Improvement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {improvementMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{metric.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {metric.current}% / {metric.target}%
                    </span>
                    <Badge variant="secondary" className="text-green-600">
                      {metric.improvement}
                    </Badge>
                  </div>
                </div>
                <Progress value={metric.current} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lessons Learned */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Lessons Learned & Improvements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commonIssuesLearned.map((lesson, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{lesson.issue}</h4>
                  <Badge 
                    variant="outline"
                    className={
                      lesson.status === 'implemented' ? 'text-green-600 border-green-200' :
                      lesson.status === 'in_progress' ? 'text-blue-600 border-blue-200' :
                      'text-amber-600 border-amber-200'
                    }
                  >
                    {lesson.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{lesson.solution}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="font-medium">{lesson.frequency} occurrences</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Knowledge Base & Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeBaseEntries.map((entry, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{entry.title}</h4>
                  <Badge variant="outline" className={
                    entry.impact === 'High' ? 'text-red-600 border-red-200' : 'text-amber-600 border-amber-200'
                  }>
                    {entry.impact}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{entry.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {entry.type.replace('_', ' ')}
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Read More
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Success Report
        </Button>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share Insights
        </Button>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          Schedule Review
        </Button>
        <Button variant="outline" className="gap-2">
          <BookOpen className="h-4 w-4" />
          View Best Practices
        </Button>
      </div>
    </div>
  );
};