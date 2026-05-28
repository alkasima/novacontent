require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { extractAll } = require('./extract');
const { supabaseAuth } = require('./middleware/auth');
const { getTier, getUsageThisMonth, TIER_LIMITS } = require('./routes/usage');

const config = require('./config');

const app = express();
const PORT = config.PORT;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.APP_URL }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Stripe webhook needs raw body
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Clean URL routes (before static middleware)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'app.html'));
});

// Redirect .html to clean URLs
app.get('/login.html', (req, res) => res.redirect(301, '/login'));
app.get('/app.html', (req, res) => res.redirect(301, '/app'));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.NODE_ENV });
});

// Public frontend config
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: config.SUPABASE_URL,
    supabaseAnonKey: config.SUPABASE_ANON_KEY,
    stripePublishableKey: config.STRIPE_PUBLISHABLE_KEY,
    appUrl: config.APP_URL
  });
});

// Video extraction (auth + usage limit)
app.post('/api/extract', supabaseAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Check usage limits
  const tier = await getTier(req.user.id);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const used = await getUsageThisMonth(req.user.id, 'generation');
  if (used >= limits.generationsPerMonth) {
    return res.status(429).json({ error: 'Monthly generation limit reached. Upgrade for more.' });
  }

  try {
    const data = await extractAll(url);
    res.json(data);
  } catch (err) {
    console.error('Extraction error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to extract video' });
  }
});

// API routes
app.use('/api/generations', require('./routes/generations'));
app.use('/api/scheduled', require('./routes/scheduled'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/usage', require('./routes/usage').usageRouter);
app.use('/api/billing', require('./routes/billing'));

// Test yt-dlp
app.get('/test-yt-dlp', async (req, res) => {
  const { exec } = require('child_process');
  exec('python -m yt_dlp --version', (err, stdout) => {
    if (err) {
      res.json({ installed: false, error: err.message });
    } else {
      res.json({ installed: true, version: stdout.trim() });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});