import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth';

const VALID = ['anthropic', 'openai', 'gemini', 'openrouter', 'custom'];

function maskKey(key: string) {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return key.slice(0, 4) + '••••' + key.slice(-4);
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { data, error } = await supabase!
    .from('ai_providers')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = (data || []).map((p: any) => ({ ...p, api_key: maskKey(p.api_key), has_key: !!p.api_key }));
  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json();
  const provider = String(body.provider || '').toLowerCase();
  const model = String(body.model || '').trim();
  const api_key = String(body.api_key || '').trim();
  const base_url = body.base_url ? String(body.base_url).trim() : null;
  const label = body.label ? String(body.label).trim() : null;
  const makeDefault = !!body.is_default;

  if (!VALID.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  if (!model) return NextResponse.json({ error: 'Model is required' }, { status: 400 });
  if (!api_key) return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  if (provider === 'custom' && !base_url) {
    return NextResponse.json({ error: 'Custom provider requires a base URL' }, { status: 400 });
  }

  if (makeDefault) {
    await supabase!.from('ai_providers').update({ is_default: false }).eq('is_default', true);
  }

  const { data, error } = await supabase!
    .from('ai_providers')
    .insert({ provider, label, model, api_key, base_url, is_default: makeDefault, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, api_key: maskKey(data.api_key), has_key: true });
}
