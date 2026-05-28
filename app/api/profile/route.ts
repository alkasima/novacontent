import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const { data: created, error: createErr } = await supabase.from('profiles').insert({
      id: user.id,
      subscription_tier: 'free',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
    }).select().single();

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
    return NextResponse.json(created);
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const body = await req.json();
  const { data, error } = await supabase.from('profiles').update({
    ...body,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
