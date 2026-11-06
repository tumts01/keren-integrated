import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periode = searchParams.get('periode');

    if (!periode) {
      return NextResponse.json({ success: false, error: 'Parameter periode diperlukan' }, { status: 400 });
    }

    // 1. Ambil data submission untuk periode ini (hanya kolom esensial agar query sangat cepat)
    const { data: records, error } = await supabase
      .from('penilaian_karakter')
      .select('id, periode, penilai_id, penilai_nama, penilai_role, created_at')
      .eq('periode', periode);

    if (error) throw error;

    // Helper normalisasi
    const cleanId = (val: any) => String(val || '').trim().replace(/^0+/, '');
    const normName = (val: string) => String(val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 2. Buat map lookup siapa saja yang sudah mengisi
    const submissionMap = new Map<string, any>();
    records?.forEach(r => {
      // Prioritaskan penilai_role = siswa atau semua yang ber-ID
      const idKey = cleanId(r.penilai_id);
      if (idKey) {
        submissionMap.set('ID_' + idKey, r);
      }
      const nameKey = normName(r.penilai_nama);
      if (nameKey) {
        submissionMap.set('NAME_' + nameKey, r);
      }
    });

    // 3. Ambil data induk seluruh siswa aktif
    const semuaSiswa = await getAllCachedDataInduk();
    const students: any[] = [];
    const rombelMap: Record<string, { total: number; sudah: number; belum: number }> = {};

    let totalSiswa = 0;
    let totalSudah = 0;
    let totalBelum = 0;

    for (const row of semuaSiswa) {
      const meta = row.metadata || {};
      const status = (meta['STATUS SISWA'] || '').toUpperCase().trim();
      if (!status.includes('AKTIF')) continue;

      let rombel = (meta['ROMBEL KELAS 9'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL KELAS 8'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL KELAS 7'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL'] || '').trim();
      if (!rombel) rombel = 'Lainnya';

      const nisn = (meta['NISN'] || '').trim();
      const nis = (meta['ID SISWA'] || meta['NIS'] || row.id_siswa || '').trim();
      const nama = (row.nama || meta['NAMA'] || '').trim();
      const jk = (meta['JENIS KELAMIN'] || meta['JK'] || '').toUpperCase().trim();

      // Cek apakah siswa ini sudah mengisi
      let matchedRecord = null;
      if (nisn && submissionMap.has('ID_' + cleanId(nisn))) {
        matchedRecord = submissionMap.get('ID_' + cleanId(nisn));
      } else if (nis && submissionMap.has('ID_' + cleanId(nis))) {
        matchedRecord = submissionMap.get('ID_' + cleanId(nis));
      } else if (nama && submissionMap.has('NAME_' + normName(nama))) {
        matchedRecord = submissionMap.get('NAME_' + normName(nama));
      }

      const sudah = !!matchedRecord;
      totalSiswa++;
      if (sudah) {
        totalSudah++;
      } else {
        totalBelum++;
      }

      // Group per rombel
      if (!rombelMap[rombel]) {
        rombelMap[rombel] = { total: 0, sudah: 0, belum: 0 };
      }
      rombelMap[rombel].total++;
      if (sudah) {
        rombelMap[rombel].sudah++;
      } else {
        rombelMap[rombel].belum++;
      }

      students.push({
        id: nisn || nis || nama,
        nisn,
        nis,
        nama,
        rombel,
        jk: jk.startsWith('L') ? 'L' : jk.startsWith('P') ? 'P' : jk,
        status: sudah ? 'sudah' : 'belum',
        submittedAt: matchedRecord?.created_at || null,
        submissionId: matchedRecord?.id || null
      });
    }

    // Urutkan nama rombel secara natural (7A, 7B, 7C, 8A, 8B, 9A, ...)
    const rombelNames = Object.keys(rombelMap).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    const rombelSummary = rombelNames.map(r => {
      const st = rombelMap[r];
      const persentase = st.total > 0 ? Math.round((st.sudah / st.total) * 1000) / 10 : 0;
      return {
        rombel: r,
        total: st.total,
        sudah: st.sudah,
        belum: st.belum,
        persentase
      };
    });

    // Urutkan siswa berdasarkan rombel lalu nama
    students.sort((a, b) => {
      const rombelDiff = a.rombel.localeCompare(b.rombel, undefined, { numeric: true, sensitivity: 'base' });
      if (rombelDiff !== 0) return rombelDiff;
      return a.nama.localeCompare(b.nama);
    });

    const persentase = totalSiswa > 0 ? Math.round((totalSudah / totalSiswa) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      periode,
      summary: {
        totalSiswa,
        sudahMengisi: totalSudah,
        belumMengisi: totalBelum,
        persentase
      },
      rombelSummary,
      students
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
