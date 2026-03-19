-- Create price_lists table
CREATE TABLE IF NOT EXISTS price_lists (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  currency      TEXT NOT NULL CHECK (currency IN ('EUR', 'USD')),
  description   TEXT,
  file_url      TEXT,
  file_path     TEXT,
  file_size     BIGINT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  valid_from    DATE,
  valid_until   DATE,
  downloads     INTEGER DEFAULT 0,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for per-distributor access control
CREATE TABLE IF NOT EXISTS price_lists_distributors (
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  distributor_id UUID REFERENCES distributors(id) ON DELETE CASCADE,
  PRIMARY KEY (price_list_id, distributor_id)
);

-- RLS
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists_distributors ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read published price lists (distributor-content.ts does further filtering)
CREATE POLICY "Authenticated users can read published price lists"
  ON price_lists FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Distributors can read junction table to resolve sharing
CREATE POLICY "Authenticated users can read price_lists_distributors"
  ON price_lists_distributors FOR SELECT
  TO authenticated
  USING (true);

-- Service role (admin client) bypasses RLS — no extra policies needed for admin writes
