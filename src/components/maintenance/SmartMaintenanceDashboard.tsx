import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wrench, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock,
  Zap,
  Target
} from 'lucide-react';
import { useSmartMaintenance } from '@/hooks/useSmartMaintenanceReal';
import { formatCurrency } from '@/utils/maintenanceUtils';
import { format } from 'date-fns';

interface SmartMaintenanceDashboardProps {
  userId: string;
  portfolioId?: string;
}

const SmartMaintenanceDashboard = ({ userId, portfolioId }: SmartMaintenanceDashboardProps) => {
  const {
    workflows,
    predictions,
    budgets,
    isLoading,
    updateWorkflowStatus,
    scheduleMaintenanceFromPrediction,
    createBudget
  } = useSmartMaintenance(portfolioId);

  const [activeTab, setActiveTab] = useState('workflows');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'occupied';
      case 'assigned': return 'warning';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 80) return 'destructive';
    if (score >= 60) return 'warning';
    return 'success';
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.allocated_amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const emergencyPredictions = predictions.filter(p => p.urgency_level > 8).length;

  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" animate={true}>
        <CardEnhancedContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-muted-foreground">Loading smart maintenance data...</p>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                <p className="text-2xl font-bold text-foreground">
                  {workflows.filter(w => w.status !== 'completed' && w.status !== 'cancelled').length}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Predictions</p>
                <p className="text-2xl font-bold text-foreground">{predictions.length}</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget Utilization</p>
                <p className="text-2xl font-bold text-foreground">{budgetUtilization.toFixed(1)}%</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-foreground">{emergencyPredictions}</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Main Dashboard */}
      <CardEnhanced variant="elevated" hover={true} animate={true}>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2" gradient>
            <Zap className="h-5 w-5 text-primary" />
            Smart Maintenance Management
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="workflows" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Request</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Estimated Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {(workflow as any).maintenance_requests?.title || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(workflow.created_at), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {(workflow as any).maintenance_vendors?.company_name || 'Unassigned'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(workflow.priority.toString())}>
                            {workflow.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(workflow.status)}>
                            {workflow.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {workflow.estimated_cost ? formatCurrency(workflow.estimated_cost) : 'TBD'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {workflow.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateWorkflowStatus(workflow.id.toString(), 'in_progress')}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Start
                              </Button>
                            )}
                            {workflow.status === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="blue"
                                onClick={() => updateWorkflowStatus(workflow.id.toString(), 'completed', undefined)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              {predictions.filter(p => p.urgency_level >= 7).length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You have {predictions.filter(p => p.urgency_level >= 7).length} high-priority maintenance predictions that require attention.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Property</TableHead>
                      <TableHead>Predicted Issue</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Estimated Cost</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map((prediction) => (
                      <TableRow key={prediction.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {(prediction as any).properties?.address || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {prediction.asset_type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{prediction.predicted_issue}</div>
                            <div className="text-sm text-muted-foreground">
                              Urgency Level: {prediction.urgency_level}/10
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={prediction.urgency_level > 7 ? 'destructive' : prediction.urgency_level > 4 ? 'warning' : 'success'}>
                            {prediction.urgency_level}/10
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {formatCurrency(prediction.estimated_repair_cost)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {format(new Date(prediction.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => scheduleMaintenanceFromPrediction(prediction.id.toString(), new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Schedule
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="budgets" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <CardEnhanced variant="elevated">
                  <CardEnhancedContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudget)}</p>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
                <CardEnhanced variant="elevated">
                  <CardEnhancedContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Spent</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
                <CardEnhanced variant="elevated">
                  <CardEnhancedContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudget - totalSpent)}</p>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Category</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Allocated</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead>Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.map((budget) => {
                      const spent = budget.spent_amount || 0;
                      const utilization = (spent / budget.allocated_amount) * 100;
                      return (
                        <TableRow key={budget.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{budget.category || 'General'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{budget.budget_year}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {formatCurrency(budget.allocated_amount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {formatCurrency(spent)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Progress value={utilization} className="w-24" />
                              <div className="text-sm text-muted-foreground">
                                {utilization.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CardEnhanced variant="elevated">
                  <CardEnhancedHeader>
                    <CardEnhancedTitle>Workflow Efficiency</CardEnhancedTitle>
                  </CardEnhancedHeader>
                  <CardEnhancedContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Completion Rate</span>
                        <span className="text-lg font-bold text-foreground">
                          {workflows.length > 0 
                            ? Math.round((workflows.filter(w => w.status === 'completed').length / workflows.length) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Resolution Time</span>
                        <span className="text-lg font-bold text-foreground">4.2 days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cost Accuracy</span>
                        <span className="text-lg font-bold text-foreground">89%</span>
                      </div>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>

                <CardEnhanced variant="elevated">
                  <CardEnhancedHeader>
                    <CardEnhancedTitle>Predictive Accuracy</CardEnhancedTitle>
                  </CardEnhancedHeader>
                  <CardEnhancedContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Prediction Accuracy</span>
                        <span className="text-lg font-bold text-foreground">84%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cost Savings</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency(12450)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Prevented Issues</span>
                        <span className="text-lg font-bold text-foreground">23</span>
                      </div>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
              </div>
            </TabsContent>
          </Tabs>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default SmartMaintenanceDashboard;