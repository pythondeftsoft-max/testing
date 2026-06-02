
-- =============================================
-- 1. user_points: Remove client-side UPDATE
-- =============================================
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;

-- =============================================
-- 2. point_conversions: Remove duplicate broad SELECT
-- =============================================
DROP POLICY IF EXISTS "Users can view point conversions" ON public.point_conversions;

-- =============================================
-- 3. content: Restrict writes to admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can delete content" ON public.content;
DROP POLICY IF EXISTS "Authenticated users can insert content" ON public.content;
DROP POLICY IF EXISTS "Authenticated users can update content" ON public.content;

CREATE POLICY "Admins can manage content" ON public.content
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 4. notification_configurations: Restrict to admins
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated users to manage notification configurations" ON public.notification_configurations;

CREATE POLICY "Admins can manage notification configurations" ON public.notification_configurations
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 5. implementation_tasks: Restrict to admins
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated users to delete implementation tasks" ON public.implementation_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert implementation tasks" ON public.implementation_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update implementation tasks" ON public.implementation_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to view implementation tasks" ON public.implementation_tasks;

CREATE POLICY "Admins can manage implementation tasks" ON public.implementation_tasks
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 6. ai_implementation_suggestions: Restrict to admins
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated users to manage AI suggestions" ON public.ai_implementation_suggestions;
DROP POLICY IF EXISTS "Allow authenticated users to view AI suggestions" ON public.ai_implementation_suggestions;

CREATE POLICY "Admins can manage AI suggestions" ON public.ai_implementation_suggestions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 7. worker_time_entries: Scope reads
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read all time entries" ON public.worker_time_entries;

CREATE POLICY "Workers can read own time entries" ON public.worker_time_entries
  FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR public.is_admin(auth.uid()));

-- =============================================
-- 8. account_invitations: Scope acceptance update
-- =============================================
DROP POLICY IF EXISTS "System can update invitations during acceptance" ON public.account_invitations;

CREATE POLICY "Users can accept their own invitations" ON public.account_invitations
  FOR UPDATE TO authenticated
  USING (email = public.get_user_email(auth.uid()));

-- =============================================
-- 9. matchmaker_stats: Restrict management to admins
-- =============================================
DROP POLICY IF EXISTS "System can manage matchmaker stats" ON public.matchmaker_stats;

CREATE POLICY "Admins can manage matchmaker stats" ON public.matchmaker_stats
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 10. points_admin_audit: Restrict INSERT to admins
-- =============================================
DROP POLICY IF EXISTS "System can insert audit logs" ON public.points_admin_audit;

CREATE POLICY "Admins can insert audit logs" ON public.points_admin_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 11. rfta_packets: Restrict anon UPDATE to safe fields only
-- =============================================
DROP POLICY IF EXISTS "Anyone can update rfta_packets via share_token" ON public.rfta_packets;

-- Create a security definer function for safe rfta updates via share token
CREATE OR REPLACE FUNCTION public.update_rfta_packet_by_token(
  p_share_token text,
  p_landlord_data jsonb DEFAULT NULL,
  p_packet_data jsonb DEFAULT NULL,
  p_landlord_signature text DEFAULT NULL,
  p_landlord_signed_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE rfta_packets
  SET
    landlord_data = COALESCE(p_landlord_data, landlord_data),
    packet_data = COALESCE(p_packet_data, packet_data),
    landlord_signature = COALESCE(p_landlord_signature, landlord_signature),
    landlord_signed_at = COALESCE(p_landlord_signed_at, landlord_signed_at),
    updated_at = now()
  WHERE share_token = p_share_token
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;
