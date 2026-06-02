-- Table to store custom notification configurations
CREATE TABLE IF NOT EXISTS notification_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('tenant', 'landlord')),
  custom_link text,
  custom_trigger text,
  custom_category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(notification_type, user_type)
);

-- Add RLS policies
ALTER TABLE notification_configurations ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read
CREATE POLICY "Allow authenticated users to read notification configurations"
  ON notification_configurations
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can manage
CREATE POLICY "Allow authenticated users to manage notification configurations"
  ON notification_configurations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_notification_configurations_type_user 
  ON notification_configurations(notification_type, user_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_configurations_updated_at
  BEFORE UPDATE ON notification_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_configurations_updated_at();

-- Add comment
COMMENT ON TABLE notification_configurations IS 'Stores custom configurations for notification types including links and triggers';