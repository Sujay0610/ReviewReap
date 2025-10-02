import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 400 });
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filepath, buffer);

    // Read and parse CSV for preview
    const csvContent = fs.readFileSync(filepath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      fs.unlinkSync(filepath); // Clean up
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const sample_rows = lines.slice(1, 6).map(line => {
      return line.split(',').map(v => v.trim().replace(/"/g, ''));
    });
    
    const preview = {
      headers,
      sample_rows,
      total_rows: lines.length - 1
    };

    // Create upload job record
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .insert({
        org_id: profile.org_id,
        user_id: user.id,
        filename: file.name,
        file_path: filepath,
        status: 'uploaded',
        total_rows: lines.length - 1,
        headers: headers
      })
      .select()
      .single();

    if (jobError) {
      fs.unlinkSync(filepath); // Clean up
      console.error('Error creating upload job:', jobError);
      return NextResponse.json({ error: 'Failed to create upload job' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      job_id: uploadJob.id,
      preview
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}