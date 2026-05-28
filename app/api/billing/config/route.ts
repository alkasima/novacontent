import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  return NextResponse.json({ publishableKey: config.STRIPE_PUBLISHABLE_KEY });
}
