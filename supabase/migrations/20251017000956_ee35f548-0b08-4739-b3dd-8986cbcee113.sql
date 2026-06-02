-- Grant execute permission on get_user_points_summary to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_points_summary(uuid, uuid) TO authenticated;

-- Ensure RLS policies allow users to see their own points
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'portfolio_user_points' 
    AND policyname = 'Users can view their own points via RPC'
  ) THEN
    CREATE POLICY "Users can view their own points via RPC"
      ON public.portfolio_user_points
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Ensure point_conversions table has proper access
ALTER TABLE public.point_conversions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'point_conversions' 
    AND policyname = 'Users can view point conversions'
  ) THEN
    CREATE POLICY "Users can view point conversions"
      ON public.point_conversions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;