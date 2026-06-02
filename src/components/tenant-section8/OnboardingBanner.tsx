
import React from 'react';
import { Info } from 'lucide-react';

interface OnboardingBannerProps {
  isOnboarded: boolean;
  agencyName?: string;
}

const OnboardingBanner = ({ isOnboarded, agencyName }: OnboardingBannerProps) => {
  if (isOnboarded) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
      <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {agencyName || 'This agency'} is not yet on OpenKey
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Your submission will be saved as a pre-registration and processed once the agency joins the platform.
        </p>
      </div>
    </div>
  );
};

export default OnboardingBanner;
