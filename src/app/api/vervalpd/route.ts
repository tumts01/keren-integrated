import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaranParam = searchParams.get('tahunAjaran') || '';

    // 1. Ambil data induk internal
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

    // 2. Ambil data VervalPD yang tersimpan di database server (jika ada)
    let savedVerval: { fileName: string; uploadedAt: string; data: any[] } | null = null;
    const { data: configRow } = await supabase
      .from('rapor_config')
      .select('value')
      .eq('key', 'vervalpd_uploaded_data')
      .maybeSingle();

    if (configRow && configRow.value) {
      try {
        savedVerval = JSON.parse(configRow.value);
      } catch (e) {
        console.error('Error parsing saved VervalPD data:', e);
      }
    }

    return NextResponse.json({
      success: true,
      tahunAjaranList,
      activeTahunAjaran: activeTA,
      totalSiswa: siswaAktif.length,
      data: siswaAktif,
      savedVerval
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: any) {
    console.error('Fetch VervalPD Internal Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat data internal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, data } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Data VervalPD kosong' }, { status: 400 });
    }

    const payload = {
      key: 'vervalpd_uploaded_data',
      value: JSON.stringify({
        fileName: fileName || 'Data_VervalPD.xlsx',
        uploadedAt: new Date().toISOString(),
        data
      })
    };

    const { error } = await supabase
      .from('rapor_config')
      .upsert(payload, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Data VervalPD berhasil disimpan ke database server'
    });
  } catch (error: any) {
    console.error('Save VervalPD Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan data ke server' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase
      .from('rapor_config')
      .delete()
      .eq('key', 'vervalpd_uploaded_data');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Data VervalPD berhasil direset dari server'
    });
  } catch (error: any) {
    console.error('Delete VervalPD Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menghapus data dari server' }, { status: 500 });
  }
}
