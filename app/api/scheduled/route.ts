import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const body = await req.json();
  const { data, error } = await supabase.from('scheduled_posts').insert({
    user_id: user.id,
    ...body,
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
