-- Phase 5: AI Integration Schema Updates
-- Add tables for AI responses, prompt templates, and conversation management

-- AI responses table for caching generated content
CREATE TABLE IF NOT EXISTS ai_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    prompt_hash VARCHAR(32) NOT NULL,
    generated_content TEXT NOT NULL,
    model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guest_id, prompt_hash)
);

-- Prompt templates table for managing AI prompts
CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    template TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'review_request', 'follow_up', 'response', 'custom'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table for tracking guest interactions
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'email'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'escalated'
    sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation messages table for storing all messages in a conversation
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL, -- 'guest', 'system', 'agent'
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    sentiment VARCHAR(20),
    intent VARCHAR(50), -- 'review_left', 'complaint', 'question', 'compliment', 'other'
    is_automated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add AI-related columns to existing tables

-- Add OpenAI API key to orgs table
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS openai_api_key VARCHAR(255);

-- Add AI configuration to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_prompt_template_id UUID REFERENCES prompt_templates(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_responses_guest_id ON ai_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_prompt_hash ON ai_responses(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_org_id ON prompt_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_type ON prompt_templates(type);
CREATE INDEX IF NOT EXISTS idx_conversations_guest_id ON conversations(guest_id);
CREATE INDEX IF NOT EXISTS idx_conversations_campaign_id ON conversations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender ON conversation_messages(sender);

-- Note: Default prompt templates will be created automatically when organizations are set up
-- This avoids foreign key constraint issues during migration

-- Add comments for documentation
COMMENT ON TABLE ai_responses IS 'Caches AI-generated content to avoid duplicate API calls';
COMMENT ON TABLE prompt_templates IS 'Stores AI prompt templates for different message types';
COMMENT ON TABLE conversations IS 'Tracks guest conversations across channels';
COMMENT ON TABLE conversation_messages IS 'Stores individual messages within conversations';

COMMENT ON COLUMN ai_responses.prompt_hash IS 'MD5 hash of prompt data for caching';
COMMENT ON COLUMN prompt_templates.type IS 'Type of prompt: review_request, follow_up, response, custom';
COMMENT ON COLUMN conversations.sentiment IS 'Overall conversation sentiment based on latest messages';
COMMENT ON COLUMN conversation_messages.intent IS 'Detected intent: review_left, complaint, question, compliment, other';