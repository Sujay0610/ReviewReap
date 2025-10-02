-- Fix RLS policies to prevent infinite recursion
-- Apply these SQL statements in your Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own org data" ON orgs;
DROP POLICY IF EXISTS "Users can update own org data" ON orgs;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new fixed policies for orgs table
CREATE POLICY "Users can view own org data" ON orgs FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.org_id = orgs.id AND users.id = auth.uid()));
CREATE POLICY "Users can update own org data" ON orgs FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.org_id = orgs.id AND users.id = auth.uid()));
CREATE POLICY "Users can insert org data" ON orgs FOR INSERT WITH CHECK (true);

-- Create new fixed policies for users table
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can view org members" ON users FOR SELECT USING (org_id IS NOT NULL AND EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = users.org_id));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (id = auth.uid());