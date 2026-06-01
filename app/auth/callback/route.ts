import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/app';

  if (code) {
    const { createClient } = await import('@supabase/supabase-js');
    const { config } = await import('@/lib/config');
    if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
      const sb = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=Auth failed', origin));
}
