import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Gift, CreditCard } from 'lucide-react';
import { usePointsConversion } from '@/hooks/usePointsConversion';
import { format } from 'date-fns';

interface ConversionHistoryProps {
  userId: string;
}

export const ConversionHistory = ({ userId }: ConversionHistoryProps) => {
  const { conversions, loadingConversions } = usePointsConversion(userId);

  if (loadingConversions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion History</CardTitle>
          <CardDescription>Your points to gift card conversions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (conversions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion History</CardTitle>
          <CardDescription>Your points to gift card conversions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversions yet</p>
            <p className="text-sm">Convert your points to gift card value to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion History</CardTitle>
        <CardDescription>Your recent points to gift card conversions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversions.map((conversion) => (
          <div
            key={conversion.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="font-medium">{conversion.points_amount.toLocaleString()}</span>
                  <span className="text-muted-foreground">points</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">
                    ${conversion.dollar_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-green-600 border-green-200">
                {conversion.status}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {format(new Date(conversion.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};