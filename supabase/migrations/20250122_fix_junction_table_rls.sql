-- Fix RLS policies on junction tables to allow proper sharing functionality
-- Problem: Inserts appear to succeed but records don't persist (RLS blocking silently)

-- ============================================================================
-- DOCUMENTATION_DISTRIBUTORS TABLE
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage documentation sharing" ON documentation_distributors;
DROP POLICY IF EXISTS "Users can view documentation sharing" ON documentation_distributors;

-- Allow admins to INSERT, UPDATE, DELETE sharing records
CREATE POLICY "Admins can manage documentation sharing"
ON documentation_distributors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Allow all authenticated users to SELECT (needed for filtering)
CREATE POLICY "Users can view documentation sharing"
ON documentation_distributors
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- MARKETING_ASSETS_DISTRIBUTORS TABLE
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage marketing asset sharing" ON marketing_assets_distributors;
DROP POLICY IF EXISTS "Users can view marketing asset sharing" ON marketing_assets_distributors;

-- Allow admins to INSERT, UPDATE, DELETE sharing records
CREATE POLICY "Admins can manage marketing asset sharing"
ON marketing_assets_distributors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Allow all authenticated users to SELECT (needed for filtering)
CREATE POLICY "Users can view marketing asset sharing"
ON marketing_assets_distributors
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- TRAINING_MATERIALS_DISTRIBUTORS TABLE
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage training materials sharing" ON training_materials_distributors;
DROP POLICY IF EXISTS "Users can view training materials sharing" ON training_materials_distributors;

-- Allow admins to INSERT, UPDATE, DELETE sharing records
CREATE POLICY "Admins can manage training materials sharing"
ON training_materials_distributors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Allow all authenticated users to SELECT (needed for filtering)
CREATE POLICY "Users can view training materials sharing"
ON training_materials_distributors
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- ANNOUNCEMENTS_DISTRIBUTORS TABLE
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage announcement sharing" ON announcements_distributors;
DROP POLICY IF EXISTS "Users can view announcement sharing" ON announcements_distributors;

-- Allow admins to INSERT, UPDATE, DELETE sharing records
CREATE POLICY "Admins can manage announcement sharing"
ON announcements_distributors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Allow all authenticated users to SELECT (needed for filtering)
CREATE POLICY "Users can view announcement sharing"
ON announcements_distributors
FOR SELECT
TO authenticated
USING (true);
