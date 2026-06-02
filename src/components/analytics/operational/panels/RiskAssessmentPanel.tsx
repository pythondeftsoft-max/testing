import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const riskCategories = [
  { name: 'Physical Security', score: 92, level: 'low', issues: 1 },
  { name: 'Fire Safety', score: 88, level: 'low', issues: 2 },
  { name: 'Environmental Hazards', score: 75, level: 'medium', issues: 5 },
  { name: 'Structural Integrity', score: 85, level: 'medium', issues: 3 },
  { name: 'Compliance Violations', score: 68, level: 'high', issues: 8 },
  { name: 'Liability Exposure', score: 80, level: 'medium', issues: 4 },
];

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'low': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'high': return <XCircle className="h-4 w-4 text-destructive" />;
    default: return null;
  }
};

const getRiskColor = (score: number) => {
  if (score >= 85) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  return 'text-destructive';
};

export const RiskAssessmentPanel: React.FC = () => {
  const overallScore = Math.round(riskCategories.reduce((sum, c) => sum + c.score, 0) / riskCategories.length);
  const totalIssues = riskCategories.reduce((sum, c) => sum + c.issues, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Risk Assessment Dashboard</h3>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className={`text-2xl font-bold ${getRiskColor(overallScore)}`}>{overallScore}</span>
        </div>
      </div>

      <Card className="p-4 bg-muted/50 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Overall Risk Level</span>
          <Badge variant={overallScore >= 85 ? 'default' : overallScore >= 70 ? 'secondary' : 'destructive'}>
            {overallScore >= 85 ? 'Low Risk' : overallScore >= 70 ? 'Medium Risk' : 'High Risk'}
          </Badge>
        </div>
        <Progress value={overallScore} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">{totalIssues} total issues identified</p>
      </Card>

      <div className="space-y-4">
        {riskCategories.map((category, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRiskIcon(category.level)}
                <span className="font-medium text-sm">{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{category.issues} issues</span>
                <span className={`text-sm font-semibold ${getRiskColor(category.score)}`}>
                  {category.score}%
                </span>
              </div>
            </div>
            <Progress value={category.score} className="h-1.5" />
          </div>
        ))}
      </div>
    </Card>
  );
};
