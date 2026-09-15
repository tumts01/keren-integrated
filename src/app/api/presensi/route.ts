import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { unstable_cache, revalidateTag } from 'next/cache';

const cleanNisn = (val: any) => String(val || '').replace(/^'/, '').trim().replace(/^0+/, '');

const cleanJamKe = (val: string) => {
  return val.replace(/,(19|20)\d{2}$/g, '').trim();
};

import { getAllCachedDataInduk } from '@/lib/data-induk';

const getMapDomisili = async () => {
  const rowsInduk = await getAllCachedDataInduk();
  const mapDomisili: Record<string, string> = {};
  if (rowsInduk) {
    rowsInduk.forEach((r: any) => {
      const nisn = cleanNisn(r.metadata?.['NISN']);
      if (nisn) {
        mapDomisili[nisn] = (r.metadata?.['DOMISILI'] || '').trim();
      }
    });
  }
  return mapDomisili;
};

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterTanggal = searchParams.get('tanggal');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Count rows first to know how many chunks we need
    let qCount = supabase.from('data_presensi_siswa').select('*', { count: 'exact', head: true });
    if (filterTanggal) qCount = qCount.eq('tanggal', filterTanggal);
    else {
      if (from) qCount = qCount.gte('tanggal', from);
      if (to) qCount = qCount.lte('tanggal', to);
    }
    const { count, error: countError } = await qCount;
    if (countError) throw countError;

    const total = count || 0;
    const pages = Math.ceil(total / 1000);
    const chunks = Array.from({ length: pages }, (_, i) => i);

    // Fetch in parallel
    const results = await Promise.all(chunks.map(async p => {
      let q = supabase.from('data_presensi_siswa').select('*').range(p * 1000, (p + 1) * 1000 - 1);
      if (filterTanggal) q = q.eq('tanggal', filterTanggal);
      else {
        if (from) q = q.gte('tanggal', from);
        if (to) q = q.lte('tanggal', to);
      }
      const { data } = await q;
      return data || [];
    }));
    
    let rows = results.flat();

    const mapDomisili = await getMapDomisili();

    const mappedData = (rows || []).map((r: any) => {
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

    return NextResponse.json({ success: true, data: mappedData }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
  } catch (error: any) {
    console.error('Fetch Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data presensi: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'mass_update') {
      const { ids, status } = body;
      if (!ids || !Array.isArray(ids)) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });
      
      for (const id of ids) {
        const { data: foundRow } = await supabase.from('data_presensi_siswa').select('*').contains('metadata', { 'ID': id }).single();
        if (foundRow) {
          if (status === 'DELETE') {
            await supabase.from('data_presensi_siswa').delete().eq('id', foundRow.id);
          } else {
            await supabase.from('data_presensi_siswa').update({
              metadata: { ...foundRow.metadata, 'KEHADIRAN': status }
            }).eq('id', foundRow.id);
          }
        }
      }
      revalidateTag('presensi', {});
      return NextResponse.json({ success: true });
    }

    if (body.action === 'update') {
      const { id, status, jamKe } = body;
      if (!id) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });
      
      const { data: foundRow } = await supabase.from('data_presensi_siswa').select('*').contains('metadata', { 'ID': id }).single();
      if (!foundRow) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
      
      const { error } = await supabase.from('data_presensi_siswa').update({
        metadata: { ...foundRow.metadata, 'KEHADIRAN': status, 'JAM KE': jamKe || foundRow.metadata?.['JAM KE'] }
      }).eq('id', foundRow.id);
      if (error) throw error;

      revalidateTag('presensi', {});
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

      revalidateTag('presensi', {});
      return NextResponse.json({ success: true });
    }

    const { tahunAjaran, mapel, kelas, jamKe, guru, timestamp, tanggal } = body;

    let listSiswa = body.listSiswa;

    if (!listSiswa && body.siswaList) {
      const presensiMap: Record<string, string> = body.presensi || {};
      listSiswa = body.siswaList.map((s: any) => {
        const nisnKey = (s.nisn || s.NISN || '').toString().replace(/^'/, '').trim();
        const namaKey = s.nama || s.namaSiswa || '';
        const idKey = s.id || ''; const status = presensiMap[idKey] || presensiMap[nisnKey] || presensiMap[namaKey] || 'H';
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

    let existingPresensi: any[] = [];
    if (kelas && kelas !== "MULTIPLE") {
      const { data, error: readError } = await supabase
        .from('data_presensi_siswa')
        .select('metadata')
        .eq('tanggal', tanggal)
        .eq('kelas', kelas);
      if (readError) throw readError;
      existingPresensi = data || [];
    }

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
          
          if (dbMapel === mapel && dbGuru === guru) {
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
      return NextResponse.json({ success: false, error: 'Data absensi ini sudah pernah Anda input sebelumnya (Anti-Dobel Aktif).' }, { status: 409 });
    }

    if (overlappingMapel && overlappingMapel !== 'PIKET' && mapel !== 'PIKET') {
      return NextResponse.json({ 
        success: false, 
        error: `Jam ke-${jamKeText} di kelas ${kelas} sudah diabsen oleh ${overlappingGuru || 'guru lain'} (Mapel: ${overlappingMapel}). Anda tidak bisa menimpa absensi.` 
      }, { status: 409 });
    }

    // ── ANTI-DOBEL KHUSUS PIKET ──
    if (kelas === "MULTIPLE" && mapel === "PIKET") {
      const { data: piketPresensi, error: pError } = await supabase
        .from('data_presensi_siswa')
        .select('metadata')
        .eq('tanggal', tanggal)
        .contains('metadata', { 'MAPEL': 'PIKET' });

      if (!pError && piketPresensi) {
        listSiswa = listSiswa.filter((s: any) => {
          return !piketPresensi.some(p => {
            const existingJams = String(p.metadata?.['JAM KE'] || '').split(',').map(j => j.trim()).filter(Boolean);
            const hasOverlap = submittedJams.some(j => existingJams.includes(j));
            return hasOverlap && p.metadata?.['NAMA SISWA'] === s.nama;
          });
        });
        
        if (listSiswa.length === 0) {
          return NextResponse.json({ success: false, error: 'Data absensi piket sudah ada sebelumnya (Anti-Dobel Aktif).' }, { status: 409 });
        }
      }
    }

    // ── FILTER: Jika guru kelas mengabsen, siswa yg sudah tercatat PIKET di hari itu dikeluarkan otomatis ──
    if (mapel !== 'PIKET') {
      const { data: piketHariIni, error: pErr } = await supabase
        .from('data_presensi_siswa')
        .select('metadata')
        .eq('tanggal', tanggal)
        .contains('metadata', { 'MAPEL': 'PIKET' });

      if (!pErr && piketHariIni && piketHariIni.length > 0) {
        const namaSiswaYgSudahDiPiket = new Set(
          piketHariIni.map(p => (p.metadata?.['NAMA SISWA'] || '').trim().toUpperCase())
        );

        const beforeCount = listSiswa.length;
        listSiswa = listSiswa.filter((s: any) => {
          const nama = (s.nama || '').trim().toUpperCase();
          return !namaSiswaYgSudahDiPiket.has(nama);
        });
        const skippedCount = beforeCount - listSiswa.length;

        if (listSiswa.length === 0) {
          return NextResponse.json({
            success: false,
            error: `Semua siswa yang tidak hadir sudah tercatat oleh Guru Piket hari ini. Tidak ada data baru yang disimpan.`
          }, { status: 409 });
        }

        // Lanjut simpan, tapi tandai ada yang diskip
        if (skippedCount > 0) {
          // Kita set flag agar response bisa memberi tahu frontend
          (body as any)._skippedPiket = skippedCount;
        }
      }
    }

    const nowTimestamp = timestamp || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const payload = listSiswa.map((s: any) => {
      const uniqueId = crypto.randomUUID();
      const studentKelas = s.kelas || kelas;
      const metadata = {
        'ID': uniqueId,
        'TIMESTAMP': nowTimestamp,
        'TANGGAL': tanggal,
        'TAHUN AJARAN': tahunAjaran || '2026/2027',
        'KELAS': studentKelas,
        'JAM KE': jamKe,
        'MAPEL': mapel,
        'GURU PENGINPUT': guru,
        'NAMA SISWA': s.nama,
        'NISN': s.nisn ? `'${s.nisn}` : '',
        'KEHADIRAN': s.status
      };
      return { tanggal, kelas: studentKelas, metadata };
    });

    const { error } = await supabase.from('data_presensi_siswa').insert(payload);
    if (error) throw error;

    const skippedPiket = (body as any)._skippedPiket || 0;
    revalidateTag('presensi', {});
    return NextResponse.json({ 
      success: true,
      ...(skippedPiket > 0 ? { skippedPiket, info: `${skippedPiket} siswa sudah tercatat oleh Guru Piket dan dilewati secara otomatis.` } : {})
    });

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

    let deleteId: number | null = null;
    
    if (/^\d+$/.test(id)) {
      deleteId = parseInt(id, 10);
    } else {
      const { data: foundRow } = await supabase.from('data_presensi_siswa').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) {
        deleteId = foundRow.id;
      }
    }

    if (deleteId !== null) {
      const { error } = await supabase.from('data_presensi_siswa').delete().eq('id', deleteId);
      if (error) throw error;
    }

    revalidateTag('presensi', {});
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus presensi' }, { status: 500 });
  }
}

