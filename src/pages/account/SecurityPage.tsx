import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldAlert, Trash2, Download, KeyRound, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import { resolveMfaIssuer } from "@/utils/mfaIssuer";
import { useNavigate } from "react-router-dom";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < count; i++) {
    let c = "";
    for (let j = 0; j < 10; j++) {
      c += chars[Math.floor(Math.random() * chars.length)];
      if (j === 4) c += "-";
    }
    codes.push(c);
  }
  return codes;
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function SecurityPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [pending, setPending] = useState<{ id: string; qr: string; secret: string; issuer: string } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const loadFactors = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast({ title: "Failed to load MFA factors", description: error.message, variant: "destructive" });
    } else {
      setFactors([...(data?.totp ?? []), ...(data?.phone ?? [])] as Factor[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadFactors();
  }, [user]);

  const startEnrollment = async () => {
    if (!user) return;
    setEnrolling(true);
    try {
      const issuer = await resolveMfaIssuer(user.id);
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer,
        friendlyName: `${issuer} (${user.email ?? user.id})`,
      } as any);
      if (error) throw error;
      setPending({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        issuer,
      });
    } catch (e: any) {
      toast({ title: "Enrollment failed", description: e.message, variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const cancelEnrollment = async () => {
    if (!pending) return;
    await supabase.auth.mfa.unenroll({ factorId: pending.id });
    setPending(null);
    setCode("");
  };

  const verifyEnrollment = async () => {
    if (!pending || !user) return;
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: pending.id });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: pending.id,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;

      // Generate + store hashed backup codes
      const codes = generateBackupCodes(10);
      const hashed = await Promise.all(codes.map(sha256));
      const { error: upsertErr } = await supabase
        .from("user_mfa_settings")
        .upsert({
          user_id: user.id,
          totp_factor_id: pending.id,
          enrolled_at: new Date().toISOString(),
          backup_codes_hash: hashed,
          backup_codes_remaining: codes.length,
          last_verified_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (upsertErr) throw upsertErr;

      setBackupCodes(codes);
      setPending(null);
      setCode("");
      await loadFactors();
      toast({ title: "MFA enabled", description: "Save your backup codes somewhere safe." });
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const removeFactor = async (id: string) => {
    if (!confirm("Remove this MFA factor? You'll need to re-enroll to use MFA again.")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      toast({ title: "Remove failed", description: error.message, variant: "destructive" });
      return;
    }
    if (user) {
      await supabase.from("user_mfa_settings").delete().eq("user_id", user.id);
    }
    await loadFactors();
    toast({ title: "MFA disabled" });
  };

  const downloadBackupCodes = () => {
    if (!backupCodes) return;
    const text =
      "OpenKey Housing — MFA Backup Codes\n" +
      "Each code can be used once. Store these somewhere safe.\n\n" +
      backupCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openkey-mfa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enrolled = factors.some((f) => f.status === "verified");

  return (
    <>
      <Helmet>
        <title>Account Security — OpenKey</title>
        <meta name="description" content="Manage two-factor authentication for your OpenKey account." />
      </Helmet>

      <div className="container max-w-3xl py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={goBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Account Security</h1>
          <p className="text-muted-foreground mt-1">
            Add an extra layer of protection to your account with two-factor authentication.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Two-Factor Authentication (TOTP)
                </CardTitle>
                <CardDescription>
                  Use an app like Google Authenticator, 1Password, or Authy.
                </CardDescription>
              </div>
              {enrolled ? (
                <Badge variant="default" className="bg-green-600">Enabled</Badge>
              ) : (
                <Badge variant="outline">Not enabled</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : factors.length > 0 ? (
              <div className="space-y-2">
                {factors.map((f) => (
                  <div key={f.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <div className="font-medium">{f.friendly_name || "Authenticator app"}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.factor_type.toUpperCase()} · {f.status}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFactor(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>No MFA configured</AlertTitle>
                <AlertDescription>
                  Anyone with your password can sign in. Add an authenticator app to protect your account.
                </AlertDescription>
              </Alert>
            )}

            {!pending && !enrolled && (
              <Button onClick={startEnrollment} disabled={enrolling}>
                {enrolling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Set up authenticator app
              </Button>
            )}

            {pending && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  This device will appear in your authenticator app as{" "}
                  <strong className="text-foreground">{pending.issuer}</strong>.
                </p>
                <div>
                  <h3 className="font-semibold mb-2">1. Scan this QR code</h3>
                  <img src={pending.qr} alt="MFA QR code" className="bg-white p-2 rounded border" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Or enter manually: <code className="font-mono">{pending.secret}</code>
                  </p>
                </div>
                <div>
                  <Label htmlFor="mfa-code">2. Enter the 6-digit code from your app</Label>
                  <Input
                    id="mfa-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="mt-1 max-w-[200px] text-lg font-mono tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={verifyEnrollment} disabled={verifying || code.length !== 6}>
                    {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Verify & enable
                  </Button>
                  <Button variant="outline" onClick={cancelEnrollment}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {backupCodes && (
          <Card className="border-yellow-500/50 bg-yellow-50/40 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-yellow-600" />
                Save your backup codes
              </CardTitle>
              <CardDescription>
                If you ever lose access to your authenticator app, these one-time codes let you (or an OpenKey admin) recover your account. Save them in a password manager — we won't show them again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((c) => (
                  <div key={c} className="bg-background border rounded px-2 py-1.5">{c}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadBackupCodes}>
                  <Download className="h-4 w-4 mr-2" />
                  Download as .txt
                </Button>
                <Button variant="outline" onClick={() => setBackupCodes(null)}>
                  I've saved them
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={() => navigate("/dashboard")}>Done</Button>
        </div>
      </div>
    </>
  );
}
