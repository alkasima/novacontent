# ContentForge (PostMint) — Video Repurposer SaaS

Turn YouTube & TikTok videos into original social media posts using AI.

## Quick Start (Render — 1-Click Deploy)

### Option A: Deploy via Render Blueprint (auto)

1. Push this repo to GitHub
2. In [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` — fill in the secret env vars in the UI
5. Click **Apply**

### Option B: Deploy via Docker (manual)

1. Push to GitHub
2. Render → **New +** → **Web Service**
3. Connect repo → select **Docker** runtime (Render detects `Dockerfile`)
4. Set these environment variables in the Render dashboard:

| Key | Required | Description |
|-----|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase Project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service_role key |

### After Deploy

1. **Set up your database** — Run `supabase-schema.sql` in your Supabase SQL Editor
2. **Make yourself superadmin** — In SQL Editor, run:
   ```sql
   update profiles set is_superadmin = true
   where id = (select id from auth.users where email = 'your@email.com');
   ```
3. **Configure an AI provider** — Sign in → visit `/admin` → add your API key (OpenAI, Anthropic, Gemini, or OpenRouter)

---

## Features

- 🎥 **Video Repurposing** — Paste any YouTube/TikTok URL, AI extracts the core idea
- 📝 **Text Repurposing** — Paste blog posts, articles, or notes
- 🎯 **7 Platforms** — X/Twitter, LinkedIn, Instagram, Facebook, TikTok, Threads, YouTube Shorts
- 🎨 **Brand Voice Cloning** — Train AI on your writing style
- 📦 **Batch Mode** — Process multiple URLs at once
- 🖼️ **AI Image Generation** — Scroll-stopping visuals per platform
- 📅 **Content Calendar** — Schedule posts with a visual calendar
- 🌍 **8 Languages** — English, Spanish, French, Portuguese, Arabic, Hindi, German, Pidgin English
- 💾 **Cloud History** — Auto-save all generations
- 🔐 **Auth** — Email/password + Google/GitHub OAuth via Supabase

## Tech Stack

- **Next.js 15** (App Router)
- **Supabase** (Auth + Database)
- **Stripe** (Billing)
- **yt-dlp** (Video extraction)
- **Groq** (AI inference for transcription)
- **External AI APIs** (OpenAI, Anthropic, Gemini, OpenRouter)

## Local Development

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

## File Structure

```
├── app/                    # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── extract/        # Video extraction (yt-dlp)
│   │   ├── generate/       # AI post generation
│   │   ├── voice/clone/    # Brand voice cloning
│   │   ├── billing/        # Stripe subscriptions
│   │   ├── admin/          # Superadmin provider management
│   │   └── ...
│   ├── dashboard/          # Main dashboard
│   ├── admin/              # AI providers admin
│   ├── login/              # Auth page
│   └── page.tsx            # Landing page
├── lib/
│   ├── ai.ts               # AI provider clients (Anthropic, OpenAI, Gemini, OpenRouter)
│   ├── auth.ts             # Auth helpers
│   ├── supabase.ts         # Supabase client
│   └── config.ts           # Env config
├── server/
│   └── extract.js          # yt-dlp wrapper (video download + transcription)
├── render.yaml             # Render Blueprint config
├── Dockerfile              # Docker deployment
└── supabase-schema.sql     # Database schema
```
