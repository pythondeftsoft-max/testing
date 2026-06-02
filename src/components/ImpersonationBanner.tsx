import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserX, Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  isImpersonationMode, 
  getImpersonatedUser, 
  getAdminSessionBackup,
  clearImpersonationData
} from '@/utils/impersonationUtils';

const ImpersonationBanner = () => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  const [exiting, setExiting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkImpersonationStatus();
  }, []);

  const checkImpersonationStatus = () => {
    if (isImpersonationMode()) {
      setIsImpersonating(true);
      setImpersonatedUser(getImpersonatedUser());
    }
  };

  const exitImpersonation = async () => {
    setExiting(true);

    try {
      // SECURITY: We no longer persist admin JWTs in localStorage. To exit
      // impersonation we sign out the impersonated user and redirect the
      // admin to re-authenticate. This eliminates the XSS-token-theft surface.
      clearImpersonationData();
      await supabase.auth.signOut();

      toast({
        title: "Impersonation Ended",
        description: "Please sign in again to return to your admin account.",
      });

      window.location.href = '/auth?redirect=/dashboard';
    } catch (error) {
      console.error('Error exiting impersonation:', error);
      clearImpersonationData();
      window.location.href = '/auth';
    }
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200">
      <Alert className="rounded-none border-0 bg-amber-50">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-medium text-amber-800">
              Admin Impersonation Mode:
            </span>
            <span className="text-amber-700">
              You are currently impersonating {impersonatedUser?.name} ({impersonatedUser?.user_type})
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exitImpersonation}
            disabled={exiting}
            className="ml-4 border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            {exiting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                Exiting...
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Impersonation
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ImpersonationBanner;