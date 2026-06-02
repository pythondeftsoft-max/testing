import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Circle, Clock, MinusCircle, Building2, Home, Globe } from 'lucide-react';
import { competitiveData, FeatureStatus, CompetitorCategory } from '@/data/competitiveAnalysis';

const statusConfig: Record<FeatureStatus, { icon: React.ElementType; label: string; variant: 'success' | 'warning' | 'neutral' | 'destructive' }> = {
  live: { icon: CheckCircle, label: 'Live', variant: 'success' },
  partial: { icon: MinusCircle, label: 'Partial', variant: 'warning' },
  planned: { icon: Clock, label: 'Planned', variant: 'neutral' },
  missing: { icon: Circle, label: 'Missing', variant: 'destructive' },
};

const StatusBadge = ({ status }: { status: FeatureStatus }) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

const computeScores = (category: CompetitorCategory) => {
  const total = category.features.length;
  const live = category.features.filter(f => f.us === 'live').length;
  const partial = category.features.filter(f => f.us === 'partial').length;
  const planned = category.features.filter(f => f.us === 'planned').length;

  const advantages = category.features.filter(f => {
    if (f.us !== 'live') return false;
    return Object.values(f.competitors).every(s => s !== 'live');
  }).length;

  return { total, live, partial, planned, advantages };
};

const CategoryTable = ({ category }: { category: CompetitorCategory }) => {
  const scores = computeScores(category);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{scores.live}/{scores.total}</p>
          <p className="text-xs text-muted-foreground">Features Live</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{scores.partial}</p>
          <p className="text-xs text-muted-foreground">Partial</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{scores.planned}</p>
          <p className="text-xs text-muted-foreground">Planned</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{scores.advantages}</p>
          <p className="text-xs text-muted-foreground">Unique Advantages</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Feature</TableHead>
                  <TableHead className="text-center min-w-[100px]">Us</TableHead>
                  {category.competitors.map(c => (
                    <TableHead key={c} className="text-center min-w-[120px]">{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.features.map(f => (
                  <TableRow key={f.feature}>
                    <TableCell className="font-medium text-sm">{f.feature}</TableCell>
                    <TableCell className="text-center"><StatusBadge status={f.us} /></TableCell>
                    {category.competitors.map(c => (
                      <TableCell key={c} className="text-center">
                        <StatusBadge status={f.competitors[c]} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const tabIcons: Record<string, React.ElementType> = {
  agencySystems: Building2,
  propertyManagement: Home,
  affordablePortals: Globe,
};

const CompetitiveAnalysis: React.FC = () => {
  const keys = Object.keys(competitiveData);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Competitive Analysis Tracker</CardTitle>
        <CardDescription>Feature-by-feature comparison — updated as new capabilities ship</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={keys[0]} className="space-y-4">
          <TabsList className="h-auto gap-1">
            {keys.map(key => {
              const Icon = tabIcons[key] || Building2;
              return (
                <TabsTrigger key={key} value={key}>
                  <Icon className="w-3.5 h-3.5 mr-1" />
                  {competitiveData[key].label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {keys.map(key => (
            <TabsContent key={key} value={key}>
              <p className="text-sm text-muted-foreground mb-4">{competitiveData[key].description}</p>
              <CategoryTable category={competitiveData[key]} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CompetitiveAnalysis;
