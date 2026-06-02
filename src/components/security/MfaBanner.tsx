import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRIVILEGED_ROLES = new Set([
  "admin",
  "system_admin",
  "agency_admin",
  "agency_staff",
  "caseworker",
  "caseworker_supervisor",
  "inspector",
]);

// Routes where the MFA reminder must NOT appear (public marketing, auth,
// public invoice/claim/demo pages, SEO landings).
const PUBLIC_EXACT = new Set([
  "/",
  "/about",
  "/find-home",
  "/browse-properties",
  "/section8-info",
  "/application-process",
  "/blog",
  "/trust",
  "/privacy-center",
  "/login",
  "/agency/login",
  "/agency-login",
  "/auth",
  "/sitemap.xml",
  "/robots.txt",
  "/404",
  "/not-found",
]);

const PUBLIC_PREFIXES = [
  "/blog/",
  "/privacy",
  "/terms",
  "/auth/",
  "/agency/invoice/",
  "/claim/",
  "/demos/",
  "/demo/",
  "/section-8/",
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Advisory banner shown to privileged users who haven't enrolled in MFA yet.
 * Hidden for tenants/landlords, on public pages, and while auth is loading.
 * Dismissal is per-user (localStorage keyed by user.id) and re-surfaces after 7 days.
 */
export function MfaBanner() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Re-evaluate dismissal whenever user changes
  useEffect(() => {
    if (!user) {
      setDismissed(false);
      return;
    }
    try {
      const raw = localStorage.getItem(`mfa-banner-dismissed:${user.id}`);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Date.parse(raw);
      if (Number.isNaN(ts) || Date.now() - ts > DISMISS_TTL_MS) {
        setDismissed(false);
      } else {
        setDismissed(true);
      }
    } catch {
      setDismissed(false);
    }
  }, [user]);

  useEffect(() => {
    if (loading || !user) {
      setShow(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const isPrivileged = (roles ?? []).some((r: any) => PRIVILEGED_ROLES.has(r.role));
        if (!isPrivileged) return;

        const { data: factors } = await supabase.auth.mfa.listFactors();
        const enrolled = (factors?.totp ?? []).some((f) => f.status === "verified");
        if (!cancelled && !enrolled) setShow(true);
      } catch {
        // fail silently — banner is advisory
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  // Gate: hide until auth resolves, hide for anon users, hide on public routes
  if (loading || !user) return null;
  if (isPublicRoute(location.pathname)) return null;
  if (!show || dismissed) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-900 px-4 py-2">
      <div className="container flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-yellow-900 dark:text-yellow-200">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            Your account has elevated access. Enable two-factor authentication to protect tenant and agency data.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="default">
            <Link to="/account/security">Enable MFA</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                localStorage.setItem(
                  `mfa-banner-dismissed:${user.id}`,
                  new Date().toISOString(),
                );
              } catch {
                // ignore storage errors
              }
              setDismissed(true);
            }}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MfaBanner;
