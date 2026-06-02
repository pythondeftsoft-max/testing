import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

export default function MfaChallenge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (!verified) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setFactorId(verified.id);
      setLoading(false);
    })();
  }, [navigate]);

  const verify = async () => {
    if (!factorId) return;
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;

      if (user) {
        await supabase
          .from("user_mfa_settings")
          .update({ last_verified_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }
      toast({ title: "Verified" });
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast({ title: "Invalid code", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Verify Identity — OpenKey</title>
      </Helmet>
      <div className="flex items-center justify-center min-h-screen p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-center">Two-factor verification</CardTitle>
            <CardDescription className="text-center">
              Enter the 6-digit code from your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mfa-code" className="sr-only">Code</Label>
              <Input
                id="mfa-code"
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl font-mono tracking-[0.5em]"
                placeholder="000000"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.length === 6) verify();
                }}
              />
            </div>
            <Button className="w-full" onClick={verify} disabled={verifying || code.length !== 6}>
              {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify
            </Button>
            <div className="text-center">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/login", { replace: true });
                }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Sign out
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
