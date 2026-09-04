import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { unstable_cache, revalidateTag } from 'next/cache';

const cleanNisn = (val: any) => String(val || '').replace(/^'/, '').trim().replace(/^0+/, '');

const cleanJamKe = (val: string) => {
  return val.replace(/,(19|20)\d{2}$/g, '').trim();
};

const getCachedPresensi = unstable_cache(
  async () => {
    let rowsInduk: any[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase.from('data_induk').select('metadata').range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rowsInduk = rowsInduk.concat(data);
      if (data.length < 1000) break;
      page++;
    }

    const mapDomisili: Record<string, string> = {};
    if (rowsInduk) {
      rowsInduk.forEach((r: any) => {
        const nisn = cleanNisn(r.metadata?.['NISN']);
        if (nisn) {
          mapDomisili[nisn] = (r.metadata?.['DOMISILI'] || '').trim();
        }
      });
    }

    let rows: any[] = [];
    let pageP = 0;
    while (true) {
      let query = supabase.from('data_presensi_siswa').select('*').range(pageP * 1000, (pageP + 1) * 1000 - 1);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows = rows.concat(data);
      if (data.length < 1000) break;
      pageP++;
    }

    return (rows || []).map((r: any) => {
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
        domisili: mapDomisili[safeNisn] || '-',
        kehadiran: (r.metadata?.['KEHADIRAN'] || 'H').trim(),
        timestamp: (r.metadata?.['TIMESTAMP'] || '').trim(),
      };
    });
  },
  ['presensi-data-all'],
  { tags: ['presensi'], revalidate: 3600 }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterTanggal = searchParams.get('tanggal');

    let data = await getCachedPresensi();

    if (filterTanggal) {
      data = data.filter((d: any) => d.tanggal === filterTanggal);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data presensi: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'update') {
      const { id, status, jamKe } = body;
      if (!id) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });
      
      const { data: foundRow } = await supabase.from('data_presensi_siswa').select('*').contains('metadata', { 'ID': id }).single();
      if (!foundRow) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
      
      const { error } = await supabase.from('data_presensi_siswa').update({
        metadata: { ...foundRow.metadata, 'KEHADIRAN': status, 'JAM KE': jamKe || foundRow.metadata?.['JAM KE'] }
      }).eq('id', foundRow.id);
      if (error) throw error;

      revalidateTag('', {});
      return NextResponse.json({ success: true });
    }

    if (body.action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });
      const { data: foundRow } = await supabase.from('data_presensi_siswa').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) {
        const { error } = await supabase.from('data_presensi_siswa').delete().eq('id', foundRow.id);
        if (error) throw error;
      }

      revalidateTag('', {});
      return NextResponse.json({ success: true });
    }

    const { tahunAjaran, mapel, kelas, jamKe, guru, timestamp, tanggal } = body;

    let listSiswa = body.listSiswa;

    if (!listSiswa && body.siswaList) {
      const presensiMap: Record<string, string> = body.presensi || {};
      listSiswa = body.siswaList.map((s: any) => {
        const nisnKey = (s.nisn || s.NISN || '').toString().replace(/^'/, '').trim();
        const namaKey = s.nama || s.namaSiswa || '';
        const status = presensiMap[nisnKey] || presensiMap[namaKey] || 'H';
        return {
          nama: namaKey,
          nisn: nisnKey,
          status
        };
      });
    }

    if (!listSiswa || listSiswa.length === 0) {
      return NextResponse.json({ success: false, error: 'Data absensi kosong' }, { status: 400 });
    }

    const jamKeText = String(jamKe);
    const submittedJams = jamKeText.split(',').map(j => j.trim()).filter(Boolean);

    const { data: existingPresensi, error: readError } = await supabase
      .from('data_presensi_siswa')
      .select('metadata')
      .eq('tanggal', tanggal)
      .eq('kelas', kelas);

    if (readError) throw readError;

    let overlappingMapel = null;
    let overlappingGuru = null;
    let isExactMatch = false;

    if (existingPresensi && existingPresensi.length > 0) {
      for (const r of existingPresensi) {
        const existingJamKeStr = String(r.metadata?.['JAM KE'] || '');
        const existingJams = existingJamKeStr.split(',').map(j => j.trim()).filter(Boolean);
        
        const hasOverlap = submittedJams.some(j => existingJams.includes(j));
        if (hasOverlap) {
          const dbMapel = r.metadata?.['MAPEL'];
          const dbGuru = r.metadata?.['GURU PENGINPUT'];
          
          if (existingJamKeStr === jamKeText && dbMapel === mapel) {
            isExactMatch = true;
            break;
          }
          
          if (dbMapel !== 'PIKET' && mapel !== 'PIKET') {
            overlappingMapel = dbMapel;
            overlappingGuru = dbGuru;
            break;
          }
        }
      }
    }

    if (isExactMatch) {
      return NextResponse.json({ success: true, message: 'Absensi sudah pernah diinput (Anti-Dobel Aktif)' });
    }

    if (overlappingMapel && overlappingMapel !== 'PIKET' && mapel !== 'PIKET') {
      return NextResponse.json({ 
        success: false, 
        error: `Jam ke-${jamKeText} di kelas ${kelas} sudah diabsen oleh ${overlappingGuru || 'guru lain'} (Mapel: ${overlappingMapel}). Anda tidak bisa menimpa absensi.` 
      }, { status: 409 });
    }

    const nowTimestamp = timestamp || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const payload = listSiswa.map((s: any) => {
      const uniqueId = crypto.randomUUID();
      const metadata = {
        'ID': uniqueId,
        'TIMESTAMP': nowTimestamp,
        'TANGGAL': tanggal,
        'TAHUN AJARAN': tahunAjaran || '2026/2027',
        'KELAS': kelas,
        'JAM KE': jamKe,
        'MAPEL': mapel,
        'GURU PENGINPUT': guru,
        'NAMA SISWA': s.nama,
        'NISN': s.nisn ? `'${s.nisn}` : '',
        'KEHADIRAN': s.status
      };
      return { tanggal, kelas, metadata };
    });

    const { error } = await supabase.from('data_presensi_siswa').insert(payload);
    if (error) throw error;

    revalidateTag('', {});
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Submit Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan absensi: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak diberikan' }, { status: 400 });
    }

    let deleteId = parseInt(id, 10);
    
    if (isNaN(deleteId)) {
      const { data: foundRow } = await supabase.from('data_presensi_siswa').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) {
        deleteId = foundRow.id;
      }
    }

    if (!isNaN(deleteId)) {
      const { error } = await supabase.from('data_presensi_siswa').delete().eq('id', deleteId);
      if (error) throw error;
    }

    revalidateTag('', {});
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus presensi' }, { status: 500 });
  }
}
