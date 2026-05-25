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

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('user_id', req.user.id)
    .order('scheduled_date', { ascending: true })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', async (req, res) => {
  const { title, posts, platforms, scheduled_date } = req.body;
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      user_id: req.user.id,
      title: title || 'Untitled',
      posts,
      platforms: platforms || [],
      scheduled_date
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
