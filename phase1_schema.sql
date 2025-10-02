-- Phase 1 Database Schema: CSV Upload and Guest Management

-- Campaigns table (needed for guest references)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    name VARCHAR NOT NULL,
    channel VARCHAR NOT NULL, -- 'whatsapp', 'email', 'both'
    message_template TEXT NOT NULL,
    ai_enabled BOOLEAN DEFAULT false,
    delay_hours INTEGER DEFAULT 24,
    status VARCHAR DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Guests table for Phase 1
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    campaign_id UUID REFERENCES campaigns(id),
    name VARCHAR NOT NULL,
    phone VARCHAR,
    email VARCHAR,
    checkin_date DATE,
    checkout_date DATE,
    booking_id VARCHAR,
    room_type VARCHAR,
    google_review_link VARCHAR,
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Upload jobs table for Phase 1
CREATE TABLE IF NOT EXISTS upload_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    filename VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    errors JSONB,
    column_mapping JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Org data access" ON campaigns;
DROP POLICY IF EXISTS "Org data access" ON guests;
DROP POLICY IF EXISTS "Org data access" ON upload_jobs;

-- Create RLS policies for new tables
CREATE POLICY "Org data access" ON campaigns FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = campaigns.org_id));
CREATE POLICY "Org data access" ON guests FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = guests.org_id));
CREATE POLICY "Org data access" ON upload_jobs FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = upload_jobs.org_id));