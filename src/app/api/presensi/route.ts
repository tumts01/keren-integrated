import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterTanggal = searchParams.get('tanggal');

    const cleanNisn = (val: any) => String(val || '').replace(/^'/, '').trim().replace(/^0+/, '');

    const cleanJamKe = (val: string) => {
      return val.replace(/,(19|20)\d{2}$/g, '').trim();
    };

    // Ambil domisili dari Supabase data_induk
    const { data: rowsInduk } = await supabase.from('data_induk').select('metadata');
    const mapDomisili: Record<string, string> = {};
    if (rowsInduk) {
      rowsInduk.forEach((r: any) => {
        const nisn = cleanNisn(r.metadata?.['NISN']);
        if (nisn) {
          mapDomisili[nisn] = (r.metadata?.['DOMISILI'] || '').trim();
        }
      });
    }

    let query = supabase.from('data_presensi_siswa').select('*');
    if (filterTanggal) {
      query = query.eq('tanggal', filterTanggal);
    }
    
    const { data: rows, error } = await query;
    if (error) throw error;

    let data = (rows || []).map((r: any) => {
      const rawNisn = (r.metadata?.['NISN'] || '').trim();
      const safeNisn = cleanNisn(rawNisn);
      return {
        id: r.metadata?.['ID'] || r.id.toString(),
        tanggal: (r.metadata?.['TANGGAL'] || r.tanggal || '').trim(),
        tahunAjaran: (r.metadata?.['TAHUN AJARAN'] || '').trim(),
        kelas: (r.metadata?.['KELAS'] || r.kelas || '').trim(),
        jamKe: cleanJamKe((r.metadata?.['JAM KE'] || '').trim()),
        mapel: (r.metadata?.['MAPEL'] || '').trim(),
        guruPenginput: (r.metadata?.['GURU PENGINPUT'] || '').trim(),
        namaSiswa: (r.metadata?.['NAMA SISWA'] || '').trim(),
        nisn: rawNisn,
        domisili: mapDomisili[safeNisn] || '',
        kehadiran: (r.metadata?.['KEHADIRAN'] || '').trim(),
        timestamp: (r.metadata?.['TIMESTAMP'] || '').trim(),
      };
    });

    if (filterTanggal) {
      data = data.filter((d: any) => d.tanggal === filterTanggal);
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error('Fetch Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data presensi: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { listSiswa, tahunAjaran, mapel, kelas, jamKe, guru, timestamp, tanggal } = await request.json();

    if (!listSiswa || listSiswa.length === 0) {
      return NextResponse.json({ success: false, error: 'Data absensi kosong' }, { status: 400 });
    }

    const payload = listSiswa.map((s: any) => {
      const uniqueId = crypto.randomUUID();
      const metadata = {
        'ID': uniqueId,
        'TIMESTAMP': timestamp,
        'TANGGAL': tanggal,
        'TAHUN AJARAN': tahunAjaran,
        'KELAS': kelas,
        'JAM KE': jamKe,
        'MAPEL': mapel,
        'GURU PENGINPUT': guru,
        'NAMA SISWA': s.nama,
        'NISN': `'${s.nisn}`,
        'KEHADIRAN': s.status
      };
      return { tanggal, kelas, metadata };
    });

    const { error } = await supabase.from('data_presensi_siswa').insert(payload);
    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Submit Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan absensi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak diberikan' }, { status: 400 });
    }

    // Try deleting by Supabase ID first, if not found or if ID is a UUID, find by JSONB ID
    let deleteId = parseInt(id, 10);
    
    if (isNaN(deleteId)) {
      // Find row by UUID in metadata
      const { data: foundRow } = await supabase.from('data_presensi_siswa').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) {
        deleteId = foundRow.id;
      }
    }

    if (!isNaN(deleteId)) {
      const { error } = await supabase.from('data_presensi_siswa').delete().eq('id', deleteId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus presensi' }, { status: 500 });
  }
}
