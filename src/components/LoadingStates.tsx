import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

// Auth loading skeleton
export const AuthLoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-3 w-32 mx-auto" />
      </div>
    </div>
  </div>
);

// Dashboard loading skeleton
export const DashboardLoadingSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <Skeleton className="h-8 w-32" />
        <div className="ml-auto">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-lg border">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-48 w-full mb-4" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Page transition loading
export const PageTransitionLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="text-center space-y-2">
      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);