import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Crown, CalendarDays, CheckCircle, AlertCircle } from 'lucide-react';
import { useApplicationQuota } from '@/hooks/useApplicationQuota';

interface ApplicationQuotaDisplayProps {
  userId: string;
  totalApplications?: number;
  className?: string;
}

const ApplicationQuotaDisplay = ({ userId, totalApplications = 0, className }: ApplicationQuotaDisplayProps) => {
  const { canApply, remainingApplications, isSubscriber, subscriptionTier, loading, error } = useApplicationQuota(userId);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Unable to load application status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle Plus tier (unlimited)
  if (subscriptionTier === 'plus') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-yellow-600" />
            Plus Subscription
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Unlimited Applications</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Apply to as many properties as you want
          </p>
        </CardContent>
      </Card>
    );
  }

  // Handle Tenant Pro tier (20 per week)
  if (subscriptionTier === 'tenant_pro') {
    const maxApplications = 20;
    const usedApplications = maxApplications - remainingApplications;
    const applicationsThisWeek = usedApplications;

    const getStatusColor = () => {
      if (remainingApplications === 0) return 'text-destructive';
      if (remainingApplications <= 3) return 'text-orange-600';
      return 'text-green-600';
    };

    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-blue-600" />
            Tenant Pro
            <Badge variant={canApply ? "default" : "destructive"}>
              {canApply ? "Available" : "Limit Reached"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Applied (All Time) */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Total Applied</span>
              </div>
              <p className="text-2xl font-bold">{totalApplications}</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>

            {/* This Week */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">This Week</span>
              </div>
              <p className="text-2xl font-bold">{applicationsThisWeek}</p>
              <p className="text-xs text-muted-foreground">of {maxApplications}</p>
            </div>

            {/* Remaining */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Remaining</span>
              </div>
              <p className={`text-2xl font-bold ${getStatusColor()}`}>{remainingApplications}</p>
              <p className="text-xs text-muted-foreground">left this week</p>
            </div>

            {/* Weekly Limit */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Crown className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Weekly Limit</span>
              </div>
              <p className="text-2xl font-bold">{maxApplications}</p>
              <p className="text-xs text-muted-foreground">applications</p>
            </div>
          </div>

          {/* Reset Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <CalendarDays className="h-4 w-4" />
            <span>Resets every Sunday at midnight • Upgrade to Plus for unlimited</span>
          </div>

          {remainingApplications === 0 && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <Crown className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Upgrade to Plus</p>
                  <p className="text-yellow-700 text-xs mt-1">
                    Get unlimited applications with Plus
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const maxApplications = 5;
  const usedApplications = maxApplications - remainingApplications;
  const applicationsThisWeek = usedApplications;

  const getStatusColor = () => {
    if (remainingApplications === 0) return 'text-destructive';
    if (remainingApplications <= 1) return 'text-orange-600';
    return 'text-green-600';
  };


  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          Weekly Applications
          <Badge variant={canApply ? "default" : "destructive"}>
            {canApply ? "Available" : "Limit Reached"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Applied (All Time) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Total Applied</span>
            </div>
            <p className="text-2xl font-bold">{totalApplications}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>

          {/* This Week */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">This Week</span>
            </div>
            <p className="text-2xl font-bold">{applicationsThisWeek}</p>
            <p className="text-xs text-muted-foreground">of {maxApplications}</p>
          </div>

          {/* Remaining */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Remaining</span>
            </div>
            <p className={`text-2xl font-bold ${getStatusColor()}`}>{remainingApplications}</p>
            <p className="text-xs text-muted-foreground">left this week</p>
          </div>

          {/* Weekly Limit */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Crown className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Weekly Limit</span>
            </div>
            <p className="text-2xl font-bold">{maxApplications}</p>
            <p className="text-xs text-muted-foreground">applications</p>
          </div>
        </div>


        {/* Reset Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <CalendarDays className="h-4 w-4" />
          <span>Resets every Sunday at midnight • Upgrade to Tenant Pro for 20 apps/week</span>
        </div>

        {remainingApplications === 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Crown className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Upgrade to Tenant Pro</p>
                <p className="text-blue-700 text-xs mt-1">
                  Get 20 applications per week for just $9.99/month
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicationQuotaDisplay;