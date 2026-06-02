import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUserInternationalContext } from '@/hooks/useUserInternationalContext';
import { Globe, Settings } from 'lucide-react';
import { formatContextualCurrency } from '@/lib/internationalUtils';
import { Link } from 'react-router-dom';

export const InternationalContextBadge: React.FC = () => {
  const { internationalContext, isLoading } = useUserInternationalContext();

  if (isLoading || !internationalContext) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
          <Globe className="h-3 w-3" />
          <span className="text-xs font-medium">
            {internationalContext.countryCode} • {internationalContext.currency}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">International Context</h4>
            <p className="text-sm text-muted-foreground">
              Your current location and currency preferences
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Country:</span>
              <Badge variant="secondary">{internationalContext.countryCode}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-medium">{internationalContext.currency}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Locale:</span>
              <span className="font-medium">{internationalContext.locale}</span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="h-3 w-3" />
                Change Preferences
              </Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};