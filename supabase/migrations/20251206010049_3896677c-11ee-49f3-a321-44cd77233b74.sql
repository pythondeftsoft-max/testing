-- Add admin SELECT policies for rent tracking tables

-- 1. Admin policy for rent_payments
CREATE POLICY "Admins can view all rent payments"
ON rent_payments FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 2. Admin policy for landlord_payment_splits
CREATE POLICY "Admins can view all payment splits"
ON landlord_payment_splits FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Admin policy for landlord_plaid_transactions
CREATE POLICY "Admins can view all plaid transactions"
ON landlord_plaid_transactions FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));