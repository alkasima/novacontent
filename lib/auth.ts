import { NextRequest } from 'next/server';
import { getSupabaseAuthClient } from './supabase';

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
