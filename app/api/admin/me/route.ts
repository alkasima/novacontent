import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { user } = await verifyAuth(req);
  if (!user) return NextResponse.json({ is_superadmin: false }, { status: 200 });
  if (!supabase) return NextResponse.json({ is_superadmin: false }, { status: 200 });

  const { data } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ is_superadmin: !!data?.is_superadmin });
}
