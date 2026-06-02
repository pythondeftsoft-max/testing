CREATE POLICY "Users can delete own rent entries"
  ON self_reported_rent FOR DELETE
  USING (user_id = auth.uid());