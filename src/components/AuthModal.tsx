
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { checkRateLimit, recordAttempt } from '@/utils/securityHeaders';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthRedirect: (mode: 'login' | 'signup') => void;
}

const AuthModal = ({ isOpen, onClose, onAuthRedirect }: AuthModalProps) => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleAuthRedirect = (mode: 'login' | 'signup') => {
    const clientId = `${navigator.userAgent}_${window.location.hostname}`;
    const rateCheck = checkRateLimit(`auth_modal_${clientId}`, 10, 5 * 60 * 1000); // 10 attempts per 5 minutes
    
    if (!rateCheck.allowed) {
      setIsRateLimited(true);
      setBlockedUntil(rateCheck.blockedUntil || null);
      toast({
        title: "Too many attempts",
        description: `Please wait before trying again. Access will be restored at ${rateCheck.blockedUntil?.toLocaleTimeString()}.`,
        variant: "destructive"
      });
      return;
    }

    recordAttempt(`auth_modal_${clientId}`);
    onAuthRedirect(mode);
  };

  // Reset rate limit state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsRateLimited(false);
      setBlockedUntil(null);
    }
  }, [isOpen]);

  // Check if rate limit has expired
  useEffect(() => {
    if (isRateLimited && blockedUntil) {
      const timer = setInterval(() => {
        if (Date.now() > blockedUntil.getTime()) {
          setIsRateLimited(false);
          setBlockedUntil(null);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isRateLimited, blockedUntil]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>
            You need to be signed in to express interest in properties. Sign in to your account or create a new one to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-4">
          <Button 
            onClick={() => handleAuthRedirect('login')} 
            className="w-full"
            disabled={isRateLimited}
          >
            {isRateLimited ? 'Sign In (Rate Limited)' : 'Sign In'}
          </Button>
          <Button 
            onClick={() => handleAuthRedirect('signup')} 
            variant="outline" 
            className="w-full"
            disabled={isRateLimited}
          >
            {isRateLimited ? 'Create Account (Rate Limited)' : 'Create Account'}
          </Button>
          {isRateLimited && blockedUntil && (
            <p className="text-sm text-muted-foreground text-center">
              Rate limited until {blockedUntil.toLocaleTimeString()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
