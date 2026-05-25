# ContentForge — Video Repurposer (SaaS)

Turn YouTube & TikTok videos into original social media posts.

## Quick Start (Local)

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase + Stripe keys
3. Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor
4. `npm start`
5. Open `http://localhost:3001`

## Environment Variables

| Key | Source |
|-----|--------|
| `SUPABASE_URL` | Supabase Project Settings > API |
| `SUPABASE_SERVICE_KEY` | Supabase Project Settings > API (service_role) |
| `SUPABASE_ANON_KEY` | Supabase Project Settings > API (anon/public) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI or Dashboard webhook endpoint |
| `STRIPE_PRICE_ID_PRO` | Stripe Dashboard > Products > Pro Price ID |
| `STRIPE_PRICE_ID_AGENCY` | Stripe Dashboard > Products > Agency Price ID |

## Features

- Auth (email/password via Supabase)
- Cloud history, scheduled posts, brand voice
- Usage limits (Free / Pro / Agency)
- Stripe billing (checkout + customer portal)
- 7 platforms: X, Facebook, LinkedIn, Instagram, TikTok, Threads, YouTube Shorts
- 8 languages, brand voice, content calendar, batch mode, export

## Deploy

Set `NODE_ENV=production` and `APP_URL` to your domain.

## Prerequisites

1. **Node.js** (v14+) - https://nodejs.org
2. **yt-dlp** - Video extraction tool

### Install yt-dlp

**Windows (PowerShell):**
```powershell
pip install yt-dlp
```
Or download from: https://github.com/yt-dlp/yt-dlp/releases

**Mac:**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo apt install yt-dlp
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the server (Terminal 1)
npm start

# 3. Open the app (Terminal 2 or browser)
# Open http://localhost:3001/index.html
```

## Usage

1. Enter your Groq API key (free at https://console.groq.com/keys)
2. Paste a YouTube or TikTok URL
3. Click "Generate Posts"
4. The app will:
   - Fetch video title, creator, description
   - Extract subtitles/transcript (if available)
   - Generate original social posts using AI
5. Copy, edit, save, or export your posts

## Project Structure

```
NovaContent/
├── index.html          # Main app UI
├── css/styles.css      # Styling
├── js/app.js           # Frontend logic
├── server/
│   ├── index.js        # Express server
│   └── extract.js      # yt-dlp wrapper
├── package.json
└── README.md
```

## API Keys Needed

- **Groq API** (free, no credit card): https://console.groq.com/keys

## Troubleshooting

**"yt-dlp is not recognized":**
- Add yt-dlp to your system PATH, or use full path in extract.js

**"Failed to extract video":**
- Make sure yt-dlp is installed: `yt-dlp --version`
- Some TikTok videos may not have captions available

**Server won't start:**
- Check if port 3001 is available
- Run: `node server/index.js` for detailed error