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

// List user's generations
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Create generation
router.post('/', async (req, res) => {
  const { title, posts, platforms, source_url } = req.body;
  const { data, error } = await supabase
    .from('generations')
    .insert({
      user_id: req.user.id,
      title: title || 'Untitled',
      posts,
      platforms: platforms || [],
      source_url: source_url || null
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete generation
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('generations')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
