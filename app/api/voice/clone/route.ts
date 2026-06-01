import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDefaultProvider, chat } from '@/lib/ai';

const VALID_TONES = ['Professional', 'Casual', 'Witty', 'Inspirational', 'Direct', 'Educational'];

const SYSTEM_PROMPT = `You are a brand voice analyst. Analyze the user's sample posts and extract their brand voice. Return a JSON object with these exact fields:
{
  "name": "short brand name inferred from content",
  "tone": "one of: Professional, Casual, Witty, Inspirational, Direct, Educational",
  "audience": "target audience description (1 sentence)",
  "examples": "2-3 signature phrases or patterns (comma separated)",
  "avoid": "2-3 things the tone should avoid (comma separated)"
}
Respond with ONLY the JSON object, no other text.`;

export async function POST(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const body = await req.json();
  const samples = String(body.samples || '').trim();
  if (!samples) return NextResponse.json({ error: 'Paste at least one post to clone your voice.' }, { status: 400 });

  const provider = await getDefaultProvider();
  if (!provider) {
    return NextResponse.json({ error: 'No AI provider configured. Ask an administrator.' }, { status: 503 });
  }

  try {
    const text = await chat(provider, {
      system: SYSTEM_PROMPT,
      prompt: `Here are my posts. Analyze my brand voice:\n\n${samples}`,
      temperature: 0.3,
      maxTokens: 600,
      json: true,
    });

    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!VALID_TONES.includes(parsed.tone)) parsed.tone = 'Professional';

    return NextResponse.json({
      name: parsed.name || '',
      tone: parsed.tone || 'Professional',
      audience: parsed.audience || '',
      examples: parsed.examples || '',
      avoid: parsed.avoid || '',
    });
  } catch (err: any) {
    console.error('Voice clone error:', err.message);
    return NextResponse.json({ error: err.message || 'Voice cloning failed' }, { status: 502 });
  }
}
