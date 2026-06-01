import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDefaultProvider, chat } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const body = await req.json();
  const prompt = String(body.prompt || '').trim();
  const system = body.system ? String(body.system) : undefined;
  if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

  const provider = await getDefaultProvider();
  if (!provider) {
    return NextResponse.json(
      { error: 'No AI provider configured. Ask an administrator to set a default provider.' },
      { status: 503 }
    );
  }

  try {
    const text = await chat(provider, {
      system,
      prompt,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.8,
      maxTokens: typeof body.maxTokens === 'number' ? body.maxTokens : 1200,
      json: !!body.json,
    });
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('Generate error:', err.message);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 502 });
  }
}
