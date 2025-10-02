-- Migration: Add Google Reviews Integration
-- This migration adds Google API credentials to organizations table
-- and ensures the reviews and google_business_profiles tables exist

-- Add Google API credentials to orgs table
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS google_api_key VARCHAR;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS google_place_id VARCHAR;

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id),
    google_review_id VARCHAR UNIQUE,
    rating INTEGER NOT NULL,
    text TEXT,
    author_name VARCHAR,
    review_date TIMESTAMP,
    response_text TEXT,
    response_date TIMESTAMP,
    source VARCHAR DEFAULT 'google',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create google_business_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS google_business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    place_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    address TEXT,
    phone VARCHAR,
    website VARCHAR,
    rating DECIMAL(2,1),
    review_count INTEGER,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_guest_id ON reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_google_review_id ON reviews(google_review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_reviews_source ON reviews(source);

CREATE INDEX IF NOT EXISTS idx_google_business_profiles_org_id ON google_business_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_google_business_profiles_place_id ON google_business_profiles(place_id);

-- Add updated_at triggers if they don't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_google_business_profiles_updated_at ON google_business_profiles;
CREATE TRIGGER update_google_business_profiles_updated_at 
    BEFORE UPDATE ON google_business_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews table
DROP POLICY IF EXISTS "Org data access" ON reviews;
CREATE POLICY "Org data access" ON reviews 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            JOIN guests ON guests.org_id = users.org_id 
            WHERE users.id = auth.uid() 
            AND guests.id = reviews.guest_id
        )
    );

-- RLS policies for google_business_profiles table
DROP POLICY IF EXISTS "Org data access" ON google_business_profiles;
CREATE POLICY "Org data access" ON google_business_profiles 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.org_id = google_business_profiles.org_id
        )
    );

-- Add comments for documentation
COMMENT ON TABLE reviews IS 'Stores customer reviews from various platforms (Google, Booking.com, etc.)';
COMMENT ON TABLE google_business_profiles IS 'Stores Google My Business profile information for organizations';

COMMENT ON COLUMN orgs.google_api_key IS 'Google Places API key for fetching reviews';
COMMENT ON COLUMN orgs.google_place_id IS 'Google Place ID for the business location';

COMMENT ON COLUMN reviews.google_review_id IS 'Unique identifier from Google Reviews API';
COMMENT ON COLUMN reviews.source IS 'Platform where the review was posted (google, booking, tripadvisor, etc.)';
COMMENT ON COLUMN reviews.response_text IS 'Business response to the review';
COMMENT ON COLUMN reviews.response_date IS 'Date when the business responded to the review';

COMMENT ON COLUMN google_business_profiles.place_id IS 'Google Place ID for the business';
COMMENT ON COLUMN google_business_profiles.last_synced_at IS 'Last time reviews were synced from Google';