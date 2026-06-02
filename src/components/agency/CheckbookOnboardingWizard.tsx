import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, ExternalLink, Loader2, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  onConnected: () => void;
}

const STEPS = ['Intro', 'Get Key', 'Paste & Encrypt', 'Test'];

export default function CheckbookOnboardingWizard({ open, onOpenChange, agencyId, onConnected }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('Operating Account – Checkbook');
  const [accountEmail, setAccountEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [balanceResult, setBalanceResult] = useState<{ success: boolean; available_balance?: number | null; error?: string | null } | null>(null);

  const reset = () => {
    setStep(0);
    setDisplayName('Operating Account – Checkbook');
    setAccountEmail('');
    setApiKey('');
    setIsDefault(true);
    setBalanceResult(null);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleSaveAndTest = async () => {
    if (!apiKey.trim() || !displayName.trim()) {
      toast({ title: 'Missing fields', description: 'API key and display name are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.functions.invoke('save-payment-rail', {
      body: {
        agency_id: agencyId,
        rail_type: 'checkbook',
        display_name: displayName.trim(),
        is_default: isDefault,
        credentials: { api_key: apiKey.trim() },
        config: { account_email: accountEmail.trim() || null },
      },
    });

    setSaving(false);
    if (error || !data?.success) {
      toast({
        title: 'Failed to save rail',
        description: error?.message || data?.error || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Credentials encrypted & saved', description: 'Now let\'s test the connection.' });
    setStep(3);
    runBalanceTest();
  };

  const runBalanceTest = async () => {
    setTesting(true);
    setBalanceResult(null);
    // Test using the raw credentials we just saved (avoids needing the new rail_id round-trip)
    const { data, error } = await supabase.functions.invoke('check-rail-balance', {
      body: {
        rail_type: 'checkbook',
        credentials: { api_key: apiKey.trim() },
      },
    });
    setTesting(false);
    if (error) {
      setBalanceResult({ success: false, error: error.message });
      return;
    }
    setBalanceResult(data);
  };

  const handleFinish = () => {
    onConnected();
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Connect Checkbook.io
          </DialogTitle>
          <DialogDescription>
            Guided setup — your funds, your account, our software. We never hold your money.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Stepper currentStep={step} steps={STEPS} />
        </div>

        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="font-semibold">How this works</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary">①</span> Your bank account funds your Checkbook account.</li>
                <li className="flex gap-2"><span className="text-primary">②</span> Our platform sends payouts on your behalf using your credentials.</li>
                <li className="flex gap-2"><span className="text-primary">③</span> Money flows directly from your Checkbook account → landlord. We never touch it.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex gap-2">
                <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Your API key is encrypted at rest</p>
                  <p className="text-muted-foreground mt-1">
                    Credentials are sealed using authenticated encryption (pgsodium AEAD) and only decrypted server-side
                    by the payout edge function. Nobody — including platform admins — can read them in the database.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You'll need a Checkbook.io account. If you don't have one yet, you can sign up in the next step.
            </p>
          </div>
        )}

        {/* Step 1: Get credentials */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold">Get your Checkbook API key</h4>
              <ol className="text-sm space-y-2 text-muted-foreground list-decimal pl-5">
                <li>
                  <a href="https://checkbook.io/signup" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                    Sign up for Checkbook.io <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  (or sign in if you already have an account).
                </li>
                <li>Complete business verification — typically 1–2 business days for PHAs.</li>
                <li>
                  Open{' '}
                  <a href="https://checkbook.io/developers/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                    Settings → Developer → API Keys <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Create a <strong>Production</strong> key (or use a Sandbox key for testing).</li>
                <li>Copy the key — you'll paste it on the next step.</li>
              </ol>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-foreground">
                  Treat this key like a password. Anyone with it can move money out of your Checkbook account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Paste & encrypt */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            <div>
              <Label>Display name</Label>
              <Input
                placeholder="e.g. Operating Account – Checkbook"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Helps you tell rails apart if you connect more than one.</p>
            </div>
            <div>
              <Label>Account email (optional)</Label>
              <Input
                placeholder="finance@yourpha.gov"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Checkbook API key</Label>
              <Input
                type="password"
                placeholder="Paste your Checkbook API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Encrypted server-side via pgsodium before storage. Never logged.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label>Set as default rail for this agency</Label>
            </div>
          </div>
        )}

        {/* Step 3: Test */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Connection test
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                We're calling Checkbook with your credentials to confirm they work and read your available balance.
                No money moves.
              </p>

              {testing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Testing…
                </div>
              )}

              {!testing && balanceResult?.success && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Connection verified
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Available balance:{' '}
                    <span className="font-medium text-foreground">
                      ${Number(balanceResult.available_balance ?? 0).toFixed(2)}
                    </span>
                  </p>
                  <Badge variant="outline" className="gap-1 text-xs mt-1">🔒 Credentials encrypted</Badge>
                </div>
              )}

              {!testing && balanceResult && !balanceResult.success && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-destructive">
                    <AlertTriangle className="w-4 h-4" /> Test failed
                  </div>
                  <p className="text-muted-foreground mt-1">{balanceResult.error}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Your credentials are still saved. You can retest from the rails list, or remove and reconnect.
                  </p>
                </div>
              )}

              {!testing && (
                <Button variant="outline" size="sm" className="mt-3" onClick={runBalanceTest}>
                  Re-run test
                </Button>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 0 && step < 3 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>
              Back
            </Button>
          )}
          {step < 2 && (
            <>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => setStep(step + 1)}>Continue</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
              <Button onClick={handleSaveAndTest} disabled={saving || !apiKey.trim() || !displayName.trim()}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Encrypting…</> : 'Save & Test'}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={handleFinish} disabled={testing}>
              {balanceResult?.success ? 'Done' : 'Finish anyway'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
