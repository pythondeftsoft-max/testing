import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import WhiteLabelBranding from "@/components/WhiteLabelBranding";

type Status = "checking" | "ready" | "invalid";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Establish the recovery session from the link.
  // Supabase's client (detectSessionInUrl: true) parses the recovery token
  // in the URL and fires a PASSWORD_RECOVERY event / sets a temporary session.
  useEffect(() => {
    let resolved = false;

    const markReady = () => {
      if (resolved) return;
      resolved = true;
      setStatus("ready");
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady();
      }
    });

    // In case the event fired before this component mounted, check for an
    // existing session directly.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        markReady();
        return;
      }
      // Give the URL-detection a brief window to complete before deciding the
      // link is invalid/expired.
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          setStatus("invalid");
        }
      }, 3000);
    })();

    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Please use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });

      // The recovery session is single-purpose — sign out so the user logs in
      // cleanly (and passes any MFA checks via the normal flow).
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      console.error("[ResetPassword] updateUser failed:", err);
      toast({
        title: "Could not update password",
        description: err?.message || "The reset link may have expired. Please request a new one.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Reset Password | OpenKey</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button onClick={() => navigate("/")}>
            <WhiteLabelBranding
              className="text-3xl font-bold text-gradient-blue-gold mb-2 hover:opacity-80 transition-colors cursor-pointer"
              fallbackText="OpenKey"
            />
          </button>
          <p className="text-muted-foreground">Real Estate Management Platform</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>
              {status === "ready"
                ? "Choose a strong password you haven't used before."
                : status === "invalid"
                ? "This reset link is invalid or has expired."
                : "Verifying your reset link..."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {status === "checking" && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Verifying...
              </div>
            )}

            {status === "invalid" && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Password reset links expire after a short time and can only be used once. Please request a new one.
                </p>
                <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
                  Back to sign in
                </Button>
              </div>
            )}

            {status === "ready" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">New password *</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">At least 8 characters.</p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm new password *</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={submitting}
                >
                  {submitting ? "Updating..." : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
