import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id, email, full_name')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }

    // If user already has an org_id, return it
    if (userData.org_id) {
      return NextResponse.json({ org_id: userData.org_id });
    }

    // Create a default organization for the user
    const { data: orgData, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: `${userData.full_name || userData.email.split('@')[0]}'s Organization`,
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
    const { error: updateError } = await supabase
      .from('users')
      .update({ org_id: orgData.id })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating user with org_id:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ org_id: orgData.id });
  } catch (error) {
    console.error('Error ensuring organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}