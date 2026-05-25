const express = require('express');
const { supabase } = require('../supabaseClient');
const { supabaseAuth } = require('../middleware/auth');

const router = express.Router();

function dbReady(req, res, next) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  next();
}

router.use(dbReady);
router.use(supabaseAuth);

const TIER_LIMITS = {
  free: { generationsPerMonth: 15, batchVideos: 3, platforms: 3 },
  pro: { generationsPerMonth: 500, batchVideos: 10, platforms: 6 },
  agency: { generationsPerMonth: 999999, batchVideos: 50, platforms: 10 }
};

async function getTier(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();

  const tier = data?.subscription_tier || 'free';
  const status = data?.subscription_status || 'active';
  if (status !== 'active') return 'free';
  return tier;
}

async function getUsageThisMonth(userId, actionType) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('usage_logs')
    .select('count')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', startOfMonth.toISOString());

  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + (row.count || 0), 0);
}

// Check limits
router.get('/limits', async (req, res) => {
  const tier = await getTier(req.user.id);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const used = await getUsageThisMonth(req.user.id, 'generation');

  res.json({
    tier,
    limits,
    used,
    remaining: Math.max(0, limits.generationsPerMonth - used)
  });
});

// Log usage
router.post('/log', async (req, res) => {
  const { action_type, count = 1 } = req.body;
  const tier = await getTier(req.user.id);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  if (action_type === 'generation') {
    const used = await getUsageThisMonth(req.user.id, 'generation');
    if (used + count > limits.generationsPerMonth) {
      return res.status(429).json({
        error: 'Monthly generation limit reached. Upgrade to Pro for more.',
        tier,
        limit: limits.generationsPerMonth,
        used
      });
    }
  }

  const { data, error } = await supabase
    .from('usage_logs')
    .insert({ user_id: req.user.id, action_type, count })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, log: data });
});

module.exports = { usageRouter: router, getTier, getUsageThisMonth, TIER_LIMITS };
