import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periode = searchParams.get('periode');
    
    let query = supabase.from('penilaian_karakter').select('*');
    if (periode) {
      query = query.eq('periode', periode);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { periode, penilai_id, penilai_nama, penilai_role, data_diri, data_teman, data_guru } = body;
    
    if (!periode || !penilai_id || !penilai_role) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Upsert based on penilai_id and periode so a user can only submit once per period
    // Since we don't have a unique constraint on (periode, penilai_id) yet, we might need to delete old one first, or just insert.
    // Let's delete existing submission for this period & user first
    await supabase
      .from('penilaian_karakter')
      .delete()
      .eq('periode', periode)
      .eq('penilai_id', penilai_id);

    const { data, error } = await supabase
      .from('penilaian_karakter')
      .insert([{
        periode,
        penilai_id,
        penilai_nama,
        penilai_role,
        data_diri,
        data_teman,
        data_guru
      }]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
