import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Palette, Globe } from 'lucide-react';

export const ThemeLoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
    <div className="h-3 w-32 bg-gray-200 rounded"></div>
  </div>
);

export const ConfigLoadingSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ThemeApplyingIndicator = ({ 
  isApplying, 
  companyName 
}: { 
  isApplying: boolean; 
  companyName?: string; 
}) => {
  if (!isApplying) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="shadow-lg border-primary">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-sm">Applying Theme</p>
              <p className="text-xs text-muted-foreground">
                {companyName ? `Loading ${companyName} branding...` : 'Updating appearance...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DomainVerificationIndicator = ({ 
  domain, 
  status 
}: { 
  domain: string; 
  status: 'pending' | 'verified' | 'failed'; 
}) => (
  <Card className="border-l-4 border-l-blue-500">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Globe className="h-5 w-5 text-blue-500" />
        <div className="flex-1">
          <p className="font-medium text-sm">Domain: {domain}</p>
          <p className="text-xs text-muted-foreground">
            Status: {status === 'pending' && 'Verification in progress...'}
            {status === 'verified' && 'Successfully verified'}
            {status === 'failed' && 'Verification failed'}
          </p>
        </div>
        {status === 'pending' && (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>
    </CardContent>
  </Card>
);

export const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-6 w-6" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-24" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export default {
  ThemeLoadingSkeleton,
  ConfigLoadingSkeleton,
  ThemeApplyingIndicator,
  DomainVerificationIndicator,
  AdminDashboardSkeleton,
};