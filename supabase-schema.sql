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
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Generations: users manage their own
CREATE POLICY "Users can view own generations" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generations" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own generations" ON generations FOR DELETE USING (auth.uid() = user_id);

-- Scheduled posts: users manage their own
CREATE POLICY "Users can view own scheduled" ON scheduled_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scheduled" ON scheduled_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own scheduled" ON scheduled_posts FOR DELETE USING (auth.uid() = user_id);

-- Usage logs: users manage their own
CREATE POLICY "Users can view own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_generations_user_id on generations(user_id);
create index if not exists idx_scheduled_user_id on scheduled_posts(user_id);
create index if not exists idx_usage_user_action on usage_logs(user_id, action_type);
