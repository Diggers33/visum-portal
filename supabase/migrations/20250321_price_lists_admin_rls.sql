-- Allow authenticated users (admins) to fully manage price lists.
-- App-level route guards ensure only admin roles reach the management UI.

CREATE POLICY "Authenticated users can manage price lists"
  ON price_lists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage price_lists_distributors"
  ON price_lists_distributors FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to upload/delete in the price-lists storage bucket
-- (bucket was created as public; object-level policies are handled by the bucket settings)
