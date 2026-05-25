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

// Get or create profile
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    // Create default profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({ id: req.user.id })
      .select()
      .single();

    if (createError) return res.status(500).json({ error: createError.message });
    return res.json(newProfile);
  }

  res.json(data);
});

// Update profile (brand voice, preferences)
router.patch('/', async (req, res) => {
  const updates = {};
  if (req.body.brand_voice !== undefined) updates.brand_voice = req.body.brand_voice;
  if (req.body.preferences !== undefined) updates.preferences = req.body.preferences;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
