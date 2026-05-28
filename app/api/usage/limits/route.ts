import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const TIER_LIMITS = {
  free: { generationsPerMonth: 15, batchVideos: 3, platforms: 3 },
  pro: { generationsPerMonth: 500, batchVideos: 10, platforms: 6 },
  agency: { generationsPerMonth: 999999, batchVideos: 50, platforms: 10 },
};

async function getTier(userId: string) {
  if (!supabase) return 'free';
  const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single();
  return data?.subscription_tier || 'free';
}

async function getUsageThisMonth(userId: string, actionType: string) {
  if (!supabase) return 0;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', startOfMonth.toISOString());

  return count || 0;
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const tier = await getTier(user.id);
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
  const used = await getUsageThisMonth(user.id, 'generation');

  return NextResponse.json({
    tier,
    limit: limits.generationsPerMonth,
    used,
    remaining: Math.max(0, limits.generationsPerMonth - used),
  });
}
