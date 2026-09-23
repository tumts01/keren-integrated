import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('olimpiade_juri')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Username atau Password salah' }, { status: 401 });
    }

    // Omit password from response
    const { password: _, ...juriData } = data;

    return NextResponse.json({ success: true, data: juriData });
  } catch (error: any) {
    console.error('Error Login Juri:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
