import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kelas = url.searchParams.get('kelas');
    const semester = url.searchParams.get('semester');
    const ta = url.searchParams.get('ta');

    if (kelas && semester && ta) {
      // Review specific class
      const { data, error } = await supabase
        .from('ekstra_buku_induk')
        .select('*')
        .match({ kelas, semester, tahun_ajaran: ta })
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // ignore no rows
      
      return NextResponse.json({ success: true, data: data?.data_ekstra || [] });
    }

    // Monitoring table
    const { data, error } = await supabase
      .from('ekstra_buku_induk')
      .select('kelas, semester, tahun_ajaran, created_at, data_ekstra')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = data.map(d => ({
      ...d,
      siswa_count: (d.data_ekstra as any[])?.length || 0
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { kelas, semester, tahun_ajaran } = body;
    
    if (!kelas || !semester || !tahun_ajaran) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ekstra_buku_induk')
      .delete()
      .match({ kelas, semester, tahun_ajaran });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
