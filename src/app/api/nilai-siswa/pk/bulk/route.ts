import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kelas, mapel, tahunAjaran, dataNilai, guru } = body;

    if (!kelas || !mapel || !tahunAjaran || !dataNilai || !Array.isArray(dataNilai)) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const columns = [
      { key: 'MATERI 1 S1', tipe: 'materi_harian', materi: 'Materi 1', sub: 'S1' },
      { key: 'MATERI 1 S2', tipe: 'materi_harian', materi: 'Materi 1', sub: 'S2' },
      { key: 'MATERI 1 S3', tipe: 'materi_harian', materi: 'Materi 1', sub: 'S3' },
      { key: 'MATERI 2 S1', tipe: 'materi_harian', materi: 'Materi 2', sub: 'S1' },
      { key: 'MATERI 2 S2', tipe: 'materi_harian', materi: 'Materi 2', sub: 'S2' },
      { key: 'MATERI 2 S3', tipe: 'materi_harian', materi: 'Materi 2', sub: 'S3' },
      { key: 'MATERI 3 S1', tipe: 'materi_harian', materi: 'Materi 3', sub: 'S1' },
      { key: 'MATERI 3 S2', tipe: 'materi_harian', materi: 'Materi 3', sub: 'S2' },
      { key: 'MATERI 3 S3', tipe: 'materi_harian', materi: 'Materi 3', sub: 'S3' },
      { key: 'MATERI 4 S1', tipe: 'materi_harian', materi: 'Materi 4', sub: 'S1' },
      { key: 'MATERI 4 S2', tipe: 'materi_harian', materi: 'Materi 4', sub: 'S2' },
      { key: 'MATERI 4 S3', tipe: 'materi_harian', materi: 'Materi 4', sub: 'S3' },
      { key: 'MATERI 5 S1', tipe: 'materi_harian', materi: 'Materi 5', sub: 'S1' },
      { key: 'MATERI 5 S2', tipe: 'materi_harian', materi: 'Materi 5', sub: 'S2' },
      { key: 'MATERI 5 S3', tipe: 'materi_harian', materi: 'Materi 5', sub: 'S3' },
      { key: 'MATERI 6 S1', tipe: 'materi_harian', materi: 'Materi 6', sub: 'S1' },
      { key: 'MATERI 6 S2', tipe: 'materi_harian', materi: 'Materi 6', sub: 'S2' },
      { key: 'MATERI 6 S3', tipe: 'materi_harian', materi: 'Materi 6', sub: 'S3' },
      { key: 'STS', tipe: 'sts', materi: '', sub: '' },
      { key: 'SAS', tipe: 'sas', materi: '', sub: '' }
    ];

    const bulkUpserts = [];
    const timestamp = new Date().toISOString();

    for (const col of columns) {
      const dataForThisCol = dataNilai.map(student => ({
        induk: student.induk,
        nama: student.nama,
        jk: student.jk,
        nilai: student[col.key] !== undefined && student[col.key] !== null ? String(student[col.key]) : ''
      }));

      // Find if we have any actual values
      const hasAnyValue = dataForThisCol.some(d => d.nilai !== '');

      if (hasAnyValue) {
        bulkUpserts.push({
          tahun_ajaran: tahunAjaran,
          kelas,
          mata_pelajaran: mapel,
          tipe: col.tipe,
          materi: col.materi,
          sub_materi: col.sub,
          data_nilai: dataForThisCol,
          guru: guru || '',
          updated_at: timestamp
        });
      }
    }

    if (bulkUpserts.length > 0) {
      const { error } = await supabase
        .from('nilai_pk')
        .upsert(bulkUpserts, { onConflict: 'tahun_ajaran,kelas,mata_pelajaran,tipe,materi,sub_materi' });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API Nilai PK Bulk Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan nilai bulk: ' + error.message }, { status: 500 });
  }
}
