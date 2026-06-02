import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LinkState =
  | { kind: "loading" }
  | { kind: "redirecting"; url: string; address: string | null }
  | { kind: "paid"; address: string | null }
  | { kind: "superseded"; address: string | null }
  | { kind: "not_found" };

export default function PaymentRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LinkState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!slug) {
        setState({ kind: "not_found" });
        return;
      }
      try {
        const { data, error } = await (supabase as any).rpc(
          "resolve_placement_fee_payment_link",
          { _slug: slug }
        );
        if (cancelled) return;
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setState({ kind: "not_found" });
          return;
        }
        const address: string | null = row.property_address ?? null;
        if (row.paid_at) {
          setState({ kind: "paid", address });
          return;
        }
        if (row.superseded_at) {
          setState({ kind: "superseded", address });
          return;
        }
        if (!row.stripe_checkout_url) {
          setState({ kind: "not_found" });
          return;
        }
        setState({ kind: "redirecting", url: row.stripe_checkout_url, address });
        // Give the page a tick to render the branded "Redirecting" state.
        setTimeout(() => {
          window.location.href = row.stripe_checkout_url;
        }, 400);
      } catch (err) {
        console.error("Error resolving payment link:", err);
        if (!cancelled) setState({ kind: "not_found" });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight text-foreground">
            OpenKey Housing
          </Link>
          <span className="text-xs text-muted-foreground">Secure payment</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-lg">
          {state.kind === "loading" && (
            <>
              <CardHeader className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
                <CardTitle>Preparing your secure checkout…</CardTitle>
                <CardDescription>
                  We're verifying your placement fee link.
                </CardDescription>
              </CardHeader>
            </>
          )}

          {state.kind === "redirecting" && (
            <>
              <CardHeader className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
                <CardTitle>Redirecting to Stripe…</CardTitle>
                <CardDescription>
                  {state.address ? (
                    <>Placement fee for <span className="font-medium text-foreground">{state.address}</span></>
                  ) : (
                    "Taking you to a secure Stripe checkout."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <a href={state.url}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open checkout manually
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  If nothing happens in a few seconds, click the button above.
                </p>
              </CardContent>
            </>
          )}

          {state.kind === "paid" && (
            <>
              <CardHeader className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Placement fee already paid</CardTitle>
                <CardDescription>
                  {state.address
                    ? <>Thanks — the placement fee for <span className="font-medium text-foreground">{state.address}</span> is on file.</>
                    : "Thanks — this placement fee has already been received."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">Back to OpenKey Housing</Link>
                </Button>
              </CardContent>
            </>
          )}

          {state.kind === "superseded" && (
            <>
              <CardHeader className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-amber-600" />
                </div>
                <CardTitle>This link has been replaced</CardTitle>
                <CardDescription>
                  {state.address
                    ? <>A newer payment link was generated for <span className="font-medium text-foreground">{state.address}</span>. Please use the most recent one we sent you.</>
                    : "A newer payment link was generated for this property. Please use the most recent one we sent you."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <a href="mailto:support@openkeyhousing.com">Contact support</a>
                </Button>
              </CardContent>
            </>
          )}

          {state.kind === "not_found" && (
            <>
              <CardHeader className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>Payment link not found</CardTitle>
                <CardDescription>
                  This link doesn't match any active placement fee. It may have been mistyped, or the fee was cancelled. Please contact support if you need a new link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <a href="mailto:support@openkeyhousing.com">Contact support</a>
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </main>

      <footer className="border-t">
        <div className="max-w-4xl mx-auto px-6 py-4 text-xs text-muted-foreground text-center">
          Payments are processed securely by Stripe. © OpenKey Housing.
        </div>
      </footer>
    </div>
  );
}
