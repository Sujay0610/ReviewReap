-- Review Automation SaaS - Database Schema
-- Phase 0: Foundation Tables
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE orgs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    default_country VARCHAR(2) DEFAULT 'US',
    whatsapp_api_token TEXT,
    whatsapp_phone_number_id VARCHAR(255),
    resend_api_key TEXT,
    google_business_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upload jobs table
CREATE TABLE upload_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp', 'email', 'both')),
    message_template TEXT NOT NULL,
    ai_enabled BOOLEAN DEFAULT false,
    delay_hours INTEGER DEFAULT 24,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests table
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    upload_job_id UUID REFERENCES upload_jobs(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    checkin_date DATE,
    checkout_date DATE,
    booking_id VARCHAR(100),
    room_type VARCHAR(100),
    google_review_link TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    is_valid BOOLEAN DEFAULT true,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled')),
    provider_msg_id VARCHAR(255),
    ai_generated BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table for tracking message events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'read', 'failed', 'bounced', 'complained')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payload JSONB DEFAULT '{}'::jsonb,
    provider VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'closed')),
    sentiment VARCHAR(50) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation messages table
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('guest', 'system', 'agent')),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio')),
    sentiment VARCHAR(50) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    is_automated BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    google_review_id VARCHAR(255) UNIQUE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    author_name VARCHAR(255),
    review_date TIMESTAMP WITH TIME ZONE,
    response_text TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    source VARCHAR(50) DEFAULT 'google' CHECK (source IN ('google', 'booking', 'makemytrip', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI responses cache table
CREATE TABLE ai_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    prompt_hash VARCHAR(64) NOT NULL,
    generated_content TEXT NOT NULL,
    model_used VARCHAR(50) DEFAULT 'gpt-4-mini',
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt templates table
CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('review_request', 'follow_up', 'response', 'thank_you')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google Business profiles table
CREATE TABLE google_business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    place_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    website VARCHAR(255),
    rating DECIMAL(2,1),
    review_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_guests_org_id ON guests(org_id);
CREATE INDEX idx_guests_campaign_id ON guests(campaign_id);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_messages_guest_id ON messages(guest_id);
CREATE INDEX idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_events_message_id ON events(message_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_conversations_guest_id ON conversations(guest_id);
CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_reviews_guest_id ON reviews(guest_id);
CREATE INDEX idx_reviews_google_review_id ON reviews(google_review_id);
CREATE INDEX idx_ai_responses_guest_id ON ai_responses(guest_id);
CREATE INDEX idx_ai_responses_prompt_hash ON ai_responses(prompt_hash);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON orgs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_upload_jobs_updated_at BEFORE UPDATE ON upload_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_business_profiles_updated_at BEFORE UPDATE ON google_business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own organization's data
CREATE POLICY "Users can view own org data" ON orgs FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.org_id = orgs.id AND users.id = auth.uid()));
CREATE POLICY "Users can update own org data" ON orgs FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.org_id = orgs.id AND users.id = auth.uid()));
CREATE POLICY "Users can insert org data" ON orgs FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can view org members" ON users FOR SELECT USING (org_id IS NOT NULL AND EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = users.org_id));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- Apply similar policies to other tables
CREATE POLICY "Org data access" ON upload_jobs FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = upload_jobs.org_id));
CREATE POLICY "Org data access" ON campaigns FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = campaigns.org_id));
CREATE POLICY "Org data access" ON guests FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = guests.org_id));
CREATE POLICY "Org data access" ON messages FOR ALL USING (EXISTS (SELECT 1 FROM campaigns c JOIN users u ON u.org_id = c.org_id WHERE u.id = auth.uid() AND c.id = messages.campaign_id));
CREATE POLICY "Org data access" ON events FOR ALL USING (EXISTS (SELECT 1 FROM messages m JOIN campaigns c ON c.id = m.campaign_id JOIN users u ON u.org_id = c.org_id WHERE u.id = auth.uid() AND m.id = events.message_id));
CREATE POLICY "Org data access" ON conversations FOR ALL USING (EXISTS (SELECT 1 FROM campaigns c JOIN users u ON u.org_id = c.org_id WHERE u.id = auth.uid() AND c.id = conversations.campaign_id));
CREATE POLICY "Org data access" ON conversation_messages FOR ALL USING (EXISTS (SELECT 1 FROM conversations conv JOIN campaigns c ON c.id = conv.campaign_id JOIN users u ON u.org_id = c.org_id WHERE u.id = auth.uid() AND conv.id = conversation_messages.conversation_id));
CREATE POLICY "Org data access" ON reviews FOR ALL USING (EXISTS (SELECT 1 FROM guests g JOIN users u ON u.org_id = g.org_id WHERE u.id = auth.uid() AND g.id = reviews.guest_id));
CREATE POLICY "Org data access" ON ai_responses FOR ALL USING (EXISTS (SELECT 1 FROM guests g JOIN users u ON u.org_id = g.org_id WHERE u.id = auth.uid() AND g.id = ai_responses.guest_id));
CREATE POLICY "Org data access" ON prompt_templates FOR ALL USING (org_id IS NULL OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = prompt_templates.org_id));
CREATE POLICY "Org data access" ON google_business_profiles FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = google_business_profiles.org_id));

-- Guests table for Phase 1
CREATE TABLE guests (
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
CREATE TABLE upload_jobs (
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

-- Campaigns table for Phase 2 (adding early for guest reference)
CREATE TABLE campaigns (
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

-- Enable RLS on new tables
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for new tables
CREATE POLICY "Org data access" ON guests FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = guests.org_id));
CREATE POLICY "Org data access" ON upload_jobs FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = upload_jobs.org_id));
CREATE POLICY "Org data access" ON campaigns FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = campaigns.org_id));

-- Insert default prompt templates
INSERT INTO prompt_templates (org_id, name, template, type) VALUES
(NULL, 'Default Review Request', 'Hi {{name}}! We hope you enjoyed your stay in our {{room_type}} room. Would you mind leaving us a review? {{review_link}}', 'review_request'),
(NULL, 'Follow-up Message', 'Hi {{name}}, we noticed you haven\'t left a review yet. We\'d really appreciate your feedback about your recent stay. {{review_link}}', 'follow_up');

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

COMMIT;