-- Create function to aggregate API stats
CREATE OR REPLACE FUNCTION get_agent_api_stats(
  time_range interval DEFAULT '24 hours'::interval
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_requests', COALESCE(COUNT(*), 0),
      'success_count', COALESCE(COUNT(*) FILTER (WHERE response_status BETWEEN 200 AND 299), 0),
      'error_count', COALESCE(COUNT(*) FILTER (WHERE response_status >= 400), 0),
      'avg_duration_ms', COALESCE(ROUND(AVG(duration_ms)::numeric, 2), 0),
      'top_endpoints', COALESCE((
        SELECT jsonb_agg(row_to_json(e))
        FROM (
          SELECT endpoint, COUNT(*) as count
          FROM agent_api_logs
          WHERE created_at > NOW() - time_range
          GROUP BY endpoint
          ORDER BY count DESC
          LIMIT 10
        ) e
      ), '[]'::jsonb),
      'requests_by_day', COALESCE((
        SELECT jsonb_agg(row_to_json(d))
        FROM (
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM agent_api_logs
          WHERE created_at > NOW() - time_range
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        ) d
      ), '[]'::jsonb),
      'error_types', COALESCE((
        SELECT jsonb_agg(row_to_json(e))
        FROM (
          SELECT response_status, COUNT(*) as count
          FROM agent_api_logs
          WHERE created_at > NOW() - time_range
            AND response_status >= 400
          GROUP BY response_status
          ORDER BY count DESC
          LIMIT 10
        ) e
      ), '[]'::jsonb)
    )
    FROM agent_api_logs
    WHERE created_at > NOW() - time_range
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_agent_api_stats TO authenticated;