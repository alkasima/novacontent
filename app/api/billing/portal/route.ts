import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any }) : null;

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${config.APP_URL}/app?page=settings`,
  });

  return NextResponse.json({ url: session.url });
}
