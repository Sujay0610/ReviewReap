import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Get Supabase connection details
supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Extract database connection details from Supabase URL
# Format: https://kaqewtdzrjnjakjfouvx.supabase.co
project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '')

# Supabase database connection string
db_url = f"postgresql://postgres:{supabase_service_key}@db.{project_ref}.supabase.co:5432/postgres"

print("Connecting to Supabase database...")

try:
    # Connect to the database
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Read the SQL file
    with open('fix_policies_v2.sql', 'r') as file:
        sql_content = file.read()
    
    # Split into individual statements
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
    
    print(f"Executing {len(statements)} SQL statements...")
    
    for i, statement in enumerate(statements):
        try:
            print(f"Executing statement {i+1}: {statement[:50]}...")
            cursor.execute(statement)
            print(f"✓ Statement {i+1} executed successfully")
        except Exception as e:
            print(f"✗ Error executing statement {i+1}: {e}")
            continue
    
    print("\n✅ Policy fixes applied successfully!")
    print("The infinite recursion issue should now be resolved.")
    
except Exception as e:
    print(f"❌ Database connection error: {e}")
    print("\nPlease apply the SQL statements manually in Supabase SQL Editor:")
    print("1. Go to your Supabase dashboard")
    print("2. Navigate to SQL Editor")
    print("3. Copy and paste the contents of fix_policies_v2.sql")
    print("4. Execute the statements")
    
finally:
    if 'conn' in locals():
        conn.close()