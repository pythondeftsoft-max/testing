import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, CheckCircle2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  agencyName: string;
}

const SEMAP_INDICATORS = [
  { number: 1, name: 'Selection from Waiting List', maxPoints: 15 },
  { number: 2, name: 'Rent Reasonableness', maxPoints: 20 },
  { number: 3, name: 'Determination of Adjusted Income', maxPoints: 20 },
  { number: 4, name: 'Utility Allowance Schedule', maxPoints: 5 },
  { number: 5, name: 'HQS Quality Control Inspections', maxPoints: 5 },
  { number: 6, name: 'HQS Enforcement', maxPoints: 10 },
  { number: 7, name: 'Expanding Housing Opportunities', maxPoints: 5 },
  { number: 8, name: 'FMR/Payment Standard', maxPoints: 5 },
  { number: 9, name: 'Annual Reexaminations', maxPoints: 10 },
  { number: 10, name: 'Correct Tenant Rent Calculations', maxPoints: 5 },
  { number: 11, name: 'Pre-Contract HQS Inspections', maxPoints: 5 },
  { number: 12, name: 'Annual HQS Inspections', maxPoints: 10 },
  { number: 13, name: 'Lease-Up', maxPoints: 20 },
  { number: 14, name: 'Family Self-Sufficiency', maxPoints: 10 },
  { number: 15, name: 'Deconcentration Bonus', maxPoints: 5 },
];

const SEMAPExport: React.FC<Props> = ({ agencyId, agencyName }) => {
  const [period, setPeriod] = useState('2026-Q1');

  // Demo scores
  const scores = SEMAP_INDICATORS.map(ind => ({
    ...ind,
    score: Math.min(ind.maxPoints, Math.round(ind.maxPoints * (0.7 + Math.random() * 0.3))),
  }));

  const totalScore = scores.reduce((s, i) => s + i.score, 0);
  const maxTotal = scores.reduce((s, i) => s + i.maxPoints, 0);
  const rating = totalScore >= maxTotal * 0.9 ? 'High Performer' : totalScore >= maxTotal * 0.6 ? 'Standard' : 'Troubled';

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`SEMAP report exported as ${format.toUpperCase()}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> SEMAP Report Export
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-Q1">2026 Q1</SelectItem>
                <SelectItem value="2025-Q4">2025 Q4</SelectItem>
                <SelectItem value="2025-Q3">2025 Q3</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
              <FileDown className="h-3 w-3 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={() => handleExport('pdf')}>
              <FileDown className="h-3 w-3 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">{agencyName}</p>
            <p className="text-xs text-muted-foreground">Period: {period}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold">{totalScore}/{maxTotal}</p>
            <Badge variant={rating === 'High Performer' ? 'default' : rating === 'Standard' ? 'secondary' : 'destructive'}>
              {rating}
            </Badge>
          </div>
        </div>

        <div className="space-y-1">
          {scores.map(ind => (
            <div key={ind.number} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
              <span className="w-6 text-muted-foreground text-right">{ind.number}.</span>
              <span className="flex-1 truncate">{ind.name}</span>
              <span className="font-medium w-12 text-right">{ind.score}/{ind.maxPoints}</span>
              {ind.score === ind.maxPoints && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SEMAPExport;
