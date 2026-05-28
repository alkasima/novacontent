import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const body = await req.json();
  const { error } = await supabase.from('usage_logs').insert({
    user_id: user.id,
    action_type: body.action_type || 'generation',
    count: body.count || 1,
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
