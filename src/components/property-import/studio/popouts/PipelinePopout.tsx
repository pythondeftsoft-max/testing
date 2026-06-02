import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  MapPin, 
  Users, 
  Target, 
  Brain,
  CheckCircle, 
  AlertTriangle, 
  Clock,
  X
} from 'lucide-react';
import { useImportStudio } from '@/stores/importStudioStore';

const STAGES = [
  {
    id: 'field-mapping' as const,
    label: 'Field Mapping',
    icon: Search,
    description: 'Map CSV columns to property fields',
    details: 'Automatically maps your CSV columns to standardized property data fields using AI-powered field detection.',
  },
  {
    id: 'address-validation' as const,
    label: 'Address Validation',
    icon: MapPin,
    description: 'Validate and standardize addresses',
    details: 'Validates addresses against postal databases and standardizes formatting for consistent data quality.',
  },
  {
    id: 'duplicate-detection' as const,
    label: 'Duplicate Detection',
    icon: Users,
    description: 'Identify duplicate properties',
    details: 'Uses advanced algorithms to detect potential duplicate properties based on address similarity and other factors.',
  },
  {
    id: 'quality-assessment' as const,
    label: 'Quality Assessment',
    icon: Target,
    description: 'Assess data quality',
    details: 'Analyzes data completeness, accuracy, and consistency to provide quality scores and improvement suggestions.',
  },
  {
    id: 'ai-insights' as const,
    label: 'AI Insights',
    icon: Brain,
    description: 'Generate AI-powered insights',
    details: 'Leverages machine learning to provide intelligent recommendations and insights about your property data.',
  },
];

interface PipelinePopoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelinePopout({ open, onOpenChange }: PipelinePopoutProps) {
  const { activeStage, stageMetrics, setActiveStage } = useImportStudio();

  const getStageStatus = (stageId: string) => {
    const metrics = stageMetrics[stageId];
    if (!metrics) return 'pending';
    
    if (metrics.issues > 0) return 'warning';
    if (metrics.completed === metrics.total) return 'complete';
    if (metrics.completed > 0) return 'in-progress';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'in-progress': return Clock;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'in-progress': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Processing Pipeline</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Pipeline Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Processing Time</div>
                    <div className="text-xs text-muted-foreground">~2-3 minutes</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Success Rate</div>
                    <div className="text-xs text-muted-foreground">94%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">AI Confidence</div>
                    <div className="text-xs text-muted-foreground">87%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stages */}
          <div className="space-y-4">
            {STAGES.map((stage, index) => {
              const status = getStageStatus(stage.id);
              const metrics = stageMetrics[stage.id];
              const StatusIcon = getStatusIcon(status);
              const isActive = activeStage === stage.id;
              const progress = metrics ? (metrics.completed / metrics.total) * 100 : 0;

              return (
                <Card key={stage.id} className={isActive ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <stage.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{stage.label}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(status)}`} />
                        <Badge variant={status === 'complete' ? 'default' : status === 'warning' ? 'secondary' : 'outline'}>
                          {status.replace('-', ' ')}
                        </Badge>
                        <Button
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveStage(stage.id)}
                        >
                          {isActive ? 'Active' : 'View'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {stage.details}
                    </p>

                    {metrics && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span className="text-muted-foreground">
                            {metrics.completed} / {metrics.total}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        
                        {metrics.issues > 0 && (
                          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-4 w-4" />
                            {metrics.issues} issues found
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}