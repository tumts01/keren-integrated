import { NextResponse } from 'next/server';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaranParam = searchParams.get('tahunAjaran') || '';

    const sbRows = await getAllCachedDataInduk();

    const allRecords = sbRows.flatMap((row: any) => {
      const getVal = (key: string) => {
        if (key === 'ID SISWA') return row.id_siswa || '';
        if (key === 'NAMA') return row.nama || '';
        return row.metadata ? (row.metadata[key] || '') : '';
      };

      const nama = (getVal('NAMA') || '').trim();
      if (!nama) return []; 
      const status = (getVal('STATUS SISWA') || '').toLowerCase().trim();
      if (status === 'tidak aktif') return []; 

      const ttl = (getVal('TEMPAT, TANGGAL LAHIR') || '').trim();
      let tempatLahir = (getVal('TEMPAT LAHIR') || '').trim();
      let tanggalLahir = (getVal('TANGGAL LAHIR') || '').trim();
      if (!tempatLahir && ttl) {
        const parts = ttl.split(',');
        tempatLahir = parts[0]?.trim() || '';
        if (!tanggalLahir && parts.length > 1) {
          tanggalLahir = parts.slice(1).join(',')?.trim() || '';
        }
      }

      const base = {
        idSiswa: (getVal('ID SISWA') || '').trim(),
        nisn: (getVal('NISN') || '').trim(),
        nik: (getVal('NIK') || '').trim(),
        nama,
        tempatLahir,
        tanggalLahir,
        ibuKandung: (getVal('NAMA IBU KANDUNG') || '').trim(),
        jenisKelamin: (getVal('JENIS KELAMIN') || '').trim(),
        status: getVal('STATUS SISWA') || '',
      };

      const records: any[] = [];
      const ta7 = (getVal('TA KELAS 7') || '').trim();
      const r7  = (getVal('ROMBEL KELAS 7') || '').trim();
      if (ta7 && r7) records.push({ ...base, kelas: r7, tahunAjaran: ta7, isLatest: false });

      const ta8 = (getVal('TA KELAS 8') || '').trim();
      const r8  = (getVal('ROMBEL KELAS 8') || '').trim();
      if (ta8 && r8) records.push({ ...base, kelas: r8, tahunAjaran: ta8, isLatest: false });

      const ta9 = (getVal('TA KELAS 9') || '').trim();
      const r9  = (getVal('ROMBEL KELAS 9') || '').trim();
      if (ta9 && r9) records.push({ ...base, kelas: r9, tahunAjaran: ta9, isLatest: false });

      if (records.length === 0) {
        records.push({
          ...base,
          kelas:  (getVal('ROMBEL') || '').trim(),
          tahunAjaran: (getVal('TAHUN AJARAN') || '').trim(),
          isLatest: true,
        });
      } else {
        records[records.length - 1].isLatest = true;
      }

      return records;
    });

    const tahunAjaranList = Array.from(new Set(
      allRecords.filter(s => s.isLatest).map(s => s.tahunAjaran).filter(Boolean)
    )).sort().reverse();

    const activeTA = tahunAjaranParam || tahunAjaranList[0] || '2026/2027';

    const siswaAktif = allRecords.filter(s =>
      s.isLatest && (!activeTA || s.tahunAjaran === activeTA)
    );

    return NextResponse.json({
      success: true,
      tahunAjaranList,
      activeTahunAjaran: activeTA,
      totalSiswa: siswaAktif.length,
      data: siswaAktif
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('Fetch VervalPD Internal Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat data internal' }, { status: 500 });
  }
}
