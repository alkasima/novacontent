import { NextRequest } from 'next/server';
import { getSupabaseAuthClient, supabase } from './supabase';

export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { user: null, error: 'Missing authorization header' };

  const token = authHeader.replace('Bearer ', '');
  if (!token) return { user: null, error: 'Missing token' };

  const client = getSupabaseAuthClient();
  if (!client) return { user: null, error: 'Auth not configured' };

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { user: null, error: 'Invalid token' };

  return { user: data.user, token };
}

export async function requireSuperadmin(req: NextRequest) {
  const { user, error } = await verifyAuth(req);
  if (!user) return { user: null, error: error || 'Unauthorized', status: 401 };
  if (!supabase) return { user: null, error: 'Database not configured', status: 503 };

  const { data } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single();

  if (!data?.is_superadmin) {
    return { user: null, error: 'Forbidden: superadmin only', status: 403 };
  }

  return { user, error: null, status: 200 };
}
