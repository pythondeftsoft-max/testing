import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve the MFA issuer label shown in the user's authenticator app.
 * - OpenKey admins → "OpenKey Housing Admin"
 * - Agency staff   → "<Authority Name> — OpenKey"
 * - Everyone else  → "OpenKey"
 */
export async function resolveMfaIssuer(userId: string): Promise<string> {
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (roleSet.has("admin") || roleSet.has("system_admin")) {
      return "OpenKey Housing Admin";
    }

    const { data: staff } = await supabase
      .from("agency_staff")
      .select("agency:housing_authorities(name)")
      .eq("user_id", userId)
      .maybeSingle();

    const agencyName = (staff as any)?.agency?.name as string | undefined;
    if (agencyName) return `${agencyName} — OpenKey`;
  } catch {
    // fall through to default
  }
  return "OpenKey";
}
