import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'inspector_install_dismissed';

const InstallPWAPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    // Already installed (standalone)?
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    setIsIos(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);

    // iOS has no beforeinstallprompt — show manual instructions.
    if (ios) setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-3 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 text-xs">
          <div className="font-semibold text-sm mb-0.5">Install for offline use</div>
          {isIos ? (
            <p className="text-muted-foreground">
              In Safari, tap the <span className="font-medium">Share</span> icon, then{' '}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Add the inspector app to your home screen for full offline support.
            </p>
          )}
        </div>
        {!isIos && deferredPrompt && (
          <Button size="sm" onClick={install}>
            <Download className="w-3.5 h-3.5 mr-1" /> Install
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={dismiss}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default InstallPWAPrompt;
