import { Lock, Crown, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LockedFinancialSectionProps {
  title: string;
  icon: LucideIcon;
}

export const LockedFinancialSection = ({ title, icon: Icon }: LockedFinancialSectionProps) => {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <Lock className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Icon className="h-5 w-5" />
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground/80">
              This financial information is only available for primary applicants
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground/60 pt-2">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-medium">Set as Primary to Unlock</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
