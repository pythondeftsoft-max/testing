import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface DynamicProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  className?: string;
}

const ProgressDynamic = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  DynamicProgressProps
>(({ className, value = 0, ...props }, ref) => {
  // Calculate color based on percentage
  const getProgressColor = (val: number): string => {
    if (val >= 85) return 'bg-green-600';
    if (val >= 70) return 'bg-green-500';
    if (val >= 55) return 'bg-yellow-500';
    if (val >= 40) return 'bg-orange-500';
    if (val >= 25) return 'bg-orange-600';
    return 'bg-red-600';
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all",
          getProgressColor(value)
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
ProgressDynamic.displayName = "ProgressDynamic";

export { ProgressDynamic };
