import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Default cutoff jika tidak ada filter: 1 tahun terakhir
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    let query = supabase.from('data_jurnal_piket').select('*');
    if (from) query = query.gte('tanggal', from);
    if (to) query = query.lte('tanggal', to);
    if (!from && !to) {
        query = query.gte('tanggal', cutoffStr);
    }

    let rows: any[] = [];
    let page = 0;
    while (true) {
      let q = query.range(page * 1000, (page + 1) * 1000 - 1);
      const { data, error } = await q;
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
    const { tanggal, petugasPiket, guruDispo, entries } = body;

    if (!tanggal || !petugasPiket) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap. Tanggal dan Petugas Piket wajib diisi.' }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const rowsToInsert = [];

    if (entries && Array.isArray(entries) && entries.length > 0) {
      for (const entry of entries) {
        if (!entry.guruIzin) continue;
        const id = crypto.randomUUID().substring(0, 8);
        rowsToInsert.push({
          tanggal,
          metadata: {
            'ID': id, 'TIMESTAMP': timestamp, 'TANGGAL': tanggal,
            'PETUGAS PIKET': petugasPiket, 'GURU IZIN': entry.guruIzin,
            'ALASAN IZIN': entry.alasanIzin || '', 'KELAS DITINGGALKAN': entry.kelasDitinggalkan || '',
            'MATERI': entry.materi || '', 'GURU PENGGANTI': entry.guruPengganti || '', 'GURU DISPO': guruDispo || ''
          }
        });
      }
    } else if (body.guruIzin) {
      const id = crypto.randomUUID().substring(0, 8);
      rowsToInsert.push({
        tanggal,
        metadata: {
          'ID': id, 'TIMESTAMP': timestamp, 'TANGGAL': tanggal,
          'PETUGAS PIKET': petugasPiket, 'GURU IZIN': body.guruIzin,
          'ALASAN IZIN': body.alasanIzin || '', 'KELAS DITINGGALKAN': body.kelasDitinggalkan || '',
          'MATERI': body.materi || '', 'GURU PENGGANTI': body.guruPengganti || '', 'GURU DISPO': guruDispo || ''
        }
      });
    }

    if (rowsToInsert.length > 0) {
      // ── ANTI-DOBEL JURNAL PIKET ──
      // Ambil data jurnal hari ini
      const { data: existingRows, error: readError } = await supabase
        .from('data_jurnal_piket')
        .select('metadata')
        .eq('tanggal', tanggal);
      
      if (readError) throw readError;

      // Filter rowsToInsert yang belum ada di database
      const filteredRowsToInsert = rowsToInsert.filter(newRow => {
        const newGuruIzin = newRow.metadata['GURU IZIN'];
        const newKelasKosong = newRow.metadata['KELAS DITINGGALKAN'];
        const newAlasan = newRow.metadata['ALASAN IZIN'];
        
        // Cek apakah ada data yang sama persis (guru izin, kelas kosong, dan tanggal)
        const isDuplicate = existingRows?.some(existing => {
          return existing.metadata['GURU IZIN'] === newGuruIzin &&
                 existing.metadata['KELAS DITINGGALKAN'] === newKelasKosong &&
                 existing.metadata['ALASAN IZIN'] === newAlasan;
        });
        
        return !isDuplicate;
      });

      if (filteredRowsToInsert.length === 0) {
        return NextResponse.json({ success: true, message: 'Data sudah ada (Anti-Dobel Aktif), tidak ada data baru yang ditambahkan.' });
      }

      const { error } = await supabase.from('data_jurnal_piket').insert(filteredRowsToInsert);
      if (error) throw error;
      
      return NextResponse.json({ success: true, message: `Berhasil menyimpan ${filteredRowsToInsert.length} data jurnal piket baru` });
    }

    return NextResponse.json({ success: true, message: `Berhasil menyimpan data` });
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

    let deleteId: number | null = null;
    if (/^\d+$/.test(id)) {
      deleteId = parseInt(id, 10);
    } else {
      const { data: foundRow } = await supabase.from('data_jurnal_piket').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) deleteId = foundRow.id;
    }

    if (deleteId !== null) {
      const { error } = await supabase.from('data_jurnal_piket').delete().eq('id', deleteId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });

    const body = await request.json();
    
    // Temukan baris yang tepat berdasarkan ID metadata atau baris ID
    let updateId: number | null = null;
    let currentMetadata: any = {};
    
    if (/^\d+$/.test(id)) {
      updateId = parseInt(id, 10);
      const { data: foundRow } = await supabase.from('data_jurnal_piket').select('metadata').eq('id', updateId).single();
      if (foundRow) currentMetadata = foundRow.metadata;
    } else {
      const { data: foundRow } = await supabase.from('data_jurnal_piket').select('id, metadata').contains('metadata', { 'ID': id }).single();
      if (foundRow) {
        updateId = foundRow.id;
        currentMetadata = foundRow.metadata;
      }
    }

    if (updateId === null) {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }

    const newMetadata = {
      ...currentMetadata,
      'TANGGAL': body.tanggal || currentMetadata['TANGGAL'],
      'PETUGAS PIKET': body.petugasPiket || currentMetadata['PETUGAS PIKET'],
      'GURU DISPO': body.guruDispo || currentMetadata['GURU DISPO'] || '',
      'GURU IZIN': body.guruIzin || currentMetadata['GURU IZIN'],
      'ALASAN IZIN': body.alasanIzin || currentMetadata['ALASAN IZIN'] || '',
      'KELAS DITINGGALKAN': body.kelasDitinggalkan || currentMetadata['KELAS DITINGGALKAN'] || '',
      'MATERI': body.materi || currentMetadata['MATERI'] || '',
      'GURU PENGGANTI': body.guruPengganti || currentMetadata['GURU PENGGANTI'] || '',
    };

    const { error } = await supabase
      .from('data_jurnal_piket')
      .update({
        tanggal: newMetadata['TANGGAL'], // Pastikan kolom tanggal sinkron
        metadata: newMetadata
      })
      .eq('id', updateId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Data berhasil diupdate' });
  } catch (error: any) {
    console.error('PUT Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengupdate data: ' + error.message }, { status: 500 });
  }
}
