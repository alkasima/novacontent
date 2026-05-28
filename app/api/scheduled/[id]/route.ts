import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from('scheduled_posts')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id } = await params;
  const { error } = await supabase.from('scheduled_posts').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
