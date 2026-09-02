import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { supabaseId, rawMetadata, nama, nis } = await request.json();

    if (!supabaseId) {
      return NextResponse.json({ success: false, error: 'Supabase ID tidak ditemukan' }, { status: 400 });
    }

    // Update in Supabase
    const { error } = await supabase
      .from('data_induk')
      .update({
        metadata: rawMetadata,
        nama: nama || rawMetadata['NAMA'] || '',
        id_siswa: nis || rawMetadata['ID SISWA'] || ''
      })
      .eq('id', supabaseId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Data siswa berhasil diperbarui' });
  } catch (error: any) {
    console.error('Update Siswa Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan data siswa' }, { status: 500 });
  }
}
