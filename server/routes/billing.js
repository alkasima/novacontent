const express = require('express');
const config = require('../config');
const stripe = config.STRIPE_SECRET_KEY ? require('stripe')(config.STRIPE_SECRET_KEY) : null;
const { supabase } = require('../supabaseClient');
const { supabaseAuth } = require('../middleware/auth');

const router = express.Router();

function dbReady(req, res, next) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  next();
}

router.use(dbReady);

// Public endpoint for publishable key
router.get('/config', (req, res) => {
  res.json({ publishableKey: config.STRIPE_PUBLISHABLE_KEY });
});

// Create checkout session (auth required)
router.post('/checkout', supabaseAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });
  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: 'Price ID required' });

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', req.user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      metadata: { supabase_user_id: req.user.id }
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', req.user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.APP_URL}/index.html?checkout=success`,
    cancel_url: `${config.APP_URL}/index.html?checkout=cancel`,
    metadata: { supabase_user_id: req.user.id }
  });

  res.json({ url: session.url });
});

// Customer portal
router.post('/portal', supabaseAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', req.user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: 'No subscription found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${config.APP_URL}/index.html?page=settings`
  });

  res.json({ url: session.url });
});

// Webhook (no auth — Stripe signs it)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.supabase_user_id;
    const subscriptionId = session.subscription;

    if (userId) {
      // Determine tier from price
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0].price.id;
      const tier = priceId === config.STRIPE_PRICE_ID_AGENCY ? 'agency' : 'pro';

      await supabase.from('profiles').update({
        subscription_tier: tier,
        subscription_status: 'active',
        stripe_subscription_id: subscriptionId
      }).eq('id', userId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const userId = subscription.metadata?.supabase_user_id;
    if (userId) {
      await supabase.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'canceled',
        stripe_subscription_id: null
      }).eq('id', userId);
    }
  }

  res.json({ received: true });
});

module.exports = router;
