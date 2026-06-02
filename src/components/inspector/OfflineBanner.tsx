import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OfflineBanner: React.FC = () => {
  const online = useOnlineStatus();
  return (
    <div
      className={cn(
        'w-full text-center text-xs font-medium py-1.5 transition-colors',
        online ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {online ? 'Online — changes will sync' : 'Offline — changes saved locally'}
      </span>
    </div>
  );
};
