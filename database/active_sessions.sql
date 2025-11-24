-- Table to track active application instances across different computers/networks
CREATE TABLE IF NOT EXISTS active_app_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  client_ip TEXT NOT NULL,
  user_agent TEXT,
  user_id UUID REFERENCES employees(id),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  location_hint TEXT, -- Can be derived from IP geolocation
  device_info JSONB, -- Browser, OS, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_active_instances_session ON active_app_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_active_instances_active ON active_app_instances(is_active, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_active_instances_ip ON active_app_instances(client_ip);

-- Function to cleanup stale sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  UPDATE active_app_instances
  SET is_active = FALSE
  WHERE last_seen < NOW() - INTERVAL '5 minutes'
  AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instance_last_seen
  BEFORE UPDATE ON active_app_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();
