import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_date', now)
    .order('scheduled_date', { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = pending || [];
  const results: { id: string; status: string; error?: string }[] = [];

  for (const post of posts) {
    try {
      // TODO: Replace with real platform API publishing when integrations are ready
      // For now, mark as published to simulate auto-publishing
      const { error: updateErr } = await supabase
        .from('scheduled_posts')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', post.id);

      if (updateErr) throw new Error(updateErr.message);
      results.push({ id: post.id, status: 'published' });
    } catch (e: any) {
      results.push({ id: post.id, status: 'failed', error: e.message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    published: results.filter(r => r.status === 'published').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  });
}
