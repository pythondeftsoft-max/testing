import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, MapPin } from 'lucide-react';
import { companyMission } from './agentDefinitions';

export const AgentMissionCard = () => {
  const pct = companyMission.targetMetric > 0
    ? Math.round((companyMission.currentMetric / companyMission.targetMetric) * 100)
    : 0;

  const currentPhaseData = companyMission.phases.find(p => p.name === companyMission.currentPhase);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{companyMission.title}</h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                {companyMission.currentPhase}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{companyMission.description}</p>
            {currentPhaseData && (
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {currentPhaseData.focus} · Target: {currentPhaseData.target}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2.5">
              <Progress value={pct} className="h-2 flex-1" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {companyMission.currentMetric} / {companyMission.targetMetric} {companyMission.unit}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
