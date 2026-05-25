const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

function supabaseAuth(req, res, next) {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: 'Auth not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  // Create a temporary client with the user's token to verify
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });

  client.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = data.user;
    req.token = token;
    next();
  }).catch(err => {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Auth verification failed' });
  });
}

module.exports = { supabaseAuth };
