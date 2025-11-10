-- ============================================================================
-- META ADS INTEGRATION SCHEMA
-- ============================================================================
-- Tables for Facebook, Instagram & WhatsApp campaign and lead management
-- Integration with existing CRM customers table
-- ============================================================================

-- Meta Campaigns Table
-- Stores all Meta advertising campaigns (Facebook, Instagram, WhatsApp)
CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id TEXT PRIMARY KEY, -- Meta campaign ID from API
  account_id TEXT NOT NULL, -- Meta Ad Account ID
  name TEXT NOT NULL,
  objective TEXT, -- LEAD_GENERATION, CONVERSIONS, TRAFFIC, etc.
  status TEXT CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED')) DEFAULT 'ACTIVE',
  
  -- Platform & Timing
  platform TEXT CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'multi')) DEFAULT 'multi',
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  
  -- Budget & Spend
  daily_budget NUMERIC(12, 2),
  lifetime_budget NUMERIC(12, 2),
  spend NUMERIC(12, 2) DEFAULT 0,
  
  -- Performance Metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5, 2) DEFAULT 0, -- Click-through rate (percentage)
  cpc NUMERIC(10, 2) DEFAULT 0, -- Cost per click
  cpm NUMERIC(10, 2) DEFAULT 0, -- Cost per 1000 impressions
  
  -- Conversion Metrics
  leads_count INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value NUMERIC(12, 2) DEFAULT 0, -- Total revenue from conversions
  cost_per_lead NUMERIC(10, 2) DEFAULT 0,
  cost_per_conversion NUMERIC(10, 2) DEFAULT 0,
  
  -- ROI Metrics
  roi NUMERIC(10, 2) DEFAULT 0, -- Return on Investment (percentage)
  roas NUMERIC(10, 2) DEFAULT 0, -- Return on Ad Spend (multiplier)
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP, -- Last time data was synced from Meta
  sync_status TEXT CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')) DEFAULT 'pending',
  sync_error TEXT,
  
  -- Raw Meta Data (for debugging/analysis)
  meta_data JSONB -- Store raw API response
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_status ON public.meta_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_platform ON public.meta_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_start_time ON public.meta_campaigns(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_updated_at ON public.meta_campaigns(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_account_id ON public.meta_campaigns(account_id);

-- ============================================================================

-- Meta Ad Sets Table
-- Stores ad sets (targeting groups) within campaigns
CREATE TABLE IF NOT EXISTS public.meta_adsets (
  id TEXT PRIMARY KEY, -- Meta ad set ID from API
  campaign_id TEXT NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED')) DEFAULT 'ACTIVE',
  
  -- Budget
  daily_budget NUMERIC(12, 2),
  lifetime_budget NUMERIC(12, 2),
  spend NUMERIC(12, 2) DEFAULT 0,
  
  -- Targeting (stored as JSON for flexibility)
  targeting JSONB, -- Age, gender, location, interests, etc.
  
  -- Performance
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5, 2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meta_adsets_campaign_id ON public.meta_adsets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_status ON public.meta_adsets(status);

-- ============================================================================

-- Meta Ads Table
-- Stores individual ads within ad sets
CREATE TABLE IF NOT EXISTS public.meta_ads (
  id TEXT PRIMARY KEY, -- Meta ad ID from API
  adset_id TEXT NOT NULL REFERENCES public.meta_adsets(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED')) DEFAULT 'ACTIVE',
  
  -- Creative
  creative_id TEXT,
  ad_copy TEXT,
  headline TEXT,
  description TEXT,
  call_to_action TEXT,
  image_url TEXT,
  video_url TEXT,
  
  -- Performance
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5, 2) DEFAULT 0,
  spend NUMERIC(12, 2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_adset_id ON public.meta_ads(adset_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_campaign_id ON public.meta_ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_status ON public.meta_ads(status);

-- ============================================================================

-- Meta Leads Table
-- Stores leads captured from Meta Lead Forms
CREATE TABLE IF NOT EXISTS public.meta_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_lead_id TEXT UNIQUE NOT NULL, -- Meta's lead ID
  
  -- Lead Information
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  
  -- Campaign Attribution
  campaign_id TEXT REFERENCES public.meta_campaigns(id) ON DELETE SET NULL,
  campaign_name TEXT,
  adset_id TEXT REFERENCES public.meta_adsets(id) ON DELETE SET NULL,
  adset_name TEXT,
  ad_id TEXT REFERENCES public.meta_ads(id) ON DELETE SET NULL,
  ad_name TEXT,
  form_id TEXT,
  form_name TEXT,
  
  -- Platform
  platform TEXT CHECK (platform IN ('facebook', 'instagram', 'whatsapp')) NOT NULL,
  
  -- Lead Status & Assignment
  status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected', 'spam')) DEFAULT 'new',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP,
  
  -- CRM Integration
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, -- Link to customer after conversion
  converted_at TIMESTAMP, -- When lead became a customer
  conversion_value NUMERIC(12, 2), -- Sale value if converted
  
  -- Lead Quality Scoring
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100), -- 0-100
  is_valid_email BOOLEAN DEFAULT TRUE,
  is_valid_phone BOOLEAN DEFAULT TRUE,
  
  -- Custom Form Fields (flexible storage)
  custom_fields JSONB, -- Store any additional form fields
  
  -- Metadata
  created_time TIMESTAMP NOT NULL, -- When lead was created in Meta
  synced_at TIMESTAMP DEFAULT NOW(), -- When lead was imported to our system
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Notes & Follow-up
  notes TEXT,
  next_follow_up_date DATE,
  last_contacted_at TIMESTAMP,
  contact_attempts INTEGER DEFAULT 0,
  
  -- Raw Meta Data
  meta_data JSONB -- Store raw API response
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_leads_meta_lead_id ON public.meta_leads(meta_lead_id);
CREATE INDEX IF NOT EXISTS idx_meta_leads_email ON public.meta_leads(email);
CREATE INDEX IF NOT EXISTS idx_meta_leads_phone ON public.meta_leads(phone);
CREATE INDEX IF NOT EXISTS idx_meta_leads_status ON public.meta_leads(status);
CREATE INDEX IF NOT EXISTS idx_meta_leads_campaign_id ON public.meta_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_leads_platform ON public.meta_leads(platform);
CREATE INDEX IF NOT EXISTS idx_meta_leads_created_time ON public.meta_leads(created_time DESC);
CREATE INDEX IF NOT EXISTS idx_meta_leads_assigned_to ON public.meta_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meta_leads_customer_id ON public.meta_leads(customer_id);

-- Unique constraint to prevent duplicate leads
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_leads_unique_meta_id ON public.meta_leads(meta_lead_id);

-- ============================================================================

-- Meta Sync Log Table
-- Track sync operations with Meta API
CREATE TABLE IF NOT EXISTS public.meta_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT CHECK (sync_type IN ('campaigns', 'adsets', 'ads', 'leads', 'full')) NOT NULL,
  status TEXT CHECK (status IN ('started', 'completed', 'failed')) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Metrics
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  meta_account_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_meta_sync_log_started_at ON public.meta_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_sync_log_status ON public.meta_sync_log(status);

-- ============================================================================

-- Extend existing customers table to link with Meta leads
-- Add these columns if not already present

-- ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS meta_lead_id UUID REFERENCES public.meta_leads(id) ON DELETE SET NULL;
-- ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_source_campaign TEXT;
-- ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_source_platform TEXT;

-- Create index on meta_lead_id
-- CREATE INDEX IF NOT EXISTS idx_customers_meta_lead_id ON public.customers(meta_lead_id);

-- ============================================================================

-- Update trigger for meta_campaigns
CREATE OR REPLACE FUNCTION update_meta_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_meta_campaign_timestamp
BEFORE UPDATE ON public.meta_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_meta_campaign_timestamp();

-- Update trigger for meta_leads
CREATE OR REPLACE FUNCTION update_meta_lead_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_meta_lead_timestamp
BEFORE UPDATE ON public.meta_leads
FOR EACH ROW
EXECUTE FUNCTION update_meta_lead_timestamp();

-- ============================================================================

-- Function to auto-create customer from converted lead
CREATE OR REPLACE FUNCTION create_customer_from_meta_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only create customer if lead is converted and customer_id is NULL
  IF NEW.status = 'converted' AND NEW.customer_id IS NULL THEN
    -- Insert new customer
    INSERT INTO public.customers (
      name,
      email,
      phone,
      status,
      source,
      tags,
      notes,
      created_by,
      assigned_sales_rep_id
    ) VALUES (
      COALESCE(NEW.full_name, CONCAT(NEW.first_name, ' ', NEW.last_name)),
      NEW.email,
      NEW.phone,
      'Customer', -- Status after conversion
      CONCAT('Meta - ', NEW.platform), -- Source tracking
      ARRAY['meta-lead', NEW.platform], -- Tags
      CONCAT('Converted from Meta Lead. Campaign: ', NEW.campaign_name),
      NEW.assigned_to, -- Created by assigned sales rep
      NEW.assigned_to -- Assign to same sales rep
    )
    RETURNING id INTO v_customer_id;
    
    -- Update lead with customer reference
    NEW.customer_id = v_customer_id;
    NEW.converted_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_customer_from_meta_lead
BEFORE UPDATE ON public.meta_leads
FOR EACH ROW
EXECUTE FUNCTION create_customer_from_meta_lead();

-- ============================================================================

-- Comments for documentation
COMMENT ON TABLE public.meta_campaigns IS 'Meta (Facebook/Instagram/WhatsApp) advertising campaigns';
COMMENT ON TABLE public.meta_adsets IS 'Ad sets within Meta campaigns (targeting groups)';
COMMENT ON TABLE public.meta_ads IS 'Individual ads within ad sets';
COMMENT ON TABLE public.meta_leads IS 'Leads captured from Meta Lead Forms';
COMMENT ON TABLE public.meta_sync_log IS 'Log of sync operations with Meta API';

COMMENT ON COLUMN public.meta_campaigns.roi IS 'Return on Investment as percentage: ((revenue - spend) / spend) * 100';
COMMENT ON COLUMN public.meta_campaigns.roas IS 'Return on Ad Spend as multiplier: revenue / spend';
COMMENT ON COLUMN public.meta_leads.quality_score IS 'Lead quality score from 0-100 based on engagement and profile completeness';
COMMENT ON COLUMN public.meta_leads.customer_id IS 'Reference to customers table when lead is converted';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get campaign performance summary
-- SELECT 
--   name,
--   platform,
--   status,
--   spend,
--   leads_count,
--   conversions,
--   roi,
--   roas
-- FROM public.meta_campaigns
-- WHERE status = 'ACTIVE'
-- ORDER BY roas DESC;

-- Get new leads from last 24 hours
-- SELECT 
--   full_name,
--   email,
--   phone,
--   campaign_name,
--   platform,
--   created_time
-- FROM public.meta_leads
-- WHERE status = 'new'
--   AND created_time > NOW() - INTERVAL '24 hours'
-- ORDER BY created_time DESC;

-- Get campaign ROI with lead count
-- SELECT 
--   c.name,
--   c.spend,
--   c.conversion_value as revenue,
--   c.roi,
--   COUNT(l.id) as total_leads,
--   COUNT(l.id) FILTER (WHERE l.status = 'converted') as converted_leads
-- FROM public.meta_campaigns c
-- LEFT JOIN public.meta_leads l ON l.campaign_id = c.id
-- GROUP BY c.id, c.name, c.spend, c.conversion_value, c.roi
-- ORDER BY c.roi DESC;

-- ============================================================================
