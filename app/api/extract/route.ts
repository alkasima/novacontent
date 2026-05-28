import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

  try {
    const { extractAll } = await import('@/server/extract');
    const data = await extractAll(url);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Extraction error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to extract video' }, { status: 500 });
  }
}
