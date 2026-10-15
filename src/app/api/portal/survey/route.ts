import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = (searchParams.get('nisn') || '').trim();
    const nama = (searchParams.get('nama') || '').trim().toUpperCase();

    if (!nisn && !nama) {
      return NextResponse.json({ success: false, error: 'NISN atau Nama diperlukan' }, { status: 400 });
    }

    const { data: allRows, error } = await supabase
      .from('data_survey')
      .select('id, tipe_survey, metadata, created_at');

    if (error) throw error;

    const norm = (s: any) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();

    const status = {
      wali_murid: false,
      siswa: false,
      kepuasan_ortu: false,
    };

    const submissions: Record<string, any> = {
      wali_murid: null,
      siswa: null,
      kepuasan_ortu: null,
    };

    (allRows || []).forEach((row: any) => {
      const meta = row.metadata || {};
      const rowNisn = String(meta['NISN'] || '').trim();
      const rowNamaSiswa = norm(meta['Nama Siswa'] || meta['Nama Anak / Siswa'] || meta['Nama Wali Murid'] || '');
      const rowNamaWali = norm(meta['Nama Wali Murid'] || '');

      const isMatch =
        (nisn && rowNisn && rowNisn === nisn) ||
        (nama && (rowNamaSiswa === nama || rowNamaWali === nama));

      if (isMatch) {
        if (row.tipe_survey === 'wali_murid') {
          status.wali_murid = true;
          submissions.wali_murid = meta;
        } else if (row.tipe_survey === 'siswa') {
          status.siswa = true;
          submissions.siswa = meta;
        } else if (row.tipe_survey === 'kepuasan_ortu') {
          status.kepuasan_ortu = true;
          submissions.kepuasan_ortu = meta;
        }
      }
    });

    return NextResponse.json({
      success: true,
      status,
      submissions
    });

  } catch (error: any) {
    console.error('Portal Survey GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { surveyType, data, student } = body;

    if (!surveyType || !data) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (surveyType !== 'wali_murid' && surveyType !== 'siswa' && surveyType !== 'kepuasan_ortu') {
      return NextResponse.json({ success: false, error: 'Tipe survey tidak valid' }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const metadata: Record<string, any> = {
      ...data,
      Timestamp: timestamp,
      NISN: student?.nisn || '',
      NIS: student?.nis || '',
      'Nama Siswa': student?.nama || data['Nama Siswa'] || '',
      Kelas: student?.kelas || data['Kelas'] || '',
      'Kelas Siswa': student?.kelas || data['Kelas Siswa'] || ''
    };

    if (surveyType === 'wali_murid') {
      // In original data_survey, 'Nama Wali Murid' often stored student name for historical reasons
      if (!metadata['Nama Wali Murid']) {
        metadata['Nama Wali Murid'] = student?.nama || '';
      }
      metadata['Nama Orang Tua'] = data['Nama Orang Tua'] || student?.namaAyah || student?.namaIbu || '';
    }

    if (surveyType === 'kepuasan_ortu') {
      metadata['Nama Wali Murid'] = data['Nama Wali Murid'] || student?.namaAyah || student?.namaIbu || '';
    }

    const { error } = await supabase.from('data_survey').insert([
      {
        tipe_survey: surveyType,
        metadata
      }
    ]);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Survey berhasil dikirim'
    });

  } catch (error: any) {
    console.error('Portal Survey POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
