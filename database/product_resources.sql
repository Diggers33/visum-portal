-- Create product_resources table
-- This table stores resources (datasheets, manuals, videos, etc.) associated with products

CREATE TABLE IF NOT EXISTS product_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'datasheet',
    'manual',
    'brochure',
    'video',
    'demo_video',
    'training_video',
    'application_note',
    'case_study',
    'whitepaper',
    'presentation',
    'press_release',
    'social_image',
    'other'
  )),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT, -- Size in bytes
  file_type TEXT, -- e.g., 'PDF', 'MP4', 'PPTX', etc.
  description TEXT,
  category TEXT, -- 'documentation', 'marketing', 'training', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_resources_product_id ON product_resources(product_id);

-- Create index on resource_type for filtering
CREATE INDEX IF NOT EXISTS idx_product_resources_type ON product_resources(resource_type);

-- Enable Row Level Security
ALTER TABLE product_resources ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read product resources
CREATE POLICY "Allow authenticated users to read product resources"
  ON product_resources
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow admins to insert product resources
CREATE POLICY "Allow admins to insert product resources"
  ON product_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create policy to allow admins to update product resources
CREATE POLICY "Allow admins to update product resources"
  ON product_resources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create policy to allow admins to delete product resources
CREATE POLICY "Allow admins to delete product resources"
  ON product_resources
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_product_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_resources_updated_at
  BEFORE UPDATE ON product_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_product_resources_updated_at();

-- Insert sample data (optional - for testing)
-- Uncomment and adjust product_id values to match your actual products
/*
INSERT INTO product_resources (product_id, resource_type, title, file_url, file_size, file_type, description) VALUES
  ('your-product-id-here', 'datasheet', 'Product Datasheet', 'https://example.com/datasheet.pdf', 2516582, 'PDF', 'Technical specifications and product overview'),
  ('your-product-id-here', 'manual', 'User Manual', 'https://example.com/manual.pdf', 5347328, 'PDF', 'Complete user guide and operating instructions'),
  ('your-product-id-here', 'video', 'Product Demo Video', 'https://www.youtube.com/watch?v=example', 0, 'MP4', 'Overview and demonstration of key features'),
  ('your-product-id-here', 'application_note', 'Application Notes', 'https://example.com/app-notes.pdf', 3355443, 'PDF', 'Industry-specific applications and best practices');
*/
