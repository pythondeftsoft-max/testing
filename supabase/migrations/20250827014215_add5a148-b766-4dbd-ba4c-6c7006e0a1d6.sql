
-- Step B: RLS policies for portfolio_asset_invitations and safe RPC fallback

-- 1) Enable RLS (safe if already enabled)
ALTER TABLE public.portfolio_asset_invitations ENABLE ROW LEVEL SECURITY;

-- 2) Portfolio members can view invitations for assets in portfolios they can access
--    This policy avoids referencing auth.users directly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'portfolio_asset_invitations'
      AND policyname = 'Portfolio members can view asset invitations'
  ) THEN
    CREATE POLICY "Portfolio members can view asset invitations"
      ON public.portfolio_asset_invitations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.portfolio_assets pa
          WHERE pa.id = portfolio_asset_invitations.asset_id
            AND has_portfolio_role(
                  pa.portfolio_id,
                  auth.uid(),
                  ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]
                )
        )
      );
  END IF;
END$$;

-- 3) Portfolio editors/admin_partners can create/update/cancel invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'portfolio_asset_invitations'
      AND policyname = 'Portfolio editors can manage asset invitations'
  ) THEN
    CREATE POLICY "Portfolio editors can manage asset invitations"
      ON public.portfolio_asset_invitations
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.portfolio_assets pa
          WHERE pa.id = portfolio_asset_invitations.asset_id
            AND has_portfolio_role(
                  pa.portfolio_id,
                  auth.uid(),
                  ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]
                )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.portfolio_assets pa
          WHERE pa.id = portfolio_asset_invitations.asset_id
            AND has_portfolio_role(
                  pa.portfolio_id,
                  auth.uid(),
                  ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]
                )
        )
      );
  END IF;
END$$;

-- 4) RPC fallback to fetch invitations without touching any policies that might reference auth.users
--    This function authorizes via has_portfolio_role and returns rows for the asset.
CREATE OR REPLACE FUNCTION public.get_asset_invitations(p_asset_id uuid)
RETURNS SETOF public.portfolio_asset_invitations
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Authorization: caller must have a portfolio role for the asset's portfolio
  IF NOT EXISTS (
    SELECT 1
    FROM public.portfolio_assets pa
    WHERE pa.id = p_asset_id
      AND has_portfolio_role(
            pa.portfolio_id,
            auth.uid(),
            ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]
          )
  ) THEN
    RAISE EXCEPTION 'Not authorized to view invitations for this asset';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.portfolio_asset_invitations pai
  WHERE pai.asset_id = p_asset_id
  ORDER BY pai.created_at DESC;
END;
$function$;

-- 5) Ensure execution permission for standard web roles
GRANT EXECUTE ON FUNCTION public.get_asset_invitations(uuid) TO anon, authenticated;
