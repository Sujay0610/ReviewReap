-- Migration: Create customers table and update references (no guests table present)
-- Run this in Supabase SQL Editor

-- 0) Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create customers table with generic business structure
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    upload_job_id UUID REFERENCES upload_jobs(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    customer_id VARCHAR(100), -- Generic customer/order/transaction ID
    service_date DATE, -- Generic service/purchase/interaction date
    google_review_link TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    is_valid VARCHAR DEFAULT 'true' NOT NULL,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1a) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_campaign_id ON customers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 2) Update foreign key references in other tables to point to customers
-- NOTE: We keep the column name guest_id in dependent tables to avoid code changes,
--       but the FK will now reference customers(id)

-- reviews.guest_id -> customers(id)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_guest_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_customer_id_fkey 
    FOREIGN KEY (guest_id) REFERENCES customers(id) ON DELETE CASCADE;

-- ai_responses.guest_id -> customers(id)
ALTER TABLE ai_responses DROP CONSTRAINT IF EXISTS ai_responses_guest_id_fkey;
ALTER TABLE ai_responses ADD CONSTRAINT ai_responses_customer_id_fkey 
    FOREIGN KEY (guest_id) REFERENCES customers(id) ON DELETE CASCADE;

-- conversations.guest_id -> customers(id)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_guest_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_customer_id_fkey 
    FOREIGN KEY (guest_id) REFERENCES customers(id) ON DELETE CASCADE;

-- messages.guest_id -> customers(id)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_guest_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_customer_id_fkey 
    FOREIGN KEY (guest_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 3) Update analytics view to use customers instead of guests
CREATE OR REPLACE VIEW campaign_analytics AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    c.channel,
    c.created_at,
    c.started_at,
    c.completed_at,
    COUNT(cu.id) as total_guests, -- keep alias for compatibility
    COUNT(m.id) as total_messages,
    COUNT(CASE WHEN m.status = 'sent' THEN 1 END) as messages_sent,
    COUNT(CASE WHEN m.status = 'delivered' THEN 1 END) as messages_delivered,
    COUNT(CASE WHEN m.status = 'read' THEN 1 END) as messages_read,
    COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as messages_failed,
    CASE 
        WHEN COUNT(CASE WHEN m.status = 'sent' THEN 1 END) > 0 
        THEN ROUND(
            (COUNT(CASE WHEN m.status = 'read' THEN 1 END)::DECIMAL / 
             COUNT(CASE WHEN m.status = 'sent' THEN 1 END)::DECIMAL) * 100, 2
        )
        ELSE 0 
    END as response_rate
FROM campaigns c
LEFT JOIN customers cu ON cu.campaign_id = c.id
LEFT JOIN messages m ON m.campaign_id = c.id
GROUP BY c.id, c.name, c.status, c.channel, c.created_at, c.started_at, c.completed_at;

-- 4) Enable RLS and policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers policy
DROP POLICY IF EXISTS "Org data access" ON customers;
CREATE POLICY "Org data access" ON customers 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.org_id = customers.org_id AND u.id = auth.uid()
    )
);

-- Ensure RLS enabled on dependent tables (no-op if already enabled)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Reviews policy references customers via the existing guest_id column
DROP POLICY IF EXISTS "Org data access" ON reviews;
CREATE POLICY "Org data access" ON reviews 
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM customers c 
        JOIN users u ON u.org_id = c.org_id
        WHERE u.id = auth.uid() AND c.id = reviews.guest_id
    )
);

-- AI responses policy references customers via the existing guest_id column
DROP POLICY IF EXISTS "Org data access" ON ai_responses;
CREATE POLICY "Org data access" ON ai_responses 
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM customers c 
        JOIN users u ON u.org_id = c.org_id
        WHERE u.id = auth.uid() AND c.id = ai_responses.guest_id
    )
);

-- Conversations policy references customers via the existing guest_id column
DROP POLICY IF EXISTS "Org data access" ON conversations;
CREATE POLICY "Org data access" ON conversations 
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM customers c 
        JOIN users u ON u.org_id = c.org_id
        WHERE u.id = auth.uid() AND c.id = conversations.guest_id
    )
);

-- Messages policy references customers via the existing guest_id column
DROP POLICY IF EXISTS "Org data access" ON messages;
CREATE POLICY "Org data access" ON messages 
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM customers c 
        JOIN users u ON u.org_id = c.org_id
        WHERE u.id = auth.uid() AND c.id = messages.guest_id
    )
);

-- 5) updated_at trigger for customers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE customers IS 'Generic customers across businesses';
COMMENT ON COLUMN customers.customer_id IS 'Generic customer/order/transaction identifier';
COMMENT ON COLUMN customers.service_date IS 'Generic service/purchase/interaction date';