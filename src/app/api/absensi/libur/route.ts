import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tanggal, keterangan } = body;

    if (!action || !tanggal) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { data: rows, error: fetchError } = await supabase.from('libur_gtk').select('*');
    if (fetchError) throw fetchError;

    if (action === 'add') {
      const existing = (rows || []).find((r: any) => r.metadata?.tanggal === tanggal);
      if (existing) {
        return NextResponse.json({ success: false, error: 'Tanggal ini sudah diatur sebagai hari libur' }, { status: 400 });
      }
      
      const { error } = await supabase.from('libur_gtk').insert([{ tanggal, keterangan, metadata: { tanggal, keterangan: keterangan || '' } }]);
      if (error) throw error;
      
      return NextResponse.json({ success: true, message: 'Hari libur berhasil ditambahkan' });

    } else if (action === 'delete') {
      const existing = (rows || []).find((r: any) => r.metadata?.tanggal === tanggal);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Data hari libur tidak ditemukan' }, { status: 404 });
      }

      const { error } = await supabase.from('libur_gtk').delete().eq('id', existing.id);
      if (error) throw error;
      
      return NextResponse.json({ success: true, message: 'Hari libur berhasil dihapus' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('Absensi Libur POST error:', error);
    return NextResponse.json({ success: false, error: 'Koneksi ke server gagal' }, { status: 500 });
  }
}
