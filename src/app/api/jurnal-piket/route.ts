import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    
    let rows: any[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase.from('data_jurnal_piket').select('*').range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows = rows.concat(data);
      if (data.length < 1000) break;
      page++;
    }


    const data = (rows || []).map((r: any) => ({
      id: r.metadata?.['ID'] || r.id.toString(),
      timestamp: r.metadata?.['TIMESTAMP'] || '',
      tanggal: r.metadata?.['TANGGAL'] || r.tanggal || '',
      petugasPiket: r.metadata?.['PETUGAS PIKET'] || '',
      guruIzin: r.metadata?.['GURU IZIN'] || '',
      alasanIzin: r.metadata?.['ALASAN IZIN'] || '',
      kelasDitinggalkan: r.metadata?.['KELAS DITINGGALKAN'] || '',
      materi: r.metadata?.['MATERI'] || '',
      guruPengganti: r.metadata?.['GURU PENGGANTI'] || '',
      guruDispo: r.metadata?.['GURU DISPO'] || '',
    })).filter((r: any) => r.tanggal || r.petugasPiket).reverse();

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: any) {
    console.error('GET Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tanggal, 
      petugasPiket, 
      guruDispo,
      entries
    } = body;

    if (!tanggal || !petugasPiket) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap. Tanggal dan Petugas Piket wajib diisi.' }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    // Process entries or single submission
    const rowsToInsert = [];
    
    if (entries && Array.isArray(entries) && entries.length > 0) {
      for (const entry of entries) {
        if (!entry.guruIzin) continue;
        const id = crypto.randomUUID().substring(0, 8);
        const metadata = {
          'ID': id,
          'TIMESTAMP': timestamp,
          'TANGGAL': tanggal,
          'PETUGAS PIKET': petugasPiket,
          'GURU IZIN': entry.guruIzin,
          'ALASAN IZIN': entry.alasanIzin || '',
          'KELAS DITINGGALKAN': entry.kelasDitinggalkan || '',
          'MATERI': entry.materi || '',
          'GURU PENGGANTI': entry.guruPengganti || '',
          'GURU DISPO': guruDispo || ''
        };
        rowsToInsert.push({ tanggal, metadata });
      }
    } else {
      // Fallback for single legacy entry if needed
      if (body.guruIzin) {
        const id = crypto.randomUUID().substring(0, 8);
        const metadata = {
          'ID': id,
          'TIMESTAMP': timestamp,
          'TANGGAL': tanggal,
          'PETUGAS PIKET': petugasPiket,
          'GURU IZIN': body.guruIzin,
          'ALASAN IZIN': body.alasanIzin || '',
          'KELAS DITINGGALKAN': body.kelasDitinggalkan || '',
          'MATERI': body.materi || '',
          'GURU PENGGANTI': body.guruPengganti || '',
          'GURU DISPO': guruDispo || ''
        };
        rowsToInsert.push({ tanggal, metadata });
      }
    }

    if (rowsToInsert.length > 0) {
      const { error } = await supabase.from('data_jurnal_piket').insert(rowsToInsert);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: `Berhasil menyimpan ${rowsToInsert.length} data jurnal piket` });

  } catch (error: any) {
    console.error('POST Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses jurnal piket' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });

    let deleteId = parseInt(id, 10);
    if (isNaN(deleteId)) {
      const { data: foundRow } = await supabase.from('data_jurnal_piket').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) deleteId = foundRow.id;
    }

    if (!isNaN(deleteId)) {
      const { error } = await supabase.from('data_jurnal_piket').delete().eq('id', deleteId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}
