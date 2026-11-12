import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

function normalizeGender(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  if (s === 'L' || s.startsWith('LAKI') || s === 'PRIA' || s === 'M' || s === 'MALE' || s === 'LK') return 'LAKI-LAKI';
  if (s === 'P' || s.startsWith('PEREMPUAN') || s === 'WANITA' || s === 'F' || s === 'FEMALE' || s === 'PR') return 'PEREMPUAN';
  return s;
}

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
        supabaseId: row.id,
        idSiswa: (getVal('ID SISWA') || '').trim(),
        nisn: (getVal('NISN') || '').trim(),
        nik: (getVal('NIK') || '').trim(),
        nama,
        tempatLahir,
        tanggalLahir,
        ibuKandung: (getVal('NAMA IBU KANDUNG') || '').trim(),
        jenisKelamin: normalizeGender(getVal('JENIS KELAMIN')),
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
        if (savedVerval && Array.isArray(savedVerval.data)) {
          savedVerval.data = savedVerval.data.map((d: any) => ({
            ...d,
            jenisKelamin: normalizeGender(d.jenisKelamin)
          }));
        }
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

    const cleanedData = data.map((d: any) => ({
      ...d,
      jenisKelamin: normalizeGender(d.jenisKelamin)
    }));

    const payload = {
      key: 'vervalpd_uploaded_data',
      value: JSON.stringify({
        fileName: fileName || 'Data_VervalPD.xlsx',
        uploadedAt: new Date().toISOString(),
        data: cleanedData
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { supabaseId, fields } = body;

    if (!supabaseId) {
      return NextResponse.json({ success: false, error: 'ID Supabase tidak ditemukan' }, { status: 400 });
    }
    if (!fields || typeof fields !== 'object') {
      return NextResponse.json({ success: false, error: 'Data perubahan tidak valid' }, { status: 400 });
    }

    // 1. Ambil data siswa saat ini dari data_induk
    const { data: existingRow, error: fetchErr } = await supabase
      .from('data_induk')
      .select('id, nama, id_siswa, metadata')
      .eq('id', supabaseId)
      .single();

    if (fetchErr || !existingRow) {
      return NextResponse.json({ success: false, error: 'Data siswa tidak ditemukan di database' }, { status: 404 });
    }

    const metadata = existingRow.metadata ? { ...existingRow.metadata } : {};

    // 2. Terapkan perubahan pada atribut terkait
    if (fields.nama !== undefined && fields.nama !== null) {
      metadata['NAMA'] = String(fields.nama).trim().toUpperCase();
    }
    if (fields.nisn !== undefined && fields.nisn !== null) {
      metadata['NISN'] = String(fields.nisn).trim();
    }
    if (fields.nik !== undefined && fields.nik !== null) {
      metadata['NIK'] = String(fields.nik).trim();
    }
    if (fields.tempatLahir !== undefined && fields.tempatLahir !== null) {
      metadata['TEMPAT LAHIR'] = String(fields.tempatLahir).trim().toUpperCase();
    }
    if (fields.tanggalLahir !== undefined && fields.tanggalLahir !== null) {
      metadata['TANGGAL LAHIR'] = String(fields.tanggalLahir).trim();
    }

    // Sinkronisasi kolom gabungan TEMPAT, TANGGAL LAHIR
    const curTempat = metadata['TEMPAT LAHIR'] || '';
    const curTgl = metadata['TANGGAL LAHIR'] || '';
    if (curTempat || curTgl) {
      metadata['TEMPAT, TANGGAL LAHIR'] = `${curTempat}, ${curTgl}`.replace(/^,\s*|,\s*$/g, '');
    }

    if (fields.ibuKandung !== undefined && fields.ibuKandung !== null) {
      metadata['NAMA IBU KANDUNG'] = String(fields.ibuKandung).trim().toUpperCase();
    }
    if (fields.jenisKelamin !== undefined && fields.jenisKelamin !== null) {
      const rawJK = String(fields.jenisKelamin).trim().toUpperCase();
      const normJK = (rawJK === 'L' || rawJK === 'LAKI-LAKI') ? 'LAKI-LAKI' : (rawJK === 'P' || rawJK === 'PEREMPUAN') ? 'PEREMPUAN' : rawJK;
      metadata['JENIS KELAMIN'] = normJK;
    }

    const newNama = metadata['NAMA'] || existingRow.nama;

    // 3. Simpan perubahan ke Supabase
    const { error: updateErr } = await supabase
      .from('data_induk')
      .update({
        nama: newNama,
        metadata
      })
      .eq('id', supabaseId);

    if (updateErr) throw updateErr;

    // 4. Revalidasi cache data induk & siswa
    try {
      revalidateTag('data_induk', {});
      revalidateTag('siswa', {});
    } catch (e) {
      console.warn('Revalidation warning:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Data siswa berhasil diperbarui langsung ke database',
      updatedData: {
        supabaseId,
        nama: newNama,
        nisn: metadata['NISN'] || '',
        nik: metadata['NIK'] || '',
        tempatLahir: metadata['TEMPAT LAHIR'] || '',
        tanggalLahir: metadata['TANGGAL LAHIR'] || '',
        ibuKandung: metadata['NAMA IBU KANDUNG'] || '',
        jenisKelamin: metadata['JENIS KELAMIN'] || ''
      }
    });
  } catch (error: any) {
    console.error('Update Siswa VervalPD Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan perubahan ke database' }, { status: 500 });
  }
}
