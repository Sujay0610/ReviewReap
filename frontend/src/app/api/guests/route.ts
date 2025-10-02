import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${BACKEND_URL}/guests?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json(
      { detail: 'Failed to fetch guests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Ensure user has an organization before creating guest
    try {
      const orgResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/ensure-org`, {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      
      if (!orgResponse.ok) {
        console.error('Failed to ensure organization for user');
        return NextResponse.json(
          { error: 'Failed to ensure user organization' },
          { status: 500 }
        );
      }
      
      const orgData = await orgResponse.json();
       if (!orgData.org_id) {
         return NextResponse.json(
           { error: 'User organization could not be created' },
           { status: 500 }
         );
       }
       
       // Small delay to ensure database consistency
       await new Promise(resolve => setTimeout(resolve, 100));
     } catch (orgError) {
       console.error('Error ensuring organization:', orgError);
       return NextResponse.json(
         { error: 'Failed to ensure user organization' },
         { status: 500 }
       );
     }

     const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating guest:', error);
    return NextResponse.json(
      { detail: 'Failed to create guest' },
      { status: 500 }
    );
  }
}