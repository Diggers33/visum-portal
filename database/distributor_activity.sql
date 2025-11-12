-- Create distributor_activity table for tracking user engagement
CREATE TABLE IF NOT EXISTS distributor_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'page_view', 'download', 'search', 'product_view')),
  page_url TEXT,
  resource_type TEXT CHECK (resource_type IN ('product', 'document', 'marketing_asset', 'training', NULL)),
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_distributor_activity_user_id ON distributor_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_distributor_activity_type ON distributor_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_distributor_activity_created_at ON distributor_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_distributor_activity_resource ON distributor_activity(resource_type, resource_id);

-- Enable Row Level Security
ALTER TABLE distributor_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can SELECT all activity records
CREATE POLICY "Admins can view all activity"
  ON distributor_activity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Policy: Authenticated users can INSERT their own activity
CREATE POLICY "Users can insert their own activity"
  ON distributor_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: No UPDATE allowed (activity is immutable)
-- No UPDATE policy needed - activity records should not be modified

-- Policy: No DELETE allowed (preserve activity history)
-- No DELETE policy needed - activity records should be permanent

-- Grant permissions
GRANT SELECT ON distributor_activity TO authenticated;
GRANT INSERT ON distributor_activity TO authenticated;

-- Create a view for admin reports with user details
CREATE OR REPLACE VIEW distributor_activity_report AS
SELECT
  da.id,
  da.user_id,
  up.email AS user_email,
  up.full_name AS user_name,
  up.company AS user_company,
  da.activity_type,
  da.page_url,
  da.resource_type,
  da.resource_id,
  da.resource_name,
  da.metadata,
  da.ip_address,
  da.user_agent,
  da.created_at
FROM distributor_activity da
LEFT JOIN user_profiles up ON da.user_id = up.id;

-- Grant SELECT on view to authenticated users (RLS still applies)
GRANT SELECT ON distributor_activity_report TO authenticated;

COMMENT ON TABLE distributor_activity IS 'Tracks distributor engagement and activity within the portal';
COMMENT ON COLUMN distributor_activity.activity_type IS 'Type of activity: login, page_view, download, search, product_view';
COMMENT ON COLUMN distributor_activity.resource_type IS 'Type of resource accessed: product, document, marketing_asset, training';
COMMENT ON COLUMN distributor_activity.metadata IS 'Additional contextual data stored as JSON';
