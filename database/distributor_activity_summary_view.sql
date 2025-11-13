-- Create a view for easier distributor activity analytics
-- This view aggregates activity data at the distributor company level

CREATE OR REPLACE VIEW distributor_activity_summary AS
SELECT
  d.id as distributor_id,
  d.company_name,
  d.territory,
  d.country,
  d.status,
  COUNT(DISTINCT up.id) as total_users,
  COUNT(DISTINCT CASE
    WHEN da.created_at > NOW() - INTERVAL '7 days'
      AND da.activity_type = 'login'
    THEN da.user_id
  END) as active_users_7d,
  COUNT(da.id) as total_activities,
  COUNT(CASE WHEN da.activity_type = 'login' THEN 1 END) as login_count,
  COUNT(CASE WHEN da.activity_type = 'download' THEN 1 END) as download_count,
  COUNT(CASE WHEN da.activity_type = 'product_view' THEN 1 END) as product_view_count,
  COUNT(CASE WHEN da.activity_type = 'page_view' THEN 1 END) as page_view_count,
  COUNT(CASE WHEN da.activity_type = 'search' THEN 1 END) as search_count,
  MAX(da.created_at) as last_activity
FROM distributors d
LEFT JOIN user_profiles up ON up.distributor_id = d.id
LEFT JOIN distributor_activity da ON da.user_id = up.id
GROUP BY d.id, d.company_name, d.territory, d.country, d.status;

-- Grant access to authenticated users (RLS still applies)
GRANT SELECT ON distributor_activity_summary TO authenticated;

COMMENT ON VIEW distributor_activity_summary IS 'Aggregated view of distributor company activity metrics';

-- Create a detailed activity view with distributor company information
CREATE OR REPLACE VIEW distributor_activity_detailed AS
SELECT
  da.id,
  da.user_id,
  up.email AS user_email,
  up.full_name AS user_name,
  up.distributor_id,
  d.company_name AS distributor_company,
  d.territory AS distributor_territory,
  d.country AS distributor_country,
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
LEFT JOIN user_profiles up ON da.user_id = up.id
LEFT JOIN distributors d ON up.distributor_id = d.id;

-- Grant access to authenticated users (RLS still applies)
GRANT SELECT ON distributor_activity_detailed TO authenticated;

COMMENT ON VIEW distributor_activity_detailed IS 'Detailed activity records with distributor company information';
