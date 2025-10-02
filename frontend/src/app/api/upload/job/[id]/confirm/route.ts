import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { column_mapping } = await request.json();
    
    // Get the upload job to retrieve the file information
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .select('*')
      .eq('id', params.id)
      .single();

    if (jobError || !uploadJob) {
      return NextResponse.json({ error: 'Upload job not found' }, { status: 404 });
    }

    // Read the file from local filesystem
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(uploadJob.file_path)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(uploadJob.file_path);
    const fileBlob = new Blob([fileBuffer], { type: 'text/csv' });

    // Create FormData for the backend request
    const formData = new FormData();
    formData.append('file', fileBlob, uploadJob.filename);
    formData.append('column_mapping', JSON.stringify(column_mapping));

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/upload/csv/process/${params.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV' },
      { status: 500 }
    );
  }
}