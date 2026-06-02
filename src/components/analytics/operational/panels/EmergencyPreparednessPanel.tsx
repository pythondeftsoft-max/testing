import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Shield, Flame, Droplets, Wind, Zap } from 'lucide-react';

const scenarios = [
  { name: 'Fire Emergency', icon: Flame, readiness: 95, status: 'ready', lastDrill: '2025-01-15' },
  { name: 'Flood/Water Damage', icon: Droplets, readiness: 88, status: 'ready', lastDrill: '2024-12-20' },
  { name: 'Severe Weather', icon: Wind, readiness: 82, status: 'attention', lastDrill: '2024-11-10' },
  { name: 'Power Outage', icon: Zap, readiness: 90, status: 'ready', lastDrill: '2025-01-05' },
  { name: 'Security Breach', icon: Shield, readiness: 78, status: 'attention', lastDrill: '2024-10-15' },
  { name: 'Medical Emergency', icon: AlertCircle, readiness: 92, status: 'ready', lastDrill: '2025-01-25' },
];

const getStatusColor = (status: string) => {
  return status === 'ready' ? 'default' : 'secondary';
};

const getReadinessColor = (score: number) => {
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-yellow-500';
  return 'text-destructive';
};

export const EmergencyPreparednessPanel: React.FC = () => {
  const avgReadiness = Math.round(scenarios.reduce((sum, s) => sum + s.readiness, 0) / scenarios.length);
  const readyCount = scenarios.filter(s => s.status === 'ready').length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Emergency Preparedness</h3>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className={`text-xl font-bold ${getReadinessColor(avgReadiness)}`}>
            {avgReadiness}%
          </span>
        </div>
      </div>

      <Card className="p-4 bg-muted/50 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Overall Preparedness</span>
          <Badge variant={avgReadiness >= 90 ? 'default' : 'secondary'}>
            {readyCount}/{scenarios.length} Ready
          </Badge>
        </div>
        <Progress value={avgReadiness} className="h-2" />
      </Card>

      <div className="space-y-4">
        {scenarios.map((scenario, index) => {
          const Icon = scenario.icon;
          return (
            <div key={index} className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{scenario.name}</span>
                </div>
                <Badge variant={getStatusColor(scenario.status)}>
                  {scenario.status === 'ready' ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {scenario.status === 'ready' ? 'Ready' : 'Needs Attention'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Readiness Score</span>
                  <span className={`font-semibold ${getReadinessColor(scenario.readiness)}`}>
                    {scenario.readiness}%
                  </span>
                </div>
                <Progress value={scenario.readiness} className="h-1.5" />
                <p className="text-xs text-muted-foreground">Last drill: {scenario.lastDrill}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
