-- Migration: Add events table and message retry functionality
-- Phase 3: WhatsApp Integration & Message Dispatch

-- Create events table for tracking message events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    event_type VARCHAR NOT NULL, -- 'sent', 'delivered', 'read', 'failed'
    timestamp TIMESTAMP DEFAULT NOW(),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_message_id ON events(message_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- Add retry functionality to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;

-- Add indexes for message status tracking
CREATE INDEX IF NOT EXISTS idx_messages_status_scheduled ON messages(status, scheduled_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_messages_campaign_status ON messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_provider_msg_id ON messages(provider_msg_id) WHERE provider_msg_id IS NOT NULL;

-- Update messages table to ensure all required fields exist
ALTER TABLE messages 
ALTER COLUMN scheduled_at SET DEFAULT NOW(),
ALTER COLUMN ai_generated SET DEFAULT false;

-- Add campaign execution tracking
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create view for campaign analytics
CREATE OR REPLACE VIEW campaign_analytics AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    c.channel,
    c.created_at,
    c.started_at,
    c.completed_at,
    COUNT(g.id) as total_guests,
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
LEFT JOIN guests g ON g.campaign_id = c.id
LEFT JOIN messages m ON m.campaign_id = c.id
GROUP BY c.id, c.name, c.status, c.channel, c.created_at, c.started_at, c.completed_at;

-- Add RLS policies for events table (when auth is implemented)
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view events for their org's messages" ON events
--     FOR SELECT USING (
--         message_id IN (
--             SELECT m.id FROM messages m 
--             JOIN campaigns c ON c.id = m.campaign_id 
--             WHERE c.org_id = auth.jwt() ->> 'org_id'
--         )
--     );

-- Add helpful functions
CREATE OR REPLACE FUNCTION get_campaign_stats(campaign_uuid UUID)
RETURNS TABLE(
    total_guests BIGINT,
    messages_sent BIGINT,
    messages_delivered BIGINT,
    messages_read BIGINT,
    messages_failed BIGINT,
    response_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.total_guests,
        ca.messages_sent,
        ca.messages_delivered,
        ca.messages_read,
        ca.messages_failed,
        ca.response_rate
    FROM campaign_analytics ca
    WHERE ca.campaign_id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up old events (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE events IS 'Tracks message delivery events from WhatsApp and email providers';
COMMENT ON COLUMN events.event_type IS 'Type of event: sent, delivered, read, failed';
COMMENT ON COLUMN events.payload IS 'Raw webhook payload from the provider';
COMMENT ON COLUMN messages.retry_count IS 'Number of retry attempts for failed messages';
COMMENT ON VIEW campaign_analytics IS 'Aggregated campaign statistics for reporting';