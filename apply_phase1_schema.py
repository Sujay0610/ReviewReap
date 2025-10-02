import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Database connection parameters
db_params = {
    'host': os.getenv('SUPABASE_URL').replace('https://', '').replace('http://', ''),
    'database': 'postgres',
    'user': 'postgres',
    'password': os.getenv('SUPABASE_DB_PASSWORD'),
    'port': 5432
}

# SQL statements for Phase 1 tables
sql_statements = [
    """
    -- Campaigns table for Phase 2 (adding early for guest reference)
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
    """,
    """
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
    """,
    """
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
    """,
    "ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE guests ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE upload_jobs ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Org data access\" ON campaigns;",
    "DROP POLICY IF EXISTS \"Org data access\" ON guests;",
    "DROP POLICY IF EXISTS \"Org data access\" ON upload_jobs;",
    "CREATE POLICY \"Org data access\" ON campaigns FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = campaigns.org_id));",
    "CREATE POLICY \"Org data access\" ON guests FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = guests.org_id));",
    "CREATE POLICY \"Org data access\" ON upload_jobs FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.org_id = upload_jobs.org_id));"
]

try:
    # Connect to the database
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()
    
    print("Applying Phase 1 database schema...")
    
    for i, sql in enumerate(sql_statements, 1):
        try:
            cursor.execute(sql)
            conn.commit()
            print(f"✓ Statement {i} executed successfully")
        except Exception as e:
            print(f"✗ Error executing statement {i}: {e}")
            conn.rollback()
    
    print("\nPhase 1 schema application completed!")
    
except Exception as e:
    print(f"Database connection error: {e}")
finally:
    if 'conn' in locals():
        conn.close()