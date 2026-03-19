-- Add missing columns to products table
-- These columns are used by the EditProduct form but were absent from the schema

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category       TEXT,
  ADD COLUMN IF NOT EXISTS applications   TEXT[],
  ADD COLUMN IF NOT EXISTS thumbnail_url  TEXT,
  ADD COLUMN IF NOT EXISTS datasheet_url  TEXT,
  ADD COLUMN IF NOT EXISTS manual_url     TEXT,
  ADD COLUMN IF NOT EXISTS brochure_url   TEXT,
  ADD COLUMN IF NOT EXISTS whitepaper_url TEXT;

-- Backfill category from product_line for existing rows
-- product_line currently stores the technology category value
-- (e.g. "NIR / FT-NIR Spectroscopy") so we copy it across.
UPDATE products
  SET category = product_line
  WHERE category IS NULL AND product_line IS NOT NULL;
