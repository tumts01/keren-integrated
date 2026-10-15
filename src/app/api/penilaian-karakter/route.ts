import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periode = searchParams.get('periode');
    const penilai_id = searchParams.get('penilai_id');
    
    // Check specific user submission status for a period
    if (periode && penilai_id) {
      const { data, error } = await supabase
        .from('penilaian_karakter')
        .select('*')
        .eq('periode', periode)
        .eq('penilai_id', penilai_id)
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        alreadySubmitted: !!data,
        data: data || null
      });
    }

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

    // Lock: Check if already submitted for this period (1x per period limit)
    const { data: existing, error: checkError } = await supabase
      .from('penilaian_karakter')
      .select('id, created_at')
      .eq('periode', periode)
      .eq('penilai_id', penilai_id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Anda sudah pernah mengisi penilaian untuk periode ini (hanya dapat diisi 1 kali per periode).'
      }, { status: 400 });
    }

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
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const periode = searchParams.get('periode');
    const penilai_id = searchParams.get('penilai_id');

    let query = supabase.from('penilaian_karakter').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (periode && penilai_id) {
      query = query.eq('periode', periode).eq('penilai_id', penilai_id);
    } else {
      return NextResponse.json({ success: false, error: 'Parameter id atau periode & penilai_id diperlukan' }, { status: 400 });
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Data penilaian berhasil direset' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
