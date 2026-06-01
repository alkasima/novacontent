-- ContentForge Supabase Schema
-- Run this in your Supabase SQL Editor

-- Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  brand_voice jsonb default '{}',
  preferences jsonb default '{}',
  subscription_tier text default 'free',
  subscription_status text default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Generations / history
create table if not exists generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text,
  posts jsonb not null,
  platforms text[] default '{}',
  source_url text,
  created_at timestamptz default now()
);

-- Scheduled posts
create table if not exists scheduled_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text,
  posts jsonb not null,
  platforms text[] default '{}',
  scheduled_date timestamptz not null,
  status text default 'pending',
  image_url text,
  created_at timestamptz default now()
);

-- Usage tracking
create table if not exists usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  action_type text not null,
  count integer default 1,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table generations enable row level security;
alter table scheduled_posts enable row level security;
alter table usage_logs enable row level security;

-- Profiles: users manage their own
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Generations: users manage their own
DROP POLICY IF EXISTS "Users can view own generations" ON generations;
CREATE POLICY "Users can view own generations" ON generations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own generations" ON generations;
CREATE POLICY "Users can insert own generations" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own generations" ON generations;
CREATE POLICY "Users can delete own generations" ON generations FOR DELETE USING (auth.uid() = user_id);

-- Scheduled posts: users manage their own
DROP POLICY IF EXISTS "Users can view own scheduled" ON scheduled_posts;
CREATE POLICY "Users can view own scheduled" ON scheduled_posts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own scheduled" ON scheduled_posts;
CREATE POLICY "Users can insert own scheduled" ON scheduled_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own scheduled" ON scheduled_posts;
CREATE POLICY "Users can delete own scheduled" ON scheduled_posts FOR DELETE USING (auth.uid() = user_id);

-- Usage logs: users manage their own
DROP POLICY IF EXISTS "Users can view own usage" ON usage_logs;
CREATE POLICY "Users can view own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own usage" ON usage_logs;
CREATE POLICY "Users can insert own usage" ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Superadmin flag on profiles
alter table profiles add column if not exists is_superadmin boolean default false;

-- AI providers (managed by superadmin only)
create table if not exists ai_providers (
  id uuid default gen_random_uuid() primary key,
  provider text not null,            -- anthropic | openai | gemini | openrouter | custom
  label text,                        -- optional friendly name
  model text not null,               -- e.g. claude-3-5-sonnet-latest, gpt-4o-mini
  api_key text not null,             -- stored server-side, never exposed to clients
  base_url text,                     -- required for "custom" (OpenAI-compatible endpoint)
  is_default boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Only one default provider at a time
create unique index if not exists idx_ai_providers_one_default
  on ai_providers(is_default) where is_default = true;

-- RLS: lock the table down. All access goes through server (service-role) routes
-- guarded by the is_superadmin check; no client-side policies are granted.
alter table ai_providers enable row level security;

-- Indexes for performance
create index if not exists idx_generations_user_id on generations(user_id);
create index if not exists idx_scheduled_user_id on scheduled_posts(user_id);
create index if not exists idx_usage_user_action on usage_logs(user_id, action_type);

-- To make yourself superadmin, run (replace with your email):
--   update profiles set is_superadmin = true
--   where id = (select id from auth.users where email = 'you@example.com');
