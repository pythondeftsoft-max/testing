import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, PieChart } from "lucide-react";

interface ChartEmptyStateProps {
  title: string;
  description?: string;
  icon?: "bar" | "pie";
}

export const ChartEmptyState = ({ 
  title, 
  description = "No data available yet. Generate test data or wait for real analytics to be collected.",
  icon = "bar"
}: ChartEmptyStateProps) => {
  const Icon = icon === "bar" ? BarChart3 : PieChart;
  
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};
