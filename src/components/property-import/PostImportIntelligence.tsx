import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Lightbulb,
  BarChart3,
  CheckCircle2,
  ArrowUpRight,
  MapPin,
  DollarSign,
  Users,
  Home
} from 'lucide-react';
import { ImportAnalyticsDashboard } from './ImportAnalyticsDashboard';
import { PropertyRecommendations } from './PropertyRecommendations';
import { PropertyValidation } from './PropertyValidation';
import { SmartBulkOperations } from './SmartBulkOperations';
import { ImportSuccessTracker } from './ImportSuccessTracker';
import type { ImportSession, ImportResult } from '@/types/propertyImport';

interface PostImportIntelligenceProps {
  session: ImportSession;
  results: ImportResult[];
  onBack: () => void;
}

export const PostImportIntelligence: React.FC<PostImportIntelligenceProps> = ({
  session,
  results,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('analytics');

  // Calculate summary metrics
  const totalProperties = results.length;
  const successfulImports = results.filter(r => r.status === 'success').length;
  const failedImports = results.filter(r => r.status === 'failed').length;
  const successRate = totalProperties > 0 ? (successfulImports / totalProperties) * 100 : 0;

  // Mock AI insights data
  const aiInsights = {
    qualityScore: 87,
    improvementOpportunities: 12,
    duplicatesPrevented: 3,
    dataEnhancementSuggestions: 8,
    estimatedValueIncrease: 15000
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Post-Import Intelligence</h2>
          <p className="text-muted-foreground">AI-powered insights and recommendations for your imported properties</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Summary
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold">{totalProperties}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Quality Score</p>
                <p className="text-2xl font-bold">{aiInsights.qualityScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Lightbulb className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recommendations</p>
                <p className="text-2xl font-bold">{aiInsights.improvementOpportunities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Value Boost</p>
                <p className="text-2xl font-bold">${(aiInsights.estimatedValueIncrease).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium">Quality Analysis</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your import achieved an {aiInsights.qualityScore}% quality score with high data completeness
              </p>
              <Badge variant="secondary" className="text-green-600">
                Excellent Quality
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Optimization Potential</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {aiInsights.improvementOpportunities} improvement opportunities identified
              </p>
              <Badge variant="secondary" className="text-blue-600">
                High Potential
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Data Enhancement</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {aiInsights.dataEnhancementSuggestions} properties could benefit from additional data
              </p>
              <Badge variant="secondary" className="text-amber-600">
                Action Required
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Intelligence Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="bulk-ops" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Success Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <ImportAnalyticsDashboard session={session} results={results} />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <PropertyRecommendations results={results} />
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <PropertyValidation results={results} />
        </TabsContent>

        <TabsContent value="bulk-ops" className="space-y-4">
          <SmartBulkOperations results={results} />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <ImportSuccessTracker session={session} results={results} />
        </TabsContent>
      </Tabs>
    </div>
  );
};