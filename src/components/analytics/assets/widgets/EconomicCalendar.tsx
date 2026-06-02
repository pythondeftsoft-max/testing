import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const EconomicCalendar = () => {
  const getImpactColor = (impact: string) => {
    if (impact === 'High') return 'text-red-600 bg-red-500/10';
    if (impact === 'Medium') return 'text-yellow-600 bg-yellow-500/10';
    return 'text-blue-600 bg-blue-500/10';
  };
  
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Economic Calendar Impact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockPortfolioData.economicCalendar.map((event, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{event.event}</div>
                  <div className="text-sm text-muted-foreground">{event.date}</div>
                </div>
              </div>
              <div className={`text-xs font-semibold px-2 py-1 rounded ${getImpactColor(event.impact)}`}>
                {event.impact}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
