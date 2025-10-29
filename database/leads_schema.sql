-- Meta Ads Lead Collection Schema
-- Table to store leads from Facebook/Instagram Ads

CREATE TABLE IF NOT EXISTS meta_ads_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Lead Information
    lead_id TEXT UNIQUE NOT NULL, -- Facebook lead ID
    form_id TEXT NOT NULL, -- Facebook form ID
    ad_id TEXT, -- Facebook ad ID
    ad_name TEXT, -- Ad campaign name
    
    -- Contact Details
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- Additional Form Fields (JSON for flexibility)
    form_data JSONB DEFAULT '{}',
    
    -- Lead Source & Attribution
    source TEXT DEFAULT 'meta_ads',
    campaign_name TEXT,
    ad_set_name TEXT,
    platform TEXT CHECK (platform IN ('facebook', 'instagram', 'messenger', 'audience_network')),
    
    -- Lead Status & Tracking
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'invalid')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id),
    
    -- Conversion Tracking
    converted_to_customer BOOLEAN DEFAULT FALSE,
    customer_id UUID REFERENCES customers(id),
    conversion_date TIMESTAMP WITH TIME ZONE,
    conversion_value DECIMAL(12, 2),
    
    -- Notes & Follow-ups
    notes TEXT,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contacted_at TIMESTAMP WITH TIME ZONE,
    
    -- Meta Data
    raw_webhook_data JSONB, -- Store complete webhook payload
    ip_address INET,
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_leads_status ON meta_ads_leads(status);
CREATE INDEX IF NOT EXISTS idx_meta_leads_created_at ON meta_ads_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_leads_assigned_to ON meta_ads_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meta_leads_email ON meta_ads_leads(email);
CREATE INDEX IF NOT EXISTS idx_meta_leads_phone ON meta_ads_leads(phone);
CREATE INDEX IF NOT EXISTS idx_meta_leads_campaign ON meta_ads_leads(campaign_name);
CREATE INDEX IF NOT EXISTS idx_meta_leads_platform ON meta_ads_leads(platform);

-- Lead interaction/activity log
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES meta_ads_leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'status_change', 'assigned', 'converted')),
    description TEXT,
    performed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Lead assignment rules
CREATE TABLE IF NOT EXISTS lead_assignment_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    conditions JSONB NOT NULL, -- Rules for auto-assignment (campaign, platform, etc.)
    assigned_to UUID REFERENCES users(id),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_timestamp
    BEFORE UPDATE ON meta_ads_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_updated_at();

-- Function to get lead conversion rate
CREATE OR REPLACE FUNCTION get_lead_conversion_stats(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_leads BIGINT,
    converted_leads BIGINT,
    conversion_rate NUMERIC,
    total_conversion_value NUMERIC,
    avg_conversion_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_leads,
        COUNT(*) FILTER (WHERE converted_to_customer = TRUE)::BIGINT as converted_leads,
        ROUND((COUNT(*) FILTER (WHERE converted_to_customer = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC * 100), 2) as conversion_rate,
        COALESCE(SUM(conversion_value) FILTER (WHERE converted_to_customer = TRUE), 0) as total_conversion_value,
        COALESCE(AVG(conversion_value) FILTER (WHERE converted_to_customer = TRUE), 0) as avg_conversion_value
    FROM meta_ads_leads
    WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE meta_ads_leads IS 'Stores leads collected from Meta (Facebook/Instagram) advertising campaigns';
COMMENT ON COLUMN meta_ads_leads.lead_id IS 'Unique identifier from Facebook Lead Ads';
COMMENT ON COLUMN meta_ads_leads.form_data IS 'Flexible JSON storage for custom form fields from Meta Lead Ads';
COMMENT ON COLUMN meta_ads_leads.raw_webhook_data IS 'Complete webhook payload for debugging and compliance';
