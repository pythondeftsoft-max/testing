import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  CheckCircle, 
  Copy, 
  BarChart3, 
  Brain,
  ChevronRight 
} from 'lucide-react';
import { useImportStudio, type ProcessingStage } from '@/stores/importStudioStore';
import { cn } from '@/lib/utils';

const STAGES = [
  {
    id: 'field-mapping' as ProcessingStage,
    label: 'Field Mapping',
    icon: MapPin,
    description: 'Map CSV columns to property fields'
  },
  {
    id: 'address-validation' as ProcessingStage,
    label: 'Address Validation',
    icon: CheckCircle,
    description: 'Validate and normalize addresses'
  },
  {
    id: 'duplicate-detection' as ProcessingStage,
    label: 'Duplicate Detection',
    icon: Copy,
    description: 'Identify potential duplicates'
  },
  {
    id: 'quality-assessment' as ProcessingStage,
    label: 'Quality Assessment',
    icon: BarChart3,
    description: 'Assess data quality scores'
  },
  {
    id: 'ai-insights' as ProcessingStage,
    label: 'AI Insights',
    icon: Brain,
    description: 'AI-powered suggestions'
  }
];

export function ProcessingPipelineRail() {
  const { 
    activeStage, 
    stageMetrics, 
    setActiveStage 
  } = useImportStudio();

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-2">
        <div className="text-sm font-medium text-muted-foreground mb-4">
          Processing Pipeline
        </div>
        
        {STAGES.map((stage, index) => {
          const isActive = activeStage === stage.id;
          const metrics = stageMetrics[stage.id];
          const progress = metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;
          const hasIssues = metrics.issues > 0;
          
          return (
            <div key={stage.id} className="relative">
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3 flex-col items-start space-y-2",
                  isActive && "bg-secondary"
                )}
                onClick={() => setActiveStage(stage.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <stage.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{stage.label}</span>
                  {hasIssues && (
                    <Badge variant="destructive" className="ml-auto">
                      {metrics.issues}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                </div>
                
                <div className="w-full space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {stage.description}
                  </div>
                  
                  {metrics.total > 0 && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-1" />
                      <div className="text-xs text-muted-foreground">
                        {metrics.completed}/{metrics.total}
                      </div>
                    </div>
                  )}
                </div>
              </Button>
              
              {index < STAGES.length - 1 && (
                <div className="absolute left-6 top-full w-px h-2 bg-border" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}