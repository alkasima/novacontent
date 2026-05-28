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

  const { priceId } = await req.json();
  if (!priceId) return NextResponse.json({ error: 'Price ID required' }, { status: 400 });

  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.APP_URL}/app?checkout=success`,
    cancel_url: `${config.APP_URL}/app?checkout=cancel`,
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
