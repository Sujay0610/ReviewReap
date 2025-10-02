import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { id, email, full_name } = await request.json();

    // First, create a default organization for the user
    const { data: orgData, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: `${full_name || email.split('@')[0]}'s Organization`,
        timezone: 'UTC',
        default_country: 'US'
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Update the user with the organization ID
    const { error: userError } = await supabase
      .from('users')
      .update({ org_id: orgData.id })
      .eq('id', id);

    if (userError) {
      console.error('Error updating user with org_id:', userError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, org_id: orgData.id });
  } catch (error) {
    console.error('Error in user creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}