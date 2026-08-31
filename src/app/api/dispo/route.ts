import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('data_dispo_siswa').select('*');
    if (error) throw error;

    const data = (rows || []).map((r: any) => ({
      id: r.metadata?.['ID'] || r.id.toString(),
      timestamp: r.metadata?.['TIMESTAMP'] || '',
      tanggal: r.metadata?.['TANGGAL'] || r.tanggal || '',
      jamKedatangan: r.metadata?.['JAM KEDATANGAN'] || '',
      kelas: r.metadata?.['KELAS'] || '',
      namaSiswa: r.metadata?.['NAMA SISWA'] || '',
      alasanTerlambat: r.metadata?.['ALASAN TERLAMBAT'] || '',
      petugasDispo: r.metadata?.['PETUGAS DISPO'] || ''
    })).filter((r: any) => r.tanggal).reverse();

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: any) {
    console.error('GET Dispo Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamKedatangan, kelas, namaSiswa, alasanTerlambat, petugasDispo } = body;

    if (!tanggal || !jamKedatangan || !kelas || !namaSiswa || !alasanTerlambat) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const id = crypto.randomUUID().substring(0, 8);

    const metadata = {
      'ID': id,
      'TIMESTAMP': timestamp,
      'TANGGAL': tanggal,
      'JAM KEDATANGAN': jamKedatangan,
      'KELAS': kelas,
      'NAMA SISWA': namaSiswa,
      'ALASAN TERLAMBAT': alasanTerlambat,
      'PETUGAS DISPO': petugasDispo || ''
    };

    const { error } = await supabase.from('data_dispo_siswa').insert([{ tanggal, metadata }]);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST Dispo Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses dispo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });

    let deleteId = parseInt(id, 10);
    if (isNaN(deleteId)) {
      const { data: foundRow } = await supabase.from('data_dispo_siswa').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) deleteId = foundRow.id;
    }

    if (!isNaN(deleteId)) {
      const { error } = await supabase.from('data_dispo_siswa').delete().eq('id', deleteId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE Dispo Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}
