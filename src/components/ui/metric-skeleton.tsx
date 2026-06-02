
import { Skeleton } from "@/components/ui/skeleton";

export const MetricSkeleton = () => (
  <div className="space-y-1">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-8 w-16" />
  </div>
);
