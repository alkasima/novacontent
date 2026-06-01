import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth';

function maskKey(key: string) {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return key.slice(0, 4) + '••••' + key.slice(-4);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.label !== undefined) updates.label = body.label ? String(body.label).trim() : null;
  if (body.model !== undefined) updates.model = String(body.model).trim();
  if (body.base_url !== undefined) updates.base_url = body.base_url ? String(body.base_url).trim() : null;
  if (body.is_active !== undefined) updates.is_active = !!body.is_active;
  // Only overwrite the key if a new, non-masked value is supplied
  if (body.api_key !== undefined && body.api_key && !String(body.api_key).includes('••')) {
    updates.api_key = String(body.api_key).trim();
  }

  if (body.is_default === true) {
    await supabase!.from('ai_providers').update({ is_default: false }).eq('is_default', true);
    updates.is_default = true;
    updates.is_active = true;
  } else if (body.is_default === false) {
    updates.is_default = false;
  }

  const { data, error } = await supabase!
    .from('ai_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, api_key: maskKey(data.api_key), has_key: !!data.api_key });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperadmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const { error } = await supabase!.from('ai_providers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
