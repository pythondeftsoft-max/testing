-- Add UPDATE policy for subscription plans
CREATE POLICY "Admins can update subscription plans"
ON subscription_plans
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add INSERT policy for subscription plans
CREATE POLICY "Admins can insert subscription plans"
ON subscription_plans
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Add DELETE policy for subscription plans
CREATE POLICY "Admins can delete subscription plans"
ON subscription_plans
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));