import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";

export const AnalyticsEmptyState = () => {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>No Analytics Data Yet</CardTitle>
        <CardDescription>
          Analytics data will appear here once white-labeled sites start receiving traffic
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Eye className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Page Views</p>
              <p className="text-xs text-muted-foreground">Track visitor activity</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Users className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Unique Visitors</p>
              <p className="text-xs text-muted-foreground">Monitor user sessions</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Performance</p>
              <p className="text-xs text-muted-foreground">Analyze engagement</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
            How Analytics Works
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
            <li>• Analytics are automatically tracked on white-labeled sites</li>
            <li>• Data includes page views, sessions, and user behavior</li>
            <li>• View real-time insights and performance metrics here</li>
            <li>• Generate test data below to preview the analytics dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
