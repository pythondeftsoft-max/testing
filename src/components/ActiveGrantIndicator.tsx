import { useState, useEffect } from 'react';
import { Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useActiveGrants } from '@/hooks/useActiveGrants';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const ActiveGrantIndicator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: grants, isLoading } = useActiveGrants();
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Get the earliest expiring grant
  const nextExpiringGrant = grants?.[0];

  useEffect(() => {
    if (!nextExpiringGrant) {
      setTimeLeft('');
      return;
    }

    const updateTimeLeft = () => {
      const now = new Date();
      const expiresAt = new Date(nextExpiringGrant.expires_at);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextExpiringGrant]);

  if (isLoading || !grants || grants.length === 0) {
    return null;
  }

  const handleClick = () => {
    navigate('/settings/my-access');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            className="gap-2 h-8 px-2"
          >
            <Shield className="h-4 w-4 text-primary" />
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {timeLeft}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm">
            <p className="font-medium">Temporary access active</p>
            <p className="text-muted-foreground">
              {grants.length} grant{grants.length > 1 ? 's' : ''} • Next expires in {timeLeft}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click to view all grants
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};