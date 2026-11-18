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

    // 1. Ambil data submission periode ini + data guru + data users + data siswa aktif secara paralel
    const [
      { data: pkRecords, error },
      semuaSiswa,
      { data: rowsGuru, error: errGuru },
      { data: rowsUsers, error: errUsers }
    ] = await Promise.all([
      supabase
        .from('penilaian_karakter')
        .select('id, periode, penilai_id, penilai_nama, penilai_role, created_at')
        .eq('periode', periode),
      getAllCachedDataInduk(),
      supabase.from('data_guru').select('id, nama, nomor_induk, metadata'),
      supabase.from('data_users').select('id, username, nama, role, metadata')
    ]);

    if (error) throw error;
    if (errGuru) throw errGuru;
    if (errUsers) throw errUsers;

    // Helper normalisasi
    const cleanId = (val: any) => String(val || '').trim().replace(/^0+/, '');
    const cleanKey = (val: any) => String(val || '').trim().toLowerCase();
    const normName = (val: string) => String(val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 2. Pisahkan map lookup submission siswa vs guru/staf
    const studentSubmissionMap = new Map<string, any>();
    const staffSubmissionMap = new Map<string, any>();

    pkRecords?.forEach(r => {
      const role = (r.penilai_role || '').toLowerCase();
      if (role === 'siswa') {
        const idKey = cleanId(r.penilai_id);
        if (idKey) studentSubmissionMap.set('ID_' + idKey, r);
        const nameKey = normName(r.penilai_nama);
        if (nameKey) studentSubmissionMap.set('NAME_' + nameKey, r);
      } else {
        const keyLower = cleanKey(r.penilai_id);
        if (keyLower) staffSubmissionMap.set('ID_' + keyLower, r);
        const idDigits = cleanId(r.penilai_id);
        if (idDigits) staffSubmissionMap.set('DIG_' + idDigits, r);
        const nameKey = normName(r.penilai_nama);
        if (nameKey) staffSubmissionMap.set('NAME_' + nameKey, r);
      }
    });

    // 3. Olah Data Siswa Aktif
    const students: any[] = [];
    const rombelMap: Record<string, { total: number; sudah: number; belum: number }> = {};

    let totalSiswa = 0;
    let totalSudah = 0;
    let totalBelum = 0;

    for (const row of semuaSiswa) {
      const meta = row.metadata || {};
      const status = (meta['STATUS SISWA'] || '').trim().toLowerCase();
      if (status !== 'aktif') continue;

      const historyRecords = [];
      const ta7 = (meta['TA KELAS 7'] || '').trim();
      const rombel7 = (meta['ROMBEL KELAS 7'] || '').trim();
      if (ta7 && rombel7) historyRecords.push({ rombel: rombel7 });

      const ta8 = (meta['TA KELAS 8'] || '').trim();
      const rombel8 = (meta['ROMBEL KELAS 8'] || '').trim();
      if (ta8 && rombel8) historyRecords.push({ rombel: rombel8 });

      const ta9 = (meta['TA KELAS 9'] || '').trim();
      const rombel9 = (meta['ROMBEL KELAS 9'] || '').trim();
      if (ta9 && rombel9) historyRecords.push({ rombel: rombel9 });

      let rombel = '';
      if (historyRecords.length > 0) {
        rombel = historyRecords[historyRecords.length - 1].rombel;
      } else {
        rombel = (meta['ROMBEL'] || '').trim();
      }
      if (!rombel) rombel = 'Lainnya';

      const nisn = (meta['NISN'] || '').trim();
      const nis = (meta['ID SISWA'] || meta['NIS'] || row.id_siswa || '').trim();
      const nama = (row.nama || meta['NAMA'] || '').trim();
      const jk = (meta['JENIS KELAMIN'] || meta['JK'] || '').toUpperCase().trim();

      let matchedRecord = null;
      if (nisn && studentSubmissionMap.has('ID_' + cleanId(nisn))) {
        matchedRecord = studentSubmissionMap.get('ID_' + cleanId(nisn));
      } else if (nis && studentSubmissionMap.has('ID_' + cleanId(nis))) {
        matchedRecord = studentSubmissionMap.get('ID_' + cleanId(nis));
      } else if (nama && studentSubmissionMap.has('NAME_' + normName(nama))) {
        const candidate = studentSubmissionMap.get('NAME_' + normName(nama));
        const candId = cleanId(candidate?.penilai_id);
        if (
          !candId ||
          candId === cleanId(nisn) ||
          candId === cleanId(nis) ||
          normName(String(candidate?.penilai_id || '')) === normName(nama)
        ) {
          matchedRecord = candidate;
        }
      }

      const sudah = !!matchedRecord;
      totalSiswa++;
      if (sudah) totalSudah++;
      else totalBelum++;

      if (!rombelMap[rombel]) {
        rombelMap[rombel] = { total: 0, sudah: 0, belum: 0 };
      }
      rombelMap[rombel].total++;
      if (sudah) rombelMap[rombel].sudah++;
      else rombelMap[rombel].belum++;

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

    const rombelNames = Object.keys(rombelMap).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

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

    students.sort((a, b) => {
      const rombelDiff = a.rombel.localeCompare(b.rombel, undefined, { numeric: true, sensitivity: 'base' });
      if (rombelDiff !== 0) return rombelDiff;
      return a.nama.localeCompare(b.nama);
    });

    const persentase = totalSiswa > 0 ? Math.round((totalSudah / totalSiswa) * 1000) / 10 : 0;

    // 4. Olah Data Guru & Staf Aktif
    const userByName = new Map<string, any>();
    (rowsUsers || []).forEach((u: any) => {
      const key = normName(u.nama || '');
      if (key && !userByName.has(key)) {
        userByName.set(key, u);
      }
    });

    const activeGuruRows = [...(rowsGuru || [])]
      .filter((g: any) => (g.metadata?.['Status'] || '').trim().toLowerCase() === 'aktif')
      .sort((a: any, b: any) => {
        const uA = a.metadata?.urutan !== undefined && a.metadata?.urutan !== null ? Number(a.metadata.urutan) : (a.id || 9999);
        const uB = b.metadata?.urutan !== undefined && b.metadata?.urutan !== null ? Number(b.metadata.urutan) : (b.id || 9999);
        if (uA !== uB) return uA - uB;
        return (a.nama || '').localeCompare(b.nama || '');
      });

    const staffList: any[] = [];
    let staffTotal = 0;
    let staffSudah = 0;
    let staffBelum = 0;
    const katCounts = {
      guru: { total: 0, sudah: 0, belum: 0 },
      staf: { total: 0, sudah: 0, belum: 0 }
    };

    for (const g of activeGuruRows) {
      const nama = (g.nama || '').trim();
      if (!nama) continue;
      const nip = (g.nomor_induk || g.metadata?.['Nomor Induk Pegawai'] || '').trim();
      const jabatan = (g.metadata?.['Jabatan'] || 'Guru').trim();
      const linkedUser = userByName.get(normName(nama));
      const username = (linkedUser?.username || '').trim();
      const role = (linkedUser?.role || '').trim();

      const isStaf =
        /(staf|tata usaha|perpustakaan|bendahara)/i.test(jabatan) &&
        !/guru/i.test(jabatan);
      const kategori: 'Guru' | 'Staf' = isStaf ? 'Staf' : 'Guru';

      let matchedRecord = null;
      if (username && staffSubmissionMap.has('ID_' + cleanKey(username))) {
        matchedRecord = staffSubmissionMap.get('ID_' + cleanKey(username));
      } else if (nip && staffSubmissionMap.has('DIG_' + cleanId(nip))) {
        matchedRecord = staffSubmissionMap.get('DIG_' + cleanId(nip));
      } else if (staffSubmissionMap.has('ID_' + cleanKey(nama))) {
        matchedRecord = staffSubmissionMap.get('ID_' + cleanKey(nama));
      } else if (staffSubmissionMap.has('NAME_' + normName(nama))) {
        matchedRecord = staffSubmissionMap.get('NAME_' + normName(nama));
      }

      const sudah = !!matchedRecord;
      staffTotal++;
      if (sudah) staffSudah++;
      else staffBelum++;

      const bucket = kategori === 'Staf' ? katCounts.staf : katCounts.guru;
      bucket.total++;
      if (sudah) bucket.sudah++;
      else bucket.belum++;

      staffList.push({
        id: String(g.id),
        nama,
        username,
        nip,
        jabatan,
        kategori,
        role: matchedRecord?.penilai_role || role || kategori.toLowerCase(),
        status: sudah ? 'sudah' : 'belum',
        submittedAt: matchedRecord?.created_at || null,
        submissionId: matchedRecord?.id || null
      });
    }

    const staffPersentase = staffTotal > 0 ? Math.round((staffSudah / staffTotal) * 1000) / 10 : 0;

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
      students,
      staffSummary: {
        total: staffTotal,
        sudahMengisi: staffSudah,
        belumMengisi: staffBelum,
        persentase: staffPersentase,
        guru: katCounts.guru,
        staf: katCounts.staf
      },
      staffList
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
