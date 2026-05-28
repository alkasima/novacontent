import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    supabaseUrl: config.SUPABASE_URL,
    supabaseAnonKey: config.SUPABASE_ANON_KEY,
    stripePublishableKey: config.STRIPE_PUBLISHABLE_KEY,
    appUrl: config.APP_URL,
  });
}
