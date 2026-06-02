import { useEffect, useCallback, useState, useRef } from 'react';
import { useActiveGrants } from '@/hooks/useActiveGrants';
import { toast } from 'sonner';

export const useGrantExpiryAlerts = () => {
  const { data: grants } = useActiveGrants();
  const toastIdsRef = useRef<Set<string>>(new Set());
  const [extensionDialog, setExtensionDialog] = useState<{
    open: boolean;
    scope: 'account' | 'portfolio';
    portfolioId?: string | null;
    objectName: string;
    action: 'view' | 'edit' | 'delete' | 'create';
  } | null>(null);

  const clearToasts = useCallback(() => {
    toastIdsRef.current.forEach(id => toast.dismiss(id));
    toastIdsRef.current.clear();
  }, []);

  const scheduleExpiryAlert = useCallback((grant: any, minutesUntilExpiry: number) => {
    const toastId = `expiry-${grant.object_name}-${grant.action}-${minutesUntilExpiry}`;
    
    if (toastIdsRef.current.has(toastId)) return;

    const timeoutMs = (minutesUntilExpiry - 1) * 60 * 1000; // 1 minute before the threshold
    
    if (timeoutMs <= 0) {
      // Show immediately if already within threshold
      const id = toast.warning(
        `Access expires in ${minutesUntilExpiry}m`,
        {
          description: `${grant.action} access to ${grant.object_name}`,
          action: {
            label: 'Request Extension',
            onClick: () => {
              setExtensionDialog({
                open: true,
                scope: grant.scope,
                portfolioId: grant.portfolio_id,
                objectName: grant.object_name,
                action: grant.action,
              });
            },
          },
          duration: Infinity, // Keep visible until dismissed
        }
      );
      
      toastIdsRef.current.add(toastId);
      return;
    }

    setTimeout(() => {
      const id = toast.warning(
        `Access expires in ${minutesUntilExpiry}m`,
        {
          description: `${grant.action} access to ${grant.object_name}`,
          action: {
            label: 'Request Extension',
            onClick: () => {
              setExtensionDialog({
                open: true,
                scope: grant.scope,
                portfolioId: grant.portfolio_id,
                objectName: grant.object_name,
                action: grant.action,
              });
            },
          },
          duration: minutesUntilExpiry === 1 ? Infinity : 10000, // Keep final alert visible
        }
      );
      
      toastIdsRef.current.add(toastId);
    }, timeoutMs);
  }, []);

  useEffect(() => {
    if (!grants || grants.length === 0) {
      clearToasts();
      return;
    }

    clearToasts(); // Clear existing toasts when grants change

    grants.forEach(grant => {
      const now = new Date();
      const expiresAt = new Date(grant.expires_at);
      const minutesUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));

      // Schedule alerts for 10m, 5m, and 1m before expiry
      if (minutesUntilExpiry > 9) {
        scheduleExpiryAlert(grant, 10);
      }
      if (minutesUntilExpiry > 4) {
        scheduleExpiryAlert(grant, 5);
      }
      if (minutesUntilExpiry > 0) {
        scheduleExpiryAlert(grant, 1);
      }
    });

    return () => {
      clearToasts();
    };
  }, [grants, scheduleExpiryAlert, clearToasts]);

  return { 
    extensionDialog,
    setExtensionDialog,
  };
};