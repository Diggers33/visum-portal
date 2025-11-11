# Product Resources Database Setup

This directory contains SQL schemas for managing product-related resources in Supabase.

## Product Resources Table

The `product_resources` table stores various types of resources (datasheets, manuals, videos, etc.) associated with products.

### Table Structure

```sql
product_resources (
  id UUID PRIMARY KEY,
  product_id UUID (Foreign Key to products.id),
  resource_type TEXT (enum),
  title TEXT,
  file_url TEXT,
  file_size BIGINT (bytes),
  file_type TEXT (e.g., 'PDF', 'MP4', 'PPTX'),
  description TEXT,
  category TEXT (e.g., 'documentation', 'marketing', 'training'),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Resource Types

The `resource_type` field supports the following values:

**Documentation:**
- `datasheet` - Product datasheets with technical specifications
- `manual` - User manuals and installation guides
- `brochure` - Product brochures

**Marketing:**
- `case_study` - Customer case studies
- `whitepaper` - Technical whitepapers
- `presentation` - Sales presentations (PowerPoint)
- `press_release` - Press releases
- `social_image` - Social media images
- `demo_video` - Product demonstration videos

**Training:**
- `video` - Training videos
- `training_video` - Specific training content

**Other:**
- `application_note` - Application notes
- `other` - Any other resource type

### Setup Instructions

1. **Run the SQL migration** in your Supabase SQL editor:
   ```bash
   # Copy the contents of product_resources.sql and run in Supabase SQL editor
   ```

2. **The hook is already integrated** in `src/hooks/useData.ts`:
   ```typescript
   import { useProductResources } from '../hooks/useData';

   const { resources, loading, error } = useProductResources(productId);
   ```

3. **Components using this hook:**
   - `src/components/mobile/MobileProductDetail.tsx` (Mobile)
   - `src/components/ProductDetail.tsx` (Desktop)

### Adding Resources

#### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Table Editor → `product_resources`
3. Click "Insert row"
4. Fill in the required fields:
   - `product_id`: UUID of the product
   - `resource_type`: Select from the dropdown
   - `title`: Display name (e.g., "Product Datasheet")
   - `file_url`: URL to the resource file
   - `file_size`: Size in bytes (optional)
   - `file_type`: File extension (e.g., "PDF", "MP4")
   - `description`: Brief description (optional)
   - `category`: Category for grouping (optional)

#### Via SQL

```sql
INSERT INTO product_resources (
  product_id,
  resource_type,
  title,
  file_url,
  file_size,
  file_type,
  description,
  category
) VALUES (
  'your-product-id-here',
  'datasheet',
  'Product Datasheet',
  'https://example.com/files/datasheet.pdf',
  2516582,
  'PDF',
  'Technical specifications and product overview',
  'documentation'
);
```

### Example: Adding Resources for a Product

```sql
-- Datasheet
INSERT INTO product_resources (product_id, resource_type, title, file_url, file_size, file_type, description, category)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'datasheet',
  'NIR-3000 Product Datasheet',
  'https://example.com/files/nir-3000-datasheet.pdf',
  2516582,
  'PDF',
  'Complete technical specifications for the NIR-3000',
  'documentation'
);

-- User Manual
INSERT INTO product_resources (product_id, resource_type, title, file_url, file_size, file_type, description, category)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'manual',
  'NIR-3000 User Manual',
  'https://example.com/files/nir-3000-manual.pdf',
  5347328,
  'PDF',
  'Installation, operation, and maintenance guide',
  'documentation'
);

-- Demo Video
INSERT INTO product_resources (product_id, resource_type, title, file_url, file_type, description, category)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'demo_video',
  'NIR-3000 Product Demo',
  'https://www.youtube.com/watch?v=example',
  'MP4',
  'See the NIR-3000 in action',
  'marketing'
);
```

### Querying Resources

The `useProductResources` hook automatically fetches all resources for a given product:

```typescript
// In your component
const { id } = useParams();
const { resources, loading, error } = useProductResources(id);

// Filter by category
const documentationResources = resources.filter(r =>
  ['datasheet', 'manual', 'brochure'].includes(r.resource_type)
);

const marketingResources = resources.filter(r =>
  ['case_study', 'whitepaper', 'presentation'].includes(r.resource_type)
);
```

### Security

The table has Row Level Security (RLS) enabled with the following policies:

- ✅ **Read:** All authenticated users can view resources
- ✅ **Insert/Update/Delete:** Only admins can modify resources

### Migration Notes

**Backward Compatibility:**
- The components still support the old product URL fields (`datasheet_url`, `manual_url`, etc.)
- If no resources exist in the database, the components will fall back to displaying resources from these URL fields
- This allows for gradual migration without breaking existing functionality

**Recommended Migration Path:**
1. Run the SQL migration to create the `product_resources` table
2. Start adding new resources using the table
3. Gradually migrate existing product URL fields to the new table
4. Once all products have resources in the table, you can deprecate the old URL fields

### Benefits

✅ **Centralized management** - All resources in one table
✅ **Flexible categorization** - Easy to add new resource types
✅ **Better organization** - Group resources by category
✅ **Metadata support** - Store file size, type, descriptions
✅ **Easy querying** - Filter and sort resources efficiently
✅ **Admin control** - Manage resources from admin panel

## Support

For issues or questions, check the main project README or contact the development team.
