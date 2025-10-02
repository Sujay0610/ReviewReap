import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/cookie
 * Receives Supabase access & refresh tokens from the client after a successful login
 * and stores them as http-only cookies so that subsequent Server Components / Route
 * Handlers can obtain the authenticated session.
 */
export async function POST(request: NextRequest) {
  console.log('DEBUG: /api/auth/cookie called');
  try {
    const { access_token, refresh_token } = await request.json();
    console.log('DEBUG: Tokens received', { access_token: !!access_token, refresh_token: !!refresh_token });

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    const debugCookies = cookieStore.getAll().map(c => c.name);
    console.log('DEBUG: Cookies after setSession', debugCookies);

    if (error) {
      console.error('Failed to set session on server:', error.message);
      return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Session stored' }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in /api/auth/cookie:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}