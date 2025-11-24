-- Create table to track sync status across all clients
CREATE TABLE IF NOT EXISTS public.essl_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.essl_devices(id) ON DELETE CASCADE,
  last_sync_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'failed', 'in_progress')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  synced_by_user_id UUID REFERENCES auth.users(id),
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_essl_sync_status_device_id ON public.essl_sync_status(device_id);
CREATE INDEX IF NOT EXISTS idx_essl_sync_status_last_sync_time ON public.essl_sync_status(last_sync_time DESC);

-- Create function to get latest sync status for a device
CREATE OR REPLACE FUNCTION get_latest_sync_status(p_device_id UUID)
RETURNS TABLE (
  device_id UUID,
  device_name TEXT,
  last_sync_time TIMESTAMPTZ,
  sync_status TEXT,
  records_synced INTEGER,
  error_message TEXT,
  minutes_since_sync INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as device_id,
    d.device_name,
    s.last_sync_time,
    s.sync_status,
    s.records_synced,
    s.error_message,
    EXTRACT(EPOCH FROM (NOW() - s.last_sync_time))::INTEGER / 60 as minutes_since_sync
  FROM essl_devices d
  LEFT JOIN LATERAL (
    SELECT *
    FROM essl_sync_status
    WHERE device_id = p_device_id
    ORDER BY last_sync_time DESC
    LIMIT 1
  ) s ON true
  WHERE d.id = p_device_id;
END;
$$;

-- Create function to get all devices sync status
CREATE OR REPLACE FUNCTION get_all_devices_sync_status()
RETURNS TABLE (
  device_id UUID,
  device_name TEXT,
  last_sync_time TIMESTAMPTZ,
  sync_status TEXT,
  records_synced INTEGER,
  error_message TEXT,
  minutes_since_sync INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as device_id,
    d.device_name,
    s.last_sync_time,
    COALESCE(s.sync_status, 'never_synced') as sync_status,
    COALESCE(s.records_synced, 0) as records_synced,
    s.error_message,
    CASE 
      WHEN s.last_sync_time IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (NOW() - s.last_sync_time))::INTEGER / 60
    END as minutes_since_sync
  FROM essl_devices d
  LEFT JOIN LATERAL (
    SELECT *
    FROM essl_sync_status
    WHERE device_id = d.id
    ORDER BY last_sync_time DESC
    LIMIT 1
  ) s ON true
  WHERE d.is_active = true
  ORDER BY d.device_name;
END;
$$;

-- Enable RLS
ALTER TABLE public.essl_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for sync status
CREATE POLICY "Allow read access to all authenticated users"
  ON public.essl_sync_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON public.essl_sync_status
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON public.essl_sync_status
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.essl_sync_status IS 'Tracks sync status for ESSL devices across all client instances';
